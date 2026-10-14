import Room from '../models/Room.js'
import mongoose from 'mongoose'
import { checkAvailability, validateReservationInput } from '../services/reservationService.js'

const ROOM_TYPES = ['Crypt', 'Den', 'Suite', 'Tower']
function roomSelector(value) {
  return mongoose.isValidObjectId(value) ? { $or: [{ _id: value }, { slug: value }] } : { slug: value }
}
function publicRoom(room) {
  const value = room.toObject ? room.toObject({ versionKey: false }) : room
  return { ...value, id: value._id }
}

export async function listRooms(req, res) {
  const { type, capacity, minCapacity, maxPrice, minPrice, amenities, search, sort, featured, page = 1, limit = 12 } = req.query
  const filter = { status: 'available' }
  if (featured === 'true') filter.featured = true
  if (featured === 'false') filter.featured = false
  if (type) {
    if (!ROOM_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid room type.' })
    filter.type = type
  }
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]
  const requestedCapacity = capacity || minCapacity
  if (requestedCapacity && Number.isFinite(Number(requestedCapacity))) filter.capacity = { $gte: Number(requestedCapacity) }
  if (minPrice && Number.isFinite(Number(minPrice))) filter.pricePerNight = { ...(filter.pricePerNight || {}), $gte: Number(minPrice) }
  if (maxPrice && Number.isFinite(Number(maxPrice))) filter.pricePerNight = { ...(filter.pricePerNight || {}), $lte: Number(maxPrice) }
  if (amenities) filter.amenities = { $all: String(amenities).split(',').map((item) => item.trim()).filter(Boolean) }
  const currentPage = Math.max(1, Number(page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(limit) || 12))
  const sortOption = sort === 'price_desc'
    ? { pricePerNight: -1 }
    : sort === 'capacity'
      ? { capacity: -1 }
      : { pricePerNight: 1 }
  const [rooms, total, types] = await Promise.all([
    Room.find(filter).sort(sortOption).skip((currentPage - 1) * pageSize).limit(pageSize),
    Room.countDocuments(filter),
    Room.distinct('type', { status: 'available' }),
  ])
  return res.json({ rooms: rooms.map(publicRoom), types, pagination: { page: currentPage, limit: pageSize, total, pages: Math.ceil(total / pageSize) } })
}

export async function roomStats(_req, res) {
  const [totalRooms, ratingResult] = await Promise.all([
    Room.countDocuments({ status: 'available' }),
    Room.aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } },
    ]),
  ])
  const averageRating = ratingResult.length ? Number(ratingResult[0].averageRating.toFixed(2)) : 0
  return res.json({ totalRooms, averageRating })
}

export async function getRoom(req, res) {
  const room = await Room.findOne(roomSelector(req.params.id))
  if (!room) return res.status(404).json({ message: 'Room not found.' })
  return res.json({ room: publicRoom(room) })
}

export async function roomAvailability(req, res) {
  const { checkIn, checkOut, guests = 1 } = req.query
  const room = await Room.findOne(roomSelector(req.params.id))
  if (!room) return res.status(404).json({ message: 'Room not found.' })
  const validation = validateReservationInput({
    room,
    checkIn,
    checkOut,
    guests,
    guestErrorMessage: 'Valid checkIn and checkOut dates are required.',
    maintenanceFirst: true,
  })
  if (validation.error?.status === 409) return res.json({ available: false, maintenance: true, conflicts: [], room: publicRoom(room) })
  if (validation.error) return res.status(validation.error.status).json({ message: validation.error.message })
  const { checkIn: start, checkOut: end } = validation.value
  const availability = await checkAvailability({ roomId: room._id, checkIn: start, checkOut: end })
  return res.json({ ...availability, room: publicRoom(room) })
}

export async function availableRooms(req, res) {
  const { checkIn, checkOut, guests = 1, type } = req.query
  const validation = validateReservationInput({
    checkIn,
    checkOut,
    guests,
    guestErrorMessage: 'Valid checkIn and checkOut dates are required.',
  })
  if (validation.error) return res.status(validation.error.status).json({ message: validation.error.message })
  const { checkIn: start, checkOut: end, guests: guestCount } = validation.value
  const availability = await checkAvailability({ checkIn: start, checkOut: end })
  const filter = { status: 'available', capacity: { $gte: guestCount }, _id: { $nin: availability.roomIds } }
  if (type) {
    if (!ROOM_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid room type.' })
    filter.type = type
  }
  const rooms = await Room.find(filter).lean()
  return res.json({ rooms: rooms.map(publicRoom) })
}
