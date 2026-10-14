import {
  cancelAdminReservation as cancelReservation,
  checkAdminReservationAvailability,
  getAdminReservation as getReservation,
  listAdminReservations as listReservations,
  updateAdminReservationDates,
} from '../../services/admin/reservationService.js'

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
