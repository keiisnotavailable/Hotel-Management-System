import { Heart, Star, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE, authConfig, getErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getRoomImage } from '../utils/roomImages'
import { formatPHP } from '../lib/currency'

export default function RoomCard({ room, saved = false, onSaved, featured = false, onAuth }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSaved, setIsSaved] = useState(saved)
  const [imageFailed, setImageFailed] = useState(false)
  const image = getRoomImage(room)
  const rating = Math.max(0, Math.min(5, Number(room.rating ?? 5)))

  async function toggleSaved(event) {
    event.stopPropagation()
    event.preventDefault()
    if (!user) {
      onAuth?.('/signin')
      return
    }
    try {
      const { data } = await axios.post(`${API_BASE}/users/saved/${room._id || room.id}`, {}, authConfig())
      setIsSaved(data.saved)
      onSaved?.(room, data.saved)
    } catch (error) {
      console.error(getErrorMessage(error, 'Saved crypts could not be updated.'))
    }
  }

  function openRoom() {
    navigate(`/crypts/${room.slug || room._id}`)
  }

  return (
    <article className={`room-card group overflow-hidden border border-ink/50 bg-[#211a20] text-parchment outline-none transition hover:-translate-y-1 hover:border-gold focus-visible:ring-2 focus-visible:ring-gold ${featured ? 'min-w-0' : ''}`} tabIndex="0" role="link" onClick={openRoom} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRoom() } }}>
      <div className="relative h-48 overflow-hidden bg-[#302532]">
        {image && !imageFailed ? <img src={image} alt={`${room.name} interior`} onError={() => setImageFailed(true)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="room-illustration h-full"><span className="absolute inset-0 grid place-items-center font-display text-4xl text-gold/60">☾</span></div>}
        <span className="absolute right-2 top-2 bg-[#211a20] px-2 py-1 text-[8px] font-bold">{formatPHP(room.pricePerNight)} / NIGHT</span>
        <button type="button" aria-label={isSaved ? 'Remove from saved crypts' : 'Save crypt'} className="absolute left-3 top-3 rounded-full bg-[#211a20]/80 p-2 text-gold hover:bg-wine" onClick={toggleSaved}><Heart size={15} fill={isSaved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="p-4">
        <p className="text-[8px] uppercase tracking-widest text-parchment/60">{room.category || `${room.type} room`}</p>
        <h3 className="mt-1 font-display text-xl leading-tight">{room.name}</h3>
        {featured ? <p className="mt-2 text-[10px] uppercase tracking-widest text-parchment/65">{room.sizeSqFt ? `${room.sizeSqFt} SQ FT / ` : ''}{room.tagline || 'NOISELESS'}</p> : <div className="mt-3 flex items-center gap-2 text-xs text-parchment/70"><Users size={14} /> Up to {room.capacity} guests</div>}
        <div className="mt-3 flex flex-wrap gap-1">{room.amenities?.slice(0, 3).map((amenity) => <span key={amenity} className="border border-gold/30 px-2 py-1 text-[9px] text-gold">{amenity}</span>)}</div>
        <div className="mt-4 flex items-center justify-between"><span className="text-xs text-parchment/70">{room.bedsLabel || `Up to ${room.capacity} guests`}</span><span className="flex text-gold" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={12} fill={star <= rating ? 'currentColor' : 'none'} />)}</span></div>
        {!featured && <span className="mt-4 inline-block bg-crimson px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-parchment">View Crypt</span>}
      </div>
    </article>
  )
}
