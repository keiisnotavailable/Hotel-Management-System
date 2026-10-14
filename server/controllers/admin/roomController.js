import {
  createAdminRoom as createRoom,
  deleteAdminRoom as deleteRoom,
  getAdminRoom as getRoom,
  getRoomImageKeys as listRoomImageKeys,
  listAdminRooms as listRooms,
  updateAdminRoom as updateRoom,
  updateAdminRoomStatus as updateRoomStatus,
  validateUploadedImage,
} from '../../services/admin/roomService.js'

export async function listAdminRooms(req, res) {
  return res.json(await listRooms(req.query))
}

export async function getAdminRoom(req, res) {
  return res.json({ room: await getRoom(req.params.id) })
}

export async function createAdminRoom(req, res) {
  return res.status(201).json({ room: await createRoom(req.body) })
}

export async function updateAdminRoom(req, res) {
  return res.json({ room: await updateRoom(req.params.id, req.body) })
}

export async function updateAdminRoomStatus(req, res) {
  const { status, maintenanceNote } = req.body
  return res.json(await updateRoomStatus(req.params.id, status, maintenanceNote))
}

export async function deleteAdminRoom(req, res) {
  await deleteRoom(req.params.id)
  return res.status(204).end()
}

export async function getAdminImageKeys(_req, res) {
  return res.json({ keys: await listRoomImageKeys() })
}

export async function uploadAdminRoomImage(req, res) {
  if (!req.file) return res.status(400).json({ message: 'An image file is required in the "image" field.' })
  const image = await validateUploadedImage(req.file)
  return res.status(201).json({ image })
}
