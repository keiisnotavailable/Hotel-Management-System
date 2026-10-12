import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import RoomCard from '../components/RoomCard'
import { API_BASE, authConfig, getErrorMessage } from '../lib/api'

export default function SavedCryptsPage({ onAuth }) {
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  useEffect(() => { axios.get(`${API_BASE}/users/saved`, authConfig()).then(({ data }) => setRooms(data.rooms || data.savedRooms || [])).catch((requestError) => setError(getErrorMessage(requestError, 'Saved crypts could not be loaded.'))) }, [])
  return <div className="min-h-screen bg-parchment text-ink"><Navbar /><main className="paper-texture min-h-[70vh] px-5 py-20 sm:px-10"><div className="mx-auto max-w-6xl"><h1 className="font-display text-4xl uppercase">Saved Crypts</h1>{error && <p className="mt-6 text-red-800">{error}</p>}{!error && rooms.length === 0 && <p className="mt-6 text-sm text-ink/70">You have not saved a crypt yet.</p>}<div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => <RoomCard key={room._id} room={room} saved onSaved={(item, saved) => { if (!saved) setRooms((current) => current.filter((entry) => entry._id !== item._id)) }} onAuth={onAuth} />)}</div></div></main></div>
}
