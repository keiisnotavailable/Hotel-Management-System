import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  category: { type: String, trim: true, default: '' },
  tagline: { type: String, trim: true, default: '' },
  sizeSqFt: { type: Number, min: 0 },
  bedsLabel: { type: String, trim: true, default: '' },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  featured: { type: Boolean, default: false },
  type: { type: String, required: true, enum: ['Crypt', 'Den', 'Suite', 'Tower'] },
  capacity: { type: Number, required: true, min: 1 },
  pricePerNight: { type: Number, required: true, min: 0 },
  amenities: { type: [String], default: [] },
  images: { type: [String], default: [] },
  floor: { type: Number, min: 0 },
  status: { type: String, enum: ['available', 'maintenance'], default: 'available' },
  maintenanceNote: { type: String, trim: true },
  statusUpdatedAt: { type: Date },
}, { timestamps: true })

export default mongoose.model('Room', roomSchema)
