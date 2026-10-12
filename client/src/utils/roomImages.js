import blobLagoonSuite from '../images/blob-lagoon-suite.jpeg'
import frankensteinLabDen from '../images/frankenstein-lab-den.jpeg'
import hauntedTowerCrypt from '../images/haunted-tower-crypt.jpeg'
import mummyTombCrypt from '../images/mummy-tomb-crypt.jpeg'
import royalCoffinPenthouse from '../images/royal-coffin-penthouse.jpeg'
import skeletonTower from '../images/skeleton-tower.jpeg'
import vampireSuite from '../images/vampire-suite.jpeg'
import werewolfBurrow from '../images/werewolf-burrow.jpeg'
import werewolvesFamilyDen from '../images/werewolves-family-den.jpeg'
import witchAttic from '../images/witch-attic.jpeg'

const imageMap = {
  'blob-lagoon-suite': blobLagoonSuite,
  'frankenstein-lab-den': frankensteinLabDen,
  'haunted-tower-crypt': hauntedTowerCrypt,
  'mummy-tomb-crypt': mummyTombCrypt,
  'royal-coffin-penthouse': royalCoffinPenthouse,
  'skeleton-tower': skeletonTower,
  'vampire-suite': vampireSuite,
  'werewolf-burrow': werewolfBurrow,
  'werewolves-family-den': werewolvesFamilyDen,
  'witch-attic': witchAttic,
}

export function getRoomImages(room) {
  const keys = room?.images?.length
    ? room.images
    : [room?.slug?.replace(/^the-/, '')]
  return keys.map((key) => imageMap[key]).filter(Boolean)
}

export function getRoomImage(room) {
  return getRoomImages(room)[0] || null
}
