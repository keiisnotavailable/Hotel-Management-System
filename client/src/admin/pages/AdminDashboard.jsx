import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, BedDouble, CalendarCheck, CalendarClock, CircleDollarSign, DoorOpen, Plus, RefreshCw, Users, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi, getAdminErrorMessage } from '../lib/adminApi'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import Skeleton from '../components/Skeleton'

const numberFormat = new Intl.NumberFormat('en-PH')
const currencyFormat = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })
const timestampFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })

function money(value) {
  return currencyFormat.format(Number(value) || 0)
}

function displayDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date)
}

function DashboardSkeleton() {
  return <div className="admin-dashboard-skeleton" aria-label="Loading dashboard" aria-busy="true">
    <div className="admin-stat-grid">{Array.from({ length: 9 }, (_, index) => <div className="admin-stat-skeleton" key={index}><span /><span /><span /></div>)}</div>
    <div className="admin-chart-grid"><Skeleton rows={3} /><Skeleton rows={3} /><Skeleton rows={3} /></div>
    <Skeleton rows={4} />
  </div>
}

function ChartPanel({ title, subtitle, children }) {
  return <section className="admin-dashboard-panel">
    <div className="admin-panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>
    {children}
  </section>
}

function ReservationsChart({ data }) {
  const width = 620
  const height = 220
  const pad = { top: 16, right: 16, bottom: 34, left: 32 }
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  const maxValue = Math.max(1, ...data.map(({ count }) => count))
  const points = data.map(({ count }, index) => ({
    x: pad.left + (data.length > 1 ? index / (data.length - 1) : 0) * plotWidth,
    y: pad.top + plotHeight - (count / maxValue) * plotHeight,
  }))
  const pointString = points.map(({ x, y }) => `${x},${y}`).join(' ')
  const hasValues = data.some(({ count }) => count > 0)

  if (!hasValues) return <EmptyState title="No reservations yet" description="New reservations will appear in this 30-day trend." />

  return <div className="admin-chart-scroll">
    <svg className="admin-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reservations per day over the last 30 days">
      {[0, 0.5, 1].map((fraction) => {
        const y = pad.top + plotHeight * fraction
        return <g key={fraction}>
          <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="admin-chart-gridline" />
          <text x={pad.left - 8} y={y + 4} textAnchor="end" className="admin-chart-axis">{Math.round(maxValue * (1 - fraction))}</text>
        </g>
      })}
      <polyline points={pointString} className="admin-line-chart-path" />
      {points.map(({ x, y }, index) => <circle key={data[index].date} cx={x} cy={y} r="3" className="admin-line-chart-point">
        <title>{`${data[index].date}: ${data[index].count} reservations`}</title>
      </circle>)}
      {data.map(({ date }, index) => index % 5 === 0 || index === data.length - 1
        ? <text key={date} x={points[index].x} y={height - 8} textAnchor="middle" className="admin-chart-axis">{date.slice(5)}</text>
        : null)}
    </svg>
  </div>
}

function RevenueChart({ data }) {
  const maxRevenue = Math.max(0, ...data.map(({ revenue }) => Number(revenue) || 0))
  if (!maxRevenue) return <EmptyState title="No confirmed revenue yet" description="Confirmed reservation revenue will be charted here." />
  return <div className="admin-revenue-chart" role="img" aria-label="Revenue per month for the last six months">
    {data.map(({ month, revenue }) => {
      const amount = Number(revenue) || 0
      return <div className="admin-revenue-bar-item" key={month} title={`${month}: ${money(amount)}`}>
        <span className="admin-revenue-value">{money(amount)}</span>
        <div className="admin-revenue-bar-track"><span className="admin-revenue-bar" style={{ height: `${Math.max(4, (amount / maxRevenue) * 100)}%` }} /></div>
        <span className="admin-revenue-month">{month}</span>
      </div>
    })}
  </div>
}

function ReservationStatusChart({ confirmed, cancelled }) {
  const total = confirmed + cancelled
  if (!total) return <EmptyState title="No reservations yet" description="Reservation status totals will appear here." />
  const confirmedPercent = (confirmed / total) * 100
  return <div className="admin-status-chart-content">
    <div className="admin-status-donut" style={{ background: `conic-gradient(#c9a24a 0 ${confirmedPercent}%, #98475b ${confirmedPercent}% 100%)` }} role="img" aria-label={`${confirmed} confirmed and ${cancelled} cancelled reservations`}>
      <div><strong>{numberFormat.format(total)}</strong><span>Total</span></div>
    </div>
    <ul className="admin-status-legend">
      <li><span className="admin-legend-dot confirmed" />Confirmed <strong>{numberFormat.format(confirmed)}</strong></li>
      <li><span className="admin-legend-dot cancelled" />Cancelled <strong>{numberFormat.format(cancelled)}</strong></li>
    </ul>
  </div>
}

function StatCard({ icon: Icon, label, value, detail, tone = '' }) {
  return <article className={`admin-stat-card ${tone}`}>
    <div className="admin-stat-icon"><Icon size={18} aria-hidden="true" /></div>
    <p>{label}</p>
    <strong>{value}</strong>
    {detail && <span>{detail}</span>}
  </article>
}

function RecentReservationTable({ reservations }) {
  const columns = useMemo(() => [
    { key: 'guest', label: 'Monster', render: (item) => <span className="admin-recent-guest"><strong>{item.user?.name || 'Unknown guest'}</strong><small>{item.user?.email || ''}</small></span> },
    { key: 'room', label: 'Crypt', render: (item) => item.room?.name || 'Unknown crypt' },
    { key: 'dates', label: 'Stay', render: (item) => `${displayDate(item.checkIn)} – ${displayDate(item.checkOut)}` },
    { key: 'totalPrice', label: 'Total', render: (item) => money(item.totalPrice) },
    { key: 'status', label: 'Status', render: (item) => <span className={`admin-status-badge admin-status-${item.status}`}>{item.status}</span> },
  ], [])

  return <DataTable columns={columns} items={reservations} emptyTitle="No recent reservations" emptyDescription="When a monster books a crypt, it will appear here." />
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadStats = useCallback(async ({ background = false } = {}) => {
    if (background) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const { data } = await adminApi.get('/stats')
      setStats(data)
      setLastUpdated(new Date())
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError, 'Could not load the dashboard statistics.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const reservations = stats?.reservations || {}
  const rooms = stats?.rooms || {}
  const users = stats?.users || {}

  if (loading && !stats) return <section className="admin-page">
    <p className="admin-kicker">Moonstoria Administration</p>
    <h1>Dashboard</h1>
    <p className="admin-page-subtitle">A moonlit overview of the castle.</p>
    <div className="admin-dashboard-body"><DashboardSkeleton /></div>
  </section>

  return <section className="admin-page admin-dashboard">
    <div className="admin-dashboard-header">
      <div>
        <p className="admin-kicker">Moonstoria Administration</p>
        <h1>Dashboard</h1>
        <p className="admin-page-subtitle">A moonlit overview of the castle.</p>
      </div>
      <div className="admin-dashboard-refresh">
        {lastUpdated && <span>Updated {timestampFormat.format(lastUpdated)}</span>}
        <button type="button" className="admin-refresh-button" onClick={() => loadStats({ background: Boolean(stats) })} disabled={refreshing} aria-label="Refresh dashboard statistics">
          <RefreshCw size={15} className={refreshing ? 'admin-refresh-spinning' : ''} /> Refresh
        </button>
      </div>
    </div>

    {error && stats && <div className="admin-dashboard-error" role="alert">
      <span>{error}</span><button type="button" onClick={() => loadStats({ background: true })}>Retry</button>
    </div>}
    {!stats && error && <div className="admin-dashboard-error admin-dashboard-error-block" role="alert">
      <Activity size={22} /><h2>Could not open the dashboard</h2><p>{error}</p>
      <button type="button" onClick={() => loadStats()}>Retry</button>
    </div>}

    {stats && <div className="admin-dashboard-body" aria-busy={refreshing}>
      <div className="admin-stat-grid">
        <StatCard icon={BedDouble} label="Total rooms" value={numberFormat.format(rooms.total || 0)} />
        <StatCard icon={DoorOpen} label="Available" value={numberFormat.format(rooms.available || 0)} tone="available" />
        <StatCard icon={Wrench} label="In maintenance" value={numberFormat.format(rooms.maintenance || 0)} tone="maintenance" />
        <StatCard icon={CalendarCheck} label="Total reservations" value={numberFormat.format(reservations.total || 0)} />
        <StatCard icon={CalendarClock} label="Upcoming" value={numberFormat.format(reservations.upcoming || 0)} tone="upcoming" />
        <StatCard icon={Activity} label="Active now" value={numberFormat.format(reservations.activeNow || 0)} tone="active" />
        <StatCard icon={Users} label="Total guests" value={numberFormat.format(users.guests || 0)} />
        <StatCard icon={CircleDollarSign} label="Revenue" value={money(stats.revenue?.total)} detail={`${money(stats.revenue?.thisMonth)} this month`} tone="revenue" />
        <StatCard icon={Activity} label="Occupancy now" value={`${Number(stats.occupancyNow || 0).toLocaleString('en-PH')}%`} detail="of available rooms" tone="occupancy" />
      </div>

      <div className="admin-chart-grid">
        <ChartPanel title="Reservations per day" subtitle="Last 30 days">
          <ReservationsChart data={stats.reservationsPerDay || []} />
        </ChartPanel>
        <ChartPanel title="Revenue by month" subtitle="Last 6 months">
          <RevenueChart data={stats.revenuePerMonth || []} />
        </ChartPanel>
        <ChartPanel title="Reservations by status">
          <ReservationStatusChart confirmed={reservations.confirmed || 0} cancelled={reservations.cancelled || 0} />
        </ChartPanel>
      </div>

      <div className="admin-dashboard-lists">
        <ChartPanel title="Top crypts" subtitle="Most confirmed reservations">
          {stats.topRooms?.length
            ? <ol className="admin-top-rooms">{stats.topRooms.map((room, index) => <li key={room.roomId || room.name}>
              <span className="admin-top-room-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="admin-top-room-name">{room.name}</span>
              <span className="admin-top-room-bookings">{numberFormat.format(room.bookings)} bookings</span>
              <strong>{money(room.revenue)}</strong>
            </li>)}</ol>
            : <EmptyState title="No top crypts yet" description="Confirmed stays will rank your most popular crypts here." />}
        </ChartPanel>

        <ChartPanel title="Recent reservations">
          <RecentReservationTable reservations={stats.recentReservations || []} />
          <Link className="admin-dashboard-view-all" to="/admin/reservations">View all reservations</Link>
        </ChartPanel>
      </div>

      <div className="admin-quick-actions">
        <Link to="/admin/rooms/new"><Plus size={17} /> Add crypt</Link>
        <Link to="/admin/reservations?checkIn=today"><CalendarCheck size={17} /> View today’s check-ins</Link>
      </div>
    </div>}
  </section>
}
