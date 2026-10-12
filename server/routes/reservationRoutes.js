import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createReservation, listReservations, getReservation, cancelReservation } from '../controllers/reservationController.js'

const router = Router()
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
router.use(requireAuth)
router.get('/', asyncHandler(listReservations))
router.get('/my', asyncHandler(listReservations))
router.post('/', asyncHandler(createReservation))
router.get('/:id', asyncHandler(getReservation))
router.patch('/:id/cancel', asyncHandler(cancelReservation))
router.delete('/:id', asyncHandler(cancelReservation))
export default router
