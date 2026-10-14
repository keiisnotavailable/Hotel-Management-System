import { getAdminStatsData } from '../../services/admin/statsService.js'

export async function getAdminStats(_req, res) {
  return res.json(await getAdminStatsData())
}
