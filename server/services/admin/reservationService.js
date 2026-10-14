import mongoose from 'mongoose'
import Reservation from '../../models/Reservation.js'
import Room from '../../models/Room.js'
import User from '../../models/User.js'
import { MIN_STAY_HOURS } from '../../config/defaults.js'
import { calculatePrice, checkAvailability } from '../reservationService.js'
import { syncReservationStatuses } from '../reservationLifecycleService.js'

const STATUSES = ['confirmed', 'upcoming', 'ongoing', 'completed', 'cancelled']
const SORTS = {
  '-createdAt': { createdAt: -1 },
  createdAt: { createdAt: 1 },
  '-checkIn': { checkIn: -1 },
  checkIn: { checkIn: 1 },
  '-totalPrice': { totalPrice: -1 },
  totalPrice: { totalPrice: 1 },
  guest: { userName: 1 },
  '-guest': { userName: -1 },
}

export class AdminReservationError extends Error {
  constructor(status, message, details = {}) {
    super(message)
    this.status = status
    this.details = details
  }
}

function paginationValue(value, fallback, max) {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new AdminReservationError(400, `Pagination values must be integers from 1 to ${max}.`)
  }
  return parsed
}

function escapedRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function dayBoundary(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new AdminReservationError(400, 'Date filters must use YYYY-MM-DD.')
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new AdminReservationError(400, 'A date filter is invalid.')
  }
  return parsed
}

function manilaDayStart(value) {
  dayBoundary(value)
  return new Date(`${value}T00:00:00+08:00`)
}

function nextDay(value) {
  const date = dayBoundary(value)
  date.setUTCDate(date.getUTCDate() + 1)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function publicReservation(reservation) {
  const value = reservation.toObject
    ? reservation.toObject({ versionKey: false })
    : reservation
  if (!value.room) value.room = { name: value.roomName, slug: value.roomSlug }
  if (!value.user) value.user = { name: value.userName, email: value.userEmail }
  value.id = value._id
  value.displayStatus = value.status
  return value
}

async function buildFilter(query, now) {
  const clauses = []
  const status = String(query.status || '')
  if (status && !STATUSES.includes(status)) throw new AdminReservationError(400, 'Invalid reservation status.')

  if (status === 'confirmed' && query.upcoming === 'true') {
    clauses.push({ status: { $in: ['confirmed', 'upcoming'] } }, { checkIn: { $gt: now } })
  } else if (status) clauses.push({ status })
  else if (query.upcoming === 'true') clauses.push({ status: { $in: ['confirmed', 'upcoming'] } }, { checkIn: { $gt: now } })

  if (query.roomId) {
    if (!mongoose.isValidObjectId(query.roomId)) throw new AdminReservationError(400, 'A supplied room identifier is invalid.')
    clauses.push({ room: query.roomId })
  }

  let from = query.from
  let to = query.to
  if (query.checkIn === 'today') {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)
    from = today
    to = today
  }
  if (from && to && String(from) > String(to)) {
    throw new AdminReservationError(400, 'The start date must be on or before the end date.')
  }
  if (from) clauses.push({ checkIn: { $gte: manilaDayStart(String(from)) } })
  if (to) clauses.push({ checkIn: { $lt: manilaDayStart(nextDay(String(to))) } })

  if (query.search) {
    const term = String(query.search).trim().slice(0, 100)
    if (term) {
      const regex = new RegExp(escapedRegex(term), 'i')
      const [users, rooms] = await Promise.all([
        User.find({ $or: [{ name: regex }, { email: regex }] }).distinct('_id'),
        Room.find({ name: regex }).distinct('_id'),
      ])
      clauses.push({
        $or: [
          { userName: regex },
          { userEmail: regex },
          { roomName: regex },
          { user: { $in: users } },
          { room: { $in: rooms } },
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' } } },
        ],
      })
    }
  }
  return clauses.length ? { $and: clauses } : {}
}

export async function listAdminReservations(query) {
  await syncReservationStatuses()
  const page = paginationValue(query.page, 1, Number.MAX_SAFE_INTEGER)
  const limit = paginationValue(query.limit, 20, 100)
  const now = new Date()
  const filter = await buildFilter(query, now)
  const sort = query.sort || '-createdAt'
  if (!SORTS[sort]) throw new AdminReservationError(400, 'Invalid reservation sort value.')

  const [reservations, total, revenue] = await Promise.all([
    Reservation.find(filter)
      .populate('room', 'name slug type images pricePerNight')
      .populate('user', 'name email')
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    Reservation.countDocuments(filter),
    Reservation.aggregate([
      { $match: filter },
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
  ])

  return {
    items: reservations.map(publicReservation),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    totalRevenue: revenue[0]?.total || 0,
  }
}

async function findReservation(id) {
  if (!mongoose.isValidObjectId(id)) throw new AdminReservationError(400, 'A supplied reservation identifier is invalid.')
  await syncReservationStatuses({ id })
  const reservation = await Reservation.findById(id)
    .populate('room', 'name slug type images pricePerNight')
    .populate('user', 'name email')
  if (!reservation) throw new AdminReservationError(404, 'Reservation not found.')
  return reservation
}

export async function getAdminReservation(id) {
  return publicReservation(await findReservation(id))
}

function parseDates(checkIn, checkOut) {
  const isoUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
  if (typeof checkIn !== 'string' || typeof checkOut !== 'string' || !isoUtc.test(checkIn) || !isoUtc.test(checkOut)) {
    throw new AdminReservationError(400, 'Valid Dusk and Dawn dates are required.')
  }
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new AdminReservationError(400, 'Dawn must be after Dusk.')
  }
  if ((end - start) / 3600000 < MIN_STAY_HOURS) {
    throw new AdminReservationError(400, `Stays must be at least ${MIN_STAY_HOURS} hours.`)
  }
  return { start, end }
}

function assertEditable(reservation) {
  if (!['confirmed', 'upcoming', 'ongoing'].includes(reservation.status)) {
    throw new AdminReservationError(400, 'Completed or cancelled reservations cannot be changed.')
  }
}

export async function checkAdminReservationAvailability(id, input) {
  const reservation = await findReservation(id)
  assertEditable(reservation)
  const { start, end } = parseDates(input.checkIn, input.checkOut)
  if (!reservation.room?._id) throw new AdminReservationError(404, 'The crypt for this reservation no longer exists.')
  const result = await checkAvailability({
    roomId: reservation.room._id,
    checkIn: start,
    checkOut: end,
    excludeReservationId: reservation._id,
  })
  return {
    available: result.available,
    conflicts: result.conflicts.map((conflict) => ({ ...conflict, checkIn: conflict.checkIn, checkOut: conflict.checkOut })),
  }
}

export async function updateAdminReservationDates(id, input) {
  const reservation = await findReservation(id)
  assertEditable(reservation)
  const { start, end } = parseDates(input.checkIn, input.checkOut)
  if (!reservation.room?._id) throw new AdminReservationError(404, 'The crypt for this reservation no longer exists.')
  const availability = await checkAvailability({
    roomId: reservation.room._id,
    checkIn: start,
    checkOut: end,
    excludeReservationId: reservation._id,
  })
  if (!availability.available) {
    throw new AdminReservationError(409, 'Those dates conflict with another reservation.', {
      conflicts: availability.conflicts,
    })
  }
  const { nights, totalPrice } = calculatePrice(reservation.room, start, end)
  reservation.checkIn = start
  reservation.checkOut = end
  reservation.nights = nights
  reservation.totalPrice = totalPrice
  const now = new Date()
  if (end <= now) {
    reservation.status = 'completed'
    reservation.completedAt = now
  } else if (start <= now) {
    reservation.status = 'ongoing'
    reservation.completedAt = undefined
  } else {
    reservation.status = 'upcoming'
    reservation.completedAt = undefined
  }
  await reservation.save()
  return getAdminReservation(reservation._id)
}

export async function cancelAdminReservation(id, reason) {
  const reservation = await findReservation(id)
  assertEditable(reservation)
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) {
    throw new AdminReservationError(400, 'The cancellation reason must be 1000 characters or fewer.')
  }
  reservation.status = 'cancelled'
  reservation.cancellationReason = (reason || '').trim()
  reservation.cancelledBy = 'admin'
  reservation.cancelledAt = new Date()
  await reservation.save()
  return getAdminReservation(reservation._id)
}

export async function completeAdminReservation(id) {
  const reservation = await findReservation(id)
  if (reservation.status === 'cancelled') throw new AdminReservationError(400, 'Cancelled reservations cannot be completed.')
  if (reservation.status === 'completed') throw new AdminReservationError(400, 'This reservation is already completed.')
  reservation.status = 'completed'
  reservation.completedAt = new Date()
  await reservation.save()
  return getAdminReservation(reservation._id)
}
