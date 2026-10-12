import mongoose from 'mongoose'

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured')
  }

  await mongoose.connect(process.env.MONGO_URI, process.env.MONGO_DB_NAME ? { dbName: process.env.MONGO_DB_NAME } : undefined)
  console.log(`MongoDB connected to database "${mongoose.connection.name}"`)
}
