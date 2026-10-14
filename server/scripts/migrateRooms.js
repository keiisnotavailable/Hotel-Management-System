import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import Room from '../models/Room.js'

async function migrateRooms() {
  await connectDatabase()

  const updatedAt = new Date()
  const [availableResult, maintenanceResult] = await Promise.all([
    Room.collection.updateMany(
      { isActive: true },
      { $set: { status: 'available', statusUpdatedAt: updatedAt }, $unset: { isActive: '' } },
    ),
    Room.collection.updateMany(
      { isActive: false },
      { $set: { status: 'maintenance', statusUpdatedAt: updatedAt }, $unset: { isActive: '' } },
    ),
  ])

  console.log(`Migrated ${availableResult.modifiedCount} available rooms and ${maintenanceResult.modifiedCount} rooms to maintenance.`)
}

migrateRooms()
  .catch((error) => {
    console.error(`Room migration failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
