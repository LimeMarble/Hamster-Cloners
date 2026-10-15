export const ROOT_TUNNEL_PAIR_LIMIT = 2

const ROOT_TUNNEL_CROP_ID = 'rootTunnel'
const MIRROR_CORN_CROP_ID = 'corn'
const NON_CONNECTABLE_CROP_IDS = new Set([
  ROOT_TUNNEL_CROP_ID,
  'leechingGourdPart',
  'splitweedPart',
])

function toTileIndex(value, tileCount) {
  if (typeof value !== 'number') return null

  const index = Number(value)
  return Number.isInteger(index) && index >= 0 && index < tileCount
    ? index
    : null
}

export function isRootTunnelEndpointInRange(
  blueprint,
  tunnelIndex,
  endpointIndex,
) {
  if (tunnelIndex === endpointIndex) return false

  const tunnelRow = Math.floor(tunnelIndex / blueprint.columns)
  const tunnelColumn = tunnelIndex % blueprint.columns
  const endpointRow = Math.floor(endpointIndex / blueprint.columns)
  const endpointColumn = endpointIndex % blueprint.columns

  return (
    Math.abs(tunnelRow - endpointRow) <= 1 &&
    Math.abs(tunnelColumn - endpointColumn) <= 1
  )
}

export function getRootTunnelEndpointIndexes(blueprint, tunnelIndex) {
  if (blueprint.cells[tunnelIndex] !== ROOT_TUNNEL_CROP_ID) return []

  return blueprint.cells.flatMap((crop, endpointIndex) =>
    crop &&
    !NON_CONNECTABLE_CROP_IDS.has(crop) &&
    isRootTunnelEndpointInRange(blueprint, tunnelIndex, endpointIndex)
      ? [endpointIndex]
      : [],
  )
}

export function isMirrorCornTunnelConnection(blueprint, connection) {
  return blueprint.cells[connection.senderIndex] === MIRROR_CORN_CROP_ID
}

export function normalizeRootTunnelConnections(
  blueprint,
  rawConnections = blueprint.rootTunnelConnections,
) {
  if (!Array.isArray(rawConnections)) return []

  const tileCount = blueprint.rows * blueprint.columns
  const connections = []
  const connectionKeys = new Set()
  const usedSenders = new Set()
  const cropTunnelIndexes = new Map()
  const ordinaryPairCounts = new Map()

  rawConnections.forEach((rawConnection) => {
    if (!rawConnection || typeof rawConnection !== 'object') return

    const tunnelIndex = toTileIndex(rawConnection.tunnelIndex, tileCount)
    const senderIndex = toTileIndex(rawConnection.senderIndex, tileCount)
    const recipientIndex = toTileIndex(rawConnection.recipientIndex, tileCount)

    if (
      tunnelIndex === null ||
      senderIndex === null ||
      recipientIndex === null ||
      senderIndex === recipientIndex ||
      blueprint.cells[tunnelIndex] !== ROOT_TUNNEL_CROP_ID ||
      !blueprint.cells[senderIndex] ||
      !blueprint.cells[recipientIndex] ||
      NON_CONNECTABLE_CROP_IDS.has(blueprint.cells[senderIndex]) ||
      NON_CONNECTABLE_CROP_IDS.has(blueprint.cells[recipientIndex]) ||
      !isRootTunnelEndpointInRange(blueprint, tunnelIndex, senderIndex) ||
      !isRootTunnelEndpointInRange(blueprint, tunnelIndex, recipientIndex) ||
      usedSenders.has(senderIndex)
    ) {
      return
    }

    const senderTunnelIndex = cropTunnelIndexes.get(senderIndex)
    const recipientTunnelIndex = cropTunnelIndexes.get(recipientIndex)
    if (
      (senderTunnelIndex !== undefined && senderTunnelIndex !== tunnelIndex) ||
      (recipientTunnelIndex !== undefined &&
        recipientTunnelIndex !== tunnelIndex)
    ) {
      return
    }

    const connection = { tunnelIndex, senderIndex, recipientIndex }
    const connectionKey = `${tunnelIndex}:${senderIndex}:${recipientIndex}`
    if (connectionKeys.has(connectionKey)) return

    if (!isMirrorCornTunnelConnection(blueprint, connection)) {
      const ordinaryPairCount = ordinaryPairCounts.get(tunnelIndex) ?? 0
      if (ordinaryPairCount >= ROOT_TUNNEL_PAIR_LIMIT) return
      ordinaryPairCounts.set(tunnelIndex, ordinaryPairCount + 1)
    }

    connections.push(connection)
    connectionKeys.add(connectionKey)
    usedSenders.add(senderIndex)
    cropTunnelIndexes.set(senderIndex, tunnelIndex)
    cropTunnelIndexes.set(recipientIndex, tunnelIndex)
  })

  return connections
}

export function getRootTunnelConnections(blueprint, tunnelIndex = null) {
  const connections = normalizeRootTunnelConnections(blueprint)

  return tunnelIndex === null
    ? connections
    : connections.filter(
        (connection) => connection.tunnelIndex === tunnelIndex,
      )
}

export function getRootTunnelConnectionState(blueprint, tunnelIndex) {
  const connections = getRootTunnelConnections(blueprint, tunnelIndex)
  const ordinaryPairCount = connections.filter(
    (connection) => !isMirrorCornTunnelConnection(blueprint, connection),
  ).length

  return {
    connections,
    ordinaryPairCount,
    ordinaryPairsRemaining: Math.max(
      0,
      ROOT_TUNNEL_PAIR_LIMIT - ordinaryPairCount,
    ),
  }
}

export function canAddRootTunnelConnection(
  blueprint,
  tunnelIndex,
  senderIndex,
  recipientIndex,
) {
  const currentConnections = getRootTunnelConnections(blueprint)
  const nextConnections = normalizeRootTunnelConnections(blueprint, [
    ...currentConnections,
    { tunnelIndex, senderIndex, recipientIndex },
  ])

  return nextConnections.length > currentConnections.length
}

export function getValidRootTunnelSenderIndexes(blueprint, tunnelIndex) {
  const endpointIndexes = getRootTunnelEndpointIndexes(blueprint, tunnelIndex)

  return endpointIndexes.filter((senderIndex) =>
    endpointIndexes.some((recipientIndex) =>
      canAddRootTunnelConnection(
        blueprint,
        tunnelIndex,
        senderIndex,
        recipientIndex,
      ),
    ),
  )
}

export function getValidRootTunnelRecipientIndexes(
  blueprint,
  tunnelIndex,
  senderIndex,
) {
  return getRootTunnelEndpointIndexes(blueprint, tunnelIndex).filter(
    (recipientIndex) =>
      canAddRootTunnelConnection(
        blueprint,
        tunnelIndex,
        senderIndex,
        recipientIndex,
      ),
  )
}

export function addRootTunnelConnection(
  blueprint,
  tunnelIndex,
  senderIndex,
  recipientIndex,
) {
  if (
    !canAddRootTunnelConnection(
      blueprint,
      tunnelIndex,
      senderIndex,
      recipientIndex,
    )
  ) {
    return null
  }

  return normalizeRootTunnelConnections(blueprint, [
    ...getRootTunnelConnections(blueprint),
    { tunnelIndex, senderIndex, recipientIndex },
  ])
}

export function removeRootTunnelConnection(
  blueprint,
  tunnelIndex,
  senderIndex,
  recipientIndex,
) {
  return getRootTunnelConnections(blueprint).filter(
    (connection) =>
      connection.tunnelIndex !== tunnelIndex ||
      connection.senderIndex !== senderIndex ||
      connection.recipientIndex !== recipientIndex,
  )
}

export function remapRootTunnelConnections(connections, remapIndex) {
  if (!Array.isArray(connections)) return []

  return connections.flatMap((connection) => {
    const tunnelIndex = remapIndex(connection.tunnelIndex)
    const senderIndex = remapIndex(connection.senderIndex)
    const recipientIndex = remapIndex(connection.recipientIndex)

    return tunnelIndex === null || senderIndex === null || recipientIndex === null
      ? []
      : [{ tunnelIndex, senderIndex, recipientIndex }]
  })
}
