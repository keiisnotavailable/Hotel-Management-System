import { Router } from 'express'
import {
  createAdminRoom,
  deleteAdminRoom,
  getAdminImageKeys,
  getAdminRoom,
  listAdminRooms,
  updateAdminRoom,
  updateAdminRoomStatus,
  uploadAdminRoomImage,
} from '../../controllers/admin/roomController.js'
import { handleRoomUploadError, uploadRoomImage } from '../../middleware/admin/roomUpload.js'
import { RoomServiceError } from '../../services/admin/roomService.js'

const router = Router()

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch((error) => {
    if (error instanceof RoomServiceError) return res.status(error.status).json({ message: error.message, ...error.details })
    if (error.code === 11000) return res.status(409).json({ message: 'A room with that name or slug already exists.' })
    return next(error)
  })
}

router.get('/image-keys', asyncHandler(getAdminImageKeys))
router.post('/uploads', uploadRoomImage.single('image'), handleRoomUploadError, asyncHandler(uploadAdminRoomImage))
router.get('/rooms', asyncHandler(listAdminRooms))
router.get('/rooms/:id', asyncHandler(getAdminRoom))
router.post('/rooms', asyncHandler(createAdminRoom))
router.put('/rooms/:id', asyncHandler(updateAdminRoom))
router.patch('/rooms/:id/status', asyncHandler(updateAdminRoomStatus))
router.delete('/rooms/:id', asyncHandler(deleteAdminRoom))

export default router
