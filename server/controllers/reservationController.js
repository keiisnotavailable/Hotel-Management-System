import Room from '../models/Room.js'
import Reservation from '../models/Reservation.js'
import { calculatePrice, checkAvailability, validateReservationInput } from '../services/reservationService.js'
import { syncReservationStatuses } from '../services/reservationLifecycleService.js'

function publicReservation(reservation) { return reservation.toObject({ versionKey: false }) }

export async function createReservation(req, res) {
  const { room, checkIn, checkOut, guests = 1, specialRequests = '' } = req.body
  const initialValidation = validateReservationInput({
    checkIn,
    checkOut,
    validateGuests: false,
    dateErrorMessage: 'checkIn and checkOut must be valid ISO UTC dates.',
  })
  if (initialValidation.error) return res.status(initialValidation.error.status).json({ message: initialValidation.error.message })

  const roomDoc = await Room.findById(room)
  if (!roomDoc) return res.status(404).json({ message: 'Room not found.' })
  const validation = validateReservationInput({ room: roomDoc, checkIn, checkOut, guests })
  if (validation.error) return res.status(validation.error.status).json({ message: validation.error.message })
  const { checkIn: start, checkOut: end, guests: guestCount } = validation.value
  const availability = await checkAvailability({ roomId: roomDoc._id, checkIn: start, checkOut: end })
  if (!availability.available) return res.status(409).json({ message: 'That room is not available for those dates.' })
  const { nights, totalPrice } = calculatePrice(roomDoc, start, end)
  const reservation = await Reservation.create({
    user: req.user._id,
    room: roomDoc._id,
    roomName: roomDoc.name,
    roomSlug: roomDoc.slug,
    userName: req.user.name,
    userEmail: req.user.email,
    checkIn: start,
    checkOut: end,
    status: 'upcoming',
    nights,
    totalPrice,
    guests: guestCount,
    specialRequests,
  })
  return res.status(201).json({ reservation: publicReservation(reservation) })
}

function reservationWithSnapshotFallback(reservation) {
  const value = reservation.toObject({ versionKey: false })
  if (!value.room) value.room = { name: value.roomName, slug: value.roomSlug }
  if (!value.user) value.user = { name: value.userName, email: value.userEmail }
  return value
}

export async function listReservations(req, res) {
  await syncReservationStatuses()
  const reservations = await Reservation.find({ user: req.user._id })
    .populate('room')
    .populate('user', 'name email')
    .sort({ checkIn: -1 })
  return res.json({ reservations: reservations.map(reservationWithSnapshotFallback) })
}

export async function getReservation(req, res) {
  let reservation = await Reservation.findById(req.params.id).populate('room').populate('user', 'name email')
  if (!reservation) return res.status(404).json({ message: 'Reservation not found.' })
  const reservationUserId = reservation.user?._id || reservation.user
  if (reservationUserId?.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You do not have access to this reservation.' })
  await syncReservationStatuses({ id: reservation._id })
  reservation = await Reservation.findById(req.params.id).populate('room').populate('user', 'name email')
  return res.json({ reservation: reservationWithSnapshotFallback(reservation) })
}

export async function cancelReservation(req, res) {
  await syncReservationStatuses({ id: req.params.id })
  const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id })
  if (!reservation) return res.status(404).json({ message: 'Reservation not found.' })
  if (!['confirmed', 'upcoming'].includes(reservation.status)) return res.status(400).json({ message: 'This reservation cannot be cancelled.' })
  if (reservation.checkIn <= new Date()) return res.status(400).json({ message: 'Reservations cannot be cancelled after check-in.' })
  reservation.status = 'cancelled'
  reservation.cancelledBy = 'guest'
  reservation.cancelledAt = new Date()
  await reservation.save()
  await reservation.populate([{ path: 'room' }, { path: 'user', select: 'name email' }])
  return res.json({ reservation: reservationWithSnapshotFallback(reservation) })
}
