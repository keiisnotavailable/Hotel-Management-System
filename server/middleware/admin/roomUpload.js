import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const uploadDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url))
const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

mkdirSync(uploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${extensionsByMimeType[file.mimetype]}`),
})

export const uploadRoomImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensionsByMimeType[file.mimetype]) return callback(new Error('Only JPG, PNG, and WebP images are allowed.'))
    return callback(null, true)
  },
})

export function handleRoomUploadError(error, _req, res, next) {
  if (!error) return next()
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Image must be 5 MB or smaller.' })
  if (error.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: 'Upload one image using the "image" field.' })
  if (error instanceof multer.MulterError) return res.status(400).json({ message: error.message })
  if (error.message === 'Only JPG, PNG, and WebP images are allowed.') return res.status(400).json({ message: error.message })
  return next(error)
}
