import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 240 },
    profileImage: { type: String, trim: true, maxlength: 500 },
    role: { type: String, enum: ['guest', 'admin'], default: 'guest' },
    isActive: { type: Boolean, default: true },
    centuryLoyaltyPoints: { type: Number, default: 0, min: 0 },
    savedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
    preferences: {
      bedType: { type: String, enum: ['any', 'single', 'double', 'queen', 'king'], default: 'any' },
      roomType: { type: String, enum: ['any', 'Crypt', 'Den', 'Suite', 'Tower'], default: 'any' },
      smokingPreference: { type: String, enum: ['non-smoking', 'smoking'], default: 'non-smoking' },
      floorPreference: { type: String, enum: ['any', 'low', 'high'], default: 'any' },
      emailNotifications: {
        bookingConfirmations: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
