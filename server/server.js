import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'
import { connectDatabase } from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import roomRoutes from './routes/roomRoutes.js'
import reservationRoutes from './routes/reservationRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import adminRoutes from './routes/admin/adminRoutes.js'
import Room from './models/Room.js'

const app = express()
const port = process.env.PORT || 5000
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)
if (process.env.NODE_ENV !== 'production' && !allowedOrigins.length) {
  allowedOrigins.push('http://localhost:5173')
}

// Connect once and reuse the connection (important on Vercel serverless)
let dbReady = null

function ensureDatabase() {
  if (!dbReady) {
    dbReady = connectDatabase().catch((error) => {
      dbReady = null
      throw error
    })
  }
  return dbReady
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) return callback(null, true)
    return callback(new Error('Origin is not allowed by CORS.'))
  },
}))
app.use(express.json({ limit: '10kb' }))
if (!process.env.VERCEL) {
  app.use('/uploads', express.static(fileURLToPath(new URL('./uploads/', import.meta.url))))
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hotel-transylvania-server' })
})

// Make sure the database is connected before any API route runs
app.use('/api', async (_req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'JWT_SECRET is not configured.' })
  }
  try {
    await ensureDatabase()
    next()
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`)
    res.status(503).json({ message: 'Database unavailable' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/users', profileRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/admin', adminRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)
  if (error.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ message: 'Origin is not allowed by CORS.' })
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(error.errors).map(({ message }) => message).join(' ') })
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'A supplied identifier is invalid.' })
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'That email address is already registered.' })
  }
  if (error.statusCode) return res.status(error.statusCode).json({ message: error.message })
  res.status(500).json({ message: 'The castle encountered an unexpected error.' })
})

export default app

if (!process.env.VERCEL) {
  const startup = process.env.JWT_SECRET
    ? ensureDatabase()
    : Promise.reject(new Error('JWT_SECRET is not configured'))
  startup
    .then(async () => {
      const roomCount = await Room.countDocuments({ status: 'available' })
      console.log(`Database "${mongoose.connection.name}" has ${roomCount} available rooms`)
      app.listen(port, () => console.log(`Server listening on http://localhost:${port}`))
    })
    .catch((error) => {
      console.error(`Unable to start server: ${error.message}`)
      process.exitCode = 1
    })
}