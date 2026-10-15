import { Router } from 'express'
import { listRooms, getRoom, roomAvailability, availableRooms, roomStats } from '../controllers/roomController.js'
import { getRoomReviews, reviewErrorHandler } from '../controllers/reviewController.js'

const router = Router()
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
router.get('/', asyncHandler(listRooms))
router.get('/stats', asyncHandler(roomStats))
router.get('/available', asyncHandler(availableRooms))
router.get('/:roomId/reviews', asyncHandler(getRoomReviews), reviewErrorHandler)
router.get('/:id/availability', asyncHandler(roomAvailability))
router.get('/:id', asyncHandler(getRoom))
export default router
