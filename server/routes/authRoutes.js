import { Router } from 'express'
import { login, register } from '../controllers/authController.js'

const router = Router()

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

router.post('/register', asyncHandler(register))
router.post('/login', asyncHandler(login))

export default router
