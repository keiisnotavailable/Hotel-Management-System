import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  roomName: { type: String, trim: true },
  roomSlug: { type: String, trim: true },
  userName: { type: String, trim: true },
  userEmail: { type: String, trim: true, lowercase: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  nights: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true, min: 0 },
  guests: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', index: true },
  specialRequests: { type: String, trim: true, maxlength: 1000, default: '' },
  cancellationReason: { type: String, trim: true, maxlength: 1000 },
  cancelledBy: { type: String, enum: ['admin', 'guest'] },
  cancelledAt: { type: Date },
}, { timestamps: true })

reservationSchema.index({ room: 1, checkIn: 1, checkOut: 1, status: 1 })
export default mongoose.model('Reservation', reservationSchema)
