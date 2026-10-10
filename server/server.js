import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { connectDatabase } from './config/db.js'
import authRoutes from './routes/authRoutes.js'

const app = express()
const port = process.env.PORT || 5000

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '10kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hotel-transylvania-server' })
})
app.use('/api/auth', authRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'The castle encountered an unexpected error.' })
})

connectDatabase()
  .then(() => {
    app.listen(port, () => console.log(`Server listening on http://localhost:${port}`))
  })
  .catch((error) => {
    console.error(`Unable to start server: ${error.message}`)
    process.exit(1)
  })
