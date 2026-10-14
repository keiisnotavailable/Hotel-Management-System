import Reservation from '../../models/Reservation.js'
import Room from '../../models/Room.js'
import User from '../../models/User.js'
import { syncReservationStatuses } from '../reservationLifecycleService.js'

const TIME_ZONE = 'Asia/Manila'
const DAY_MS = 24 * 60 * 60 * 1000

function manilaParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]))
}

function manilaDayStart(date) {
  const { year, month, day } = manilaParts(date)
  return new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000)
}

function manilaMonthStart(date) {
  const { year, month } = manilaParts(date)
  return new Date(Date.UTC(year, month - 1, 1) - 8 * 60 * 60 * 1000)
}

function dayLabel(date) {
  const { year, month, day } = manilaParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthLabel(date) {
  const { year, month } = manilaParts(date)
  return `${year}-${String(month).padStart(2, '0')}`
}

function rangeStartDay(now, daysAgo) {
  return new Date(manilaDayStart(now).getTime() - daysAgo * DAY_MS)
}

function rangeStartMonth(now, monthsAgo) {
  const { year, month } = manilaParts(now)
  return new Date(Date.UTC(year, month - 1 - monthsAgo, 1) - 8 * 60 * 60 * 1000)
}

export async function getAdminStatsData(now = new Date()) {
  await syncReservationStatuses({ now })
  const firstDay = rangeStartDay(now, 29)
  const firstMonth = rangeStartMonth(now, 5)
  const roomsCollection = Room.collection.name
  const usersCollection = User.collection.name

  const [
    roomStats,
    reservationStats,
    userStats,
    occupancyResult,
    dailyResults,
    monthlyResults,
    topRooms,
    recentReservations,
  ] = await Promise.all([
    Room.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        },
      },
    ]),
    Reservation.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          upcoming: {
            $sum: {
              $cond: [
                { $and: [{ $in: ['$status', ['confirmed', 'upcoming']] }, { $gt: ['$checkIn', now] }] },
                1,
                0,
              ],
            },
          },
          activeNow: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['confirmed', 'upcoming', 'ongoing']] },
                    { $lte: ['$checkIn', now] },
                    { $gt: ['$checkOut', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$totalPrice', 0] } },
          thisMonth: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'cancelled'] },
                    { $gte: ['$createdAt', manilaMonthStart(now)] },
                    { $lte: ['$createdAt', now] },
                  ],
                },
                '$totalPrice',
                0,
              ],
            },
          },
        },
      },
    ]),
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          guests: { $sum: { $cond: [{ $eq: ['$role', 'guest'] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
        },
      },
    ]),
    Reservation.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'upcoming', 'ongoing'] },
          checkIn: { $lte: now },
          checkOut: { $gt: now },
        },
      },
      { $group: { _id: '$room' } },
      {
        $lookup: {
          from: roomsCollection,
          localField: '_id',
          foreignField: '_id',
          as: 'room',
        },
      },
      { $unwind: '$room' },
      { $match: { 'room.status': 'available' } },
      { $count: 'occupied' },
    ]),
    Reservation.aggregate([
      { $match: { createdAt: { $gte: firstDay, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIME_ZONE } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Reservation.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'upcoming', 'ongoing', 'completed'] },
          createdAt: { $gte: firstMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TIME_ZONE } },
          revenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Reservation.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$room',
          name: { $first: '$roomName' },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
      {
        $lookup: {
          from: roomsCollection,
          localField: '_id',
          foreignField: '_id',
          as: 'room',
        },
      },
      {
        $set: {
          name: { $ifNull: [{ $arrayElemAt: ['$room.name', 0] }, { $ifNull: ['$name', 'Unknown room'] }] },
        },
      },
      { $sort: { bookings: -1, revenue: -1, _id: 1 } },
      { $limit: 5 },
      { $project: { _id: 0, roomId: '$_id', name: 1, bookings: 1, revenue: 1 } },
    ]),
    Reservation.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: usersCollection,
          localField: 'user',
          foreignField: '_id',
          as: 'userRecord',
        },
      },
      {
        $lookup: {
          from: roomsCollection,
          localField: 'room',
          foreignField: '_id',
          as: 'roomRecord',
        },
      },
      {
        $set: {
          userRecord: { $arrayElemAt: ['$userRecord', 0] },
          roomRecord: { $arrayElemAt: ['$roomRecord', 0] },
        },
      },
      {
        $project: {
          user: {
            name: { $ifNull: ['$userRecord.name', { $ifNull: ['$userName', 'Unknown guest'] }] },
            email: { $ifNull: ['$userRecord.email', { $ifNull: ['$userEmail', ''] }] },
          },
          room: {
            name: { $ifNull: ['$roomRecord.name', { $ifNull: ['$roomName', 'Unknown room'] }] },
            slug: { $ifNull: ['$roomRecord.slug', { $ifNull: ['$roomSlug', ''] }] },
          },
          checkIn: 1,
          checkOut: 1,
          nights: 1,
          totalPrice: 1,
          guests: 1,
          status: 1,
          createdAt: 1,
        },
      },
    ]),
  ])

  const roomSummary = roomStats[0] || {}
  const roomCounts = Object.fromEntries((roomSummary.byStatus || []).map(({ _id, count }) => [_id, count]))
  const reservationCounts = reservationStats[0] || {}
  const userCounts = userStats[0] || {}
  const availableRooms = roomCounts.available || 0

  const reservationsPerDay = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(firstDay.getTime() + index * DAY_MS)
    const label = dayLabel(date)
    const result = dailyResults.find(({ _id }) => _id === label)
    return { date: label, count: result?.count || 0 }
  })

  const revenuePerMonth = Array.from({ length: 6 }, (_, index) => {
    const monthStart = rangeStartMonth(now, 5 - index)
    const label = monthLabel(monthStart)
    const result = monthlyResults.find(({ _id }) => _id === label)
    return { month: label, revenue: result?.revenue || 0 }
  })

  return {
    rooms: {
      total: roomSummary.total?.[0]?.count || 0,
      available: availableRooms,
      maintenance: roomCounts.maintenance || 0,
    },
    reservations: {
      total: reservationCounts.total || 0,
      confirmed: reservationCounts.confirmed || 0,
      cancelled: reservationCounts.cancelled || 0,
      upcoming: reservationCounts.upcoming || 0,
      activeNow: reservationCounts.activeNow || 0,
    },
    users: {
      total: userCounts.total || 0,
      guests: userCounts.guests || 0,
      admins: userCounts.admins || 0,
      blocked: userCounts.blocked || 0,
    },
    revenue: {
      total: reservationCounts.revenue || 0,
      thisMonth: reservationCounts.thisMonth || 0,
    },
    occupancyNow: availableRooms ? Number((((occupancyResult[0]?.occupied || 0) / availableRooms) * 100).toFixed(2)) : 0,
    reservationsPerDay,
    revenuePerMonth,
    topRooms,
    recentReservations,
  }
}
