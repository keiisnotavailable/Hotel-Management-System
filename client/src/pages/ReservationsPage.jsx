import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Star, X } from 'lucide-react'
import { API_BASE, authConfig, getErrorMessage } from '../lib/api'
import { formatDateTime } from '../lib/date'
import { formatPHP } from '../lib/currency'
import ReviewModal from '../components/ReviewModal'

function getDismissedReservations() {
  try {
    const stored = window.localStorage.getItem('dismissed-stay-review-prompts')
    const parsed = stored ? JSON.parse(stored) : []
    if (!Array.isArray(parsed)) throw new Error('Dismissed review prompts are not stored as a list.')
    return new Set(parsed.filter((id) => typeof id === 'string'))
  } catch (storageError) {
    console.error('Dismissed review prompts could not be read.', storageError)
    return new Set()
  }
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [reviewReservation, setReviewReservation] = useState(null)
  const [dismissed, setDismissed] = useState(() => getDismissedReservations())
  const [message, setMessage] = useState('')

  useEffect(() => {
    axios.get(`${API_BASE}/reservations/my`, authConfig())
      .then(({ data }) => setReservations(data.reservations || []))
      .catch((requestError) => setError(getErrorMessage(requestError, 'Reservations could not be loaded.')))
      .finally(() => setLoading(false))
  }, [])

  async function cancel(id) {
    setError('')
    try {
      const { data } = await axios.patch(`${API_BASE}/reservations/${id}/cancel`, {}, authConfig())
      setReservations((current) => current.map((item) => item._id === id ? { ...data.reservation, review: item.review } : item))
      setConfirming(null)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Reservation could not be cancelled.'))
    }
  }

  function dismissPrompt(id) {
    const next = new Set(dismissed)
    next.add(id)
    try {
      window.localStorage.setItem('dismissed-stay-review-prompts', JSON.stringify([...next]))
      setDismissed(next)
    } catch (storageError) {
      setError(getErrorMessage(storageError, 'The rating reminder could not be dismissed.'))
    }
  }

  function saveReview(review) {
    const reservationId = reviewReservation._id
    setReservations((current) => current.map((reservation) => reservation._id === reservationId ? { ...reservation, review } : reservation))
    setReviewReservation(null)
    setMessage('Your review has been saved. Thank you for staying with Moonstoria.')
  }

  function removeReview() {
    const reservationId = reviewReservation._id
    setReservations((current) => current.map((reservation) => reservation._id === reservationId ? { ...reservation, review: null } : reservation))
    setReviewReservation(null)
    setMessage('Your review has been deleted.')
  }

  const reviewPrompt = useMemo(() => reservations
    .filter((reservation) => reservation.status === 'completed' && !reservation.review && !dismissed.has(reservation._id))
    .sort((a, b) => new Date(b.completedAt || b.checkOut) - new Date(a.completedAt || a.checkOut))[0], [dismissed, reservations])

  return <main className="paper-texture min-h-screen px-5 pb-20 pt-10 sm:px-10">
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl uppercase">My reservations</h1>
      {error && <p className="mt-5 text-sm text-crimson" role="alert">{error}</p>}
      {message && <p className="mt-5 flex items-center justify-between gap-3 border border-emerald-800/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16} /></button></p>}
      {reviewPrompt && <aside className="review-prompt-banner mt-6" aria-label="Rate a recent stay">
        <div><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Share your experience</p><p className="mt-1 font-display text-xl">{reviewPrompt.room?.name || reviewPrompt.roomName || 'Your completed stay'}</p><span>{formatDateTime(reviewPrompt.checkIn)} – {formatDateTime(reviewPrompt.checkOut)}</span></div>
        <button type="button" onClick={() => setReviewReservation(reviewPrompt)}>Rate your stay</button>
        <button type="button" className="review-prompt-dismiss" aria-label="Dismiss rating reminder" onClick={() => dismissPrompt(reviewPrompt._id)}><X size={17} /></button>
      </aside>}
      <div className="mt-8 space-y-4">
        {loading && <p className="text-sm text-ink/60" aria-live="polite">Loading reservations…</p>}
        {!loading && !reservations.length && !error && <p className="border border-ink/20 bg-white/40 p-6 text-sm text-ink/60">You have no reservations yet.</p>}
        {reservations.map((reservation) => {
          const cancellable = reservation.status === 'upcoming' && new Date(reservation.checkIn) > new Date()
          const statusClass = reservation.status === 'upcoming' ? 'bg-emerald-100 text-emerald-800' : reservation.status === 'cancelled' ? 'bg-crimson/10 text-crimson' : 'bg-ink/10 text-ink/60'
          return <article key={reservation._id} className="border border-ink/20 bg-white/40 p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div><h2 className="font-display text-2xl">{reservation.room?.name || reservation.roomName || 'Moonstoria crypt'}</h2><p className="mt-2 text-sm">{formatDateTime(reservation.checkIn)} – {formatDateTime(reservation.checkOut)}</p></div>
              <span className={`h-fit px-3 py-1 text-[10px] uppercase tracking-widest ${statusClass}`}>{reservation.status}</span>
            </div>
            <p className="mt-3 text-sm">{formatPHP(reservation.totalPrice)} · {reservation.nights} night(s) · {reservation.guests} guest(s)</p>
            {reservation.review ? <div className="guest-review-rating mt-4">
              <span aria-label={`${reservation.review.overall} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill={star <= reservation.review.overall ? 'currentColor' : 'none'} />)}</span>
              {reservation.review.editable && <button type="button" onClick={() => setReviewReservation(reservation)}>Edit review</button>}
              {!reservation.review.editable && <span className="text-xs text-ink/55">Review submitted</span>}
              {new Date(reservation.review.updatedAt) > new Date(reservation.review.createdAt) && <small>Edited {formatDateTime(reservation.review.updatedAt)}</small>}
            </div> : reservation.status === 'completed' && <button type="button" className="guest-rate-button mt-4" onClick={() => setReviewReservation(reservation)}>Rate your stay</button>}
            {cancellable && <button className="mt-4 border border-crimson px-4 py-2 text-[10px] uppercase tracking-widest text-crimson" onClick={() => setConfirming(reservation)}>Cancel reservation</button>}
          </article>
        })}
      </div>
    </div>
    {confirming && <div className="auth-overlay fixed inset-0 z-50 flex items-center justify-center px-5"><section className="auth-modal max-w-md p-7 text-parchment"><h2 className="font-display text-2xl uppercase">Cancel reservation?</h2><p className="mt-3 text-sm text-parchment/70">This action cannot be undone.</p><div className="mt-6 flex gap-3"><button className="border border-parchment/30 px-4 py-3 text-xs" onClick={() => setConfirming(null)}>Keep booking</button><button className="bg-crimson px-4 py-3 text-xs" onClick={() => cancel(confirming._id)}>Cancel reservation</button></div></section></div>}
    {reviewReservation && <ReviewModal reservation={reviewReservation} existingReview={reviewReservation.review} onClose={() => setReviewReservation(null)} onSaved={saveReview} onDeleted={removeReview} />}
  </main>
}
