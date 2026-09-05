import {
  getLeechingGourdFootprint,
  isLeechingGourdAnchor,
  isLeechingGourdCell,
} from './cropFootprintLogic.js'
import { CROP_DEFINITIONS } from './crops.js'
import { ROOT_TUNNEL_ADJACENCY_DECAY } from './gameConfig.js'
import { getRootTunnelConnections } from './rootTunnelLogic.js'

export function getOrthogonalIndexes(blueprint, index) {
  const { rows, columns } = blueprint
  const row = Math.floor(index / columns)
  const column = index % columns
  const neighboringIndexes = []

  if (row > 0) neighboringIndexes.push(index - columns)
  if (row < rows - 1) neighboringIndexes.push(index + columns)
  if (column > 0) neighboringIndexes.push(index - 1)
  if (column < columns - 1) neighboringIndexes.push(index + 1)

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

  // A single-tile connection is the initial Root Tunnel stage and transfers
  // at full strength. Attenuation starts if longer routes are unlocked later.
  return ROOT_TUNNEL_ADJACENCY_DECAY ** Math.max(0, safeDistance - 1)
}

export function getConnectedRootTunnelIndexes(blueprint, startingIndexes) {
  return [...new Set(startingIndexes)].filter((index) =>
    isRootTunnel(blueprint.cells[index]),
  )
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
  excludedIndexes = new Set(),
) {
  const connections = new Map()

  originIndexes.forEach((originIndex) => {
    getOrthogonalIndexes(blueprint, originIndex).forEach((neighborIndex) => {
      const neighborCrop = blueprint.cells[neighborIndex]

      if (
        !excludedIndexes.has(neighborIndex) &&
        neighborCrop &&
        !isRootTunnel(neighborCrop) &&
        !isLeechingGourdCell(neighborCrop)
      ) {
        addNearestConnection(connections, neighborIndex, 0)
      }
    })
  })

  getRootTunnelConnections(blueprint).forEach(
    ({ senderIndex, recipientIndex }) => {
      if (
        originIndexes.includes(recipientIndex) &&
        !excludedIndexes.has(senderIndex)
      ) {
        addNearestConnection(connections, senderIndex, 1)
      }
    },
  )

  return [...connections.entries()]
    .map(([index, adjacencyDistance]) => ({ index, adjacencyDistance }))
    .sort((left, right) => left.index - right.index)
}

export function getLeechingGourdAdjacentCropConnections(blueprint) {
  const anchorIndex = blueprint.cells.findIndex(isLeechingGourdAnchor)

  if (anchorIndex === -1) return []

  const footprint = getLeechingGourdFootprint(blueprint, anchorIndex)
  if (footprint.length !== 4) return []

  return getCropConnectionsFromOrigins(
    blueprint,
    footprint,
    new Set(footprint),
  )
}

export function getLeechingGourdAdjacentCropIndexes(blueprint) {
  return getLeechingGourdAdjacentCropConnections(blueprint).map(
    ({ index }) => index,
  )
}

export function getAdjacentCropConnections(blueprint, index) {
  const crop = blueprint.cells[index]

  if (!crop || isRootTunnel(crop)) return []

  return getCropConnectionsFromOrigins(
    blueprint,
    [index],
    new Set([index]),
  )
}

export function getAdjacentCropIndexes(blueprint, index) {
  return getAdjacentCropConnections(blueprint, index).map(
    ({ index: neighborIndex }) => neighborIndex,
  )
}
