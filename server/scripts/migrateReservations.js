import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import Reservation from '../models/Reservation.js'

async function migrateReservations() {
  await connectDatabase()

  let lastId
  let migratedCount = 0
  const now = new Date()
  while (true) {
    const filter = lastId ? { _id: { $gt: lastId } } : {}
    const reservations = await Reservation.find(filter)
      .sort({ _id: 1 })
      .limit(500)
      .populate('room', 'name slug')
      .populate('user', 'name email')
      .lean()
    if (!reservations.length) break

    await Reservation.bulkWrite(reservations.map((reservation) => {
      const completed = reservation.status !== 'cancelled'
        && (reservation.status === 'completed' || reservation.checkOut <= now)
      const set = {
        roomName: reservation.roomName || reservation.room?.name || 'Unknown room',
        roomSlug: reservation.roomSlug || reservation.room?.slug || '',
        userName: reservation.userName || reservation.user?.name || 'Unknown guest',
        userEmail: reservation.userEmail || reservation.user?.email || '',
        status: reservation.status === 'cancelled' ? 'cancelled' : completed ? 'completed' : 'upcoming',
      }
      if (completed) set.completedAt = reservation.completedAt || now
      const update = { $set: set }
      if (!completed) update.$unset = { completedAt: 1 }
      return { updateOne: { filter: { _id: reservation._id }, update } }
    }))
    lastId = reservations[reservations.length - 1]._id
    migratedCount += reservations.length
  }

  console.log(`Backfilled snapshots and statuses for ${migratedCount} reservations.`)
}

migrateReservations()
  .catch((error) => {
    console.error(`Reservation migration failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
