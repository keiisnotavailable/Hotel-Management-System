import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, CalendarDays, Check, Eye, Pencil, Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import DateTimePicker from '../../components/DateTimePicker'
import SelectControl from '../../components/SelectControl'
import { formatPHP } from '../../lib/currency'
import { formatDateTime, MIN_STAY_HOURS } from '../../lib/date'
import { getRoomImage } from '../../utils/roomImages'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import Skeleton from '../components/Skeleton'
import Toast from '../components/Toast'
import { adminApi, getAdminErrorMessage } from '../lib/adminApi'

const PAGE_LIMIT = 20
const SORT_OPTIONS = [
  ['-createdAt', 'Newest first'],
  ['createdAt', 'Oldest first'],
  ['-checkIn', 'Dusk: latest first'],
  ['checkIn', 'Dusk: earliest first'],
  ['-totalPrice', 'Total: high to low'],
  ['totalPrice', 'Total: low to high'],
  ['guest', 'Guest: A–Z'],
  ['-guest', 'Guest: Z–A'],
]
const emptyDateValues = { checkIn: '', checkOut: '' }

function localDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function reservationId(reservation) {
  return String(reservation._id || reservation.id || '').slice(-8).toUpperCase()
}

function statusLabel(reservation) {
  if (reservation.displayStatus === 'cancelled' || reservation.status === 'cancelled') return 'Cancelled'
  const labels = { upcoming: 'Upcoming', completed: 'Completed' }
  return labels[reservation.displayStatus || reservation.status] || 'Upcoming'
}

function ReservationStatusBadge({ reservation }) {
  const status = (reservation.displayStatus || reservation.status || 'upcoming').toLowerCase()
  return <span className={`admin-status-badge admin-status-${status}`}>{statusLabel(reservation)}</span>
}

function ReservationSkeleton() {
  return <div className="admin-reservations-skeleton" aria-label="Loading reservations" aria-busy="true"><Skeleton rows={8} /></div>
}

function ReservationIdentity({ reservation }) {
  const room = reservation.room || { name: reservation.roomName, slug: reservation.roomSlug }
  const image = getRoomImage(room)
  return <span className="admin-reservation-room">
    {image ? <img src={image} alt="" loading="lazy" /> : <span className="admin-reservation-room-placeholder" aria-hidden="true">☾</span>}
    <strong>{room?.name || reservation.roomName || 'Unknown crypt'}</strong>
  </span>
}

function EditDatesModal({ reservation, onClose, onSaved }) {
  const id = reservation._id || reservation.id
  const [dates, setDates] = useState(() => ({
    checkIn: localDateTime(reservation.checkIn),
    checkOut: localDateTime(reservation.checkOut),
  }))
  const [availability, setAvailability] = useState(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const start = new Date(dates.checkIn)
  const end = new Date(dates.checkOut)
  const durationHours = (end - start) / 3600000
  const validation = !dates.checkIn || !dates.checkOut
    ? 'Choose both Dusk and Dawn.'
    : Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      ? 'Choose valid dates and times.'
      : end <= start
        ? 'Dawn must be after Dusk.'
        : durationHours < MIN_STAY_HOURS
          ? `Stays must be at least ${MIN_STAY_HOURS} hours.`
          : ''

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, saving])

  useEffect(() => {
    if (validation) {
      setAvailability(null)
      setChecking(false)
      return undefined
    }
    const controller = new AbortController()
    setChecking(true)
    setAvailability(null)
    const timer = window.setTimeout(async () => {
      try {
        const checkIn = new Date(dates.checkIn)
        const checkOut = new Date(dates.checkOut)
        const { data } = await adminApi.get(`/reservations/${id}/availability`, {
          params: {
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
          },
          signal: controller.signal,
        })
        setAvailability(data)
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') {
          setAvailability({ error: getAdminErrorMessage(requestError, 'Could not check reservation conflicts.') })
        }
      } finally {
        if (!controller.signal.aborted) setChecking(false)
      }
    }, 350)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [dates.checkIn, dates.checkOut, id, validation])

  async function saveDates() {
    setSaving(true)
    setError('')
    try {
      const { data } = await adminApi.patch(`/reservations/${id}/dates`, {
        checkIn: start.toISOString(),
        checkOut: end.toISOString(),
      })
      onSaved(data.reservation)
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setAvailability({ available: false, conflicts: requestError.response.data?.conflicts || [] })
      } else {
        setError(getAdminErrorMessage(requestError, 'The reservation dates could not be saved.'))
      }
    } finally {
      setSaving(false)
    }
  }

  const conflictMessage = availability?.available === false
    ? availability.conflicts?.length
      ? `This crypt is already booked ${formatDateTime(availability.conflicts[0].checkIn)} – ${formatDateTime(availability.conflicts[0].checkOut)}.`
      : 'This crypt is unavailable for those dates.'
    : ''
  const canSave = !validation && !checking && availability?.available === true && !saving

  return <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
    <section className="admin-confirm-modal admin-reservation-modal" role="dialog" aria-modal="true" aria-labelledby="admin-reservation-edit-title">
      <p className="admin-kicker">Reservation dates</p>
      <h2 id="admin-reservation-edit-title">Edit Dusk and Dawn</h2>
      <p className="admin-reservation-modal-subtitle">{reservation.user?.name || reservation.userName || 'Guest'} · {reservation.room?.name || reservation.roomName || 'Unknown crypt'}</p>
      <div className="admin-reservation-date-fields">
        <DateTimePicker label="Dusk" id="admin-edit-checkin" value={dates.checkIn} onChange={(checkIn) => setDates((current) => ({ ...current, checkIn }))} variant="booking" />
        <DateTimePicker label="Dawn" id="admin-edit-checkout" value={dates.checkOut} onChange={(checkOut) => setDates((current) => ({ ...current, checkOut }))} variant="booking" />
      </div>
      <div className={`admin-reservation-conflict ${validation || conflictMessage || availability?.error ? 'is-error' : availability?.available ? 'is-available' : ''}`} aria-live="polite">
        {validation || conflictMessage || availability?.error || (checking ? 'Checking crypt availability…' : availability?.available ? 'No reservation conflicts found.' : 'Choose dates to check availability.')}
      </div>
      {error && <p className="admin-reservation-action-error" role="alert">{error}</p>}
      <div className="admin-modal-actions">
        <button type="button" onClick={onClose} disabled={saving}>Keep current dates</button>
        <button type="button" className="danger" onClick={saveDates} disabled={!canSave}>{saving ? 'Saving…' : 'Save dates'}</button>
      </div>
    </section>
  </div>
}

function CancelReservationModal({ reservation, onClose, onCancelled }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = reservation._id || reservation.id

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [busy, onClose])

  async function cancel() {
    setBusy(true)
    setError('')
    try {
      const { data } = await adminApi.patch(`/reservations/${id}/cancel`, { reason })
      onCancelled(data.reservation)
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError, 'The reservation could not be cancelled.'))
    } finally {
      setBusy(false)
    }
  }

  return <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section className="admin-confirm-modal admin-reservation-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-reservation-cancel-title">
      <p className="admin-kicker">Cancel reservation</p>
      <h2 id="admin-reservation-cancel-title">Cancel stay {reservationId(reservation)}?</h2>
      <p>This will cancel the booking for {reservation.user?.name || reservation.userName || 'this guest'} at {reservation.room?.name || reservation.roomName || 'this crypt'}.</p>
      <label className="admin-reservation-reason">Reason (optional)
        <textarea rows="4" maxLength="1000" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add a note for the reservation record" />
      </label>
      {error && <p className="admin-reservation-action-error" role="alert">{error}</p>}
      <div className="admin-modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>Keep reservation</button>
        <button type="button" className="danger" onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel reservation'}</button>
      </div>
    </section>
  </div>
}

function CompleteReservationModal({ reservation, onClose, onCompleted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = reservation._id || reservation.id

  async function complete() {
    setBusy(true)
    setError('')
    try {
      const { data } = await adminApi.patch(`/reservations/${id}/complete`)
      onCompleted(data.reservation)
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError, 'The reservation could not be marked as completed.'))
    } finally {
      setBusy(false)
    }
  }

  return <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section className="admin-confirm-modal admin-reservation-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-reservation-complete-title">
      <p className="admin-kicker">Complete reservation</p>
      <h2 id="admin-reservation-complete-title">Mark stay {reservationId(reservation)} as completed?</h2>
      <p>This closes the stay for {reservation.user?.name || reservation.userName || 'this guest'} at {reservation.room?.name || reservation.roomName || 'this crypt'} now.</p>
      {error && <p className="admin-reservation-action-error" role="alert">{error}</p>}
      <div className="admin-modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>Keep reservation</button>
        <button type="button" className="danger" onClick={complete} disabled={busy}>{busy ? 'Completing…' : 'Mark completed'}</button>
      </div>
    </section>
  </div>
}

function ReservationDrawer({ reservation, open, loading, error, onClose }) {
  const room = reservation?.room || { name: reservation?.roomName, slug: reservation?.roomSlug }
  const user = reservation?.user || { name: reservation?.userName, email: reservation?.userEmail }
  return <Drawer open={open} onClose={onClose} label="Reservation details" panelClassName="admin-reservation-drawer-panel">
    <div className="admin-reservation-drawer-content">
      <p className="admin-kicker">Reservation record</p>
      <h2>Stay {reservation ? reservationId(reservation) : ''}</h2>
      {loading ? <div className="admin-user-drawer-loading"><Skeleton rows={5} /></div>
        : error ? <div className="admin-dashboard-error" role="alert">{error}</div>
          : reservation && <>
            <div className="admin-reservation-drawer-status"><ReservationStatusBadge reservation={reservation} /></div>
            <section className="admin-reservation-detail-section">
              <h3>Monster</h3>
              <strong>{user?.name || reservation.userName || 'Guest record unavailable'}</strong>
              <span>{user?.email || reservation.userEmail || 'Email unavailable'}</span>
            </section>
            <section className="admin-reservation-detail-section admin-reservation-drawer-room">
              <h3>Crypt</h3>
              {getRoomImage(room) && <img src={getRoomImage(room)} alt="" />}
              <strong>{room?.name || reservation.roomName || 'Crypt record unavailable'}</strong>
              <span>{room?.type || 'Room details are no longer available'}</span>
            </section>
            <dl className="admin-reservation-detail-grid">
              <div><dt>Dusk</dt><dd>{formatDateTime(reservation.checkIn)}</dd></div>
              <div><dt>Dawn</dt><dd>{formatDateTime(reservation.checkOut)}</dd></div>
              <div><dt>Stay</dt><dd>{reservation.nights} night{reservation.nights === 1 ? '' : 's'}</dd></div>
              <div><dt>Monsters</dt><dd>{reservation.guests}</dd></div>
              <div><dt>Total</dt><dd>{formatPHP(reservation.totalPrice)}</dd></div>
              <div><dt>Created</dt><dd>{formatDateTime(reservation.createdAt)}</dd></div>
              {reservation.completedAt && <div><dt>Completed</dt><dd>{formatDateTime(reservation.completedAt)}</dd></div>}
            </dl>
            {reservation.specialRequests && <section className="admin-reservation-detail-section"><h3>Special requests</h3><p>{reservation.specialRequests}</p></section>}
            {reservation.cancellationReason && <section className="admin-reservation-cancellation-note"><h3>Cancellation reason</h3><p>{reservation.cancellationReason}</p></section>}
          </>}
    </div>
  </Drawer>
}

export default function AdminReservationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const searchParam = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const roomId = searchParams.get('roomId') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const sort = searchParams.get('sort') || '-createdAt'
  const [searchInput, setSearchInput] = useState(searchParam)
  const [result, setResult] = useState(null)
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [selected, setSelected] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [editReservation, setEditReservation] = useState(null)
  const [cancelReservation, setCancelReservation] = useState(null)
  const [completeReservation, setCompleteReservation] = useState(null)

  useEffect(() => setSearchInput(searchParam), [searchParam])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      if (nextSearch === searchParam) return
      const next = new URLSearchParams(queryString)
      if (nextSearch) next.set('search', nextSearch)
      else next.delete('search')
      next.delete('page')
      setSearchParams(next, { replace: true })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [queryString, searchInput, searchParam, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    async function loadReservations() {
      setLoading(true)
      setError('')
      const params = new URLSearchParams(queryString)
      params.set('page', String(page))
      params.set('limit', String(PAGE_LIMIT))
      try {
        const { data } = await adminApi.get(`/reservations?${params}`, { signal: controller.signal })
        setResult(data)
        if (data.totalPages > 0 && page > data.totalPages) {
          const next = new URLSearchParams(queryString)
          next.set('page', String(data.totalPages))
          setSearchParams(next, { replace: true })
        } else if (data.totalPages === 0 && page !== 1) {
          const next = new URLSearchParams(queryString)
          next.delete('page')
          setSearchParams(next, { replace: true })
        }
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getAdminErrorMessage(requestError, 'Could not load reservations.'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    loadReservations()
    return () => controller.abort()
  }, [page, queryString, refreshKey, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    adminApi.get('/rooms?limit=100', { signal: controller.signal })
      .then(({ data }) => setRooms(data.items || []))
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setToast({ type: 'error', message: getAdminErrorMessage(requestError, 'Crypt filters could not be loaded.') })
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const updateFilters = useCallback((updates) => {
    const next = new URLSearchParams(queryString)
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    next.delete('page')
    next.delete('checkIn')
    setSearchParams(next)
  }, [queryString, setSearchParams])

  const reload = useCallback(() => setRefreshKey((key) => key + 1), [])

  async function viewDetails(reservation) {
    const id = reservation._id || reservation.id
    setSelected(reservation)
    setDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError('')
    try {
      const { data } = await adminApi.get(`/reservations/${id}`)
      setSelected(data.reservation)
    } catch (requestError) {
      setDrawerError(getAdminErrorMessage(requestError, 'Could not load reservation details.'))
    } finally {
      setDrawerLoading(false)
    }
  }

  function savedDates(reservation) {
    setEditReservation(null)
    setToast({ type: 'success', message: `Stay ${reservationId(reservation)} dates were updated.` })
    if (drawerOpen && (selected?._id || selected?.id) === (reservation._id || reservation.id)) setSelected(reservation)
    reload()
  }

  function cancelledReservation(reservation) {
    setCancelReservation(null)
    setToast({ type: 'success', message: `Stay ${reservationId(reservation)} was cancelled.` })
    if (drawerOpen && (selected?._id || selected?.id) === (reservation._id || reservation.id)) setSelected(reservation)
    reload()
  }

  function completedReservation(reservation) {
    setCompleteReservation(null)
    setToast({ type: 'success', message: `Stay ${reservationId(reservation)} was marked completed.` })
    if (drawerOpen && (selected?._id || selected?.id) === (reservation._id || reservation.id)) setSelected(reservation)
    reload()
  }

  const items = result?.items || []
  const columns = useMemo(() => [
    { key: 'id', label: 'Reservation', render: (reservation) => <span className="admin-reservation-id">#{reservationId(reservation)}</span> },
    { key: 'guest', label: 'Monster', render: (reservation) => <span className="admin-reservation-guest"><strong>{reservation.user?.name || reservation.userName || 'Guest unavailable'}</strong><small>{reservation.user?.email || reservation.userEmail || 'Email unavailable'}</small></span> },
    { key: 'room', label: 'Crypt', render: (reservation) => <ReservationIdentity reservation={reservation} /> },
    { key: 'dates', label: 'Dusk / Dawn', render: (reservation) => <span className="admin-reservation-dates"><span>{formatDateTime(reservation.checkIn)}</span><span>{formatDateTime(reservation.checkOut)}</span></span> },
    { key: 'nights', label: 'Nights', render: (reservation) => reservation.nights },
    { key: 'guests', label: 'Monsters', render: (reservation) => reservation.guests },
    { key: 'total', label: 'Total', render: (reservation) => formatPHP(reservation.totalPrice) },
    { key: 'status', label: 'Status', render: (reservation) => <ReservationStatusBadge reservation={reservation} /> },
    { key: 'created', label: 'Created', render: (reservation) => formatDateTime(reservation.createdAt) },
    { key: 'actions', label: 'Actions', render: (reservation) => {
      const locked = ['completed', 'cancelled'].includes(reservation.displayStatus || reservation.status)
      return <div className="admin-reservation-actions">
        <button type="button" title="View details" aria-label={`View reservation ${reservationId(reservation)}`} onClick={() => viewDetails(reservation)}><Eye size={15} /></button>
        <button type="button" title={locked ? 'Completed or cancelled reservations cannot be edited.' : 'Edit dates'} aria-label={`Edit dates for reservation ${reservationId(reservation)}`} disabled={locked} onClick={() => setEditReservation(reservation)}><Pencil size={15} /></button>
        <button type="button" className="danger" title={locked ? 'Completed or cancelled reservations cannot be cancelled.' : 'Cancel reservation'} aria-label={`Cancel reservation ${reservationId(reservation)}`} disabled={locked} onClick={() => setCancelReservation(reservation)}><X size={16} /></button>
        <button type="button" title={locked ? 'Completed or cancelled reservations cannot be marked completed.' : 'Mark as completed'} aria-label={`Mark reservation ${reservationId(reservation)} completed`} disabled={locked} onClick={() => setCompleteReservation(reservation)}><Check size={15} /></button>
      </div>
    } },
  ], [drawerOpen, selected])

  return <section className="admin-page admin-reservations-page">
    <div className="admin-reservations-heading">
      <div>
        <p className="admin-kicker">Moonstoria Administration</p>
        <h1>Reservations</h1>
        <p className="admin-page-subtitle">Manage stays from Dusk to Dawn.</p>
      </div>
      <button className="admin-reservations-refresh" type="button" disabled={loading} onClick={reload}><CalendarDays size={15} /> Refresh</button>
    </div>

    <div className="admin-reservations-toolbar">
      <label className="admin-reservations-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search reservations</span>
        <input type="search" value={searchInput} placeholder="Search monster, crypt, email or ID…" onChange={(event) => setSearchInput(event.target.value)} />
      </label>
      <label className="admin-reservations-filter"><span>Status</span><SelectControl value={status} onChange={(event) => updateFilters({ status: event.target.value })}>
        <option value="">All statuses</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
      </SelectControl></label>
      <label className="admin-reservations-filter"><span>Crypt</span><SelectControl value={roomId} onChange={(event) => updateFilters({ roomId: event.target.value })}>
        <option value="">All crypts</option>{rooms.map((room) => <option key={room._id || room.id} value={room._id || room.id}>{room.name}</option>)}
      </SelectControl></label>
      <label className="admin-reservations-filter"><span>From</span><input type="date" value={from} onChange={(event) => updateFilters({ from: event.target.value })} /></label>
      <label className="admin-reservations-filter"><span>To</span><input type="date" value={to} onChange={(event) => updateFilters({ to: event.target.value })} /></label>
      <label className="admin-reservations-filter admin-reservations-sort"><span><ArrowDownUp size={12} /> Sort</span><SelectControl value={sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
        {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectControl></label>
    </div>

    {result && <p className="admin-reservations-summary" aria-live="polite"><strong>{result.total || 0} {result.total === 1 ? 'reservation' : 'reservations'}</strong><span>{formatPHP(result.totalRevenue || 0)} revenue</span></p>}
    {error && <div className={`admin-dashboard-error admin-reservations-error ${!result ? 'is-fatal' : ''}`} role="alert"><span>{error}</span><button type="button" disabled={loading} onClick={reload}>Retry</button></div>}

    {loading && !result ? <ReservationSkeleton /> : !result && error ? null : items.length === 0
      ? <EmptyState title="No reservations found" description={searchParam || status || roomId || from || to ? 'Try changing your search or filters.' : 'New stays will appear here when a monster reserves a crypt.'} />
      : <div className={`admin-reservations-results ${loading ? 'is-loading' : ''}`}>
        <div className="admin-reservations-table-wrap">
          <table className="admin-data-table admin-reservations-table">
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>{items.map((reservation) => <tr key={reservation._id || reservation.id}>
              {columns.map((column) => <td key={column.key} data-label={column.label}>{column.render(reservation)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <Pagination page={result.page || page} totalPages={result.totalPages || 0} onPageChange={(nextPage) => {
          const next = new URLSearchParams(queryString)
          next.set('page', String(nextPage))
          setSearchParams(next)
        }} />
      </div>}

    {selected && <ReservationDrawer reservation={selected} open={drawerOpen} loading={drawerLoading} error={drawerError} onClose={() => setDrawerOpen(false)} />}
    {editReservation && <EditDatesModal reservation={editReservation} onClose={() => setEditReservation(null)} onSaved={savedDates} />}
    {cancelReservation && <CancelReservationModal reservation={cancelReservation} onClose={() => setCancelReservation(null)} onCancelled={cancelledReservation} />}
    {completeReservation && <CompleteReservationModal reservation={completeReservation} onClose={() => setCompleteReservation(null)} onCompleted={completedReservation} />}
    <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
  </section>
}
