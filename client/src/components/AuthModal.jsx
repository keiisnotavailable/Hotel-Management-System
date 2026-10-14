import { useEffect, useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_BASE, getErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function PasswordField({ name, placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false)
  return <div className="relative"><input className="auth-input" type={visible ? 'text' : 'password'} name={name} placeholder={placeholder} value={value} onChange={onChange} minLength={6} required /><button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
}

export default function AuthModal({ initialMode = 'signin', from, onClose }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (mode === 'signup' && form.password !== form.confirmPassword) { setError('The two secret spells must match.'); return }
    setSubmitting(true)
    try {
      const endpoint = mode === 'signup' ? 'register' : 'login'
      const payload = mode === 'signup' ? { name: form.name, email: form.email, password: form.password } : { email: form.email, password: form.password }
      const { data } = await axios.post(`${API_BASE}/auth/${endpoint}`, payload)
      if (mode === 'signup') {
        setMode('signin')
        setForm({ name: '', email: form.email, password: '', confirmPassword: '' })
        setMessage('Your account was created successfully. Sign in to enter the castle.')
      } else {
        signIn(data.user, data.token)
        onClose()
        const returnTo = from || location.state?.from
        const destination = typeof returnTo === 'string'
          ? returnTo
          : returnTo
            ? { pathname: returnTo.pathname, search: returnTo.search, hash: returnTo.hash }
            : '/'
        navigate(data.user.role === 'admin' ? '/admin' : destination, { replace: true })
      }
    } catch (requestError) { setError(getErrorMessage(requestError, 'The castle could not complete your request.')) } finally { setSubmitting(false) }
  }

  return <div className="auth-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 sm:py-14" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="auth-modal relative w-full max-w-md px-6 pb-7 pt-8 text-parchment sm:px-9" role="dialog" aria-modal="true">
      <button className="absolute right-3 top-3 text-parchment/60 hover:text-parchment" onClick={onClose} aria-label="Close authentication"><X size={18} /></button>
      <h2 className="text-center font-display text-3xl uppercase">{mode === 'signup' ? 'Join the castle' : 'Enter the castle'}</h2>
      <p className="mt-2 text-center text-xs text-parchment/60">{mode === 'signup' ? 'Create your reservation account' : 'Sign in to your crypt'}</p>
      {message && <p className="mt-4 text-center text-xs text-emerald-200" role="status">{message}</p>}
      <form className="mt-5 space-y-3" onSubmit={submit}>
        {mode === 'signup' && <input className="auth-input" name="name" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />}
        <input className="auth-input" type="email" name="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <PasswordField name="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        {mode === 'signup' && <PasswordField name="confirmPassword" placeholder="Repeat password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />}
        {error && <p className="text-xs text-[#f49a9a]" role="alert">{error}</p>}
        <button className="w-full bg-crimson px-4 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60" disabled={submitting}>{submitting ? 'Summoning...' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      </form>
      <p className="mt-5 text-center text-xs text-parchment/75">{mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}<button className="text-[#ef9ed7]" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage('') }}>{mode === 'signup' ? 'Sign in' : 'Sign up'}</button></p>
    </section>
  </div>
}
