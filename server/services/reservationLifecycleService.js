import Reservation from '../models/Reservation.js'

export async function syncReservationStatuses({ now = new Date(), id } = {}) {
  const scope = id ? { _id: id } : {}
  const active = ['confirmed', 'upcoming', 'ongoing']
  await Reservation.updateMany(
    { ...scope, status: { $in: active }, checkOut: { $lte: now } },
    { $set: { status: 'completed', completedAt: now } },
  )
  await Reservation.updateMany(
    { ...scope, status: { $in: active }, checkIn: { $lte: now }, checkOut: { $gt: now } },
    { $set: { status: 'ongoing' }, $unset: { completedAt: 1 } },
  )
  await Reservation.updateMany(
    { ...scope, status: 'completed', $or: [{ completedAt: { $exists: false } }, { completedAt: null }] },
    { $set: { completedAt: now } },
  )
}
