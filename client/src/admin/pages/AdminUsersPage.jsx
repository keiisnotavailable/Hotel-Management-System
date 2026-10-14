import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ellipsis, Search, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { adminApi, getAdminErrorMessage } from '../lib/adminApi'
import { getUploadedAssetUrl } from '../../lib/api'
import ConfirmModal from '../components/ConfirmModal'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import Skeleton from '../components/Skeleton'
import Toast from '../components/Toast'

const PAGE_LIMIT = 20
const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

function initials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?'
}

function UserAvatar({ name, image, large = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [image])
  const photoUrl = getUploadedAssetUrl(image)
  return <span className={`admin-user-avatar ${large ? 'admin-user-avatar-large' : ''}`}>
    {photoUrl && !imageFailed
      ? <img src={photoUrl} alt="" onError={() => setImageFailed(true)} />
      : initials(name)}
  </span>
}

function UserRoleBadge({ role }) {
  return <span className={`admin-user-role-badge ${role === 'admin' ? 'is-admin' : ''}`}>{role || 'guest'}</span>
}

function UserStatusBadge({ isActive }) {
  const status = isActive ? 'Active' : 'Blocked'
  return <span className={`admin-status-badge admin-status-${isActive ? 'active' : 'blocked'}`}>{status}</span>
}

function UserActions({ user, busy, self, adminCount, activeAdminCount, onAction }) {
  const isAdmin = user.role === 'admin'
  const demoteReason = self ? 'You cannot change your own role.' : isAdmin && adminCount <= 1 ? 'The last admin cannot be demoted.' : ''
  const blockReason = self ? 'You cannot block your own account.' : isAdmin && user.isActive && activeAdminCount <= 1 ? 'The last active admin cannot be blocked.' : ''
  const deleteReason = self ? 'You cannot delete your own account.' : isAdmin && adminCount <= 1 ? 'The last admin cannot be deleted.' : ''

  function run(event, action) {
    const menu = event.currentTarget.closest('details')
    if (menu) menu.open = false
    onAction(action, user)
  }

  return <details className="admin-user-actions-menu">
    <summary aria-label={`Actions for ${user.name}`} aria-disabled={busy}><Ellipsis size={19} /></summary>
    <div className="admin-user-actions-popover">
      <button type="button" disabled={busy} onClick={(event) => run(event, 'view')}>View</button>
      <button type="button" disabled={busy} onClick={(event) => run(event, 'edit')}>Edit</button>
      <button type="button" disabled={busy || Boolean(demoteReason)} title={demoteReason || ''} onClick={(event) => run(event, 'role')}>
        Make {isAdmin ? 'guest' : 'admin'}
      </button>
      <button type="button" disabled={busy || Boolean(blockReason)} title={blockReason || ''} onClick={(event) => run(event, 'status')}>
        {user.isActive ? 'Block' : 'Unblock'}
      </button>
      <button type="button" className="danger" disabled={busy || Boolean(deleteReason)} title={deleteReason || ''} onClick={(event) => run(event, 'delete')}>Delete</button>
    </div>
  </details>
}

function UserDrawer({ open, user, mode, detail, loading, error, editValues, setEditValues, onClose, onEdit, onSave, saving }) {
  const [reservationPage, setReservationPage] = useState(1)
  const reservationPageSize = 5

  useEffect(() => {
    setReservationPage(1)
  }, [user?._id, user?.id])

  const reservations = detail?.reservations || []
  const reservationTotalPages = Math.ceil(reservations.length / reservationPageSize)
  const visibleReservations = reservations.slice((reservationPage - 1) * reservationPageSize, reservationPage * reservationPageSize)

  return <Drawer open={open} onClose={onClose} label={mode === 'edit' ? 'Edit monster profile' : 'Monster profile'} panelClassName="admin-user-drawer-panel">
    <div className="admin-user-drawer-content">
      <p className="admin-kicker">Monster profile</p>
      <h2>{mode === 'edit' ? 'Edit details' : detail?.user?.name || user?.name || 'Monster'}</h2>
      {loading ? <div className="admin-user-drawer-loading"><Skeleton rows={5} /></div>
        : error ? <div className="admin-dashboard-error" role="alert">{error}</div>
          : detail && <>
            <div className="admin-user-profile-summary">
              <UserAvatar name={detail.user.name} image={detail.user.profileImage} large />
              <div><strong>{detail.user.name}</strong><span>{detail.user.email}</span></div>
              <div className="admin-user-badges"><UserRoleBadge role={detail.user.role} /><UserStatusBadge isActive={detail.user.isActive} /></div>
            </div>
            {mode === 'edit'
              ? <form className="admin-user-edit-form" onSubmit={(event) => { event.preventDefault(); onSave() }}>
                <label>Name<input required maxLength={120} value={editValues.name} onChange={(event) => setEditValues((value) => ({ ...value, name: event.target.value }))} /></label>
                <label>Email<input type="email" required maxLength={254} value={editValues.email} onChange={(event) => setEditValues((value) => ({ ...value, email: event.target.value }))} /></label>
                <label>Phone<input maxLength={40} value={editValues.phone} onChange={(event) => setEditValues((value) => ({ ...value, phone: event.target.value }))} /></label>
                <label>Address<textarea rows="3" maxLength={500} value={editValues.address} onChange={(event) => setEditValues((value) => ({ ...value, address: event.target.value }))} /></label>
                <div className="admin-user-drawer-actions">
                  <button type="button" onClick={() => onEdit('view')} disabled={saving}>Cancel</button>
                  <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </form>
              : <>
                <dl className="admin-user-profile-fields">
                  <div><dt>Phone</dt><dd>{detail.user.phone || '—'}</dd></div>
                  <div><dt>Address</dt><dd>{detail.user.address || '—'}</dd></div>
                  <div><dt>Joined</dt><dd>{formatDate(detail.user.createdAt)}</dd></div>
                  <div><dt>Reservations</dt><dd>{detail.reservations.length}</dd></div>
                </dl>
                <div className="admin-user-history-heading"><h3>Reservation history</h3><span>{reservations.length}</span></div>
                {reservations.length
                  ? <>
                    <div className="admin-user-reservation-list">{visibleReservations.map((reservation) => <article key={reservation._id || reservation.id}>
                    <div><strong>{reservation.room?.name || reservation.roomName || 'Unknown crypt'}</strong><span>{formatDate(reservation.checkIn)} – {formatDate(reservation.checkOut)}</span></div>
                    <div className="admin-user-reservation-meta"><span className={`admin-status-badge admin-status-${reservation.status}`}>{reservation.status}</span><span>{Number(reservation.totalPrice || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })}</span></div>
                    </article>)}</div>
                    <Pagination page={reservationPage} totalPages={reservationTotalPages} onPageChange={setReservationPage} />
                  </>
                  : <p className="admin-user-no-history">No reservations on record.</p>}
                <button type="button" className="admin-user-edit-button" onClick={() => onEdit('edit')}><UserRound size={15} /> Edit profile</button>
              </>}
          </>}
    </div>
  </Drawer>
}

export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser } = useAuth()
  const queryString = searchParams.toString()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const searchParam = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const status = searchParams.get('status') || ''
  const [searchInput, setSearchInput] = useState(searchParam)
  const [result, setResult] = useState(null)
  const [adminCount, setAdminCount] = useState(0)
  const [activeAdminCount, setActiveAdminCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [deleteConflict, setDeleteConflict] = useState(null)
  const [drawer, setDrawer] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [editValues, setEditValues] = useState({ name: '', email: '', phone: '', address: '' })

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
  }, [searchInput, searchParam, queryString, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    async function loadUsers() {
      setLoading(true)
      setError('')
      const params = new URLSearchParams(queryString)
      params.set('page', String(page))
      params.set('limit', String(PAGE_LIMIT))
      try {
        const [usersResponse, adminsResponse, activeAdminsResponse] = await Promise.all([
          adminApi.get(`/users?${params.toString()}`, { signal: controller.signal }),
          adminApi.get('/users?role=admin&page=1&limit=1', { signal: controller.signal }),
          adminApi.get('/users?role=admin&status=active&page=1&limit=1', { signal: controller.signal }),
        ])
        if (controller.signal.aborted) return
        setResult(usersResponse.data)
        setAdminCount(adminsResponse.data.total)
        setActiveAdminCount(activeAdminsResponse.data.total)
        if (usersResponse.data.totalPages > 0 && page > usersResponse.data.totalPages) {
          const next = new URLSearchParams(queryString)
          next.set('page', String(usersResponse.data.totalPages))
          setSearchParams(next, { replace: true })
        } else if (usersResponse.data.totalPages === 0 && page !== 1) {
          const next = new URLSearchParams(queryString)
          next.delete('page')
          setSearchParams(next, { replace: true })
        }
      } catch (requestError) {
        if (requestError.code === 'ERR_CANCELED') return
        setError(getAdminErrorMessage(requestError, 'Could not load the monsters.'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    loadUsers()
    return () => controller.abort()
  }, [page, queryString, refreshKey, setSearchParams])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!drawer?.user) return undefined
    const controller = new AbortController()
    async function loadDetail() {
      setDetail(null)
      setDetailError('')
      setDetailLoading(true)
      try {
        const { data } = await adminApi.get(`/users/${drawer.user._id || drawer.user.id}`, { signal: controller.signal })
        if (controller.signal.aborted) return
        setDetail(data)
        setEditValues({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
        })
      } catch (requestError) {
        if (requestError.code === 'ERR_CANCELED') return
        setDetailError(getAdminErrorMessage(requestError, 'Could not load this profile.'))
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false)
      }
    }
    loadDetail()
    return () => controller.abort()
  }, [drawer?.user?._id, drawer?.user?.id])

  const users = result?.items || []
  const updateFilters = useCallback((updates) => {
    const next = new URLSearchParams(queryString)
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    next.delete('page')
    setSearchParams(next)
  }, [queryString, setSearchParams])

  const reload = useCallback(() => setRefreshKey((key) => key + 1), [])

  function requestAction(action, target) {
    if (action === 'view' || action === 'edit') {
      setDrawer({ user: target, mode: action })
      return
    }
    setPendingAction({ type: action, user: target })
  }

  async function executeAction(action, cancelReservations = false) {
    const target = action.user
    const id = target._id || target.id
    setBusyId(id)
    try {
      if (action.type === 'role') {
        const roleValue = target.role === 'admin' ? 'guest' : 'admin'
        await adminApi.patch(`/users/${id}/role`, { role: roleValue })
        setToast({ type: 'success', message: `${target.name} is now a ${roleValue}.` })
      } else if (action.type === 'status') {
        const nextActive = !target.isActive
        await adminApi.patch(`/users/${id}/status`, { isActive: nextActive })
        setToast({ type: 'success', message: `${target.name} is ${nextActive ? 'active' : 'blocked'}.` })
      } else if (action.type === 'delete') {
        await adminApi.delete(`/users/${id}${cancelReservations ? '?cancelReservations=true' : ''}`)
        setDeleteConflict(null)
        setToast({ type: 'success', message: `${target.name} was deleted${cancelReservations ? ' and their future reservations were cancelled' : ''}.` })
      } else if (action.type === 'edit') {
        await adminApi.put(`/users/${id}`, editValues)
        setToast({ type: 'success', message: `${target.name}’s profile was updated.` })
        setDetail((current) => current ? { ...current, user: { ...current.user, ...editValues } } : current)
        setDrawer({ user: { ...target, ...editValues }, mode: 'view' })
      }
      setPendingAction(null)
      reload()
    } catch (requestError) {
      if (action.type === 'delete' && requestError.response?.status === 409 && !cancelReservations) {
        setDeleteConflict({ action, count: requestError.response.data?.count ?? 0 })
        setPendingAction(null)
      } else {
        setToast({ type: 'error', message: getAdminErrorMessage(requestError, `Could not ${action.type} this monster.`) })
      }
    } finally {
      setBusyId('')
    }
  }

  const columns = useMemo(() => [
    { key: 'monster', label: 'Monster', render: (item) => <span className="admin-user-identity"><UserAvatar name={item.name} image={item.profileImage} /><strong>{item.name}</strong></span> },
    { key: 'email', label: 'Email', render: (item) => <span className="admin-user-email">{item.email}</span> },
    { key: 'role', label: 'Role', render: (item) => <UserRoleBadge role={item.role} /> },
    { key: 'status', label: 'Status', render: (item) => <UserStatusBadge isActive={item.isActive} /> },
    { key: 'reservationCount', label: 'Reservations', render: (item) => item.reservationCount ?? 0 },
    { key: 'createdAt', label: 'Joined', render: (item) => formatDate(item.createdAt) },
    { key: 'actions', label: 'Actions', render: (item) => <UserActions user={item} busy={busyId === (item._id || item.id)} self={String(item._id || item.id) === String(currentUser?._id || currentUser?.id)} adminCount={adminCount} activeAdminCount={activeAdminCount} onAction={requestAction} /> },
  ], [activeAdminCount, adminCount, busyId, currentUser])

  const currentAction = pendingAction
  const isBusy = Boolean(busyId)
  const isEditDrawer = drawer?.mode === 'edit'

  return <section className="admin-page admin-users-page">
    <div className="admin-users-heading">
      <div><p className="admin-kicker">Moonstoria Administration</p><h1>Monsters</h1><p className="admin-page-subtitle">Search and manage guest and administrator accounts.</p></div>
    </div>
    <div className="admin-users-toolbar">
      <label className="admin-rooms-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search monsters</span><input type="search" value={searchInput} placeholder="Search name or email…" onChange={(event) => setSearchInput(event.target.value)} /></label>
      <label className="admin-rooms-filter"><span>Role</span><select value={role} onChange={(event) => updateFilters({ role: event.target.value })}><option value="">All roles</option><option value="guest">Guest</option><option value="admin">Admin</option></select></label>
      <label className="admin-rooms-filter"><span>Status</span><select value={status} onChange={(event) => updateFilters({ status: event.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="blocked">Blocked</option></select></label>
    </div>

    {error && <div className={`admin-dashboard-error admin-users-error ${!result ? 'is-fatal' : ''}`} role="alert"><span>{error}</span><button type="button" disabled={loading} onClick={reload}>Retry</button></div>}
    {loading && !result
      ? <div className="admin-users-skeleton" aria-busy="true"><Skeleton rows={7} /></div>
      : !result && error ? null
        : users.length === 0
          ? <EmptyState title="No monsters found" description={searchParam || role || status ? 'Try changing the search or filters.' : 'There are no accounts to display yet.'} />
          : <div className={`admin-users-results ${loading ? 'is-loading' : ''}`}>
            <div className="admin-users-table-wrap"><table className="admin-data-table admin-users-table">
              <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
              <tbody>{users.map((item) => <tr key={item._id || item.id}>{columns.map((column) => <td key={column.key} data-label={column.label}>{column.render(item)}</td>)}</tr>)}</tbody>
            </table></div>
            <p className="admin-users-total">{result.total} {result.total === 1 ? 'account' : 'accounts'}</p>
            <Pagination page={result.page || page} totalPages={result.totalPages || 0} onPageChange={(nextPage) => {
              const next = new URLSearchParams(queryString)
              next.set('page', String(nextPage))
              setSearchParams(next)
            }} />
          </div>}

    {currentAction && <ConfirmModal
      open
      busy={isBusy}
      onClose={() => !isBusy && setPendingAction(null)}
      onConfirm={() => executeAction(currentAction)}
      title={currentAction.type === 'role' ? `Change ${currentAction.user.name}’s role?` : currentAction.type === 'status' ? `${currentAction.user.isActive ? 'Block' : 'Unblock'} ${currentAction.user.name}?` : currentAction.type === 'delete' ? `Delete ${currentAction.user.name}?` : 'Save profile changes?'}
      description={currentAction.type === 'role'
        ? `This account will become ${currentAction.user.role === 'admin' ? 'a guest' : 'an administrator'}.`
        : currentAction.type === 'status'
          ? currentAction.user.isActive ? 'They will be signed out and cannot sign in until unblocked.' : 'They will be able to sign in and use their account again.'
          : currentAction.type === 'delete'
            ? 'This permanently deletes the account. Past reservation records remain with their saved guest details.'
            : 'Save the updated name, email, phone, and address for this account.'}
      confirmLabel={isBusy ? 'Working…' : currentAction.type === 'role' ? 'Confirm role change' : currentAction.type === 'status' ? currentAction.user.isActive ? 'Block account' : 'Unblock account' : currentAction.type === 'delete' ? 'Delete account' : 'Save changes'}
    />}

    {deleteConflict && <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isBusy && setDeleteConflict(null)}>
      <section className="admin-confirm-modal admin-user-delete-conflict" role="alertdialog" aria-modal="true" aria-labelledby="user-delete-conflict-title">
        <p className="admin-kicker">Upcoming stays</p>
        <h2 id="user-delete-conflict-title">This monster has future reservations</h2>
        <p>{deleteConflict.count} future confirmed {deleteConflict.count === 1 ? 'reservation is' : 'reservations are'} booked under {deleteConflict.action.user.name}.</p>
        <p>You can cancel those reservations and delete the account. Past reservations will remain in the records.</p>
        <div className="admin-modal-actions">
          <button type="button" disabled={isBusy} onClick={() => setDeleteConflict(null)}>Keep account</button>
          <button type="button" className="danger" disabled={isBusy} onClick={() => executeAction(deleteConflict.action, true)}>{isBusy ? 'Deleting…' : 'Cancel reservations and delete'}</button>
        </div>
      </section>
    </div>}

    <UserDrawer open={Boolean(drawer)} user={drawer?.user} mode={drawer?.mode} detail={detail} loading={detailLoading} error={detailError} editValues={editValues} setEditValues={setEditValues} onClose={() => setDrawer(null)} onEdit={(mode) => setDrawer((current) => ({ ...current, mode }))} onSave={() => setPendingAction({ type: 'edit', user: drawer.user })} saving={busyId === (drawer?.user?._id || drawer?.user?.id)} />
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </section>
}
