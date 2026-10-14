import {
  deleteAdminUser as deleteUser,
  getAdminUser as getUser,
  listAdminUsers as listUsers,
  updateAdminUser as updateUser,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../../services/admin/userService.js'

export async function listAdminUsers(req, res) {
  return res.json(await listUsers(req.query))
}

export async function getAdminUser(req, res) {
  return res.json(await getUser(req.params.id))
}

export async function updateAdminUser(req, res) {
  return res.json({ user: await updateUser(req.params.id, req.body) })
}

export async function changeAdminUserRole(req, res) {
  return res.json(await updateAdminUserRole(req.params.id, req.body?.role, req.user._id))
}

export async function changeAdminUserStatus(req, res) {
  return res.json(await updateAdminUserStatus(req.params.id, req.body?.isActive, req.user._id))
}

export async function deleteAdminUser(req, res) {
  const result = await deleteUser(req.params.id, {
    cancelReservations: req.query.cancelReservations === 'true',
    actingUserId: req.user._id,
  })
  return res.json(result)
}
