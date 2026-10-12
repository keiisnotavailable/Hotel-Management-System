import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

function createToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    centuryLoyaltyPoints: user.centuryLoyaltyPoints,
    phone: user.phone,
    address: user.address,
    profileImage: user.profileImage,
  }
}

export async function register(req, res) {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Secret spell must be at least 6 characters.' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const existingUser = await User.findOne({ email: normalizedEmail })
  if (existingUser) {
    return res.status(409).json({ message: 'That Bat-Gram is already registered.' })
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
  })

  return res.status(201).json({ user: publicUser(user), token: createToken(user) })
}

export async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'The secret spell does not match.' })
  }

  return res.json({ user: publicUser(user), token: createToken(user) })
}
