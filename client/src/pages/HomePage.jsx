import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ChevronLeft, ChevronRight, ChevronDown, Moon, Star, Minus, Plus, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import RoomCard from '../components/RoomCard'
import DateTimePicker from '../components/DateTimePicker'
import SelectControl from '../components/SelectControl'
import { API_BASE, getErrorMessage } from '../lib/api'
import { DEFAULT_CHECKIN_TIME, DEFAULT_CHECKOUT_TIME, defaultLocalDateTime, validateDateRange } from '../lib/date'
import hotelHomepage from '../images/hotel-homepage.jpeg'

export default function HomePage({ onAuth }) {
  const [checkIn, setCheckIn] = useState(() => defaultLocalDateTime(1, DEFAULT_CHECKIN_TIME))
  const [checkOut, setCheckOut] = useState(() => defaultLocalDateTime(2, DEFAULT_CHECKOUT_TIME))
  const [type, setType] = useState('')
  const [guests, setGuests] = useState('1')
  const [error, setError] = useState('')
  const [rooms, setRooms] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [stats, setStats] = useState({ totalRooms: 0, averageRating: 0 })
  const [loading, setLoading] = useState(true)
  const [roomError, setRoomError] = useState('')
  const [page, setPage] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const navigate = useNavigate()

  async function loadHomepage() {
    setLoading(true); setRoomError('')
    try {
      const [{ data: roomData }, { data: statsData }] = await Promise.all([
        axios.get(`${API_BASE}/rooms?featured=true&limit=9`),
        axios.get(`${API_BASE}/rooms/stats`),
      ])
      setRooms(roomData.rooms || []); setRoomTypes(roomData.types || []); setStats(statsData)
    } catch (requestError) { setRoomError(getErrorMessage(requestError, 'The featured crypts could not be loaded.')) } finally { setLoading(false) }
  }
  useEffect(() => { loadHomepage() }, [])

  const cardsPerPage = 3
  const pageCount = Math.max(1, Math.ceil(rooms.length / cardsPerPage))
  const visibleRooms = useMemo(() => rooms.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage), [rooms, page])
  const dateError = validateDateRange(checkIn, checkOut)
  useEffect(() => { if (page >= pageCount) setPage(0) }, [page, pageCount])

  function searchRooms(event) {
    event.preventDefault()
    const validation = validateDateRange(checkIn, checkOut)
    if (validation) { setError(validation); return }
    if (!guests || Number(guests) < 1) { setError('At least one guest is required.'); return }
    setError('')
    const params = new URLSearchParams({ guests })
    params.set('checkIn', new Date(checkIn).toISOString()); params.set('checkOut', new Date(checkOut).toISOString())
    if (type) params.set('type', type)
    navigate(`/crypts?${params}`)
  }

  function adjustGuests(amount) {
    setGuests(String(Math.min(12, Math.max(1, Number(guests || 1) + amount))))
  }

  return <div className="min-h-screen bg-parchment text-ink">
    <header className="hero relative min-h-[580px] text-parchment" style={{ '--hero-image': `url("${hotelHomepage}")` }}>
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pt-24 text-center sm:pt-28"><div className="flex items-center gap-1 text-gold">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" />)}</div><p className="mt-3 text-[9px] font-bold uppercase tracking-[0.28em]">Luxury for the undead &amp; monster kind</p><h1 className="mt-4 font-display text-4xl uppercase leading-tight text-gold sm:text-6xl">The best human-free hotel<br />in Moonstoria</h1><Link to="/crypts" className="mt-6 border border-gold bg-wine px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-parchment">Enter if you dare</Link></div>
      <form onSubmit={searchRooms} className={`booking-bar ${dateError ? 'booking-bar-invalid' : ''}`}><div className="booking-cell"><DateTimePicker variant="booking" id="check-in-dusk" label="CHECK-IN · DUSK" value={checkIn} min={new Date().toISOString().slice(0, 10)} onChange={setCheckIn} /></div><div className="booking-cell"><DateTimePicker variant="booking" id="check-out-dawn" label="CHECK-OUT · DAWN" value={checkOut} min={checkIn?.slice(0, 10)} onChange={setCheckOut} /></div><label className="booking-cell booking-select-cell" htmlFor="room-type"><span className="booking-label">ROOM TYPE</span><span className="booking-select-wrap"><SelectControl indicator={false} id="room-type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All crypts</option>{roomTypes.map((item) => <option key={item} value={item}>{item}</option>)}</SelectControl><ChevronDown size={14} aria-hidden="true" /></span></label><div className="booking-cell"><span className="booking-label">GUESTS</span><div className="booking-stepper" role="group" aria-label="Number of guests" tabIndex="0" onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); adjustGuests(-1) } if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); adjustGuests(1) } }}><button type="button" aria-label="Decrease guests" onClick={() => adjustGuests(-1)} disabled={Number(guests) <= 1}><Minus size={14} /></button><span aria-live="polite">{guests} {Number(guests) === 1 ? 'guest' : 'guests'}</span><button type="button" aria-label="Increase guests" onClick={() => adjustGuests(1)} disabled={Number(guests) >= 12}><Plus size={14} /></button></div></div><button type="submit" disabled={Boolean(dateError)} className="booking-submit">Book now <ArrowRight size={16} /></button>{(error || dateError) && <span className="booking-error" aria-live="polite">{error || dateError}</span>}</form>
    </header>
    <main>
      <section id="rooms" className="paper-texture relative px-5 pb-20 pt-36 sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl"><div className="mx-auto max-w-xl text-center"><div className="bat-mark mx-auto mb-4"><Moon size={23} fill="currentColor" /></div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink/70">Moonstoria&apos;s crypts &amp; suites</p><h2 className="mt-2 font-display text-3xl uppercase leading-tight sm:text-4xl">Hand-tailored for night owls</h2><p className="mx-auto mt-3 max-w-md text-xs leading-5 text-ink/70">Find a gothic retreat made for unforgettable nights beneath the moon.</p></div>
        {loading ? <div className="mt-10 grid gap-5 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse bg-ink/15" />)}</div> : roomError ? <div className="mt-10 text-center text-sm">{roomError}<button onClick={loadHomepage} className="ml-3 underline">Retry</button></div> : rooms.length === 0 ? <p className="mt-10 text-center text-sm">No crypts are open right now.</p> : <><div className="relative mt-10" onTouchStart={(event) => setTouchStart(event.changedTouches[0].clientX)} onTouchEnd={(event) => { if (touchStart === null) return; const distance = event.changedTouches[0].clientX - touchStart; if (Math.abs(distance) > 40) setPage((current) => distance < 0 ? (current + 1) % pageCount : (current - 1 + pageCount) % pageCount); setTouchStart(null) }}><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visibleRooms.map((room) => <RoomCard key={room._id} room={room} featured onAuth={onAuth} />)}</div>{pageCount > 1 && <><button aria-label="Previous featured rooms" onClick={() => setPage((current) => (current - 1 + pageCount) % pageCount)} className="absolute -left-4 top-1/2 rounded-full bg-ink p-2 text-parchment"><ChevronLeft size={16} /></button><button aria-label="Next featured rooms" onClick={() => setPage((current) => (current + 1) % pageCount)} className="absolute -right-4 top-1/2 rounded-full bg-ink p-2 text-parchment"><ChevronRight size={16} /></button></>}</div><div className="mt-7 flex justify-center gap-2">{Array.from({ length: pageCount }, (_, index) => <button key={index} aria-label={`Featured rooms page ${index + 1}`} onClick={() => setPage(index)} className={`h-2 w-2 rounded-full border border-ink ${index === page ? 'bg-ink' : ''}`} />)}</div></>}</div></section>
      <section className="paper-texture border-t border-ink/20 px-5 py-20 sm:px-10 lg:px-16"><div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2"><div className="sanctuary-image relative mx-auto h-80 w-full max-w-sm"><div className="absolute inset-3 border border-parchment/50" /><span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.25em] text-parchment/70">The royal resting chamber</span></div><div className="max-w-md"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-ink/60">Luxury hotel and resort</p><h2 className="mt-3 font-display text-3xl uppercase leading-tight">The best gothic sanctuary in Moonstoria</h2><p className="mt-4 text-sm leading-6 text-ink/70">A moonlit retreat for every beloved creature of the night. Come for the crypts, stay for the legendary hospitality.</p><div className="mt-6 flex gap-10 border-y border-ink/25 py-4"><div><strong className="block font-display text-3xl">{stats.totalRooms >= 250 ? `${stats.totalRooms}+` : stats.totalRooms}</strong><span className="text-[10px]">Crypts &amp; Dens</span></div><div><strong className="block font-display text-3xl">{Number(stats.averageRating || 0).toFixed(1)}</strong><span className="text-[10px]">Guest Scream Ratings</span></div></div><Link to="/crypts" className="mt-5 inline-block bg-ink px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-parchment hover:bg-crimson">Explore the castle</Link></div></div></section>
    </main>
  </div>
}
