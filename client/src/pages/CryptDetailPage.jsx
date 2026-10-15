import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, ChevronLeft, ChevronRight, Heart, Maximize2, Sparkles, Star, Users, X } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import DateTimePicker from '../components/DateTimePicker'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { API_BASE, authConfig, getErrorMessage } from '../lib/api'
import { defaultLocalDateTime, formatDateTime, validateDateRange } from '../lib/date'
import { getRoomImages } from '../utils/roomImages'
import { formatPHP } from '../lib/currency'

function Placeholder({ name }) {
  return <div className="room-detail-placeholder" role="img" aria-label={`${name} interior placeholder`}><span>☾</span></div>
}

function formatConflict(conflict) {
  return `Booked ${formatDateTime(conflict.checkIn)} to ${formatDateTime(conflict.checkOut)}`
}

export default function CryptDetailPage({ onAuth }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [room, setRoom] = useState(null)
  const [booking, setBooking] = useState({ checkIn: '', checkOut: '', guests: 1 })
  const [availability, setAvailability] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [specialRequests, setSpecialRequests] = useState('')
  const [reviewResult, setReviewResult] = useState(null)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewSort, setReviewSort] = useState('newest')
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState('')
  const isMaintenance = room?.status === 'maintenance'

  useEffect(() => {
    setLoading(true)
    axios.get(`${API_BASE}/rooms/${id}`)
      .then(({ data }) => setRoom(data.room))
      .catch((requestError) => setError(getErrorMessage(requestError, 'Crypt not found.')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!room?._id) return
    let active = true
    setReviewsLoading(true)
    setReviewsError('')
    axios.get(`${API_BASE}/rooms/${room._id}/reviews`, { params: { page: reviewPage, limit: 5, sort: reviewSort } })
      .then(({ data }) => { if (active) setReviewResult(data) })
      .catch((requestError) => { if (active) setReviewsError(getErrorMessage(requestError, 'Reviews could not be loaded.')) })
      .finally(() => { if (active) setReviewsLoading(false) })
    return () => { active = false }
  }, [room?._id, reviewPage, reviewSort])

  useEffect(() => {
    if (!room) return
    const params = new URLSearchParams(location.search)
    const checkIn = params.get('checkIn') ? new Date(params.get('checkIn')) : null
    const checkOut = params.get('checkOut') ? new Date(params.get('checkOut')) : null
    const toLocal = (date) => date && !Number.isNaN(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : ''
    const guests = Math.min(room.capacity, Math.max(1, Number(params.get('guests')) || 1))
    setBooking({ checkIn: toLocal(checkIn) || defaultLocalDateTime(1, '18:00'), checkOut: toLocal(checkOut) || defaultLocalDateTime(2, '06:00'), guests })
  }, [room, location.search])

  const validation = validateDateRange(booking.checkIn, booking.checkOut)

  useEffect(() => {
    if (!room || isMaintenance || validation) { setAvailability(null); setChecking(false); return undefined }
    setChecking(true)
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/rooms/${id}/availability`, { params: { checkIn: new Date(booking.checkIn).toISOString(), checkOut: new Date(booking.checkOut).toISOString(), guests: booking.guests } })
        setAvailability(data)
        setError('')
      } catch (requestError) {
        setAvailability(null)
        setError(getErrorMessage(requestError, 'Availability could not be checked.'))
      } finally { setChecking(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [booking.checkIn, booking.checkOut, booking.guests, id, isMaintenance, room, validation])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') setLightbox(false)
      if (!lightbox || images.length < 2) return
      if (event.key === 'ArrowRight') setActiveImage((current) => (current + 1) % images.length)
      if (event.key === 'ArrowLeft') setActiveImage((current) => (current - 1 + images.length) % images.length)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const images = useMemo(() => getRoomImages(room), [room])
  const nights = validation ? 0 : Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / 86400000))
  const totalPrice = nights * (room?.pricePerNight || 0)
  const reviewSummary = reviewResult?.summary || { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }

  async function toggleSaved() {
    if (!user) { onAuth('/signin', location.pathname + location.search); return }
    try {
      const { data } = await axios.post(`${API_BASE}/users/saved/${room._id || room.id}`, {}, authConfig())
      setSaved(data.saved)
    } catch (requestError) { setError(getErrorMessage(requestError, 'Saved crypts could not be updated.')) }
  }

  async function reserve() {
    if (validation) { setError(validation); return }
    if (!user) { onAuth('/signin', location.pathname + location.search); return }
    if (isMaintenance || availability?.available === false) return
    setSubmitting(true); setError('')
    try {
      const { data } = await axios.post(`${API_BASE}/reservations`, { room: room.id || room._id, checkIn: new Date(booking.checkIn).toISOString(), checkOut: new Date(booking.checkOut).toISOString(), guests: Number(booking.guests), specialRequests }, authConfig())
      setMessage(`Reservation confirmed for ${data.reservation.nights} night(s), totaling ${formatPHP(data.reservation.totalPrice)}.`)
      setAvailability({ available: true })
    } catch (requestError) {
      if (requestError.response?.status === 409) setAvailability(null)
      setError(getErrorMessage(requestError, 'The reservation could not be completed.'))
    } finally { setSubmitting(false) }
  }

  function updateGuests(amount) {
    setBooking((current) => ({ ...current, guests: Math.min(room.capacity, Math.max(1, Number(current.guests) + amount)) }))
  }

  if (loading) return <main className="paper-texture min-h-screen px-5 py-10 text-center"><div className="detail-skeleton mx-auto max-w-6xl" /></main>
  if (!room) return <main className="paper-texture flex min-h-screen items-center justify-center px-5 text-center"><div><h1 className="font-display text-4xl uppercase">Crypt not found</h1><p className="mt-3 text-sm text-ink/65">That chamber has vanished into the mist.</p><Link to="/crypts" className="mt-6 inline-block bg-ink px-5 py-3 text-xs uppercase tracking-widest text-parchment">Back to crypts</Link></div></main>

  return <main className="paper-texture min-h-screen px-5 pb-24 pt-10 sm:px-10 lg:px-16">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-widest text-ink/60"><div><Link to="/" className="hover:text-crimson">Home</Link><span className="mx-2">/</span><Link to="/crypts" className="hover:text-crimson">Crypts</Link><span className="mx-2">/</span><span>{room.name}</span></div><button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 hover:text-crimson"><ArrowLeft size={14} /> Back to crypts</button></div>
      {isMaintenance && <div role="status" className="mt-6 border border-gold/50 bg-[#211a20] px-5 py-4 font-display text-lg uppercase tracking-wide text-gold">This crypt is closed for repairs</div>}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="room-detail-hero" onClick={() => images.length && setLightbox(true)} role={images.length ? 'button' : undefined} tabIndex={images.length ? 0 : undefined} onKeyDown={(event) => { if (images.length && (event.key === 'Enter' || event.key === ' ')) setLightbox(true) }}>
            {images[activeImage] ? <img src={images[activeImage]} alt={`${room.name} interior`} onError={() => setActiveImage(-1)} /> : <Placeholder name={room.name} />}
            {images.length > 1 && <><button type="button" aria-label="Previous room image" className="gallery-arrow left-3" onClick={(event) => { event.stopPropagation(); setActiveImage((current) => (current - 1 + images.length) % images.length) }}><ChevronLeft size={20} /></button><button type="button" aria-label="Next room image" className="gallery-arrow right-3" onClick={(event) => { event.stopPropagation(); setActiveImage((current) => (current + 1) % images.length) }}><ChevronRight size={20} /></button></>}
            {images.length > 1 && <button type="button" className="gallery-zoom" aria-label="Zoom image" onClick={(event) => { event.stopPropagation(); setLightbox(true) }}><Maximize2 size={16} /></button>}
          </div>
          {images.length > 1 && <div className="mt-3 grid grid-cols-4 gap-2">{images.map((image, index) => <button type="button" key={image} className={`gallery-thumb ${index === activeImage ? 'active' : ''}`} onClick={() => setActiveImage(index)}><img src={image} alt={`${room.name} view ${index + 1}`} /></button>)}</div>}
        </section>
        <section className="room-detail-info">
          <div className="flex items-start justify-between gap-4"><div><p className="detail-eyebrow">{room.category || room.type}</p><h1 className="mt-2 font-display text-4xl uppercase leading-none text-ink sm:text-5xl">{room.name}</h1><div className="mt-4 flex items-center gap-2 text-gold"><span className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= (reviewSummary.count ? reviewSummary.average : room.rating) ? 'currentColor' : 'none'} />)}</span><span className="text-sm text-ink/65">{Number(reviewSummary.count ? reviewSummary.average : room.rating || 0).toFixed(1)}{reviewSummary.count ? ` · ${reviewSummary.count} review${reviewSummary.count === 1 ? '' : 's'}` : ''}</span></div></div><button type="button" aria-label={saved ? 'Remove from saved crypts' : 'Save crypt'} className="save-room-button" onClick={toggleSaved}><Heart size={20} fill={saved ? 'currentColor' : 'none'} /></button></div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-crimson">{room.sizeSqFt} SQ FT / {room.tagline}</p><p className="mt-5 text-sm leading-7 text-ink/70">{room.description}</p>
          <div className="detail-facts mt-7">{[[<BedDouble />, `${formatPHP(room.pricePerNight)} / night`], [<Users />, `Up to ${room.capacity} monsters`], [<BedDouble />, room.bedsLabel], [<Maximize2 />, `${room.sizeSqFt} sq ft`]].map(([icon, text]) => <div key={text}>{icon}<span>{text}</span></div>)}</div>
          <h2 className="mt-8 font-display text-2xl uppercase">Amenities</h2><div className="amenity-grid mt-4">{room.amenities.map((amenity) => <span key={amenity}><Sparkles size={14} />{amenity}</span>)}</div>
        </section>
      </div>
      <fieldset disabled={isMaintenance} className="stay-panel mt-12 min-w-0 border-0 p-0">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="detail-eyebrow">Your nocturnal itinerary</p><h2 className="mt-1 font-display text-3xl uppercase text-parchment">Plan your stay</h2></div><span className="text-xs uppercase tracking-widest text-parchment/55">Dusk to dawn</span></div>
        <div className="mt-6 grid gap-3 lg:grid-cols-[1.25fr_1.25fr_0.8fr]"><div className="stay-cell"><DateTimePicker variant="booking" id="detail-check-in" label="CHECK-IN · DUSK" value={booking.checkIn} onChange={(value) => setBooking({ ...booking, checkIn: value })} min={new Date().toISOString().slice(0, 10)} /></div><div className="stay-cell"><DateTimePicker variant="booking" id="detail-check-out" label="CHECK-OUT · DAWN" value={booking.checkOut} onChange={(value) => setBooking({ ...booking, checkOut: value })} min={booking.checkIn?.slice(0, 10)} /></div><div className="stay-cell"><span className="booking-label">MONSTERS</span><div className="booking-stepper mt-4" role="group" aria-label="Number of monsters" tabIndex="0" onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') updateGuests(-1); if (event.key === 'ArrowRight' || event.key === 'ArrowUp') updateGuests(1) }}><button type="button" aria-label="Decrease monsters" onClick={() => updateGuests(-1)} disabled={booking.guests <= 1}><span>−</span></button><span aria-live="polite">{booking.guests}</span><button type="button" aria-label="Increase monsters" onClick={() => updateGuests(1)} disabled={booking.guests >= room.capacity}><span>+</span></button></div><p className="mt-2 text-xs text-parchment/55">Fits up to {room.capacity} monsters</p></div></div>
        {booking.guests >= room.capacity && <p className="mt-3 text-xs text-gold" aria-live="polite">This crypt fits up to {room.capacity} monsters.</p>}
        {validation && <p className="booking-error mt-3" aria-live="polite">{validation}</p>}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]"><div aria-live="polite" className="text-sm">{checking ? <p className="text-gold">Checking the shadows...</p> : availability?.available ? <p className="text-emerald-300">Available for these hours.</p> : availability?.conflicts?.length ? <div className="text-red-300"><p>Not available for those hours.</p>{availability.conflicts.map((conflict) => <p key={conflict._id}>{formatConflict(conflict)}</p>)}</div> : null}<label className="mt-4 block text-xs uppercase tracking-widest text-parchment/60">Special requests (optional)<textarea className="mt-2 min-h-20 w-full border border-parchment/20 bg-[#0f0b14] p-3 text-sm text-parchment outline-none focus:border-gold" value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} placeholder="Tell the keepers anything useful." /></label></div><div className="price-summary" aria-live="polite"><p><span>Dusk</span><strong>{booking.checkIn ? formatDateTime(booking.checkIn) : 'Choose a time'}</strong></p><p><span>Dawn</span><strong>{booking.checkOut ? formatDateTime(booking.checkOut) : 'Choose a time'}</strong></p><p><span>Stay</span><strong>{nights ? `${formatPHP(room.pricePerNight)} x ${nights} night${nights === 1 ? '' : 's'}` : 'Dates required'}</strong></p><p className="price-total"><span>Total</span><strong>{formatPHP(totalPrice)}</strong></p><button type="button" className="booking-submit mt-4 w-full" onClick={reserve} disabled={isMaintenance || submitting || Boolean(validation) || checking || availability?.available === false}>{submitting ? 'Reserving...' : user ? 'Reserve' : 'Sign in to reserve'} <ArrowRight size={16} /></button></div></div>
      </fieldset>
      <section className="room-reviews-section" aria-labelledby="room-reviews-heading">
        <div className="room-reviews-heading">
          <div><p className="detail-eyebrow">Guest experiences</p><h2 id="room-reviews-heading">Reviews</h2></div>
          <label>Sort reviews
            <select value={reviewSort} onChange={(event) => { setReviewSort(event.target.value); setReviewPage(1) }}>
              <option value="newest">Newest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option>
            </select>
          </label>
        </div>
        {reviewSummary.count > 0 && <div className="room-review-summary">
          <div className="room-review-average"><strong>{reviewSummary.average.toFixed(1)}</strong><span className="review-stars-static" aria-label={`${reviewSummary.average} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={17} fill={star <= Math.round(reviewSummary.average) ? 'currentColor' : 'none'} />)}</span><span>{reviewSummary.count} review{reviewSummary.count === 1 ? '' : 's'}</span></div>
          <div className="room-review-distribution" aria-label="Rating distribution">
            {[5, 4, 3, 2, 1].map((rating) => <div key={rating}><span>{rating} star</span><span className="review-distribution-track"><span style={{ width: `${reviewSummary.count ? reviewSummary.distribution[rating] / reviewSummary.count * 100 : 0}%` }} /></span><span>{reviewSummary.distribution[rating]}</span></div>)}
          </div>
        </div>}
        {reviewsError && <p className="room-reviews-error" role="alert">{reviewsError}</p>}
        {reviewsLoading && <p className="room-reviews-message" aria-live="polite">Loading reviews…</p>}
        {!reviewsLoading && !reviewsError && !reviewSummary.count && <p className="room-reviews-message">No reviews yet. Be the first monster to share a stay.</p>}
        {!reviewsLoading && reviewResult?.items?.map((review) => <article className="room-review-card" key={review.reviewId}>
          <div className="room-review-card-heading"><div><strong>{review.displayName}</strong><span>Stayed {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(review.stayCheckIn))}</span></div><div><span className="review-stars-static" aria-label={`${review.overall} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= review.overall ? 'currentColor' : 'none'} />)}</span><time>{formatDateTime(review.createdAt)}</time></div></div>
          {review.comment && <p>{review.comment}</p>}
          {review.edited && <small>Edited {formatDateTime(review.updatedAt)}</small>}
        </article>)}
        {reviewResult?.totalPages > 1 && <nav className="room-reviews-pagination" aria-label="Review pages">
          <button type="button" disabled={reviewPage <= 1} onClick={() => setReviewPage((page) => page - 1)}>Previous</button><span>Page {reviewPage} of {reviewResult.totalPages}</span><button type="button" disabled={reviewPage >= reviewResult.totalPages} onClick={() => setReviewPage((page) => page + 1)}>Next</button>
        </nav>}
      </section>
      {error && <Toast error={error} />}<Toast message={message} />
    </div>
    {lightbox && images[activeImage] && <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${room.name} gallery`} onClick={() => setLightbox(false)}><button type="button" aria-label="Close gallery" onClick={() => setLightbox(false)}><X /></button><img src={images[activeImage]} alt={`${room.name} interior`} onClick={(event) => event.stopPropagation()} /></div>}
  </main>
}
