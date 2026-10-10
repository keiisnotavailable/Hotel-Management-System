import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    monsterType: { type: String, default: 'Unknown', trim: true },
    role: { type: String, enum: ['guest', 'staff', 'admin'], default: 'guest' },
    centuryLoyaltyPoints: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
