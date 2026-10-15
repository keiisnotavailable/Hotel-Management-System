import { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { getAdminStats } from '../../controllers/admin/statsController.js'
import { adminOnly } from '../../middleware/admin/adminOnly.js'
import { requireAuth } from '../../middleware/auth.js'
import { syncReservationStatuses } from '../../services/reservationLifecycleService.js'
import adminReservationRoutes from './adminReservationRoutes.js'
import adminRoomRoutes from './adminRoomRoutes.js'
import adminUserRoutes from './adminUserRoutes.js'

const router = Router()

router.get('/cron/sync-reservations', async (req, res, next) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return res.status(503).json({ message: 'Cron authentication is not configured.' })
  const expected = Buffer.from(`Bearer ${secret}`)
  const provided = Buffer.from(req.get('authorization') || '')
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ message: 'Unauthorized.' })
  }
  try {
    await syncReservationStatuses()
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

router.use(requireAuth, adminOnly)
router.get('/ping', (_req, res) => res.json({ ok: true }))
router.get('/stats', async (req, res, next) => {
  try {
    await getAdminStats(req, res)
  } catch (error) {
    return next(error)
  }
})
router.use(adminRoomRoutes)
router.use('/reservations', adminReservationRoutes)
router.use('/users', adminUserRoutes)

export default router
