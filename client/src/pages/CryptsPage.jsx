import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import RoomCard from '../components/RoomCard'
import SelectControl from '../components/SelectControl'
import { API_BASE, getErrorMessage } from '../lib/api'

export default function CryptsPage() {
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ search: params.get('search') || '', type: params.get('type') || '', capacity: params.get('guests') || '', sort: 'price_asc', page: 1 })
  const [rooms, setRooms] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const endpoint = params.get('checkIn') && params.get('checkOut') ? `${API_BASE}/rooms/available` : `${API_BASE}/rooms`
        const { data } = await axios.get(endpoint, { params: { ...filters, checkIn: params.get('checkIn'), checkOut: params.get('checkOut'), guests: filters.capacity } })
        setRooms(data.rooms || [])
        setPagination(data.pagination || {})
        setError('')
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'The crypt catalogue could not be loaded.'))
      } finally { setLoading(false) }
    }
    load()
  }, [filters, params])

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }))
  return (
    <main className="paper-texture min-h-screen px-5 pb-20 pt-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink/70">Moonstoria accommodations</p>
        <h1 className="mt-2 font-display text-4xl uppercase">Explore the crypts</h1>
        <div className="mt-8 grid gap-2 border border-ink/20 bg-parchment/70 p-3 sm:grid-cols-2 lg:grid-cols-6">
          <input className="border border-ink/20 bg-white/50 px-3 py-2 text-xs lg:col-span-2" placeholder="Search rooms" value={filters.search} onChange={(event) => update('search', event.target.value)} />
          <SelectControl className="border border-ink/20 bg-white/50 px-2 text-xs" value={filters.type} onChange={(event) => update('type', event.target.value)}><option value="">All types</option><option>Crypt</option><option>Den</option><option>Suite</option><option>Tower</option></SelectControl>
          <input className="border border-ink/20 bg-white/50 px-2 text-xs" type="number" min="1" placeholder="Capacity" value={filters.capacity} onChange={(event) => update('capacity', event.target.value)} />
          <SelectControl className="border border-ink/20 bg-white/50 px-2 text-xs" value={filters.sort} onChange={(event) => update('sort', event.target.value)}><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="capacity">Capacity</option></SelectControl>
        </div>
        {error && <p className="mt-6 text-sm text-crimson">{error}</p>}
        {loading ? <p className="mt-10 text-center text-sm text-ink/60">Opening the crypt catalogue...</p> : rooms.length ? <div className="mt-10 grid gap-5 md:grid-cols-3">{rooms.map((room) => <RoomCard key={room.id || room._id} room={room} />)}</div> : <p className="mt-10 text-center text-sm text-ink/60">No crypts available for those times.</p>}
        {pagination.pages > 1 && <div className="mt-8 flex justify-center gap-3"><button className="border border-ink/30 px-4 py-2 text-xs disabled:opacity-40" disabled={filters.page <= 1} onClick={() => update('page', filters.page - 1)}>Previous</button><span className="px-3 py-2 text-xs">Page {filters.page} of {pagination.pages}</span><button className="border border-ink/30 px-4 py-2 text-xs disabled:opacity-40" disabled={filters.page >= pagination.pages} onClick={() => update('page', filters.page + 1)}>Next</button></div>}
      </div>
    </main>
  )
}
