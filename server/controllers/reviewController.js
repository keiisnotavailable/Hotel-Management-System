import { ReviewServiceError, createReservationReview, deleteReservationReview, listRoomReviews, updateReservationReview } from '../services/reviewService.js'

export function reviewErrorHandler(error, _req, res, next) {
  if (error instanceof ReviewServiceError) return res.status(error.status).json({ message: error.message })
  return next(error)
}

export async function createReview(req, res) {
  const review = await createReservationReview(req.params.reservationId, req.user, req.body)
  return res.status(201).json({ review })
}

export async function updateReview(req, res) {
  const review = await updateReservationReview(req.params.reservationId, req.user._id, req.body)
  return res.json({ review })
}

export async function deleteReview(req, res) {
  return res.json(await deleteReservationReview(req.params.reservationId, req.user._id))
}

export async function getRoomReviews(req, res) {
  return res.json(await listRoomReviews(req.params.roomId, req.query))
}
