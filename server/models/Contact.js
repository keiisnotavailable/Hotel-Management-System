import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
}, { timestamps: true })

export default mongoose.model('Contact', contactSchema)
