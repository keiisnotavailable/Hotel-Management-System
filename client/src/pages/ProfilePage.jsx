import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Eye, EyeOff, Heart, LogOut, Settings, Shield, Star, UserCircle, X } from 'lucide-react'
import { API_BASE, authConfig, getErrorMessage, getUploadedAssetUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getRoomImage } from '../utils/roomImages'
import { formatPHP } from '../lib/currency'

function FavoritesPanel() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    axios.get(`${API_BASE}/users/saved`, authConfig())
      .then(({ data }) => { if (active) setRooms(data.rooms || data.savedRooms || []) })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError, 'Saved rooms could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function removeFavorite(room) {
    setRooms((current) => current.filter((item) => item._id !== room._id))
    try {
      await axios.post(`${API_BASE}/users/saved/${room._id || room.id}`, {}, authConfig())
    } catch (requestError) {
      setRooms((current) => [room, ...current])
      setError(getErrorMessage(requestError, 'This room could not be removed from favorites.'))
    }
  }

  if (loading) return <section className="profile-panel"><h2>Favorites</h2><p className="profile-panel-description">Gathering your saved crypts...</p></section>
  if (error) return <section className="profile-panel"><h2>Favorites</h2><p className="profile-status profile-error" role="alert">{error}</p></section>
  if (!rooms.length) return <EmptyPanel title="Favorites" text="No saved rooms yet. Keep your favorite crypts close." />

  return <section className="profile-panel"><div className="profile-panel-heading"><div><h2>Favorites</h2><p className="profile-panel-description">Your saved crypts, gathered in one place.</p></div><span className="profile-count">{rooms.length} saved crypt{rooms.length === 1 ? '' : 's'}</span></div><div className="profile-favorites-grid">{rooms.map((room) => <article className="profile-favorite-card" key={room._id || room.id}><div className="profile-favorite-image">{getRoomImage(room) ? <img src={getRoomImage(room)} alt={`${room.name} interior`} /> : <span aria-hidden="true">☾</span>}<button type="button" className="profile-favorite-remove" aria-label={`Remove ${room.name} from favorites`} onClick={() => removeFavorite(room)}><Heart size={16} fill="currentColor" /></button></div><div className="profile-favorite-body"><p className="section-eyebrow">{room.category || `${room.type || 'Crypt'} room`}</p><h3>{room.name}</h3><div className="profile-favorite-meta"><span className="profile-rating" aria-label={`${room.rating ?? 5} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill={star <= Number(room.rating ?? 5) ? 'currentColor' : 'none'} />)}</span><strong>{formatPHP(room.pricePerNight)} <small>/ night</small></strong></div><Link to={`/crypts/${room.slug || room._id}`} className="profile-favorite-link">View room</Link></div></article>)}</div></section>
}

export default function ProfilePage() {
  const { user, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('profile')
  const initialForm = { name: user.name || '', email: user.email || '', phone: user.phone || '', address: user.address || '' }
  const [form, setForm] = useState(initialForm)
  const [profileErrors, setProfileErrors] = useState({})
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordVisibility, setPasswordVisibility] = useState({ currentPassword: false, newPassword: false, confirmPassword: false })
  const [passwordError, setPasswordError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(() => getUploadedAssetUrl(user.profileImage || ''))
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [preferences, setPreferences] = useState(() => {
    const stored = localStorage.getItem('moonstoriaPreferences')
    return stored ? JSON.parse(stored) : { roomType: 'Any room', darkness: 'Total darkness', dietary: '', bookingUpdates: true, newsletter: false }
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const profileDirty = ['name', 'phone', 'address'].some((field) => form[field] !== initialForm[field])

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

  async function save(event) {
    event.preventDefault()
    const nextErrors = validateProfile()
    if (Object.keys(nextErrors).length) {
      setProfileErrors(nextErrors)
      return
    }
    setSaving(true); setMessage(''); setError('')
    try { const { data } = await axios.put(`${API_BASE}/users/profile`, form, authConfig()); localStorage.setItem('hotelTransylvaniaUser', JSON.stringify(data.user)); signIn(data.user, localStorage.getItem('hotelTransylvaniaToken')); setMessage('Profile updated.') } catch (requestError) { setError(getErrorMessage(requestError, 'Profile could not be updated.')) } finally { setSaving(false) }
  }
  async function changePassword(event) {
    event.preventDefault()
    if (passwords.newPassword === passwords.currentPassword) { setPasswordError('Your new password must be different from your current password.'); return }
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordError('Your new passwords do not match.'); return }
    if (!passwordRules.every((rule) => rule.valid)) { setPasswordError('Please meet all password requirements.'); return }
    setSaving(true); setMessage(''); setError(''); setPasswordError('')
    try { await axios.put(`${API_BASE}/users/change-password`, { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }, authConfig()); setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); setMessage('Password changed.') } catch (requestError) { setError(getErrorMessage(requestError, 'Password could not be changed.')) } finally { setSaving(false) }
  }
  const initials = (user.name || user.email || 'M').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = user.createdAt && !Number.isNaN(new Date(user.createdAt).getTime()) ? new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : ''
  const bookingCount = Array.isArray(user.bookings) ? user.bookings.length : Array.isArray(user.reservations) ? user.reservations.length : 0
  const favoriteCount = Array.isArray(user.savedRooms) ? user.savedRooms.length : 0
  const sections = [
    ['profile', 'Profile', UserCircle],
    ['security', 'Security', Shield],
    ['bookings', 'My Bookings', CalendarDays],
    ['favorites', 'Favorites', Heart],
    ['preferences', 'Preferences', Settings],
  ]
  const passwordRules = [
    { label: '8+ characters', valid: passwords.newPassword.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(passwords.newPassword) },
    { label: 'One number', valid: /\d/.test(passwords.newPassword) },
    { label: 'One symbol', valid: /[^A-Za-z0-9]/.test(passwords.newPassword) },
  ]
  const passwordScore = passwordRules.filter((rule) => rule.valid).length

  function PasswordField({ id, label, value, field, required = true }) {
    const visible = passwordVisibility[field]
    return <div className="profile-field"><label htmlFor={id}>{label}</label><div className="profile-password-input"><input id={id} className="profile-input" type={visible ? 'text' : 'password'} placeholder={`Enter your ${label.toLowerCase()}`} value={value} onChange={(event) => { setPasswords({ ...passwords, [field]: event.target.value }); setPasswordError('') }} required={required} /><button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setPasswordVisibility({ ...passwordVisibility, [field]: !visible })}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
  }

  function logout() {
    signOut()
    navigate('/')
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const input = event.currentTarget
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image no larger than 5 MB.')
      input.value = ''
      return
    }
    async function savePhoto() {
      setUploadingPhoto(true)
      setError('')
      setMessage('')
      const body = new FormData()
      body.append('image', file)
      try {
        const { data } = await axios.post(`${API_BASE}/users/profile/photo`, body, authConfig())
        setProfilePhoto(getUploadedAssetUrl(data.user.profileImage || ''))
        signIn(data.user, localStorage.getItem('hotelTransylvaniaToken'))
        setMessage('Profile photo updated.')
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Profile photo could not be updated.'))
      } finally {
        setUploadingPhoto(false)
        input.value = ''
      }
    }
    savePhoto()
  }

  function updatePreference(field, value) {
    setPreferences((current) => {
      const next = { ...current, [field]: value }
      localStorage.setItem('moonstoriaPreferences', JSON.stringify(next))
      return next
    })
  }

  function EmptyPanel({ title, text }) {
    return <section className="profile-empty-panel"><h2>{title}</h2><p>{text}</p><Link to="/crypts" className="profile-primary-button">Explore the crypts</Link></section>
  }

  return <main className="paper-texture profile-page"><div className="profile-container"><header className="profile-header-card"><div className="profile-avatar" aria-hidden="true">{profilePhoto ? <img src={profilePhoto} alt="" /> : initials}</div><div className="profile-header-details"><p className="section-eyebrow">Guest account</p><h1 className="profile-title">{user.name || 'Moonstoria guest'}</h1><p className="profile-header-email">{user.email}</p>{memberSince && <p className="profile-help">Member since {memberSince}</p>}</div><div className="profile-header-stats" aria-label="Account summary"><div><strong>{bookingCount}</strong><span>Bookings</span></div><div><strong>{favoriteCount}</strong><span>Favorites</span></div>{memberSince && <div><strong>{memberSince}</strong><span>Member since</span></div>}  </div><label className="profile-secondary-button profile-photo-button">Change photo<input type="file" accept="image/*" onChange={uploadPhoto} /></label></header><div className="profile-mobile-tabs" role="tablist" aria-label="Profile sections">{sections.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeSection === id} className={activeSection === id ? 'active' : ''} onClick={() => setActiveSection(id)}>{label}</button>)}</div><div className="profile-layout"><aside className="profile-sidebar" aria-label="Account sections"><nav>{sections.map(([id, label, Icon]) => <button key={id} type="button" className={activeSection === id ? 'active' : ''} onClick={() => setActiveSection(id)}><Icon size={16} />{label}</button>)}</nav><button type="button" className="profile-logout-button" onClick={logout}><LogOut size={16} />Log out</button></aside><div className="profile-content">{activeSection === 'profile' && <section className="profile-panel"><h2>Your profile</h2><p className="profile-panel-description">Keep your contact details current for a smoother stay.</p><form className="profile-form" onSubmit={save}><div className="profile-field"><label htmlFor="profile-name">Full name</label><input id="profile-name" className="profile-input" value={form.name} placeholder="Enter your full name" onChange={(event) => updateProfileField('name', event.target.value)} aria-describedby={profileErrors.name ? 'profile-name-error' : undefined} required />{profileErrors.name && <p id="profile-name-error" className="profile-field-error">{profileErrors.name}</p>}</div><div className="profile-field"><div className="profile-label-row"><label htmlFor="profile-email">Email</label><span className="profile-badge">Verified</span></div><input id="profile-email" className="profile-input profile-input-readonly" type="email" value={form.email} readOnly aria-describedby="profile-email-help" /><p id="profile-email-help" className="profile-help">Contact us to change your email.</p></div><div className="profile-field"><label htmlFor="profile-phone">Phone</label><input id="profile-phone" className="profile-input" type="tel" inputMode="tel" value={form.phone} placeholder="+63 917 000 0000" onChange={(event) => updateProfileField('phone', event.target.value)} aria-describedby={profileErrors.phone ? 'profile-phone-error' : 'profile-phone-help'} />{profileErrors.phone ? <p id="profile-phone-error" className="profile-field-error">{profileErrors.phone}</p> : <p id="profile-phone-help" className="profile-help">Use an international format, for example +63 917 000 0000.</p>}</div><div className="profile-field"><label htmlFor="profile-address">Address</label><textarea id="profile-address" className="profile-input profile-textarea" maxLength={200} value={form.address} placeholder="Enter your address" onChange={(event) => updateProfileField('address', event.target.value)} aria-describedby={profileErrors.address ? 'profile-address-error' : 'profile-address-count'} />{profileErrors.address ? <p id="profile-address-error" className="profile-field-error">{profileErrors.address}</p> : <p id="profile-address-count" className="profile-help profile-counter">{form.address.length}/200</p>}</div><button className="profile-primary-button" disabled={!profileDirty || saving}>{saving ? 'Saving...' : 'Save profile'}</button></form></section>}{activeSection === 'security' && <section className="profile-panel"><h2>Change password</h2><p className="profile-panel-description">Update your password regularly to keep your account secure.</p><form className="profile-password-form" onSubmit={changePassword}><PasswordField id="current-password" label="Current password" value={passwords.currentPassword} field="currentPassword" /><PasswordField id="new-password" label="New password" value={passwords.newPassword} field="newPassword" /><PasswordField id="confirm-password" label="Confirm new password" value={passwords.confirmPassword} field="confirmPassword" /><div className="password-strength" aria-live="polite"><div className="password-strength-bars">{[0, 1, 2, 3].map((segment) => <span key={segment} className={segment < passwordScore ? `filled strength-${passwordScore}` : ''} />)}</div><p>{passwords.newPassword ? `${passwordScore}/4 password requirements met` : 'Choose a strong password'}</p></div><ul className="password-rules" aria-label="Password requirements">{passwordRules.map((rule) => <li key={rule.label} className={rule.valid ? 'valid' : ''}>{rule.valid ? '✓' : '○'} {rule.label}</li>)}</ul>{passwordError && <p className="profile-field-error" role="alert">{passwordError}</p>}<button className="profile-secondary-button" disabled={saving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword || passwordScore < 4}>{saving ? 'Changing...' : 'Change password'}</button></form><section className="danger-zone"><div><h3>Danger zone</h3><p>Account deletion is not connected to the current API.</p></div><button type="button" className="danger-button" onClick={() => setDeleteOpen(true)}>Delete account</button></section></section>}{activeSection === 'bookings' && <EmptyPanel title="My bookings" text="No bookings yet. Your next moonlit stay is waiting." />  }{activeSection === 'favorites' && <FavoritesPanel />}{activeSection === 'preferences' && <section className="profile-panel"><h2>Preferences</h2><p className="profile-panel-description">Set the atmosphere and updates you prefer for future stays.</p><div className="preferences-grid"><div className="profile-field"><label htmlFor="preferred-room">Preferred room type</label><select id="preferred-room" className="profile-input" value={preferences.roomType} onChange={(event) => updatePreference('roomType', event.target.value)}><option>Any room</option><option>Crypt</option><option>Den</option><option>Suite</option><option>Tower</option></select></div><div className="profile-field"><label htmlFor="darkness-level">Darkness level</label><select id="darkness-level" className="profile-input" value={preferences.darkness} onChange={(event) => updatePreference('darkness', event.target.value)}><option>Total darkness</option><option>Moonlit</option><option>Lantern glow</option></select></div><div className="profile-field"><label htmlFor="dietary-needs">Dietary needs</label><input id="dietary-needs" className="profile-input" value={preferences.dietary} placeholder="Vegetarian, allergies, or other notes" onChange={(event) => updatePreference('dietary', event.target.value)} /></div></div><div className="preference-switches"><label><span><strong>Booking updates</strong><small>Receive reservation and arrival notices.</small></span><input type="checkbox" checked={preferences.bookingUpdates} onChange={(event) => updatePreference('bookingUpdates', event.target.checked)} /></label><label><span><strong>Newsletter</strong><small>Receive letters from the keep.</small></span><input type="checkbox" checked={preferences.newsletter} onChange={(event) => updatePreference('newsletter', event.target.checked)} /></label></div><p className="profile-help">Preferences are saved on this device until profile preferences are added to the account API.</p></section>}{(message || error) && <p className={`profile-status ${message ? 'profile-success' : 'profile-error'}`} role={message ? 'status' : 'alert'}>{message || error}</p>}</div></div></div>{deleteOpen && <div className="profile-modal-backdrop" role="presentation" onClick={() => setDeleteOpen(false)}><section className="profile-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}><button type="button" className="profile-modal-close" aria-label="Close delete account dialog" onClick={() => setDeleteOpen(false)}><X size={18} /></button><h2 id="delete-account-title">Delete account</h2><p>This action is not connected yet. Type DELETE to confirm when account deletion is implemented.</p><input className="profile-input" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" aria-label="Type DELETE to confirm" /><button type="button" className="danger-button" disabled={deleteConfirmation !== 'DELETE'}>Delete account</button></section></div>}</main>
}
