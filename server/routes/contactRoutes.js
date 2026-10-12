import { Router } from 'express'
import { createContact } from '../controllers/contactController.js'

const router = Router()
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
router.post('/', asyncHandler(createContact))
export default router
