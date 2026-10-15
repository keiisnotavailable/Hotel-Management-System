import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'

const ratingSchema = new mongoose.Schema({
  cleanliness: { type: Number, min: 1, max: 5 },
  comfort: { type: Number, min: 1, max: 5 },
  value: { type: Number, min: 1, max: 5 },
  location: { type: Number, min: 1, max: 5 },
  hostService: { type: Number, min: 1, max: 5 },
}, { _id: false })

const reviewSchema = new mongoose.Schema({
  reviewId: { type: String, default: randomUUID, unique: true },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roomName: { type: String, trim: true, required: true },
  guestFirstName: { type: String, trim: true, required: true },
  stayCheckIn: { type: Date, required: true },
  overall: { type: Number, required: true, min: 1, max: 5 },
  categories: { type: ratingSchema, default: () => ({}) },
  comment: { type: String, trim: true, maxlength: 1000, default: '' },
  showName: { type: Boolean, default: true },
  status: { type: String, enum: ['visible', 'hidden'], default: 'visible', index: true },
  hideReason: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true })

reviewSchema.index({ roomId: 1, status: 1, createdAt: -1 })
export default mongoose.model('Review', reviewSchema)
