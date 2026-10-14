import Room from '../models/Room.js'
import Reservation from '../models/Reservation.js'
import { CLEANING_BUFFER_MINUTES, DEFAULT_CHECKIN_TIME, DEFAULT_CHECKOUT_TIME, MIN_STAY_HOURS } from '../config/defaults.js'

function normalizeDate(value, time) {
  if (typeof value !== 'string') return null
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${time}:00.000Z` : value
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function publicReservation(reservation) { return reservation.toObject({ versionKey: false }) }

export async function createReservation(req, res) {
  const { room, checkIn, checkOut, guests = 1, specialRequests = '' } = req.body
  const start = normalizeDate(checkIn, DEFAULT_CHECKIN_TIME)
  const end = normalizeDate(checkOut, DEFAULT_CHECKOUT_TIME)
  if (start && end && end <= start && /^\d{4}-\d{2}-\d{2}$/.test(checkOut || '')) end.setUTCDate(end.getUTCDate() + 1)
  if (!start || !end || end <= start) return res.status(400).json({ message: 'checkIn and checkOut must be valid ISO UTC dates.' })
  const durationHours = (end - start) / 3600000
  if (start <= new Date()) return res.status(400).json({ message: 'Check-in must be in the future.' })
  if (durationHours < MIN_STAY_HOURS) return res.status(400).json({ message: `A stay must be at least ${MIN_STAY_HOURS} hours.` })
  const roomDoc = await Room.findById(room)
  if (!roomDoc) return res.status(404).json({ message: 'Room not found.' })
  if (roomDoc.status !== 'available') return res.status(409).json({ message: 'This crypt is closed for repairs.' })
  const guestCount = Number(guests)
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > roomDoc.capacity) return res.status(400).json({ message: 'Guest count exceeds room capacity.' })
  const bufferedStart = new Date(start.getTime() - CLEANING_BUFFER_MINUTES * 60000)
  const bufferedEnd = new Date(end.getTime() + CLEANING_BUFFER_MINUTES * 60000)
  const conflict = await Reservation.exists({ room: roomDoc._id, status: 'confirmed', checkIn: { $lt: bufferedEnd }, checkOut: { $gt: bufferedStart } })
  if (conflict) return res.status(409).json({ message: 'That room is not available for those dates.' })
  const nights = Math.ceil(durationHours / 24)
  const reservation = await Reservation.create({ user: req.user._id, room: roomDoc._id, checkIn: start, checkOut: end, nights, totalPrice: nights * roomDoc.pricePerNight, guests: guestCount, specialRequests })
  return res.status(201).json({ reservation: publicReservation(reservation) })
}

export async function listReservations(req, res) {
  const reservations = await Reservation.find({ user: req.user._id }).populate('room').sort({ checkIn: -1 })
  return res.json({ reservations })
}

export async function getReservation(req, res) {
  const reservation = await Reservation.findById(req.params.id).populate('room')
  if (!reservation) return res.status(404).json({ message: 'Reservation not found.' })
  if (reservation.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You do not have access to this reservation.' })
  return res.json({ reservation: publicReservation(reservation) })
}

export async function cancelReservation(req, res) {
  const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id })
  if (!reservation) return res.status(404).json({ message: 'Reservation not found.' })
  if (reservation.status !== 'confirmed') return res.status(400).json({ message: 'This reservation cannot be cancelled.' })
  if (reservation.checkIn <= new Date()) return res.status(400).json({ message: 'Reservations cannot be cancelled after check-in.' })
  reservation.status = 'cancelled'
  await reservation.save()
  return res.json({ reservation })
}
