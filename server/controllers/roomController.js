import Room from '../models/Room.js'
import Reservation from '../models/Reservation.js'
import mongoose from 'mongoose'
import { CLEANING_BUFFER_MINUTES } from '../config/defaults.js'
import { DEFAULT_CHECKIN_TIME, DEFAULT_CHECKOUT_TIME, MIN_STAY_HOURS } from '../config/defaults.js'

function normalizeDate(value, time) {
  if (typeof value !== 'string') return null
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${time}:00.000Z` : value
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

const activeReservations = (checkIn, checkOut) => ({
  status: 'confirmed',
  checkIn: { $lt: checkOut },
  checkOut: { $gt: checkIn },
})
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
  if (room.status !== 'available') return res.json({ available: false, maintenance: true, conflicts: [], room: publicRoom(room) })
  const start = normalizeDate(checkIn, DEFAULT_CHECKIN_TIME)
  const end = normalizeDate(checkOut, DEFAULT_CHECKOUT_TIME)
  if (start && end && end <= start && /^\d{4}-\d{2}-\d{2}$/.test(checkOut || '')) end.setUTCDate(end.getUTCDate() + 1)
  const guestCount = Number(guests)
  if (!start || !end || start >= end || end - start < MIN_STAY_HOURS * 3600000 || start <= new Date() || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > room.capacity) {
    return res.status(400).json({ message: 'Valid checkIn and checkOut dates are required.' })
  }
  const bufferedStart = new Date(start.getTime() - CLEANING_BUFFER_MINUTES * 60000)
  const bufferedEnd = new Date(end.getTime() + CLEANING_BUFFER_MINUTES * 60000)
  const conflicts = await Reservation.find({ room: room._id, ...activeReservations(bufferedStart, bufferedEnd) }).select('_id checkIn checkOut status').lean()
  return res.json({ available: conflicts.length === 0, conflicts, room: publicRoom(room) })
}

export async function availableRooms(req, res) {
  const { checkIn, checkOut, guests = 1, type } = req.query
  const start = normalizeDate(checkIn, DEFAULT_CHECKIN_TIME)
  const end = normalizeDate(checkOut, DEFAULT_CHECKOUT_TIME)
  if (start && end && end <= start && /^\d{4}-\d{2}-\d{2}$/.test(checkOut || '')) end.setUTCDate(end.getUTCDate() + 1)
  const guestCount = Number(guests)
  if (!start || !end || start >= end || end - start < MIN_STAY_HOURS * 3600000 || start <= new Date() || !Number.isInteger(guestCount) || guestCount < 1) {
    return res.status(400).json({ message: 'Valid checkIn and checkOut dates are required.' })
  }
  const bufferedStart = new Date(start.getTime() - CLEANING_BUFFER_MINUTES * 60000)
  const bufferedEnd = new Date(end.getTime() + CLEANING_BUFFER_MINUTES * 60000)
  const conflicts = await Reservation.find({ ...activeReservations(bufferedStart, bufferedEnd) }).distinct('room')
  const filter = { status: 'available', capacity: { $gte: guestCount }, _id: { $nin: conflicts } }
  if (type) {
    if (!ROOM_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid room type.' })
    filter.type = type
  }
  const rooms = await Room.find(filter).lean()
  return res.json({ rooms: rooms.map(publicRoom) })
}
