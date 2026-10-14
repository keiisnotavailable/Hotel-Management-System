import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
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

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured')
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '10kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hotel-transylvania-server' })
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
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(error.errors).map(({ message }) => message).join(' ') })
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'A supplied identifier is invalid.' })
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'That email address is already registered.' })
  }
  res.status(500).json({ message: 'The castle encountered an unexpected error.' })
})

connectDatabase()
  .then(() => {
    Room.countDocuments({ isActive: true }).then((roomCount) => {
      console.log(`Database "${mongoose.connection.name}" has ${roomCount} active rooms`)
      app.listen(port, () => console.log(`Server listening on http://localhost:${port}`))
    })
  })
  .catch((error) => {
    console.error(`Unable to start server: ${error.message}`)
    process.exit(1)
  })
