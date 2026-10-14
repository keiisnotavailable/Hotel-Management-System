import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Room from '../models/Room.js'

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, centuryLoyaltyPoints: user.centuryLoyaltyPoints, phone: user.phone, address: user.address, profileImage: user.profileImage, preferences: user.preferences }
}

export function getProfile(req, res) { return res.json({ user: publicUser(req.user) }) }

export async function uploadProfilePhoto(req, res) {
  if (!req.file) return res.status(400).json({ message: 'An image file is required in the "image" field.' })
  req.user.profileImage = `/uploads/${req.file.filename}`
  await req.user.save()
  return res.status(201).json({ user: publicUser(req.user) })
}

export async function updateProfile(req, res) {
  const allowed = ['name', 'email', 'phone', 'address', 'profileImage']
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user[key] = key === 'email' ? String(req.body[key]).trim().toLowerCase() : req.body[key]
  }
  await req.user.save()
  return res.json({ user: publicUser(req.user) })
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Current password and a new password of at least 6 characters are required.' })
  const user = await User.findById(req.user._id).select('+password')
  if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ message: 'Current password is incorrect.' })
  user.password = await bcrypt.hash(newPassword, 12)
  await user.save()
  return res.json({ message: 'Password changed successfully.' })
}

export async function getSavedRooms(req, res) {
  const user = await User.findById(req.user._id).populate({ path: 'savedRooms', match: { status: 'available' }, select: '-__v' })
  const rooms = (user.savedRooms || []).filter(Boolean)
  return res.json({ rooms, savedRooms: rooms })
}

export async function toggleSavedRoom(req, res) {
  if (!mongoose.isValidObjectId(req.params.roomId)) return res.status(400).json({ message: 'A supplied room identifier is invalid.' })
  const room = await Room.findOne({ _id: req.params.roomId, status: 'available' })
  if (!room) return res.status(404).json({ message: 'Room not found.' })
  const user = await User.findById(req.user._id)
  const index = user.savedRooms.findIndex((id) => id.equals(room._id))
  let saved
  if (index >= 0) {
    user.savedRooms.splice(index, 1)
    saved = false
  } else {
    user.savedRooms.push(room._id)
    saved = true
  }
  await user.save()
  return res.json({ saved, roomId: room._id, savedRooms: user.savedRooms })
}

const preferenceOptions = {
  bedType: ['any', 'single', 'double', 'queen', 'king'],
  roomType: ['any', 'Crypt', 'Den', 'Suite', 'Tower'],
  smokingPreference: ['non-smoking', 'smoking'],
  floorPreference: ['any', 'low', 'high'],
}

export async function getPreferences(req, res) {
  return res.json({ preferences: req.user.preferences })
}

export async function updatePreferences(req, res) {
  const { bedType, roomType, smokingPreference, floorPreference, emailNotifications } = req.body
  for (const [field, allowedValues] of Object.entries(preferenceOptions)) {
    if (!allowedValues.includes(req.body[field])) return res.status(400).json({ message: `A valid ${field} preference is required.` })
  }
  if (!emailNotifications || typeof emailNotifications.bookingConfirmations !== 'boolean' || typeof emailNotifications.promotions !== 'boolean') {
    return res.status(400).json({ message: 'Valid email notification preferences are required.' })
  }
  req.user.preferences = { bedType, roomType, smokingPreference, floorPreference, emailNotifications }
  await req.user.save()
  return res.json({ preferences: req.user.preferences })
}
