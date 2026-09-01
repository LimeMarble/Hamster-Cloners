import {
  CROP_DEFINITIONS,
  getCropPerfection,
} from './crops.js'
import { isLeechingGourdCell } from './cropFootprintLogic.js'

export const MANGROVE_SAPLING_PLACEMENT_LIMIT =
  CROP_DEFINITIONS.mangroveSapling.maximumPlacementsPerBlueprint

function getSurroundingIndexes(blueprint, index) {
  const row = Math.floor(index / blueprint.columns)
  const column = index % blueprint.columns
  const indexes = []

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue

      const nextRow = row + rowOffset
      const nextColumn = column + columnOffset
      if (
        nextRow >= 0 &&
        nextRow < blueprint.rows &&
        nextColumn >= 0 &&
        nextColumn < blueprint.columns
      ) {
        indexes.push(nextRow * blueprint.columns + nextColumn)
      }
    }
  }

  return indexes
}

function getNurseryCropType(crop, completedCropPerfections) {
  if (!crop || crop === 'rootTunnel') return null

  if (isLeechingGourdCell(crop)) {
    return {
      key: 'leechingGourd',
      cropId: 'leechingGourd',
      sourceCropId: 'pumpkin',
      perfected: completedCropPerfections.includes('leechingGourd'),
      manateeCrop: false,
    }
  }

  if (
    (crop === 'knotweed' || crop === 'splitweedPart') &&
    completedCropPerfections.includes('splitweed')
  ) {
    return {
      key: 'splitweed',
      cropId: 'knotweed',
      sourceCropId: 'knotweed',
      perfected: true,
      manateeCrop: false,
    }
  }

  // Planted Pumpkins remain their base crop after Leeching Gourd is unlocked.
  const perfection = crop === 'pumpkin'
    ? null
    : getCropPerfection(crop, completedCropPerfections)

  return {
    key: crop,
    cropId: crop,
    sourceCropId: crop,
    perfected: Boolean(perfection),
    manateeCrop: CROP_DEFINITIONS[crop]?.isManateeCrop === true,
  }
}

export function getMangroveNurseryCropTypes(
  blueprint,
  completedCropPerfections = [],
) {
  const mangroveIndexes = blueprint.cells.flatMap((crop, index) =>
    crop === 'mangroveSapling' ? [index] : [],
  )

  if (mangroveIndexes.length === 0) return []

  const cropTypes = new Map()
  const addCropType = (crop) => {
    const cropType = getNurseryCropType(crop, completedCropPerfections)
    if (!cropType || cropTypes.has(cropType.key)) return

    const weight =
      (cropType.perfected ? 2 : 1) * (cropType.manateeCrop ? 3 : 1)
    cropTypes.set(cropType.key, {
      ...cropType,
      weight,
      baseBonus:
        weight * CROP_DEFINITIONS.mangroveSapling.nurseryBonusPerCropType,
    })
  }

  // The sapling is part of its own nursery calculation even though its tile
  // lies in the middle of the surrounding ring.
  mangroveIndexes.forEach((mangroveIndex) => {
    addCropType('mangroveSapling')
    getSurroundingIndexes(blueprint, mangroveIndex).forEach((index) => {
      addCropType(blueprint.cells[index])
    })
  })

  return [...cropTypes.values()]
}

export function getMangroveNurseryBaseEffect(
  blueprint,
  completedCropPerfections = [],
) {
  const cropTypes = getMangroveNurseryCropTypes(
    blueprint,
    completedCropPerfections,
  )

  return {
    saplingCount: blueprint.cells.filter(
      (crop) => crop === 'mangroveSapling',
    ).length,
    cropTypes,
    baseBonus: cropTypes.reduce(
      (total, cropType) => total + cropType.baseBonus,
      0,
    ),
  }
}

export function canPlaceMangroveSapling(blueprint, index) {
  if (blueprint.cells[index] === 'mangroveSapling') return true

  return (
    blueprint.cells.filter((crop) => crop === 'mangroveSapling').length <
    MANGROVE_SAPLING_PLACEMENT_LIMIT
  )
}

export function normalizeMangroveSaplingCells(cells) {
  let retainedCount = 0

  return cells.map((crop) => {
    if (crop !== 'mangroveSapling') return crop
    retainedCount += 1
    return retainedCount <= MANGROVE_SAPLING_PLACEMENT_LIMIT ? crop : null
  })
}
