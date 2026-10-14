import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Eye, EyeOff, Heart, LogOut, Settings, Shield, UserCircle } from 'lucide-react'
import { API_BASE, authConfig, getErrorMessage, getUploadedAssetUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getRoomImage } from '../utils/roomImages'
import { formatPHP } from '../lib/currency'
import { formatDateTime } from '../lib/date'
import SelectControl from '../components/SelectControl'

const defaultPreferences = {
  bedType: 'any',
  roomType: 'any',
  smokingPreference: 'non-smoking',
  floorPreference: 'any',
  emailNotifications: { bookingConfirmations: true, promotions: false },
}

function EmptyPanel({ title, text, actionLabel = 'Browse Rooms' }) {
  return <section className="profile-empty-panel"><h2>{title}</h2><p>{text}</p><Link to="/crypts" className="profile-primary-button">{actionLabel}</Link></section>
}

function LoadError({ title, message, onRetry }) {
  return <section className="profile-panel"><h2>{title}</h2><p className="profile-status profile-error" role="alert">{message}</p><button type="button" className="profile-secondary-button" onClick={onRetry}>Retry</button></section>
}

function BookingPanel({ bookings, loading, error, onRetry }) {
  if (loading) return <section className="profile-panel" aria-live="polite"><h2>My bookings</h2><p className="profile-panel-description">Gathering your reservations...</p></section>
  if (error) return <LoadError title="My bookings" message={error} onRetry={onRetry} />
  if (!bookings.length) return <EmptyPanel title="My bookings" text="No bookings yet. Your next moonlit stay is waiting." />

  const now = Date.now()
  return <section className="profile-panel">
    <div className="profile-panel-heading"><div><h2>My bookings</h2><p className="profile-panel-description">Your stays at Moonstoria, gathered in one place.</p></div><span className="profile-count">{bookings.length} booking{bookings.length === 1 ? '' : 's'}</span></div>
    <div className="profile-bookings-list">
      {bookings.map((booking) => {
        const status = booking.status === 'cancelled'
          ? 'cancelled'
          : new Date(booking.checkOut).getTime() <= now ? 'completed' : 'upcoming'
        const roomName = booking.room?.name || booking.roomName || 'Moonstoria crypt'
        return <article className="profile-booking-card" key={booking._id || booking.id}>
          <div className="profile-booking-heading"><h3>{roomName}</h3><span className={`profile-booking-status ${status}`}>{status}</span></div>
          <dl className="profile-booking-details">
            <div><dt>Dusk</dt><dd>{formatDateTime(booking.checkIn)}</dd></div>
            <div><dt>Dawn</dt><dd>{formatDateTime(booking.checkOut)}</dd></div>
            <div><dt>Guests</dt><dd>{booking.guests}</dd></div>
            <div><dt>Total</dt><dd>{formatPHP(booking.totalPrice)}</dd></div>
          </dl>
        </article>
      })}
    </div>
  </section>
}

function FavoritesPanel({ rooms, loading, error, onRetry, onRemove, busyRoomId }) {
  if (loading) return <section className="profile-panel" aria-live="polite"><h2>Favorites</h2><p className="profile-panel-description">Gathering your saved crypts...</p></section>
  if (error && !rooms.length) return <LoadError title="Favorites" message={error} onRetry={onRetry} />
  if (!rooms.length) return <EmptyPanel title="Favorites" text="No saved rooms yet. Keep your favorite crypts close." />

  return <section className="profile-panel">
    <div className="profile-panel-heading"><div><h2>Favorites</h2><p className="profile-panel-description">Your saved crypts, gathered in one place.</p></div><span className="profile-count">{rooms.length} saved crypt{rooms.length === 1 ? '' : 's'}</span></div>
    {error && <p className="profile-status profile-error" role="alert">{error} <button type="button" className="profile-inline-retry" onClick={onRetry}>Retry</button></p>}
    <div className="profile-favorites-grid">
      {rooms.map((room) => <article className="profile-favorite-card" key={room._id || room.id}>
        <div className="profile-favorite-image">{getRoomImage(room) ? <img src={getRoomImage(room)} alt={`${room.name} interior`} /> : <span aria-hidden="true">☾</span>}
          <button type="button" className="profile-favorite-remove" aria-label={`Remove ${room.name} from favorites`} disabled={busyRoomId === (room._id || room.id)} onClick={() => onRemove(room)}><Heart size={16} fill="currentColor" /></button>
        </div>
        <div className="profile-favorite-body"><h3>{room.name}</h3><div className="profile-favorite-meta"><strong>{formatPHP(room.pricePerNight)} <small>/ night</small></strong></div><Link to={`/crypts/${room.slug || room._id}`} className="profile-favorite-link">View Room</Link></div>
      </article>)}
    </div>
  </section>
}

function PreferencesPanel() {
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')

  const loadPreferences = useCallback(async () => {
    setLoading(true)
    setError('')
    setLoadError('')
    try {
      const { data } = await axios.get(`${API_BASE}/users/preferences`, authConfig())
      setPreferences({
        ...defaultPreferences,
        ...data.preferences,
        emailNotifications: { ...defaultPreferences.emailNotifications, ...data.preferences?.emailNotifications },
      })
    } catch (requestError) {
      setLoadError(getErrorMessage(requestError, 'Preferences could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPreferences() }, [loadPreferences])

  function updatePreference(field, value) {
    setPreferences((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  function updateNotification(field, value) {
    setPreferences((current) => ({ ...current, emailNotifications: { ...current.emailNotifications, [field]: value } }))
    setMessage('')
  }

  async function savePreferences(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data } = await axios.put(`${API_BASE}/users/preferences`, preferences, authConfig())
      setPreferences({ ...defaultPreferences, ...data.preferences, emailNotifications: { ...defaultPreferences.emailNotifications, ...data.preferences?.emailNotifications } })
      setMessage('Preferences saved.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Preferences could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return <section className="profile-panel">
    <h2>Preferences</h2>
    <p className="profile-panel-description">Set the details and updates you prefer for future stays.</p>
    {loading ? <p className="profile-help" aria-live="polite">Loading your preferences...</p> : loadError ? <><p className="profile-status profile-error" role="alert">{loadError}</p><button type="button" className="profile-secondary-button" onClick={loadPreferences}>Retry</button></> :
      <form onSubmit={savePreferences}>
        <div className="preferences-grid">
          <div className="profile-field"><label htmlFor="preferred-bed-type">Preferred bed type</label><SelectControl id="preferred-bed-type" className="profile-input" value={preferences.bedType} onChange={(event) => updatePreference('bedType', event.target.value)}><option value="any">No preference</option><option value="single">Single</option><option value="double">Double</option><option value="queen">Queen</option><option value="king">King</option></SelectControl></div>
          <div className="profile-field"><label htmlFor="preferred-room-type">Preferred room type</label><SelectControl id="preferred-room-type" className="profile-input" value={preferences.roomType} onChange={(event) => updatePreference('roomType', event.target.value)}><option value="any">Any room</option><option value="Crypt">Crypt</option><option value="Den">Den</option><option value="Suite">Suite</option><option value="Tower">Tower</option></SelectControl></div>
          <div className="profile-field"><label htmlFor="smoking-preference">Smoking preference</label><SelectControl id="smoking-preference" className="profile-input" value={preferences.smokingPreference} onChange={(event) => updatePreference('smokingPreference', event.target.value)}><option value="non-smoking">Non-smoking</option><option value="smoking">Smoking</option></SelectControl></div>
          <div className="profile-field"><label htmlFor="floor-preference">Floor preference</label><SelectControl id="floor-preference" className="profile-input" value={preferences.floorPreference} onChange={(event) => updatePreference('floorPreference', event.target.value)}><option value="any">No preference</option><option value="low">Low floor</option><option value="high">High floor</option></SelectControl></div>
        </div>
        <div className="preference-switches">
          <label><span><strong>Booking confirmations</strong><small>Receive reservation and arrival notices.</small></span><input type="checkbox" checked={preferences.emailNotifications.bookingConfirmations} onChange={(event) => updateNotification('bookingConfirmations', event.target.checked)} /></label>
          <label><span><strong>Promotions</strong><small>Receive special offers and letters from the keep.</small></span><input type="checkbox" checked={preferences.emailNotifications.promotions} onChange={(event) => updateNotification('promotions', event.target.checked)} /></label>
        </div>
        {error && <p className="profile-status profile-error" role="alert">{error}</p>}
        {message && <p className="profile-status profile-success" role="status">{message}</p>}
        <button className="profile-primary-button profile-preferences-save" disabled={saving}>{saving ? 'Saving...' : 'Save preferences'}</button>
      </form>}
  </section>
}

function PasswordField({ id, label, value, field, visible, onChange, onToggle }) {
  return <div className="profile-field"><label htmlFor={id}>{label}</label><div className="profile-password-input"><input id={id} className="profile-input" type={visible ? 'text' : 'password'} placeholder={`Enter your ${label.toLowerCase()}`} value={value} onChange={(event) => onChange(field, event.target.value)} required /><button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => onToggle(field)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
}

export default function ProfilePage() {
  const { user, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const photoInputRef = useRef(null)
  const [activeSection, setActiveSection] = useState('profile')
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '', address: user.address || '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordVisibility, setPasswordVisibility] = useState({ currentPassword: false, newPassword: false, confirmPassword: false })
  const [passwordError, setPasswordError] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(() => getUploadedAssetUrl(user.profileImage || ''))
  const [photoError, setPhotoError] = useState('')
  const [photoMessage, setPhotoMessage] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
  const [favorites, setFavorites] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(true)
  const [favoritesError, setFavoritesError] = useState('')
  const [busyRoomId, setBusyRoomId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const initialForm = { name: user.name || '', email: user.email || '', phone: user.phone || '', address: user.address || '' }
  const profileDirty = ['name', 'phone', 'address'].some((field) => form[field] !== initialForm[field])

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true)
    setBookingsError('')
    try {
      const { data } = await axios.get(`${API_BASE}/reservations/my`, authConfig())
      setBookings(data.reservations || [])
    } catch (requestError) {
      setBookingsError(getErrorMessage(requestError, 'Your bookings could not be loaded.'))
    } finally {
      setBookingsLoading(false)
    }
  }, [])

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true)
    setFavoritesError('')
    try {
      const { data } = await axios.get(`${API_BASE}/users/saved`, authConfig())
      setFavorites((data.rooms || data.savedRooms || []).filter(Boolean))
    } catch (requestError) {
      setFavoritesError(getErrorMessage(requestError, 'Saved rooms could not be loaded.'))
    } finally {
      setFavoritesLoading(false)
    }
  }, [])

  useEffect(() => { loadBookings(); loadFavorites() }, [loadBookings, loadFavorites])

  useEffect(() => {
    function warnBeforeUnload(event) {
      if (!profileDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [profileDirty])

  function updateProfileField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setProfileErrors((current) => ({ ...current, [field]: '' }))
  }

  function validateProfile() {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Please enter your full name.'
    if (form.phone && !/^\+?[0-9\s()-]{7,20}$/.test(form.phone.trim())) nextErrors.phone = 'Enter a valid phone number.'
    if (form.address.length > 200) nextErrors.address = 'Address must be 200 characters or fewer.'
    return nextErrors
  }

  async function saveProfile(event) {
    event.preventDefault()
    const nextErrors = validateProfile()
    if (Object.keys(nextErrors).length) {
      setProfileErrors(nextErrors)
      return
    }
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { data } = await axios.put(`${API_BASE}/users/profile`, form, authConfig())
      signIn(data.user, localStorage.getItem('hotelTransylvaniaToken'))
      setMessage('Profile updated.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Profile could not be updated.'))
    } finally {
      setSaving(false)
    }
  }

  const passwordRules = [
    { label: '8+ characters', valid: passwords.newPassword.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(passwords.newPassword) },
    { label: 'One number', valid: /\d/.test(passwords.newPassword) },
    { label: 'One symbol', valid: /[^A-Za-z0-9]/.test(passwords.newPassword) },
  ]
  const passwordScore = passwordRules.filter((rule) => rule.valid).length

  async function changePassword(event) {
    event.preventDefault()
    if (passwords.newPassword === passwords.currentPassword) { setPasswordError('Your new password must be different from your current password.'); return }
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordError('Your new passwords do not match.'); return }
    if (!passwordRules.every((rule) => rule.valid)) { setPasswordError('Please meet all password requirements.'); return }
    setSaving(true)
    setMessage('')
    setError('')
    setPasswordError('')
    try {
      await axios.put(`${API_BASE}/users/change-password`, { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }, authConfig())
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage('Password changed.')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Password could not be changed.'))
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    setPhotoError('')
    setPhotoMessage('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setPhotoError('Choose a JPG, PNG, or WebP image no larger than 2 MB.')
      return
    }

    const previousPhoto = getUploadedAssetUrl(user.profileImage || '')
    const previewUrl = URL.createObjectURL(file)
    setProfilePhoto(previewUrl)
    setUploadingPhoto(true)
    const body = new FormData()
    body.append('image', file)
    try {
      const { data } = await axios.post(`${API_BASE}/users/profile/photo`, body, authConfig())
      const profileImage = data.user?.profileImage
      if (!profileImage) throw new Error('The server did not return the uploaded profile photo.')
      setProfilePhoto(getUploadedAssetUrl(profileImage))
      signIn({ ...user, profileImage }, localStorage.getItem('hotelTransylvaniaToken'))
      setPhotoMessage('Profile photo updated.')
    } catch (requestError) {
      setProfilePhoto(previousPhoto)
      setPhotoError(getErrorMessage(requestError, 'Profile photo could not be updated.'))
    } finally {
      URL.revokeObjectURL(previewUrl)
      setUploadingPhoto(false)
    }
  }

  async function removeFavorite(room) {
    const roomId = room._id || room.id
    const previousIndex = favorites.findIndex((item) => (item._id || item.id) === roomId)
    setFavorites((current) => current.filter((item) => (item._id || item.id) !== roomId))
    setBusyRoomId(roomId)
    setFavoritesError('')
    try {
      const { data } = await axios.post(`${API_BASE}/users/saved/${roomId}`, {}, authConfig())
      if (data.saved) setFavorites((current) => current.some((item) => (item._id || item.id) === roomId) ? current : [...current, room])
    } catch (requestError) {
      setFavorites((current) => current.some((item) => (item._id || item.id) === roomId) ? current : [...current.slice(0, previousIndex), room, ...current.slice(previousIndex)])
      setFavoritesError(getErrorMessage(requestError, 'This room could not be removed from favorites.'))
    } finally {
      setBusyRoomId('')
    }
  }

  const initials = (user.name || user.email || 'M').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = user.createdAt && !Number.isNaN(new Date(user.createdAt).getTime()) ? new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : ''
  const sections = [
    ['profile', 'Profile', UserCircle],
    ['security', 'Security', Shield],
    ['bookings', 'My Bookings', CalendarDays],
    ['favorites', 'Favorites', Heart],
    ['preferences', 'Preferences', Settings],
  ]

  function logout() {
    signOut()
    navigate('/')
  }

  return <main className="paper-texture profile-page"><div className="profile-container">
    <header className="profile-header-card">
      <div className="profile-avatar" aria-hidden="true">{profilePhoto ? <img src={profilePhoto} alt="" onError={() => setProfilePhoto('')} /> : initials}</div>
      <div className="profile-header-details"><p className="section-eyebrow">Guest account</p><h1 className="profile-title">{user.name || 'Moonstoria guest'}</h1><p className="profile-header-email">{user.email}</p>{memberSince && <p className="profile-help">Member since {memberSince}</p>}</div>
      <div className="profile-header-stats" aria-label="Account summary"><div><strong>{bookings.length}</strong><span>Bookings</span></div><div><strong>{favorites.length}</strong><span>Favorites</span></div>{memberSince && <div><strong>{memberSince}</strong><span>Member since</span></div>}</div>
      <div className="profile-photo-control"><input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} aria-label="Choose a profile photo" /><button className="profile-secondary-button" type="button" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()}>{uploadingPhoto ? 'Uploading...' : 'Change photo'}</button>{photoError && <p className="profile-field-error" role="alert">{photoError}</p>}{photoMessage && <p className="profile-help" role="status">{photoMessage}</p>}</div>
    </header>
    <div className="profile-mobile-tabs" role="tablist" aria-label="Profile sections">{sections.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeSection === id} className={activeSection === id ? 'active' : ''} onClick={() => setActiveSection(id)}>{label}</button>)}</div>
    <div className="profile-layout">
      <aside className="profile-sidebar" aria-label="Account sections"><nav>{sections.map(([id, label, Icon]) => <button key={id} type="button" className={activeSection === id ? 'active' : ''} onClick={() => setActiveSection(id)}><Icon size={16} />{label}</button>)}</nav><button type="button" className="profile-logout-button" onClick={logout}><LogOut size={16} />Log out</button></aside>
      <div className="profile-content">
        {activeSection === 'profile' && <section className="profile-panel"><h2>Your profile</h2><p className="profile-panel-description">Keep your contact details current for a smoother stay.</p><form className="profile-form" onSubmit={saveProfile}>
          <div className="profile-field"><label htmlFor="profile-name">Full name</label><input id="profile-name" className="profile-input" value={form.name} placeholder="Enter your full name" onChange={(event) => updateProfileField('name', event.target.value)} aria-describedby={profileErrors.name ? 'profile-name-error' : undefined} required />{profileErrors.name && <p id="profile-name-error" className="profile-field-error">{profileErrors.name}</p>}</div>
          <div className="profile-field"><div className="profile-label-row"><label htmlFor="profile-email">Email</label><span className="profile-badge">Verified</span></div><input id="profile-email" className="profile-input profile-input-readonly" type="email" value={form.email} readOnly aria-describedby="profile-email-help" /><p id="profile-email-help" className="profile-help">Contact us to change your email.</p></div>
          <div className="profile-field"><label htmlFor="profile-phone">Phone</label><input id="profile-phone" className="profile-input" type="tel" inputMode="tel" value={form.phone} placeholder="+63 917 000 0000" onChange={(event) => updateProfileField('phone', event.target.value)} aria-describedby={profileErrors.phone ? 'profile-phone-error' : 'profile-phone-help'} />{profileErrors.phone ? <p id="profile-phone-error" className="profile-field-error">{profileErrors.phone}</p> : <p id="profile-phone-help" className="profile-help">Use an international format, for example +63 917 000 0000.</p>}</div>
          <div className="profile-field"><label htmlFor="profile-address">Address</label><textarea id="profile-address" className="profile-input profile-textarea" maxLength={200} value={form.address} placeholder="Enter your address" onChange={(event) => updateProfileField('address', event.target.value)} aria-describedby={profileErrors.address ? 'profile-address-error' : 'profile-address-count'} />{profileErrors.address ? <p id="profile-address-error" className="profile-field-error">{profileErrors.address}</p> : <p id="profile-address-count" className="profile-help profile-counter">{form.address.length}/200</p>}</div>
          {error && <p className="profile-status profile-error" role="alert">{error}</p>}{message && <p className="profile-status profile-success" role="status">{message}</p>}<button className="profile-primary-button" disabled={!profileDirty || saving}>{saving ? 'Saving...' : 'Save profile'}</button>
        </form></section>}
        {activeSection === 'security' && <section className="profile-panel"><h2>Change password</h2><p className="profile-panel-description">Update your password regularly to keep your account secure.</p><form className="profile-password-form" onSubmit={changePassword}>
          <PasswordField id="current-password" label="Current password" value={passwords.currentPassword} field="currentPassword" visible={passwordVisibility.currentPassword} onChange={(field, value) => { setPasswords((current) => ({ ...current, [field]: value })); setPasswordError('') }} onToggle={(field) => setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))} />
          <PasswordField id="new-password" label="New password" value={passwords.newPassword} field="newPassword" visible={passwordVisibility.newPassword} onChange={(field, value) => { setPasswords((current) => ({ ...current, [field]: value })); setPasswordError('') }} onToggle={(field) => setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))} />
          <PasswordField id="confirm-password" label="Confirm new password" value={passwords.confirmPassword} field="confirmPassword" visible={passwordVisibility.confirmPassword} onChange={(field, value) => { setPasswords((current) => ({ ...current, [field]: value })); setPasswordError('') }} onToggle={(field) => setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))} />
          <div className="password-strength" aria-live="polite"><div className="password-strength-bars">{[0, 1, 2, 3].map((segment) => <span key={segment} className={segment < passwordScore ? `filled strength-${passwordScore}` : ''} />)}</div><p>{passwords.newPassword ? `${passwordScore}/4 password requirements met` : 'Choose a strong password'}</p></div>
          <ul className="password-rules" aria-label="Password requirements">{passwordRules.map((rule) => <li key={rule.label} className={rule.valid ? 'valid' : ''}>{rule.valid ? '✓' : '○'} {rule.label}</li>)}</ul>
          {passwordError && <p className="profile-field-error" role="alert">{passwordError}</p>}{error && <p className="profile-status profile-error" role="alert">{error}</p>}{message && <p className="profile-status profile-success" role="status">{message}</p>}
          <button className="profile-secondary-button" disabled={saving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword || passwordScore < 4}>{saving ? 'Changing...' : 'Change password'}</button>
        </form></section>}
        {activeSection === 'bookings' && <BookingPanel bookings={bookings} loading={bookingsLoading} error={bookingsError} onRetry={loadBookings} />}
        {activeSection === 'favorites' && <FavoritesPanel rooms={favorites} loading={favoritesLoading} error={favoritesError} onRetry={loadFavorites} onRemove={removeFavorite} busyRoomId={busyRoomId} />}
        {activeSection === 'preferences' && <PreferencesPanel />}
      </div>
    </div>
  </div></main>
}
