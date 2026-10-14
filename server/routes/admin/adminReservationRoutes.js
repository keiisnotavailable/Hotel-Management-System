import { Router } from 'express'
import {
  cancelAdminReservation,
  checkAdminReservation,
  getAdminReservation,
  listAdminReservations,
  updateAdminReservation,
} from '../../controllers/admin/reservationController.js'
import { AdminReservationError } from '../../services/admin/reservationService.js'

const router = Router()

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch((error) => {
    if (error instanceof AdminReservationError) return res.status(error.status).json({ message: error.message, ...error.details })
    return next(error)
  })
}

router.get('/', asyncHandler(listAdminReservations))
router.get('/:id/availability', asyncHandler(checkAdminReservation))
router.get('/:id', asyncHandler(getAdminReservation))
router.patch('/:id/dates', asyncHandler(updateAdminReservation))
router.patch('/:id/cancel', asyncHandler(cancelAdminReservation))

export default router
