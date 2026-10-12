import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getProfile, updateProfile, changePassword, getSavedRooms, toggleSavedRoom } from '../controllers/profileController.js'

const router = Router()
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
router.use(requireAuth)
router.get('/saved', asyncHandler(getSavedRooms))
router.post('/saved/:roomId', asyncHandler(toggleSavedRoom))
router.get('/', getProfile)
router.patch('/', asyncHandler(updateProfile))
router.patch('/password', asyncHandler(changePassword))
router.patch('/change-password', asyncHandler(changePassword))
router.get('/profile', getProfile)
router.put('/profile', asyncHandler(updateProfile))
router.put('/change-password', asyncHandler(changePassword))
export default router
