import { CROP_DEFINITIONS } from '../game/crops.js'

export function formatPlaytime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

export function getCropMark(crop) {
  return crop ? CROP_DEFINITIONS[crop].icon : null
}
export function getBlueprintCropSummary(cells = []) {
  const cropCounts = cells.reduce((counts, cropId) => {
    if (
      !cropId ||
      cropId === 'leechingGourdPart' ||
      !CROP_DEFINITIONS[cropId]
    ) {
      return counts
    }

    counts[cropId] = (counts[cropId] ?? 0) + 1
    return counts
  }, {})

  return Object.keys(CROP_DEFINITIONS)
    .filter((cropId) => cropCounts[cropId] > 0)
    .map((cropId) => ({ cropId, count: cropCounts[cropId] }))
}
