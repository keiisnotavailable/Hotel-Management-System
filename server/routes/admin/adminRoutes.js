import { Router } from 'express'
import { adminOnly } from '../../middleware/admin/adminOnly.js'
import { requireAuth } from '../../middleware/auth.js'

const router = Router()

router.use(requireAuth, adminOnly)
router.get('/ping', (_req, res) => res.json({ ok: true }))

export default router
