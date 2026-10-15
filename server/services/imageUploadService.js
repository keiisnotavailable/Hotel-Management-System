import { Readable } from 'node:stream'
import { readFile, rm } from 'node:fs/promises'
import { v2 as cloudinary } from 'cloudinary'

const cloudinaryEnvironment = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
]

const imageSignatures = {
  'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (buffer) => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
}

export class ImageUploadError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function uploadImage(file, folder) {
  if (!file) throw new ImageUploadError(400, 'An image file is required.')
  if (process.env.VERCEL && !file.buffer) {
    throw new ImageUploadError(500, 'Image uploads must use in-memory storage on Vercel.')
  }
  const buffer = file.buffer || (file.path ? await readFile(file.path) : null)
  if (!buffer) throw new ImageUploadError(400, 'The uploaded image data is missing.')
  const signatureMatches = imageSignatures[file.mimetype]?.(buffer)
  if (!signatureMatches) {
    if (file.path && !process.env.VERCEL) await rm(file.path, { force: true })
    throw new ImageUploadError(400, 'Uploaded file is not a valid JPG, PNG, or WebP image.')
  }

  const configured = cloudinaryEnvironment.filter((name) => Boolean(process.env[name]))
  if (configured.length === cloudinaryEnvironment.length) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => {
        if (error) return reject(error)
        if (!result?.secure_url) return reject(new Error('Cloudinary did not return a secure image URL.'))
        return resolve(result.secure_url)
      })
      Readable.from([buffer]).pipe(upload)
    })
  }

  if (configured.length || process.env.VERCEL) {
    throw new ImageUploadError(500, 'Persistent image storage is not configured.')
  }
  if (!file.filename) throw new ImageUploadError(500, 'The local image upload did not produce a file.')
  return `/uploads/${file.filename}`
}
