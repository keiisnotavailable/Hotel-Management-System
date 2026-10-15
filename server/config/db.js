import mongoose from 'mongoose'

mongoose.set('bufferCommands', false)

let connectionPromise

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured')
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (!connectionPromise) {
    const options = {
      serverSelectionTimeoutMS: 5000,
      ...(process.env.MONGO_DB_NAME ? { dbName: process.env.MONGO_DB_NAME } : {}),
    }
    connectionPromise = mongoose.connect(process.env.MONGO_URI, options)
      .then(() => {
        console.log(`MongoDB connected to database "${mongoose.connection.name}"`)
        return mongoose.connection
      })
      .catch((error) => {
        connectionPromise = null
        throw error
      })
  }
  return connectionPromise
}
