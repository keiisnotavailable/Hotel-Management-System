import { Router } from 'express'
import {
  changeAdminUserRole,
  changeAdminUserStatus,
  deleteAdminUser,
  getAdminUser,
  listAdminUsers,
  updateAdminUser,
} from '../../controllers/admin/userController.js'
import { UserServiceError } from '../../services/admin/userService.js'

const router = Router()

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch((error) => {
    if (error instanceof UserServiceError) return res.status(error.status).json({ message: error.message, ...error.details })
    if (error.code === 11000) return res.status(409).json({ message: 'That email address is already registered.' })
    return next(error)
  })
}

router.get('/', asyncHandler(listAdminUsers))
router.get('/:id', asyncHandler(getAdminUser))
router.put('/:id', asyncHandler(updateAdminUser))
router.patch('/:id/role', asyncHandler(changeAdminUserRole))
router.patch('/:id/status', asyncHandler(changeAdminUserStatus))
router.delete('/:id', asyncHandler(deleteAdminUser))

export default router
