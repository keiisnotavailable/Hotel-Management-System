import Reservation from '../models/Reservation.js'
import { CLEANING_BUFFER_MINUTES, DEFAULT_CHECKIN_TIME, DEFAULT_CHECKOUT_TIME, MIN_STAY_HOURS } from '../config/defaults.js'

function normalizeDate(value, time) {
  if (typeof value !== 'string') return null
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${time}:00.000Z` : value
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export function validateReservationInput({
  room,
  checkIn,
  checkOut,
  guests = 1,
  dateErrorMessage = 'Valid checkIn and checkOut dates are required.',
  guestErrorMessage = 'Guest count exceeds room capacity.',
  validateGuests = true,
  maintenanceFirst = false,
}) {
  if (maintenanceFirst && room && room.status !== 'available') {
    return { error: { status: 409, message: 'This room is under maintenance' } }
  }

  const start = normalizeDate(checkIn, DEFAULT_CHECKIN_TIME)
  const end = normalizeDate(checkOut, DEFAULT_CHECKOUT_TIME)
  if (start && end && end <= start && /^\d{4}-\d{2}-\d{2}$/.test(checkOut || '')) {
    end.setUTCDate(end.getUTCDate() + 1)
  }
  if (!start || !end || end <= start) {
    return { error: { status: 400, message: dateErrorMessage } }
  }
  if (start <= new Date()) {
    return { error: { status: 400, message: 'Check-in must be in the future.' } }
  }
  if ((end - start) / 3600000 < MIN_STAY_HOURS) {
    return { error: { status: 400, message: `A stay must be at least ${MIN_STAY_HOURS} hours.` } }
  }

  if (room && room.status !== 'available') {
    return { error: { status: 409, message: 'This room is under maintenance' } }
  }
  const guestCount = Number(guests)
  if (validateGuests && (!Number.isInteger(guestCount) || guestCount < 1 || (room && guestCount > room.capacity))) {
    return { error: { status: 400, message: guestErrorMessage } }
  }

  return { value: { checkIn: start, checkOut: end, guests: guestCount } }
}

export async function checkAvailability({ roomId, checkIn, checkOut, excludeReservationId }) {
  const bufferedStart = new Date(checkIn.getTime() - CLEANING_BUFFER_MINUTES * 60000)
  const bufferedEnd = new Date(checkOut.getTime() + CLEANING_BUFFER_MINUTES * 60000)
  const filter = {
    status: 'confirmed',
    checkIn: { $lt: bufferedEnd },
    checkOut: { $gt: bufferedStart },
  }
  if (roomId) filter.room = roomId
  if (excludeReservationId) filter._id = { $ne: excludeReservationId }

  const conflicts = await Reservation.find(filter).select(roomId ? '_id checkIn checkOut status' : 'room').lean()
  return {
    available: conflicts.length === 0,
    conflicts,
    roomIds: roomId
      ? conflicts.length ? [roomId] : []
      : [...new Map(conflicts.filter(({ room }) => room).map(({ room }) => [room.toString(), room])).values()],
  }
}

export function calculatePrice(room, checkIn, checkOut) {
  const nights = Math.ceil((checkOut - checkIn) / 86400000)
  return { nights, totalPrice: nights * room.pricePerNight }
}
