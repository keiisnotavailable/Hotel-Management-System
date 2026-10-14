import { Router } from 'express'
import { getAdminStats } from '../../controllers/admin/statsController.js'
import { adminOnly } from '../../middleware/admin/adminOnly.js'
import { requireAuth } from '../../middleware/auth.js'
import adminRoomRoutes from './adminRoomRoutes.js'

const router = Router()

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

export default router
