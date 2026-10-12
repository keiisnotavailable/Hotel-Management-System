import { useState } from 'react'
import axios from 'axios'
import { API_BASE, getErrorMessage } from '../lib/api'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setStatus(''); setError('')
    try { await axios.post(`${API_BASE}/contact`, form); setStatus('Your message has reached the castle.'); setForm({ name: '', email: '', message: '' }) } catch (requestError) { setError(getErrorMessage(requestError, 'The ravens could not deliver your message.')) }
  }
  return <main className="paper-texture px-5 py-20 sm:px-10"><div className="mx-auto max-w-5xl"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><section><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink/60">The castle correspondence</p><h1 className="mt-3 font-display text-4xl uppercase">Contact Moonstoria</h1><p className="mt-6 text-sm leading-7 text-ink/75">Whether you are planning a moonlit escape, arranging a gathering, or simply curious about life inside the castle, our keepers are ready to hear from you.</p><p className="mt-4 text-sm leading-7 text-ink/75">Send a message about reservations, accessibility, celebrations, or special requests. The concierge reviews every note and will reply through the email address you provide.</p><div className="mt-8 border-l border-crimson/50 pl-5 text-sm leading-7 text-ink/70"><p>Moonstoria Hotel</p><p>At the edge of Moonstoria forest</p><p>Correspondence answered nightly, from dusk until dawn.</p></div></section><form onSubmit={submit} className="space-y-4"><input required className="w-full border border-ink/30 bg-white/30 p-3 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input required type="email" className="w-full border border-ink/30 bg-white/30 p-3 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><textarea required rows="7" className="w-full border border-ink/30 bg-white/30 p-3 text-sm" placeholder="How may the castle assist you?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><button className="bg-ink px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-parchment">Send message</button>{status && <p className="text-sm text-green-800">{status}</p>}{error && <p className="text-sm text-red-800">{error}</p>}</form></div></div></main></div>
}
