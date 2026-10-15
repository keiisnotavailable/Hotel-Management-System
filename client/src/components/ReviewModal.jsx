import { useEffect, useState } from 'react'
import axios from 'axios'
import { Star, X } from 'lucide-react'
import { API_BASE, authConfig, getErrorMessage } from '../lib/api'
import { formatDateTime } from '../lib/date'
import { getRoomImage } from '../utils/roomImages'

const categoryOptions = [
  ['cleanliness', 'Cleanliness'],
  ['comfort', 'Comfort'],
  ['value', 'Value'],
  ['location', 'Location'],
  ['hostService', 'Host/Service'],
]
const ratingLabels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']

function StarRating({ label, value, onChange, required = false }) {
  return <fieldset className="review-rating-field">
    <legend>{label}{required && <span aria-hidden="true"> *</span>}</legend>
    <div className="review-star-options" role="group" aria-label={`${label} rating`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className={rating <= value ? 'selected' : ''}
          aria-label={`${ratingLabels[rating - 1]}: ${rating} out of 5 stars`}
          aria-pressed={value === rating}
          onClick={() => onChange(rating)}
        ><Star size={20} fill={rating <= value ? 'currentColor' : 'none'} /></button>
      ))}
      {value > 0 && <span className="review-rating-label" aria-live="polite">{ratingLabels[value - 1]}</span>}
    </div>
  </fieldset>
}

export default function ReviewModal({ reservation, existingReview, onClose, onSaved, onDeleted }) {
  const [overall, setOverall] = useState(existingReview?.overall || 0)
  const [categories, setCategories] = useState(existingReview?.categories || {})
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [showName, setShowName] = useState(existingReview?.showName ?? true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const room = reservation.room || { name: reservation.roomName }
  const image = getRoomImage(room)
  const editable = !existingReview || existingReview.editable !== false

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [busy, onClose])

  async function submit(event) {
    event.preventDefault()
    if (!overall) {
      setError('Choose an overall rating before submitting.')
      return
    }
    if (comment.length > 1000) {
      setError('Your comment must be 1000 characters or fewer.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const path = `${API_BASE}/reservations/${reservation._id}/review`
      const body = { overall, categories, comment, showName }
      const { data } = existingReview
        ? await axios.patch(path, body, authConfig())
        : await axios.post(path, body, authConfig())
      onSaved(data.review)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Your review could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  async function deleteReview() {
    if (!window.confirm('Delete your review? This cannot be undone.')) return
    setBusy(true)
    setError('')
    try {
      await axios.delete(`${API_BASE}/reservations/${reservation._id}/review`, authConfig())
      onDeleted()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Your review could not be deleted.'))
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-8" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
    <section className="review-modal auth-modal w-full max-w-xl p-6 text-parchment sm:p-8" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Your Moonstoria stay</p><h2 id="review-modal-title" className="mt-2 font-display text-3xl uppercase">{existingReview ? 'Edit your review' : 'Rate your stay'}</h2></div>
        <button type="button" className="review-modal-close" aria-label="Close review form" onClick={onClose} disabled={busy}><X size={20} /></button>
      </div>
      <div className="review-stay-summary">
        {image ? <img src={image} alt="" /> : <span className="review-stay-placeholder" aria-hidden="true">☾</span>}
        <div><strong>{room.name || reservation.roomName || 'Moonstoria crypt'}</strong><span>{formatDateTime(reservation.checkIn)} – {formatDateTime(reservation.checkOut)}</span></div>
      </div>
      {editable ? <form onSubmit={submit}>
        <StarRating label="Overall rating" value={overall} onChange={setOverall} required />
        {!overall && <p className="review-required-hint">Choose an overall rating before submitting.</p>}
        <div className="review-category-grid">{categoryOptions.map(([key, label]) => <StarRating key={key} label={label} value={categories[key] || 0} onChange={(value) => setCategories((current) => ({ ...current, [key]: value }))} />)}</div>
        <label className="review-comment-label">Your review <span>(optional)</span>
          <textarea maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} rows={4} aria-describedby="review-comment-count" />
        </label>
        <p id="review-comment-count" className="review-character-count" aria-live="polite">{comment.length}/1000</p>
        <label className="review-name-toggle"><input type="checkbox" checked={showName} onChange={(event) => setShowName(event.target.checked)} /> Show my first name publicly</label>
        {error && <p className="review-form-error" role="alert">{error}</p>}
        <div className="review-modal-actions">
          {existingReview && <button type="button" className="review-delete-button" disabled={busy} onClick={deleteReview}>Delete review</button>}
          <button type="button" className="review-cancel-button" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" className="review-submit-button" disabled={!overall || busy}>{busy ? 'Saving…' : existingReview ? 'Save changes' : 'Submit review'}</button>
        </div>
      </form> : <p className="review-form-error" role="status">The 14-day review editing period has ended.</p>}
    </section>
  </div>
}
