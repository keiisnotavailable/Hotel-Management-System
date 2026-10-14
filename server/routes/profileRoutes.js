import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getProfile, updateProfile, uploadProfilePhoto, changePassword, getSavedRooms, toggleSavedRoom, getPreferences, updatePreferences } from '../controllers/profileController.js'
import { handleProfileUploadError, uploadProfileImage } from '../middleware/admin/roomUpload.js'

const router = Router()
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
router.use(requireAuth)
router.get('/saved', asyncHandler(getSavedRooms))
router.post('/saved/:roomId', asyncHandler(toggleSavedRoom))
router.get('/preferences', asyncHandler(getPreferences))
router.put('/preferences', asyncHandler(updatePreferences))
router.post('/profile/photo', uploadProfileImage.single('image'), handleProfileUploadError, asyncHandler(uploadProfilePhoto))
router.get('/', getProfile)
router.patch('/', asyncHandler(updateProfile))
router.patch('/password', asyncHandler(changePassword))
router.patch('/change-password', asyncHandler(changePassword))
router.get('/profile', getProfile)
router.put('/profile', asyncHandler(updateProfile))
router.put('/change-password', asyncHandler(changePassword))
export default router
