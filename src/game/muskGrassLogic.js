import { getOrthogonalIndexes } from './adjacencyLogic.js'
import {
  getLeechingGourdFootprint,
  getSplitweedAnchorIndex,
  getSplitweedFootprint,
  isLeechingGourdCell,
} from './cropFootprintLogic.js'

function getLeechingGourdAnchorIndex(blueprint, index) {
  if (!isLeechingGourdCell(blueprint.cells[index])) return null

  const anchorIndex = blueprint.cells.indexOf('leechingGourd')
  if (anchorIndex === -1) return null

  return getLeechingGourdFootprint(blueprint, anchorIndex).includes(index)
    ? anchorIndex
    : null
}

export function getCropFootprintIndexes(blueprint, index) {
  const splitweedAnchorIndex = getSplitweedAnchorIndex(blueprint, index)
  if (splitweedAnchorIndex !== null) {
    return getSplitweedFootprint(blueprint, splitweedAnchorIndex)
  }

  const gourdAnchorIndex = getLeechingGourdAnchorIndex(blueprint, index)
  if (gourdAnchorIndex !== null) {
    return getLeechingGourdFootprint(blueprint, gourdAnchorIndex)
  }

  return blueprint.cells[index] ? [index] : []
}

export function getMuskGrassNetworkSizeByIndex(blueprint) {
  const networkSizes = new Map()
  const visitedIndexes = new Set()

  blueprint.cells.forEach((crop, startingIndex) => {
    if (crop !== 'muskGrass' || visitedIndexes.has(startingIndex)) return

    const networkIndexes = []
    const pendingIndexes = [startingIndex]
    visitedIndexes.add(startingIndex)

    for (let pendingIndex = 0; pendingIndex < pendingIndexes.length; pendingIndex += 1) {
      const index = pendingIndexes[pendingIndex]
      networkIndexes.push(index)

      getOrthogonalIndexes(blueprint, index).forEach((neighborIndex) => {
        if (
          blueprint.cells[neighborIndex] === 'muskGrass' &&
          !visitedIndexes.has(neighborIndex)
        ) {
          visitedIndexes.add(neighborIndex)
          pendingIndexes.push(neighborIndex)
        }
      })
    }

    networkIndexes.forEach((index) => networkSizes.set(index, networkIndexes.length))
  })

  return networkSizes
}

export function getMuskGrassNetworkSize(blueprint, index) {
  return getMuskGrassNetworkSizeByIndex(blueprint).get(index) ?? 0
}

export function isCropFullySurroundedByMuskGrass(blueprint, index) {
  const footprint = getCropFootprintIndexes(blueprint, index)
  if (footprint.length === 0) return false

  const footprintIndexes = new Set(footprint)
  const { rows, columns } = blueprint

  for (const footprintIndex of footprint) {
    const row = Math.floor(footprintIndex / columns)
    const column = footprintIndex % columns

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (rowOffset === 0 && columnOffset === 0) continue

        const neighborRow = row + rowOffset
        const neighborColumn = column + columnOffset

        // A field edge is an incomplete surround; missing out-of-bounds tiles do
        // not make edge or corner placement cheaper.
        if (
          neighborRow < 0 ||
          neighborRow >= rows ||
          neighborColumn < 0 ||
          neighborColumn >= columns
        ) {
          return false
        }

        const neighborIndex = neighborRow * columns + neighborColumn
        if (
          !footprintIndexes.has(neighborIndex) &&
          blueprint.cells[neighborIndex] !== 'muskGrass'
        ) {
          return false
        }
      }
    }
  }

  return true
}
