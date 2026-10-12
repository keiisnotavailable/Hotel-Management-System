import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import Room from '../models/Room.js'
import Reservation from '../models/Reservation.js'
import User from '../models/User.js'

const rooms = [
  { slug: 'werewolf-pups-family-den', name: 'Werewolf Pups Family Den', description: 'A generous, quiet den for moonlit family gatherings and energetic pups. Soft furnishings, a warm hearth, and a private courtyard make this a restful hideaway after dark.', category: 'Luxury Room', tagline: 'Noiseless', sizeSqFt: 150, bedsLabel: '12 Cozy Beds', rating: 5, featured: true, type: 'Den', capacity: 12, pricePerNight: 14500, amenities: ['Family lounge', 'Fireplace', 'Moonlit courtyard'], images: ['werewolves-family-den'], floor: 1 },
  { slug: 'the-haunted-tower-crypt', name: 'The Haunted Tower Crypt', description: 'A dramatic, sunlight-proof tower crypt with stained glass and gothic rafters. Its quiet stone walls keep the room cool, dark, and wonderfully private.', category: 'Luxury Room', tagline: '100% Sunlight-proof / Gothic', sizeSqFt: 120, bedsLabel: '1 Stained-Glass Crypt', rating: 5, featured: true, type: 'Tower', capacity: 2, pricePerNight: 8700, amenities: ['Stained glass', 'Blackout curtains', 'Valley view'], images: ['haunted-tower-crypt'], floor: 6 },
  { slug: 'royal-coffin-penthouse', name: 'Royal Coffin Penthouse', description: 'A grand penthouse with imported Roma details, velvet-lined coffins, and a private moonlit terrace. Designed for guests who prefer their nocturnal escape with a little ceremony.', category: 'Luxury Room', tagline: 'Spoil-solid / Imported Roma', sizeSqFt: 1200, bedsLabel: '2 VIP Coffins', rating: 5, featured: true, type: 'Suite', capacity: 4, pricePerNight: 24940, amenities: ['Private terrace', 'Imported Roma marble', 'Royal salon'], images: ['royal-coffin-penthouse'], floor: 8 },
  { slug: 'the-vampire-suite', name: 'The Vampire Suite', description: 'A refined crimson suite with antique furnishings, a private salon, and a perfectly quiet atmosphere for elegant evenings.', category: 'Suite', tagline: 'Regal comfort after sunset', sizeSqFt: 900, bedsLabel: '1 King Coffin', rating: 4.9, featured: false, type: 'Suite', capacity: 2, pricePerNight: 27840, amenities: ['Private salon', 'Butler service', 'Minibar'], images: ['vampire-suite'], floor: 4 },
  { slug: 'frankensteins-lab-den', name: "Frankenstein's Lab Den", description: 'A curious den inspired by the castle laboratory, with sturdy worktables, electric-blue accents, and space for the whole experiment.', category: 'Themed Den', tagline: 'Charged with comfort', sizeSqFt: 700, bedsLabel: '2 Double Beds', rating: 4.6, featured: false, type: 'Den', capacity: 4, pricePerNight: 13340, amenities: ['Worktable', 'Reading nook', 'Tea service'], images: ['frankenstein-lab-den'], floor: 3 },
  { slug: 'mummys-tomb-crypt', name: "Mummy's Tomb Crypt", description: 'A serene stone chamber with linen textures, warm lantern light, and the deep quiet of an ancient resting place.', category: 'Crypt', tagline: 'Peaceful rest, ancient style', sizeSqFt: 400, bedsLabel: '1 Queen Coffin', rating: 4.2, featured: false, type: 'Crypt', capacity: 2, pricePerNight: 10150, amenities: ['Stone bath', 'Climate control', 'Tea service'], images: ['mummy-tomb-crypt'], floor: 1 },
  { slug: 'werewolf-burrow', name: 'Werewolf Burrow', description: 'A cozy earth-toned burrow with a soft lounge and plenty of room to stretch after a long night under the moon.', category: 'Den', tagline: 'Wildly comfortable', sizeSqFt: 520, bedsLabel: '3 Cozy Beds', rating: 4.5, featured: false, type: 'Den', capacity: 5, pricePerNight: 12180, amenities: ['Lounge hearth', 'Moon window', 'Soundproofing'], images: ['werewolf-burrow'], floor: 0 },
  { slug: 'blob-lagoon-suite', name: 'Blob Lagoon Suite', description: 'A playful suite with cool lagoon tones, rounded furnishings, and a private sitting area for slow, dreamy evenings.', category: 'Suite', tagline: 'Softly surreal', sizeSqFt: 650, bedsLabel: '1 King Bed', rating: 4.4, featured: false, type: 'Suite', capacity: 3, pricePerNight: 18560, amenities: ['Lagoon view', 'Rain shower', 'Sitting room'], images: ['blob-lagoon-suite'], floor: 2 },
  { slug: 'skeleton-tower', name: 'Skeleton Tower', description: 'A high tower room with dramatic arches, moonlit views, and a quiet reading corner above the castle mist.', category: 'Tower', tagline: 'Bones above the clouds', sizeSqFt: 560, bedsLabel: '2 Twin Coffins', rating: 4.3, featured: false, type: 'Tower', capacity: 3, pricePerNight: 16820, amenities: ['Tower view', 'Reading nook', 'Stained glass'], images: ['skeleton-tower'], floor: 7 },
  { slug: 'witchs-attic', name: "Witch's Attic", description: 'A charming attic retreat filled with warm wood, spell-safe storage, and a small window overlooking the enchanted grounds.', category: 'Attic Room', tagline: 'A little magic upstairs', sizeSqFt: 360, bedsLabel: '1 Double Bed', rating: 4.1, featured: false, type: 'Crypt', capacity: 2, pricePerNight: 11310, amenities: ['Potion-safe storage', 'Hearth', 'Garden view'], images: ['witch-attic'], floor: 5 },
]

const sampleReservations = [
  { slug: 'werewolf-pups-family-den', checkIn: '2027-01-18T18:00:00.000Z', checkOut: '2027-01-21T06:00:00.000Z', guests: 2, status: 'confirmed', specialRequests: 'Late-night complimentary cocoa.' },
  { slug: 'royal-coffin-penthouse', checkIn: '2027-02-10T18:00:00.000Z', checkOut: '2027-02-13T06:00:00.000Z', guests: 2, status: 'confirmed', specialRequests: 'Please prepare the royal terrace.' },
  { slug: 'the-haunted-tower-crypt', checkIn: '2027-03-05T18:00:00.000Z', checkOut: '2027-03-08T06:00:00.000Z', guests: 2, status: 'cancelled', specialRequests: 'Window seat requested.' },
]

function nightsBetween(checkIn, checkOut) {
  return Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)
}

async function seed() {
  await connectDatabase()
  await Reservation.deleteMany({})
  await Room.deleteMany({})
  await User.updateMany({}, { $set: { savedRooms: [] } })
  const createdRooms = await Room.insertMany(rooms)
  const password = await bcrypt.hash('transylvania-demo-password', 12)
  const user = await User.findOneAndUpdate({ email: 'guest@example.com' }, { $set: { name: 'Jonathan Harker', role: 'guest', password } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const roomBySlug = new Map(createdRooms.map((room) => [room.slug, room]))
  await Reservation.insertMany(sampleReservations.map((item) => {
    const room = roomBySlug.get(item.slug)
    const nights = nightsBetween(item.checkIn, item.checkOut)
    return { user: user._id, room: room._id, checkIn: new Date(item.checkIn), checkOut: new Date(item.checkOut), nights, totalPrice: nights * room.pricePerNight, guests: item.guests, status: item.status, specialRequests: item.specialRequests }
  }))
  console.table(createdRooms.map((room) => ({ name: room.name, slug: room.slug, type: room.type, capacity: room.capacity, price: room.pricePerNight, featured: room.featured, images: room.images.join(', ') || 'placeholder' })))
  console.log(`Seeded ${createdRooms.length} rooms and ${sampleReservations.length} reservations in database "${mongoose.connection.name}".`)
}

seed().catch((error) => {
  console.error(`Seed failed: ${error.message}`)
  process.exitCode = 1
}).finally(async () => {
  await mongoose.disconnect()
})
