import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Ellipsis, Plus, Search, Star, Wrench } from 'lucide-react'
import { adminApi, getAdminErrorMessage } from '../lib/adminApi'
import DropdownMenu from '../../components/DropdownMenu'
import SelectControl from '../../components/SelectControl'
import ConfirmModal from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { getRoomImage } from '../../utils/roomImages'

const PAGE_LIMIT = 20
const TYPES = ['Crypt', 'Den', 'Suite', 'Tower']
const RESERVATION_FILTER = (roomId) => `/admin/reservations?${new URLSearchParams({ roomId, status: 'upcoming', upcoming: 'true' })}`
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })

function RoomSkeleton() {
  return <div className="admin-rooms-skeleton" aria-label="Loading crypts" aria-busy="true">
    <Skeleton rows={8} />
  </div>
}

function MaintenanceModal({ room, busy, onClose, onConfirm }) {
  const [note, setNote] = useState(room.maintenanceNote || '')
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [busy, onClose])
  const upcomingCount = room.upcomingBookingCount || 0

  return <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section className="admin-confirm-modal admin-room-status-modal" role="dialog" aria-modal="true" aria-labelledby="maintenance-title">
      <p className="admin-kicker">Crypt status</p>
      <h2 id="maintenance-title">Set {room.name} to maintenance?</h2>
      <p>Guests will no longer see this crypt in listings or availability. Existing reservations will not be cancelled.</p>
      <div className="admin-maintenance-warning" role="note">
        <Wrench size={17} />
        <span><strong>{upcomingCount} upcoming {upcomingCount === 1 ? 'reservation remains' : 'reservations remain'} booked.</strong> Review those stays before making changes.</span>
      </div>
      {upcomingCount > 0 && <Link className="admin-reservation-filter-link" to={RESERVATION_FILTER(room._id || room.id)} onClick={onClose}>View this crypt’s upcoming reservations</Link>}
      <label className="admin-confirm-input-label">Maintenance note (optional)
        <textarea rows="3" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note for the castle staff" />
      </label>
      <div className="admin-modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="danger" onClick={() => onConfirm(note)} disabled={busy}>{busy ? 'Saving…' : 'Set to maintenance'}</button>
      </div>
    </section>
  </div>
}

function DeleteConflictModal({ conflict, onClose }) {
  return <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="admin-confirm-modal admin-delete-conflict" role="alertdialog" aria-modal="true" aria-labelledby="delete-conflict-title">
      <p className="admin-kicker">Crypt kept safe</p>
      <h2 id="delete-conflict-title">Cannot delete this crypt</h2>
      <p>This crypt has {conflict.count} upcoming reservations. Cancel them first or set it to Maintenance instead.</p>
      <Link className="admin-reservation-filter-link" to={RESERVATION_FILTER(conflict.roomId)} onClick={onClose}>View this crypt’s upcoming reservations</Link>
      <div className="admin-modal-actions"><button type="button" onClick={onClose}>Close</button></div>
    </section>
  </div>
}

function FeaturedMark({ featured }) {
  return <span className={`admin-room-featured ${featured ? 'is-featured' : ''}`} aria-label={featured ? 'Featured' : 'Not featured'} title={featured ? 'Featured' : 'Not featured'}>
    <Star size={16} fill={featured ? 'currentColor' : 'none'} />
  </span>
}

function RoomStatusSwitch({ room, busy, onToggle }) {
  const available = room.status === 'available'
  return <button type="button" role="switch" aria-checked={available} aria-label={`${room.name}: ${available ? 'Available' : 'Maintenance'}. Change status`} className={`admin-room-switch ${available ? 'is-available' : 'is-maintenance'}`} onClick={() => onToggle(room)} disabled={busy}>
    <span className="admin-room-switch-track"><span /></span>
    <StatusBadge status={room.status} />
  </button>
}

function RoomActions({ room, busy, search, onStatus, onDelete }) {
  return <DropdownMenu
    label={`Actions for ${room.name}`}
    minWidth={155}
    menuClassName="admin-room-actions-popover"
    trigger={<button type="button" className="admin-room-actions-trigger" aria-label={`Actions for ${room.name}`} disabled={busy}><Ellipsis size={19} /></button>}
  >
      <Link role="menuitem" to={`/admin/rooms/${room._id || room.id}/edit${search}`} aria-disabled={busy} onClick={(event) => busy && event.preventDefault()}>Edit</Link>
      <button type="button" role="menuitem" disabled={busy} onClick={() => onStatus(room, room.status === 'available' ? 'maintenance' : 'available')}>
        Set to {room.status === 'available' ? 'Maintenance' : 'Available'}
      </button>
      <button type="button" role="menuitem" className="danger" disabled={busy} onClick={() => onDelete(room)}>Delete</button>
  </DropdownMenu>
}

function RoomThumbnail({ room }) {
  const image = getRoomImage(room)
  return image
    ? <img className="admin-room-thumbnail" src={image} alt="" loading="lazy" />
    : <span className="admin-room-thumbnail admin-room-thumbnail-fallback" aria-hidden="true">☾</span>
}

export default function AdminRoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryString = searchParams.toString()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const searchParam = searchParams.get('search') || ''
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''
  const sort = searchParams.get('sort') || 'name'
  const [searchInput, setSearchInput] = useState(searchParam)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyRoomId, setBusyRoomId] = useState('')
  const [maintenanceRoom, setMaintenanceRoom] = useState(null)
  const [deleteRoom, setDeleteRoom] = useState(null)
  const [deleteConflict, setDeleteConflict] = useState(null)
  const [toast, setToast] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => setSearchInput(searchParam), [searchParam])

  useEffect(() => {
    if (!location.state?.roomToast) return
    setToast({ type: 'success', message: location.state.roomToast })
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location, navigate])

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
  }, [searchInput, searchParam, queryString, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    async function loadRooms() {
      setLoading(true)
      setError('')
      const params = new URLSearchParams(queryString)
      params.set('page', String(page))
      params.set('limit', String(PAGE_LIMIT))
      try {
        const { data } = await adminApi.get(`/rooms?${params.toString()}`, { signal: controller.signal })
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
        if (requestError.code === 'ERR_CANCELED') return
        setError(getAdminErrorMessage(requestError, 'Could not load the crypts.'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    loadRooms()
    return () => controller.abort()
  }, [queryString, page, refreshKey, setSearchParams])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const rooms = result?.items || []
  const updateFilters = useCallback((updates, resetPage = true) => {
    const next = new URLSearchParams(queryString)
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }, [queryString, setSearchParams])

  const reload = useCallback(() => setRefreshKey((key) => key + 1), [])

  async function changeStatus(room, nextStatus, maintenanceNote) {
    const id = room._id || room.id
    setBusyRoomId(id)
    try {
      const { data } = await adminApi.patch(`/rooms/${id}/status`, { status: nextStatus, maintenanceNote })
      setToast({
        type: 'success',
        message: nextStatus === 'maintenance'
          ? `“${room.name}” is in maintenance. ${data.futureUpcomingReservationsAffected || 0} upcoming reservations remain booked.`
          : `“${room.name}” is available again.`,
      })
      setMaintenanceRoom(null)
      reload()
    } catch (requestError) {
      setToast({ type: 'error', message: getAdminErrorMessage(requestError, 'Could not update the crypt status.') })
    } finally {
      setBusyRoomId('')
    }
  }

  function requestStatusChange(room) {
    if (room.status === 'available') setMaintenanceRoom(room)
    else changeStatus(room, 'available')
  }

  async function confirmDelete() {
    if (!deleteRoom) return
    const room = deleteRoom
    const id = room._id || room.id
    setBusyRoomId(id)
    try {
      await adminApi.delete(`/rooms/${id}`)
      setDeleteRoom(null)
      setToast({ type: 'success', message: `“${room.name}” was deleted.` })
      reload()
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setDeleteRoom(null)
        setDeleteConflict({ roomId: id, count: requestError.response.data?.count ?? room.upcomingBookingCount ?? 0 })
      } else {
        setToast({ type: 'error', message: getAdminErrorMessage(requestError, 'Could not delete this crypt.') })
      }
    } finally {
      setBusyRoomId('')
    }
  }

  const columns = useMemo(() => [
    { key: 'crypt', label: 'Crypt', render: (room) => <span className="admin-room-identity"><RoomThumbnail room={room} /><strong>{room.name}</strong></span> },
    { key: 'type', label: 'Type', render: (room) => room.type || '—' },
    { key: 'pricePerNight', label: 'Price / night', render: (room) => money.format(Number(room.pricePerNight) || 0) },
    { key: 'capacity', label: 'Capacity', render: (room) => `${room.capacity || 0} ${room.capacity === 1 ? 'monster' : 'monsters'}` },
    { key: 'status', label: 'Status', render: (room) => <RoomStatusSwitch room={room} busy={Boolean(busyRoomId)} onToggle={requestStatusChange} /> },
    { key: 'featured', label: 'Featured', render: (room) => <FeaturedMark featured={room.featured} /> },
    { key: 'bookingCount', label: 'Bookings', render: (room) => <span className="admin-room-booking-count">{room.bookingCount || 0}<small>{room.upcomingBookingCount || 0} upcoming</small></span> },
    { key: 'actions', label: 'Actions', render: (room) => <RoomActions room={room} busy={Boolean(busyRoomId)} search={location.search} onStatus={requestStatusChange} onDelete={setDeleteRoom} /> },
  ], [busyRoomId, location.search])

  return <section className="admin-page admin-rooms-page">
    <div className="admin-rooms-heading">
      <div>
        <p className="admin-kicker">Moonstoria Administration</p>
        <h1>Crypts</h1>
        <p className="admin-page-subtitle">Search and manage every crypt in the castle.</p>
      </div>
      <Link className="admin-rooms-add-button" to={`/admin/rooms/new${location.search}`}><Plus size={16} /> Add crypt</Link>
    </div>

    <div className="admin-rooms-toolbar">
      <label className="admin-rooms-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search crypts</span>
        <input type="search" value={searchInput} placeholder="Search crypts…" onChange={(event) => setSearchInput(event.target.value)} />
      </label>
      <label className="admin-rooms-filter"><span>Type</span><SelectControl value={type} onChange={(event) => updateFilters({ type: event.target.value })}>
        <option value="">All types</option>{TYPES.map((roomType) => <option key={roomType} value={roomType}>{roomType}</option>)}
      </SelectControl></label>
      <label className="admin-rooms-filter"><span>Status</span><SelectControl value={status} onChange={(event) => updateFilters({ status: event.target.value })}>
        <option value="">All statuses</option><option value="available">Available</option><option value="maintenance">Maintenance</option>
      </SelectControl></label>
      <label className="admin-rooms-filter admin-rooms-sort"><span><ArrowDownUp size={12} /> Sort</span><SelectControl value={sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
        <option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="price">Price low–high</option><option value="-price">Price high–low</option><option value="rating">Top rated</option><option value="status">Status</option>
      </SelectControl></label>
    </div>

    {error && <div className={`admin-dashboard-error admin-rooms-error ${!result ? 'is-fatal' : ''}`} role="alert"><span>{error}</span><button type="button" disabled={loading} onClick={reload}>Retry</button></div>}
    {loading && !result ? <RoomSkeleton /> : !result && error ? null : rooms.length === 0
      ? <EmptyState title="No crypts found" description={searchParam || type || status ? 'Try changing your search or filters.' : 'Add the first crypt to begin managing the castle.'}>
        <Link className="admin-rooms-add-button" to={`/admin/rooms/new${location.search}`}><Plus size={16} /> Add crypt</Link>
      </EmptyState>
      : <div className={`admin-rooms-results ${loading ? 'is-loading' : ''}`}>
        <div className="admin-rooms-table-wrap">
          <table className="admin-data-table admin-rooms-table">
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>{rooms.map((room) => <tr key={room._id || room.id}>
              {columns.map((column) => <td key={column.key} data-label={column.label}>{column.render(room)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <Pagination page={result?.page || page} totalPages={result?.totalPages || 0} onPageChange={(nextPage) => updateFilters({ page: String(nextPage) }, false)} />
        {result && <p className="admin-rooms-total">{result.total} {result.total === 1 ? 'crypt' : 'crypts'} · Page {result.page} of {result.totalPages || 1}</p>}
      </div>}

    {maintenanceRoom && <MaintenanceModal room={maintenanceRoom} busy={busyRoomId === (maintenanceRoom._id || maintenanceRoom.id)} onClose={() => setMaintenanceRoom(null)} onConfirm={(note) => changeStatus(maintenanceRoom, 'maintenance', note)} />}
    {deleteRoom && <ConfirmModal open title="Delete crypt?" description={`This will permanently delete “${deleteRoom.name}”. This action cannot be undone.`} confirmLabel={busyRoomId === (deleteRoom._id || deleteRoom.id) ? 'Deleting…' : 'Delete crypt'} requiredText={deleteRoom.name} busy={busyRoomId === (deleteRoom._id || deleteRoom.id)} onConfirm={confirmDelete} onClose={() => !busyRoomId && setDeleteRoom(null)} />}
    {deleteConflict && <DeleteConflictModal conflict={deleteConflict} onClose={() => setDeleteConflict(null)} />}
    <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
  </section>
}
