import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE, authConfig, getErrorMessage } from '../lib/api'
import { formatDateTime } from '../lib/date'
import { formatPHP } from '../lib/currency'

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(null)
  useEffect(() => { axios.get(`${API_BASE}/reservations/my`, authConfig()).then(({ data }) => setReservations(data.reservations || [])).catch((requestError) => setError(getErrorMessage(requestError, 'Reservations could not be loaded.'))) }, [])
  async function cancel(id) {
    try { const { data } = await axios.patch(`${API_BASE}/reservations/${id}/cancel`, {}, authConfig()); setReservations((current) => current.map((item) => item._id === id ? data.reservation : item)); setConfirming(null) } catch (requestError) { setError(getErrorMessage(requestError, 'Reservation could not be cancelled.')) }
  }
  return <main className="paper-texture min-h-screen px-5 pb-20 pt-10 sm:px-10"><div className="mx-auto max-w-4xl"><h1 className="font-display text-4xl uppercase">My reservations</h1>{error && <p className="mt-5 text-sm text-crimson">{error}</p>}<div className="mt-8 space-y-4">{!reservations.length && !error && <p className="text-sm text-ink/60">You have no reservations yet.</p>}{reservations.map((reservation) => { const cancellable = reservation.status === 'confirmed' && new Date(reservation.checkIn) > new Date(); return <article key={reservation._id} className="border border-ink/20 bg-white/40 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-display text-2xl">{reservation.room?.name}</h2><p className="mt-2 text-sm">{formatDateTime(reservation.checkIn)} – {formatDateTime(reservation.checkOut)}</p></div><span className={`h-fit px-3 py-1 text-[10px] uppercase tracking-widest ${reservation.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-ink/10 text-ink/60'}`}>{reservation.status}</span></div><p className="mt-3 text-sm">{formatPHP(reservation.totalPrice)} · {reservation.nights} night(s) · {reservation.guests} guest(s)</p>{cancellable && <button className="mt-4 border border-crimson px-4 py-2 text-[10px] uppercase tracking-widest text-crimson" onClick={() => setConfirming(reservation)}>Cancel reservation</button>}</article>})}</div></div>{confirming && <div className="auth-overlay fixed inset-0 z-50 flex items-center justify-center px-5"><section className="auth-modal max-w-md p-7 text-parchment"><h2 className="font-display text-2xl uppercase">Cancel reservation?</h2><p className="mt-3 text-sm text-parchment/70">This action cannot be undone.</p><div className="mt-6 flex gap-3"><button className="border border-parchment/30 px-4 py-3 text-xs" onClick={() => setConfirming(null)}>Keep booking</button><button className="bg-crimson px-4 py-3 text-xs" onClick={() => cancel(confirming._id)}>Cancel reservation</button></div></section></div>}</main>
}
