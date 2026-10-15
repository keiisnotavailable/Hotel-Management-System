import mongoose from 'mongoose'
import Reservation from '../models/Reservation.js'
import Review from '../models/Review.js'
import Room from '../models/Room.js'
import { syncReservationStatuses } from './reservationLifecycleService.js'

const EDIT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const CATEGORY_FIELDS = ['cleanliness', 'comfort', 'value', 'location', 'hostService']
const CATEGORY_LABELS = {
  cleanliness: 'Cleanliness',
  comfort: 'Comfort',
  value: 'Value',
  location: 'Location',
  hostService: 'Host/Service',
}

export class ReviewServiceError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function validId(value, label) {
  if (!mongoose.isValidObjectId(value)) throw new ReviewServiceError(400, `A supplied ${label} identifier is invalid.`)
}

function validateInput(input, existing) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ReviewServiceError(400, 'A review object is required.')
  }
  const overall = input.overall
  if (!Number.isInteger(overall) || overall < 1 || overall > 5) {
    throw new ReviewServiceError(400, 'Choose an overall rating from 1 to 5 stars.')
  }
  const categories = input.categories === undefined ? (existing?.categories?.toObject?.() || existing?.categories || {}) : input.categories
  if (!categories || typeof categories !== 'object' || Array.isArray(categories)) {
    throw new ReviewServiceError(400, 'Category ratings must be an object.')
  }
  const validCategories = {}
  for (const key of CATEGORY_FIELDS) {
    const value = categories[key]
    if (value === undefined || value === null || value === '') continue
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new ReviewServiceError(400, `${CATEGORY_LABELS[key]} must be rated from 1 to 5 stars.`)
    }
    validCategories[key] = value
  }
  const comment = input.comment === undefined ? (existing?.comment || '') : input.comment
  if (typeof comment !== 'string' || comment.length > 1000) {
    throw new ReviewServiceError(400, 'The review comment must be 1000 characters or fewer.')
  }
  const showName = input.showName === undefined ? (existing?.showName ?? true) : input.showName
  if (typeof showName !== 'boolean') throw new ReviewServiceError(400, 'showName must be a boolean.')
  return { overall, categories: validCategories, comment: comment.trim(), showName }
}

function withEditWindow(review, now = new Date()) {
  const value = review.toObject ? review.toObject({ versionKey: false }) : review
  return { ...value, editable: now.getTime() - new Date(value.createdAt).getTime() <= EDIT_WINDOW_MS }
}

async function getOwnedCompletedReservation(reservationId, userId) {
  validId(reservationId, 'reservation')
  await syncReservationStatuses({ id: reservationId })
  const reservation = await Reservation.findById(reservationId).lean()
  if (!reservation) throw new ReviewServiceError(404, 'Reservation not found.')
  if (reservation.user?.toString() !== userId.toString()) {
    throw new ReviewServiceError(403, 'You do not have access to this reservation.')
  }
  if (reservation.status !== 'completed') {
    throw new ReviewServiceError(409, 'Only completed reservations can be reviewed.')
  }
  return reservation
}

export async function recomputeRoomReviewSummary(roomId) {
  if (!roomId) return
  const [summary] = await Review.aggregate([
    { $match: { roomId: new mongoose.Types.ObjectId(roomId), status: 'visible' } },
    { $group: { _id: null, average: { $avg: '$overall' }, count: { $sum: 1 } } },
  ])
  await Room.updateOne(
    { _id: roomId },
    { $set: { reviewAverage: summary ? Number(summary.average.toFixed(2)) : 0, reviewCount: summary?.count || 0 } },
  )
}

export async function getReservationReviews(reservationIds, now = new Date(), includeModeration = false) {
  if (!reservationIds.length) return new Map()
  const reviews = await Review.find({ reservationId: { $in: reservationIds } }).lean()
  return new Map(reviews.map((review) => {
    const value = withEditWindow(review, now)
    const guestReview = {
      reviewId: value.reviewId,
      overall: value.overall,
      categories: value.categories,
      comment: value.comment,
      showName: value.showName,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      editable: value.editable,
    }
    return [review.reservationId.toString(), includeModeration ? value : guestReview]
  }))
}

export async function createReservationReview(reservationId, user, input) {
  const reservation = await getOwnedCompletedReservation(reservationId, user._id)
  if (await Review.exists({ reservationId: reservation._id })) {
    throw new ReviewServiceError(409, 'This reservation already has a review.')
  }
  const fields = validateInput(input)
  let review
  try {
    review = await Review.create({
      ...fields,
      reservationId: reservation._id,
      roomId: reservation.room,
      userId: user._id,
      roomName: reservation.roomName || 'Moonstoria crypt',
      guestFirstName: (user.name || reservation.userName || '').trim().split(/\s+/)[0] || 'Guest',
      stayCheckIn: reservation.checkIn,
    })
  } catch (error) {
    if (error.code === 11000) throw new ReviewServiceError(409, 'This reservation already has a review.')
    throw error
  }
  await recomputeRoomReviewSummary(review.roomId)
  return withEditWindow(review)
}

export async function updateReservationReview(reservationId, userId, input) {
  await getOwnedCompletedReservation(reservationId, userId)
  const review = await Review.findOne({ reservationId, userId })
  if (!review) throw new ReviewServiceError(404, 'Review not found.')
  if (Date.now() - review.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new ReviewServiceError(403, 'Reviews can only be edited or deleted within 14 days of submission.')
  }
  const fields = validateInput(input, review)
  Object.assign(review, fields)
  await review.save()
  await recomputeRoomReviewSummary(review.roomId)
  return withEditWindow(review)
}

export async function deleteReservationReview(reservationId, userId) {
  await getOwnedCompletedReservation(reservationId, userId)
  const review = await Review.findOne({ reservationId, userId })
  if (!review) throw new ReviewServiceError(404, 'Review not found.')
  if (Date.now() - review.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new ReviewServiceError(403, 'Reviews can only be edited or deleted within 14 days of submission.')
  }
  const roomId = review.roomId
  await review.deleteOne()
  await recomputeRoomReviewSummary(roomId)
  return { deleted: true }
}

export async function listRoomReviews(roomId, query = {}) {
  if (!mongoose.isValidObjectId(roomId)) throw new ReviewServiceError(400, 'A supplied room identifier is invalid.')
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 10 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ReviewServiceError(400, 'Review pagination must use a positive page and a limit from 1 to 50.')
  }
  const sortOptions = {
    newest: { createdAt: -1, _id: -1 },
    highest: { overall: -1, createdAt: -1 },
    lowest: { overall: 1, createdAt: -1 },
  }
  const sort = query.sort || 'newest'
  if (!sortOptions[sort]) throw new ReviewServiceError(400, 'Review sort must be newest, highest, or lowest.')

  const [ratingCounts, total, items] = await Promise.all([
    Review.aggregate([
      { $match: { roomId: new mongoose.Types.ObjectId(roomId), status: 'visible' } },
      { $group: { _id: '$overall', count: { $sum: 1 }, total: { $sum: '$overall' } } },
    ]),
    Review.countDocuments({ roomId, status: 'visible' }),
    Review.find({ roomId, status: 'visible' })
      .sort(sortOptions[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .select('reviewId roomName guestFirstName stayCheckIn overall comment showName createdAt updatedAt'),
  ])
  const distribution = Object.fromEntries([1, 2, 3, 4, 5].map((rating) => [
    rating,
    ratingCounts.find((item) => item._id === rating)?.count || 0,
  ]))
  const average = total
    ? ratingCounts.reduce((sum, item) => sum + item.total, 0) / total
    : 0
  return {
    summary: { average: Number(average.toFixed(1)), count: total, distribution },
    items: items.map((review) => ({
      reviewId: review.reviewId,
      overall: review.overall,
      comment: review.comment,
      displayName: review.showName ? review.guestFirstName : 'Guest',
      stayCheckIn: review.stayCheckIn,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      edited: review.updatedAt.getTime() > review.createdAt.getTime(),
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function setReservationReviewVisibility(reservationId, visible, reason) {
  validId(reservationId, 'reservation')
  if (typeof visible !== 'boolean') throw new ReviewServiceError(400, 'Review visibility must be a boolean.')
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
    throw new ReviewServiceError(400, 'The hide reason must be 500 characters or fewer.')
  }
  const review = await Review.findOne({ reservationId })
  if (!review) throw new ReviewServiceError(404, 'Review not found.')
  review.status = visible ? 'visible' : 'hidden'
  review.hideReason = visible ? undefined : (reason || '').trim() || undefined
  await review.save()
  await recomputeRoomReviewSummary(review.roomId)
  return withEditWindow(review)
}
