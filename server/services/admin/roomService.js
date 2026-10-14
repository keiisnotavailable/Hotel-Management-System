import { randomUUID } from 'node:crypto'
import { access, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import Reservation from '../../models/Reservation.js'
import Room from '../../models/Room.js'
import User from '../../models/User.js'

const ROOM_TYPES = ['Crypt', 'Den', 'Suite', 'Tower']
const ROOM_STATUSES = ['available', 'maintenance']
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const uploadsDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url))
const imageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../client/src/images')
const editableFields = [
  'name', 'slug', 'type', 'category', 'tagline', 'sizeSqFt', 'bedsLabel',
  'rating', 'featured', 'description', 'pricePerNight', 'capacity',
  'amenities', 'images', 'status', 'maintenanceNote',
]

export class RoomServiceError extends Error {
  constructor(status, message, details = {}) {
    super(message)
    this.status = status
    this.details = details
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function slugify(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function validateFields(input, creating) {
  if (!isPlainObject(input)) throw new RoomServiceError(400, 'A room object is required.')
  const data = Object.fromEntries(editableFields.filter((field) => Object.hasOwn(input, field)).map((field) => [field, input[field]]))
  const required = creating ? ['name', 'type', 'pricePerNight', 'capacity'] : []
  for (const field of required) {
    if (data[field] === undefined) throw new RoomServiceError(400, `${field} is required.`)
  }

  if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim())) throw new RoomServiceError(400, 'Name is required.')
  if (data.slug !== undefined && (typeof data.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug.trim().toLowerCase()))) {
    throw new RoomServiceError(400, 'Slug must contain lowercase letters, numbers, and hyphens.')
  }
  if (data.type !== undefined && !ROOM_TYPES.includes(data.type)) throw new RoomServiceError(400, 'Invalid room type.')
  for (const field of ['category', 'tagline', 'bedsLabel', 'description', 'maintenanceNote']) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== 'string') throw new RoomServiceError(400, `${field} must be a string.`)
  }
  if (data.sizeSqFt !== undefined && data.sizeSqFt !== null && (!Number.isFinite(Number(data.sizeSqFt)) || Number(data.sizeSqFt) < 0)) {
    throw new RoomServiceError(400, 'sizeSqFt must be a non-negative number.')
  }
  if (data.rating !== undefined && (!Number.isFinite(Number(data.rating)) || Number(data.rating) < 0 || Number(data.rating) > 5)) {
    throw new RoomServiceError(400, 'Rating must be between 0 and 5.')
  }
  if (data.featured !== undefined && typeof data.featured !== 'boolean') throw new RoomServiceError(400, 'featured must be a boolean.')
  if (data.pricePerNight !== undefined && (!Number.isFinite(Number(data.pricePerNight)) || Number(data.pricePerNight) <= 0)) {
    throw new RoomServiceError(400, 'pricePerNight must be greater than 0.')
  }
  if (data.capacity !== undefined && (!Number.isInteger(Number(data.capacity)) || Number(data.capacity) < 1 || Number(data.capacity) > 20)) {
    throw new RoomServiceError(400, 'Capacity must be an integer from 1 to 20.')
  }
  if (data.amenities !== undefined && (!Array.isArray(data.amenities) || data.amenities.some((amenity) => typeof amenity !== 'string'))) {
    throw new RoomServiceError(400, 'amenities must be an array of strings.')
  }
  if (data.images !== undefined && (!Array.isArray(data.images) || data.images.some((image) => typeof image !== 'string'))) {
    throw new RoomServiceError(400, 'images must be an array of strings.')
  }
  if (data.status !== undefined && !ROOM_STATUSES.includes(data.status)) throw new RoomServiceError(400, 'Invalid room status.')

  for (const field of ['name', 'slug', 'category', 'tagline', 'bedsLabel', 'description', 'maintenanceNote']) {
    if (typeof data[field] === 'string') data[field] = data[field].trim()
  }
  for (const field of ['sizeSqFt', 'rating', 'pricePerNight', 'capacity']) {
    if (data[field] !== undefined && data[field] !== null) data[field] = Number(data[field])
  }
  if (data.slug) data.slug = data.slug.toLowerCase()
  return data
}

async function ensureUniqueName(name, excludeId) {
  const filter = { name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } }
  if (excludeId) filter._id = { $ne: excludeId }
  if (await Room.exists(filter)) throw new RoomServiceError(409, 'A room with that name already exists.')
}

async function uniqueSlug(base, excludeId) {
  const slugBase = slugify(base) || 'room'
  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? slugBase : `${slugBase}-${suffix}`
    const filter = { slug: candidate }
    if (excludeId) filter._id = { $ne: excludeId }
    if (!(await Room.exists(filter))) return candidate
  }
}

async function validateImages(images) {
  if (!images) return
  const keys = new Set(await getRoomImageKeys())
  for (const image of images) {
    if (keys.has(image)) continue
    if (!/^\/uploads\/[0-9a-f-]+\.(?:jpg|jpeg|png|webp)$/i.test(image)) {
      throw new RoomServiceError(400, `Unknown room image: ${image}`)
    }
    try {
      await access(path.join(uploadsDirectory, path.basename(image)))
    } catch {
      throw new RoomServiceError(400, `Uploaded room image does not exist: ${image}`)
    }
  }
}

function validPagination(value, fallback, maximum) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new RoomServiceError(400, `Pagination values must be integers from 1 to ${maximum}.`)
  }
  return parsed
}

function roomSort(value) {
  const sorts = {
    name: { name: 1 },
    '-name': { name: -1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
    price: { pricePerNight: 1 },
    '-price': { pricePerNight: -1 },
    pricePerNight: { pricePerNight: 1 },
    '-pricePerNight': { pricePerNight: -1 },
    price_asc: { pricePerNight: 1 },
    price_desc: { pricePerNight: -1 },
    rating: { rating: -1 },
    '-rating': { rating: 1 },
    created: { createdAt: -1 },
    createdAt: { createdAt: -1 },
    '-createdAt': { createdAt: 1 },
    status: { status: 1, name: 1 },
  }
  if (value && !sorts[value]) throw new RoomServiceError(400, 'Invalid sort value.')
  return sorts[value] || sorts.name
}

export async function listAdminRooms(query) {
  const page = validPagination(query.page, 1, Number.MAX_SAFE_INTEGER)
  const limit = validPagination(query.limit, 20, 100)
  const filter = {}
  if (query.search) filter.$or = ['name', 'slug', 'description'].map((field) => ({ [field]: { $regex: escapeRegex(String(query.search)), $options: 'i' } }))
  if (query.type) {
    if (!ROOM_TYPES.includes(query.type)) throw new RoomServiceError(400, 'Invalid room type.')
    filter.type = query.type
  }
  if (query.status) {
    if (!ROOM_STATUSES.includes(query.status)) throw new RoomServiceError(400, 'Invalid room status.')
    filter.status = query.status
  }

  const now = new Date()
  const [items, total] = await Promise.all([
    Room.aggregate([
      { $match: filter },
      { $sort: roomSort(query.sort) },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: Reservation.collection.name,
          let: { roomId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$room', '$$roomId'] } } },
            {
              $group: {
                _id: null,
                bookingCount: { $sum: 1 },
                upcomingBookingCount: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', 'confirmed'] }, { $gt: ['$checkIn', now] }] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: 'bookingStats',
        },
      },
      {
        $set: {
          id: '$_id',
          bookingCount: { $ifNull: [{ $arrayElemAt: ['$bookingStats.bookingCount', 0] }, 0] },
          upcomingBookingCount: { $ifNull: [{ $arrayElemAt: ['$bookingStats.upcomingBookingCount', 0] }, 0] },
        },
      },
      { $unset: 'bookingStats' },
    ]),
    Room.countDocuments(filter),
  ])

  return { items, page, limit, total, totalPages: Math.ceil(total / limit) }
}

export async function getAdminRoom(id) {
  if (!mongoose.isValidObjectId(id)) throw new RoomServiceError(400, 'A supplied room identifier is invalid.')
  const room = await Room.findById(id).lean()
  if (!room) throw new RoomServiceError(404, 'Room not found.')
  const now = new Date()
  const [bookingStats] = await Reservation.aggregate([
    { $match: { room: room._id } },
    {
      $group: {
        _id: null,
        bookingCount: { $sum: 1 },
        upcomingBookingCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'confirmed'] }, { $gt: ['$checkIn', now] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ])
  return { ...room, id: room._id, bookingCount: bookingStats?.bookingCount || 0, upcomingBookingCount: bookingStats?.upcomingBookingCount || 0 }
}

export async function createAdminRoom(input) {
  const data = validateFields(input, true)
  await ensureUniqueName(data.name)
  if (data.slug) {
    if (await Room.exists({ slug: data.slug })) throw new RoomServiceError(409, 'A room with that slug already exists.')
  } else {
    data.slug = await uniqueSlug(data.name)
  }
  await validateImages(data.images)
  const room = await Room.create(data)
  return room.toObject({ versionKey: false })
}

export async function updateAdminRoom(id, input) {
  if (!mongoose.isValidObjectId(id)) throw new RoomServiceError(400, 'A supplied room identifier is invalid.')
  const room = await Room.findById(id)
  if (!room) throw new RoomServiceError(404, 'Room not found.')
  const data = validateFields(input, false)
  const nextName = data.name ?? room.name
  const nextSlug = data.slug ?? room.slug
  await ensureUniqueName(nextName, room._id)
  if (data.slug !== undefined && await Room.exists({ slug: nextSlug, _id: { $ne: room._id } })) {
    throw new RoomServiceError(409, 'A room with that slug already exists.')
  }
  await validateImages(data.images)
  if (data.status !== undefined && data.status !== room.status) room.statusUpdatedAt = new Date()
  for (const [field, value] of Object.entries(data)) room[field] = value
  await room.save()
  return room.toObject({ versionKey: false })
}

export async function updateAdminRoomStatus(id, status, maintenanceNote) {
  if (!mongoose.isValidObjectId(id)) throw new RoomServiceError(400, 'A supplied room identifier is invalid.')
  if (!ROOM_STATUSES.includes(status)) throw new RoomServiceError(400, 'Invalid room status.')
  if (maintenanceNote !== undefined && maintenanceNote !== null && typeof maintenanceNote !== 'string') {
    throw new RoomServiceError(400, 'maintenanceNote must be a string.')
  }
  const room = await Room.findById(id)
  if (!room) throw new RoomServiceError(404, 'Room not found.')
  room.status = status
  if (maintenanceNote !== undefined) room.maintenanceNote = maintenanceNote
  room.statusUpdatedAt = new Date()
  await room.save()
  const futureConfirmedReservationsAffected = await Reservation.countDocuments({
    room: room._id,
    status: 'confirmed',
    checkIn: { $gt: new Date() },
  })
  return { room: room.toObject({ versionKey: false }), futureConfirmedReservationsAffected }
}

export async function deleteAdminRoom(id) {
  if (!mongoose.isValidObjectId(id)) throw new RoomServiceError(400, 'A supplied room identifier is invalid.')
  const room = await Room.findById(id)
  if (!room) throw new RoomServiceError(404, 'Room not found.')
  const futureConfirmedReservations = await Reservation.countDocuments({
    room: room._id,
    status: 'confirmed',
    checkIn: { $gt: new Date() },
  })
  if (futureConfirmedReservations) {
    throw new RoomServiceError(409, `Room has ${futureConfirmedReservations} future confirmed reservation(s).`, {
      count: futureConfirmedReservations,
    })
  }
  await User.updateMany({ savedRooms: room._id }, { $pull: { savedRooms: room._id } })
  await room.deleteOne()
  return { deleted: true }
}

export async function getRoomImageKeys() {
  const files = await readdir(imageDirectory, { withFileTypes: true })
  return files
    .filter((file) => file.isFile() && IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()))
    .map((file) => path.basename(file.name, path.extname(file.name)))
    .sort()
}

const signatures = {
  '.jpg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  '.jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  '.png': (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  '.webp': (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
}

export async function validateUploadedImage(file) {
  const extension = path.extname(file.filename).toLowerCase()
  const bytes = await readFile(file.path)
  const isValid = signatures[extension] && signatures[extension](bytes)
  if (!isValid) {
    await rm(file.path, { force: true })
    throw new RoomServiceError(400, 'Uploaded file is not a valid JPG, PNG, or WebP image.')
  }
  return `/uploads/${file.filename}`
}
