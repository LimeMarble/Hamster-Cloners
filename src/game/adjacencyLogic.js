import {
  getLeechingGourdFootprint,
  isLeechingGourdAnchor,
  isLeechingGourdCell,
} from './blueprintLogic.js'
import { CROP_DEFINITIONS, isCropEffectModifier } from './crops.js'
import { ROOT_TUNNEL_ADJACENCY_DECAY } from './gameConfig.js'

export function getOrthogonalIndexes(blueprint, index) {
  const { rows, columns } = blueprint
  const row = Math.floor(index / columns)
  const column = index % columns
  const neighboringIndexes = []

  if (row > 0) {
    neighboringIndexes.push(index - columns)
  }
  if (row < rows - 1) {
    neighboringIndexes.push(index + columns)
  }
  if (column > 0) {
    neighboringIndexes.push(index - 1)
  }
  if (column < columns - 1) {
    neighboringIndexes.push(index + 1)
  }

  return neighboringIndexes
}

export function isRootTunnel(crop) {
  return CROP_DEFINITIONS[crop]?.transfersAdjacencies === true
}

export function getRootTunnelAdjacencyStrength(adjacencyDistance = 0) {
  const safeDistance = Math.max(
    0,
    Math.floor(Number(adjacencyDistance) || 0),
  )

  return ROOT_TUNNEL_ADJACENCY_DECAY ** safeDistance
}

function getRootTunnelDistanceMap(blueprint, startingIndexes) {
  const { cells } = blueprint
  const tunnelDistances = new Map()
  const pendingTunnels = startingIndexes
    .filter((index) => isRootTunnel(cells[index]))
    .map((index) => ({ index, adjacencyDistance: 1 }))
  let pendingIndex = 0

  while (pendingIndex < pendingTunnels.length) {
    const { index: tunnelIndex, adjacencyDistance } =
      pendingTunnels[pendingIndex]
    pendingIndex += 1

    const knownDistance = tunnelDistances.get(tunnelIndex)
    if (knownDistance !== undefined && knownDistance <= adjacencyDistance) {
      continue
    }

    tunnelDistances.set(tunnelIndex, adjacencyDistance)
    getOrthogonalIndexes(blueprint, tunnelIndex).forEach((neighborIndex) => {
      if (isRootTunnel(cells[neighborIndex])) {
        pendingTunnels.push({
          index: neighborIndex,
          adjacencyDistance: adjacencyDistance + 1,
        })
      }
    })
  }

  return tunnelDistances
}

export function getConnectedRootTunnelIndexes(blueprint, startingIndexes) {
  return [...getRootTunnelDistanceMap(blueprint, startingIndexes).keys()]
}

function addNearestConnection(connections, index, adjacencyDistance) {
  const knownDistance = connections.get(index)

  if (knownDistance === undefined || adjacencyDistance < knownDistance) {
    connections.set(index, adjacencyDistance)
  }
}

function getCropConnectionsFromOrigins(
  blueprint,
  originIndexes,
  {
    excludedIndexes = new Set(),
    transferThroughTunnels = true,
    canTransferCrop = () => true,
  } = {},
) {
  const { cells } = blueprint
  const connections = new Map()
  const startingTunnelIndexes = []

  originIndexes.forEach((originIndex) => {
    getOrthogonalIndexes(blueprint, originIndex).forEach((neighborIndex) => {
      if (excludedIndexes.has(neighborIndex)) {
        return
      }

      const neighborCrop = cells[neighborIndex]
      if (isRootTunnel(neighborCrop)) {
        if (transferThroughTunnels) {
          startingTunnelIndexes.push(neighborIndex)
        }
        return
      }

      if (neighborCrop && !isLeechingGourdCell(neighborCrop)) {
        addNearestConnection(connections, neighborIndex, 0)
      }
    })
  })

  if (transferThroughTunnels) {
    getRootTunnelDistanceMap(blueprint, startingTunnelIndexes).forEach(
      (adjacencyDistance, tunnelIndex) => {
        getOrthogonalIndexes(blueprint, tunnelIndex).forEach(
          (neighborIndex) => {
            if (excludedIndexes.has(neighborIndex)) {
              return
            }

            const neighborCrop = cells[neighborIndex]
            if (
              neighborCrop &&
              !isRootTunnel(neighborCrop) &&
              !isLeechingGourdCell(neighborCrop) &&
              canTransferCrop(neighborCrop)
            ) {
              addNearestConnection(
                connections,
                neighborIndex,
                adjacencyDistance,
              )
            }
          },
        )
      },
    )
  }

  return [...connections.entries()]
    .map(([index, adjacencyDistance]) => ({ index, adjacencyDistance }))
    .sort((left, right) => left.index - right.index)
}

export function getLeechingGourdAdjacentCropConnections(blueprint) {
  const anchorIndex = blueprint.cells.findIndex(isLeechingGourdAnchor)

  if (anchorIndex === -1) {
    return []
  }

  const footprint = getLeechingGourdFootprint(blueprint, anchorIndex)
  if (footprint.length !== 4) {
    return []
  }

  return getCropConnectionsFromOrigins(blueprint, footprint, {
    excludedIndexes: new Set(footprint),
  })
}

export function getLeechingGourdAdjacentCropIndexes(blueprint) {
  return getLeechingGourdAdjacentCropConnections(blueprint).map(
    ({ index }) => index,
  )
}

function canParticipateInTunnelAdjacency(crop) {
  return !isCropEffectModifier(crop) || crop === 'turnip'
}

export function getAdjacentCropConnections(blueprint, index) {
  const crop = blueprint.cells[index]
  const transferThroughTunnels =
    Boolean(crop) &&
    !isRootTunnel(crop) &&
    canParticipateInTunnelAdjacency(crop)

  return getCropConnectionsFromOrigins(blueprint, [index], {
    excludedIndexes: new Set([index]),
    transferThroughTunnels,
    canTransferCrop: canParticipateInTunnelAdjacency,
  })
}

export function getAdjacentCropIndexes(blueprint, index) {
  return getAdjacentCropConnections(blueprint, index).map(
    ({ index: neighborIndex }) => neighborIndex,
  )
}
