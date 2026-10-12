import { useState } from 'react'
import axios from 'axios'
import { API_BASE, authConfig, getErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user, signIn } = useAuth()
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '', address: user.address || '' })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('')
    try { const { data } = await axios.put(`${API_BASE}/users/profile`, form, authConfig()); localStorage.setItem('hotelTransylvaniaUser', JSON.stringify(data.user)); signIn(data.user, localStorage.getItem('hotelTransylvaniaToken')); setMessage('Profile updated.') } catch (requestError) { setError(getErrorMessage(requestError, 'Profile could not be updated.')) } finally { setSaving(false) }
  }
  async function changePassword(event) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('')
    try { await axios.put(`${API_BASE}/users/change-password`, passwords, authConfig()); setPasswords({ currentPassword: '', newPassword: '' }); setMessage('Password changed.') } catch (requestError) { setError(getErrorMessage(requestError, 'Password could not be changed.')) } finally { setSaving(false) }
  }
  return <main className="paper-texture min-h-screen px-5 pb-20 pt-10 sm:px-10"><div className="mx-auto max-w-xl"><h1 className="font-display text-4xl uppercase">Your profile</h1><form className="mt-8 space-y-3" onSubmit={save}><input className="auth-input border border-ink/20 bg-white/60 text-ink" value={form.name} placeholder="Name" onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input className="auth-input border border-ink/20 bg-white/60 text-ink" type="email" value={form.email} placeholder="Email" onChange={(event) => setForm({ ...form, email: event.target.value })} required /><input className="auth-input border border-ink/20 bg-white/60 text-ink" value={form.phone} placeholder="Phone" onChange={(event) => setForm({ ...form, phone: event.target.value })} /><textarea className="auth-input min-h-24 border border-ink/20 bg-white/60 text-ink" value={form.address} placeholder="Address" onChange={(event) => setForm({ ...form, address: event.target.value })} /><button className="bg-crimson px-5 py-3 text-xs font-bold uppercase tracking-widest text-parchment disabled:opacity-60" disabled={saving}>Save profile</button></form><form className="mt-10 space-y-3 border-t border-ink/20 pt-6" onSubmit={changePassword}><h2 className="font-display text-2xl uppercase">Change password</h2><input className="auth-input border border-ink/20 bg-white/60 text-ink" type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required /><input className="auth-input border border-ink/20 bg-white/60 text-ink" type="password" placeholder="New password" minLength={6} value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required /><button className="border border-ink/40 px-5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60" disabled={saving}>Change password</button></form>{message && <p className="mt-5 text-sm text-emerald-700">{message}</p>}{error && <p className="mt-5 text-sm text-crimson">{error}</p>}</div></main>
}
