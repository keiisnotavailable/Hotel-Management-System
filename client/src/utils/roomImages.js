import { API_BASE } from '../lib/api'

const imageModules = import.meta.glob('../images/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' })
const imageMap = Object.fromEntries(Object.entries(imageModules).map(([path, image]) => [
  path.split('/').at(-1).replace(/\.[^.]+$/, ''),
  image,
]))

export function getRoomImages(room) {
  const images = room?.images?.length ? room.images : [room?.slug?.replace(/^the-/, '')]
  return images.map((image) => {
    if (image?.startsWith('/uploads/')) return new URL(image, new URL(API_BASE, window.location.origin)).toString()
    return imageMap[image]
  }).filter(Boolean)
}

export function getRoomImage(room) {
  return getRoomImages(room)[0] || null
}
