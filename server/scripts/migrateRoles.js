import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import User from '../models/User.js'

async function migrateRoles() {
  await connectDatabase()

  const roleResult = await User.updateMany(
    { role: { $nin: ['guest', 'admin'] } },
    { $set: { role: 'guest' } },
  )
  const activeResult = await User.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } },
  )

  console.log(`Backfilled ${roleResult.modifiedCount} user roles and ${activeResult.modifiedCount} account statuses.`)
}

migrateRoles()
  .catch((error) => {
    console.error(`Role migration failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
