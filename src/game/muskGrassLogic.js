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

function getCropAnchorIndex(blueprint, index) {
  return (
    getSplitweedAnchorIndex(blueprint, index) ??
    getLeechingGourdAnchorIndex(blueprint, index) ??
    index
  )
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

function getMuskGrassNetworkAnchorByIndex(blueprint) {
  const networkAnchors = new Map()
  const visitedIndexes = new Set()

  blueprint.cells.forEach((crop, startingIndex) => {
    if (crop !== 'muskGrass' || visitedIndexes.has(startingIndex)) return

    const pendingIndexes = [startingIndex]
    visitedIndexes.add(startingIndex)

    for (let pendingIndex = 0; pendingIndex < pendingIndexes.length; pendingIndex += 1) {
      const index = pendingIndexes[pendingIndex]
      networkAnchors.set(index, startingIndex)

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
  })

  return networkAnchors
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

const muskGrassIsolationCache = new WeakMap()

function getMuskGrassIsolationIndexes(blueprint) {
  const cachedIndexes = muskGrassIsolationCache.get(blueprint)
  if (cachedIndexes) return cachedIndexes

  const isolatedIndexes = new Set()
  const claimedCropTypesByNetwork = new Map()
  const networkAnchors = getMuskGrassNetworkAnchorByIndex(blueprint)

  blueprint.cells.forEach((crop, index) => {
    if (!crop || crop === 'muskGrass') return

    const cropAnchorIndex = getCropAnchorIndex(blueprint, index)
    if (
      cropAnchorIndex !== index ||
      !isCropFullySurroundedByMuskGrass(blueprint, cropAnchorIndex)
    ) {
      return
    }

    const footprint = getCropFootprintIndexes(blueprint, cropAnchorIndex)
    const footprintIndexes = new Set(footprint)
    const networkAnchor = footprint
      .flatMap((footprintIndex) => {
        const row = Math.floor(footprintIndex / blueprint.columns)
        const column = footprintIndex % blueprint.columns
        const neighborIndexes = []

        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
          for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
            if (rowOffset === 0 && columnOffset === 0) continue

            const neighborRow = row + rowOffset
            const neighborColumn = column + columnOffset
            const neighborIndex =
              neighborRow * blueprint.columns + neighborColumn

            if (
              neighborRow >= 0 &&
              neighborRow < blueprint.rows &&
              neighborColumn >= 0 &&
              neighborColumn < blueprint.columns &&
              !footprintIndexes.has(neighborIndex) &&
              blueprint.cells[neighborIndex] === 'muskGrass'
            ) {
              neighborIndexes.push(neighborIndex)
            }
          }
        }

        return neighborIndexes
      })
      .map((muskGrassIndex) => networkAnchors.get(muskGrassIndex))
      .find((anchor) => anchor !== undefined)

    if (networkAnchor === undefined) return

    const cropType = blueprint.cells[cropAnchorIndex]
    const claimedCropTypes =
      claimedCropTypesByNetwork.get(networkAnchor) ?? new Set()
    if (claimedCropTypes.has(cropType)) return

    claimedCropTypes.add(cropType)
    claimedCropTypesByNetwork.set(networkAnchor, claimedCropTypes)
    footprint.forEach((footprintIndex) => isolatedIndexes.add(footprintIndex))
  })

  muskGrassIsolationCache.set(blueprint, isolatedIndexes)
  return isolatedIndexes
}

export function isCropDebuffIsolatedByMuskGrass(blueprint, index) {
  return getMuskGrassIsolationIndexes(blueprint).has(index)
}
