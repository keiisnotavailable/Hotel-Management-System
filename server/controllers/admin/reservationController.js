import {
  cancelAdminReservation as cancelReservation,
  checkAdminReservationAvailability,
  completeAdminReservation as completeReservation,
  getAdminReservation as getReservation,
  listAdminReservations as listReservations,
  updateAdminReservationDates,
} from '../../services/admin/reservationService.js'
import { ReviewServiceError, setReservationReviewVisibility } from '../../services/reviewService.js'

export async function listAdminReservations(req, res) {
  return res.json(await listReservations(req.query))
}

export async function getAdminReservation(req, res) {
  return res.json({ reservation: await getReservation(req.params.id) })
}

export async function checkAdminReservation(req, res) {
  return res.json(await checkAdminReservationAvailability(req.params.id, req.query))
}

export async function updateAdminReservation(req, res) {
  return res.json({ reservation: await updateAdminReservationDates(req.params.id, req.body) })
}

export async function cancelAdminReservation(req, res) {
  return res.json({ reservation: await cancelReservation(req.params.id, req.body.reason) })
}

export async function completeAdminReservation(req, res) {
  return res.json({ reservation: await completeReservation(req.params.id) })
}

export async function setAdminReviewVisibility(req, res, next) {
  try {
    const body = req.body || {}
    const review = await setReservationReviewVisibility(req.params.id, body.visible, body.reason)
    return res.json({ review })
  } catch (error) {
    if (error instanceof ReviewServiceError) return res.status(error.status).json({ message: error.message })
    return next(error)
  }
}
