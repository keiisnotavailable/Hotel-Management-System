import mongoose from 'mongoose'
import Reservation from '../../models/Reservation.js'
import Room from '../../models/Room.js'
import User from '../../models/User.js'
import { syncReservationStatuses } from '../reservationLifecycleService.js'

export class UserServiceError extends Error {
  constructor(status, message, details = {}) {
    super(message)
    this.status = status
    this.details = details
  }
}

function validPagination(value, fallback, maximum) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new UserServiceError(400, `Pagination values must be integers from 1 to ${maximum}.`)
  }
  return parsed
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function validateObjectId(id) {
  if (!mongoose.isValidObjectId(id)) throw new UserServiceError(400, 'A supplied user identifier is invalid.')
}

async function requireUser(id) {
  validateObjectId(id)
  const user = await User.findById(id)
  if (!user) throw new UserServiceError(404, 'User not found.')
  return user
}

async function assertNotLastAdmin(user, action) {
  if (user.role !== 'admin') return
  const adminFilter = action === 'block' ? { role: 'admin', isActive: true } : { role: 'admin' }
  const adminCount = await User.countDocuments(adminFilter)
  if (adminCount <= 1) {
    const messages = {
      demote: 'The last remaining admin cannot be demoted.',
      block: 'The last remaining admin cannot be blocked.',
      delete: 'The last remaining admin cannot be deleted.',
    }
    throw new UserServiceError(400, messages[action])
  }
}

export async function listAdminUsers(query) {
  const page = validPagination(query.page, 1, Number.MAX_SAFE_INTEGER)
  const limit = validPagination(query.limit, 20, 100)
  const filter = {}
  if (query.search) {
    const search = escapeRegex(String(query.search))
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }
  if (query.role) {
    if (!['guest', 'admin'].includes(query.role)) throw new UserServiceError(400, 'Invalid user role.')
    filter.role = query.role
  }
  if (query.status) {
    if (!['active', 'blocked'].includes(query.status)) throw new UserServiceError(400, 'Status must be active or blocked.')
    filter.isActive = query.status === 'active'
  }

  const [items, total] = await Promise.all([
    User.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: Reservation.collection.name,
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$userId'] } } },
            { $count: 'count' },
          ],
          as: 'reservationCountResult',
        },
      },
      {
        $set: {
          id: '$_id',
          reservationCount: { $ifNull: [{ $arrayElemAt: ['$reservationCountResult.count', 0] }, 0] },
        },
      },
      {
        $project: {
          password: 0,
          reservationCountResult: 0,
          __v: 0,
        },
      },
    ]),
    User.countDocuments(filter),
  ])
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) }
}

export async function getAdminUser(id) {
  const user = await requireUser(id)
  await syncReservationStatuses()
  const reservations = await Reservation.aggregate([
    { $match: { user: user._id } },
    { $sort: { checkIn: -1 } },
    {
      $lookup: {
        from: Room.collection.name,
        localField: 'room',
        foreignField: '_id',
        as: 'roomRecord',
      },
    },
    {
      $set: {
        roomRecord: { $arrayElemAt: ['$roomRecord', 0] },
      },
    },
    {
      $project: {
        room: {
          name: { $ifNull: ['$roomRecord.name', { $ifNull: ['$roomName', 'Unknown room'] }] },
          slug: { $ifNull: ['$roomRecord.slug', { $ifNull: ['$roomSlug', ''] }] },
        },
        roomName: 1,
        roomSlug: 1,
        userName: 1,
        userEmail: 1,
        checkIn: 1,
        checkOut: 1,
        nights: 1,
        totalPrice: 1,
        guests: 1,
        status: 1,
        specialRequests: 1,
        cancellationReason: 1,
        cancelledBy: 1,
        cancelledAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ])
  const profile = user.toObject({ versionKey: false })
  delete profile.password
  return { user: profile, reservations }
}

export async function updateAdminUser(id, input) {
  const user = await requireUser(id)
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new UserServiceError(400, 'A user object is required.')

  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim()) throw new UserServiceError(400, 'Name is required.')
    user.name = input.name.trim()
  }
  if (input.email !== undefined) {
    if (typeof input.email !== 'string' || !input.email.trim()) throw new UserServiceError(400, 'Email is required.')
    const email = input.email.trim().toLowerCase()
    if (await User.exists({ email, _id: { $ne: user._id } })) throw new UserServiceError(409, 'That email address is already registered.')
    user.email = email
  }
  for (const field of ['phone', 'address']) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'string') throw new UserServiceError(400, `${field} must be a string.`)
      user[field] = input[field].trim()
    }
  }
  await user.save()
  const profile = user.toObject({ versionKey: false })
  delete profile.password
  return profile
}

export async function updateAdminUserRole(id, role, actingUserId) {
  const user = await requireUser(id)
  if (!['guest', 'admin'].includes(role)) throw new UserServiceError(400, 'Role must be guest or admin.')
  if (user.role === 'admin' && role === 'guest') {
    if (user._id.toString() === actingUserId.toString()) throw new UserServiceError(400, 'You cannot demote your own admin account.')
    await assertNotLastAdmin(user, 'demote')
  }
  user.role = role
  await user.save()
  return { id: user._id, role: user.role }
}

export async function updateAdminUserStatus(id, isActive, actingUserId) {
  const user = await requireUser(id)
  if (typeof isActive !== 'boolean') throw new UserServiceError(400, 'isActive must be a boolean.')
  if (!isActive) {
    if (user._id.toString() === actingUserId.toString()) throw new UserServiceError(400, 'You cannot block your own admin account.')
    await assertNotLastAdmin(user, 'block')
  }
  user.isActive = isActive
  await user.save()
  return { id: user._id, isActive: user.isActive }
}

export async function deleteAdminUser(id, { cancelReservations = false, actingUserId }) {
  const user = await requireUser(id)
  if (user._id.toString() === actingUserId.toString()) throw new UserServiceError(400, 'You cannot delete your own admin account.')
  await assertNotLastAdmin(user, 'delete')

  await syncReservationStatuses()
  const now = new Date()
  const futureFilter = { user: user._id, status: 'upcoming', checkIn: { $gt: now } }
  const futureUpcomingReservationCount = await Reservation.countDocuments(futureFilter)
  if (futureUpcomingReservationCount && !cancelReservations) {
    throw new UserServiceError(
      409,
      `User has ${futureUpcomingReservationCount} future upcoming reservation(s).`,
      { count: futureUpcomingReservationCount },
    )
  }
  if (futureUpcomingReservationCount) {
    await Reservation.updateMany(futureFilter, {
      $set: {
        status: 'cancelled',
        cancelledBy: 'admin',
        cancelledAt: now,
      },
    })
  }

  user.savedRooms = []
  await user.save()
  await user.deleteOne()
  return { deleted: true, cancelledReservations: futureUpcomingReservationCount }
}
