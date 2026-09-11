import {
  getAdjacentCropConnections,
  getOrthogonalIndexes,
} from './adjacencyLogic.js'

const sweetPotatoBedCache = new WeakMap()

function calculateSweetPotatoBeds(blueprint) {
  const beds = []
  const bedByIndex = new Map()
  const visitedIndexes = new Set()

  blueprint.cells.forEach((crop, startingIndex) => {
    if (crop !== 'sweetPotato' || visitedIndexes.has(startingIndex)) return

    const indexes = []
    const pendingIndexes = [startingIndex]
    visitedIndexes.add(startingIndex)

    for (
      let pendingIndex = 0;
      pendingIndex < pendingIndexes.length;
      pendingIndex += 1
    ) {
      const index = pendingIndexes[pendingIndex]
      indexes.push(index)

      getOrthogonalIndexes(blueprint, index).forEach((neighborIndex) => {
        if (
          blueprint.cells[neighborIndex] === 'sweetPotato' &&
          !visitedIndexes.has(neighborIndex)
        ) {
          visitedIndexes.add(neighborIndex)
          pendingIndexes.push(neighborIndex)
        }
      })
    }

    const bed = { anchorIndex: startingIndex, indexes }
    beds.push(bed)
    indexes.forEach((index) => bedByIndex.set(index, bed))
  })

  return { beds, bedByIndex }
}

function getCachedSweetPotatoBeds(blueprint) {
  const cachedBeds = sweetPotatoBedCache.get(blueprint)
  if (cachedBeds) return cachedBeds

  const beds = calculateSweetPotatoBeds(blueprint)
  sweetPotatoBedCache.set(blueprint, beds)
  return beds
}

export function getSweetPotatoBeds(blueprint) {
  return getCachedSweetPotatoBeds(blueprint).beds
}

export function getSweetPotatoBed(blueprint, index) {
  return getCachedSweetPotatoBeds(blueprint).bedByIndex.get(index) ?? null
}

export function getSweetPotatoBedTurnipConnections(blueprint, bedIndexes) {
  const nearestConnectionByTurnip = new Map()

  bedIndexes.forEach((bedIndex) => {
    getAdjacentCropConnections(blueprint, bedIndex).forEach(
      ({ index, adjacencyDistance }) => {
        if (blueprint.cells[index] !== 'turnip') return

        const knownDistance = nearestConnectionByTurnip.get(index)
        if (knownDistance === undefined || adjacencyDistance < knownDistance) {
          nearestConnectionByTurnip.set(index, adjacencyDistance)
        }
      },
    )
  })

  return [...nearestConnectionByTurnip.entries()]
    .map(([index, adjacencyDistance]) => ({ index, adjacencyDistance }))
    .sort((left, right) => left.index - right.index)
}

export function getSweetPotatoBedBaseBonus(perfection, connectedCropCount) {
  const count = Math.max(0, Math.floor(Number(connectedCropCount) || 0))
  if (count === 0) return 0

  return (
    perfection.bedHamsterEfficiencyBonusPerCrop *
    count *
    perfection.bedGrowthMultiplier **
      Math.min(count - 1, perfection.bedGrowthExponentCap)
  )
}

export function getSweetPotatoBedCrowdingMultiplier(
  perfection,
  adjacentBuffCount,
) {
  const count = Math.max(0, Math.floor(Number(adjacentBuffCount) || 0))
  const pairCount = (count * (count - 1)) / 2

  return perfection.bedBuffCrowdingMultiplier ** pairCount
}
