import Reservation from '../models/Reservation.js'

export async function syncReservationStatuses({ now = new Date(), id } = {}) {
  const scope = id ? { _id: id } : {}
  await Reservation.updateMany(
    { ...scope, status: { $nin: ['completed', 'cancelled'] }, checkOut: { $lte: now } },
    { $set: { status: 'completed', completedAt: now } },
  )
  await Reservation.updateMany(
    { ...scope, status: { $nin: ['upcoming', 'completed', 'cancelled'] }, checkOut: { $gt: now } },
    { $set: { status: 'upcoming' }, $unset: { completedAt: 1 } },
  )
  await Reservation.updateMany(
    { ...scope, status: 'completed', $or: [{ completedAt: { $exists: false } }, { completedAt: null }] },
    { $set: { completedAt: now } },
  )
}
