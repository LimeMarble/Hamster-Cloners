const DIRECTIONS = Object.freeze({
  NORTH: 'north',
  EAST: 'east',
  SOUTH: 'south',
  WEST: 'west',
})

const DIRECTION_ORDER = Object.freeze([
  DIRECTIONS.NORTH,
  DIRECTIONS.EAST,
  DIRECTIONS.SOUTH,
  DIRECTIONS.WEST,
])

const DIRECTION_VECTORS = Object.freeze({
  [DIRECTIONS.NORTH]: Object.freeze([-1, 0]),
  [DIRECTIONS.EAST]: Object.freeze([0, 1]),
  [DIRECTIONS.SOUTH]: Object.freeze([1, 0]),
  [DIRECTIONS.WEST]: Object.freeze([0, -1]),
})

const OPPOSITE_DIRECTION = Object.freeze({
  [DIRECTIONS.NORTH]: DIRECTIONS.SOUTH,
  [DIRECTIONS.EAST]: DIRECTIONS.WEST,
  [DIRECTIONS.SOUTH]: DIRECTIONS.NORTH,
  [DIRECTIONS.WEST]: DIRECTIONS.EAST,
})

const LEFT_DIRECTION = Object.freeze({
  [DIRECTIONS.NORTH]: DIRECTIONS.WEST,
  [DIRECTIONS.EAST]: DIRECTIONS.NORTH,
  [DIRECTIONS.SOUTH]: DIRECTIONS.EAST,
  [DIRECTIONS.WEST]: DIRECTIONS.SOUTH,
})

const RIGHT_DIRECTION = Object.freeze({
  [DIRECTIONS.NORTH]: DIRECTIONS.EAST,
  [DIRECTIONS.EAST]: DIRECTIONS.SOUTH,
  [DIRECTIONS.SOUTH]: DIRECTIONS.WEST,
  [DIRECTIONS.WEST]: DIRECTIONS.NORTH,
})

const STANDARD_FLOW_WEIGHTS = Object.freeze({
  C: Object.freeze([0.8, 0.1, 0.1, 0]),
  W4: Object.freeze([0.7, 0.125, 0.125, 0.05]),
  W3: Object.freeze([0.6, 0.15, 0.15, 0.1]),
  W2: Object.freeze([0.5, 0.2, 0.2, 0.1]),
  W1: Object.freeze([0.4, 0.225, 0.225, 0.15]),
  W0: Object.freeze([0.25, 0.25, 0.25, 0.25]),
  H1: Object.freeze([0.25, 0.25, 0.25, 0.25]),
})

const OPPOSING_FLOW_WEIGHTS = Object.freeze([0.2, 0.3, 0.3, 0.2])
const FLOW_EPSILON = 1e-11
const MAX_FLOW_STEPS = 1200
const RESULT_CACHE_LIMIT = 100

export const WETLANDS_CONNECTION_ROWS = 12
export const WETLANDS_CONNECTION_COLUMNS = 9
export const WETLANDS_FEEDING_GROUND_SAFE_PPM = 1000
export const WETLANDS_OBSTRUCTION_STRENGTH = 0.5

export const WETLANDS_DIRECTION_LABELS = Object.freeze({
  [DIRECTIONS.NORTH]: 'North',
  [DIRECTIONS.EAST]: 'East',
  [DIRECTIONS.SOUTH]: 'South',
  [DIRECTIONS.WEST]: 'West',
})

export const WETLANDS_DIRECTION_ARROWS = Object.freeze({
  [DIRECTIONS.NORTH]: '↑',
  [DIRECTIONS.EAST]: '→',
  [DIRECTIONS.SOUTH]: '↓',
  [DIRECTIONS.WEST]: '←',
})

const RAW_LAYOUT = Object.freeze([
  ['L', 'L', 'B1B:S', 'B1A:S', 'B2B:S', 'B1A:S', 'B1B:S', 'L', 'L'],
  ['L', 'W4:S', 'C:S', 'C:S', 'C:S', 'C:S', 'C:S', 'W4:S', 'L'],
  ['L', 'W4:S', 'W4:S', 'W4:S', 'W4:S', 'W4:S', 'W4:S', 'W4:S', 'L'],
  ['L', 'W3:S', 'W4:S', 'W4:S', 'W4:S', 'W4:S', 'W4:S', 'W3:E', 'X1'],
  ['L', 'W3:S', 'W3:S', 'W3:S', 'W3:S', 'W3:S', 'W3:S', 'W3:E', 'X1'],
  ['L', 'W2:S', 'W3:S', 'W3:S', 'W3:S', 'W3:S', 'W3:S', 'W2:E', 'X1'],
  ['L', 'W2:N', 'W2:N', 'W2:N', 'W2:N', 'W2:N', 'W2:N', 'W2:E', 'X1'],
  ['L', 'W2:N', 'W2:N', 'W3:N', 'W3:N', 'W3:N', 'W2:N', 'W2:E', 'X1'],
  ['L', 'W2:N', 'W3:N', 'W3:N', 'W3:N', 'W3:N', 'W3:N', 'W3:E', 'X1'],
  ['L', 'W3:N', 'H1', 'W4:N', 'H1', 'W4:N', 'H1', 'W3:N', 'L'],
  ['L', 'L', 'W4:N', 'C:N', 'C:N', 'C:N', 'W4:N', 'L', 'L'],
  ['L', 'L', 'L', 'F1C:N', 'F1C:N', 'F1C:N', 'L', 'L', 'L'],
])

const SOURCE_CONFIGURATION = Object.freeze({
  B1A: Object.freeze({ flow: 12, ppm: 4000, water: 'Brackish inlet' }),
  B1B: Object.freeze({ flow: 20, ppm: 4000, water: 'Brackish inlet' }),
  B2A: Object.freeze({ flow: 12, ppm: 8000, water: 'Brackish inlet' }),
  B2B: Object.freeze({ flow: 20, ppm: 8000, water: 'Brackish inlet' }),
  F1A: Object.freeze({ flow: 12, ppm: 50, water: 'Freshwater inlet' }),
  F1B: Object.freeze({ flow: 20, ppm: 50, water: 'Freshwater inlet' }),
  F1C: Object.freeze({ flow: 28, ppm: 50, water: 'Freshwater inlet' }),
})

function getDirection(rawDirection) {
  return {
    N: DIRECTIONS.NORTH,
    E: DIRECTIONS.EAST,
    S: DIRECTIONS.SOUTH,
    W: DIRECTIONS.WEST,
  }[rawDirection] ?? null
}

export function getWetlandsTileId(row, column) {
  return `${String.fromCharCode(65 + column)}${row + 1}`
}

function createTile(rawTile, row, column) {
  const [kind, rawDirection] = rawTile.split(':')
  const direction = getDirection(rawDirection)
  const source = SOURCE_CONFIGURATION[kind]

  return Object.freeze({
    id: getWetlandsTileId(row, column),
    row,
    column,
    index: row * WETLANDS_CONNECTION_COLUMNS + column,
    kind,
    direction,
    category: kind === 'L'
      ? 'land'
      : kind === 'X1'
        ? 'outlet'
        : source
          ? 'source'
          : kind === 'H1'
            ? 'feeding-ground'
            : kind === 'C'
              ? 'channel'
              : 'water',
    canObstruct: /^W[0-4]$/.test(kind),
    ...(source ?? {}),
  })
}

export const WETLANDS_CONNECTION_TILES = Object.freeze(
  RAW_LAYOUT.flatMap((row, rowIndex) =>
    row.map((rawTile, columnIndex) =>
      createTile(rawTile, rowIndex, columnIndex),
    ),
  ),
)

const TILE_BY_ID = new Map(
  WETLANDS_CONNECTION_TILES.map((tile) => [tile.id, tile]),
)
const TILE_BY_POSITION = new Map(
  WETLANDS_CONNECTION_TILES.map((tile) => [
    `${tile.row}:${tile.column}`,
    tile,
  ]),
)
const SOURCE_TILES = WETLANDS_CONNECTION_TILES.filter(
  (tile) => tile.category === 'source',
)
const FEEDING_GROUND_TILES = WETLANDS_CONNECTION_TILES.filter(
  (tile) => tile.category === 'feeding-ground',
)
const resultCache = new Map()

export function getWetlandsTile(tileId) {
  return TILE_BY_ID.get(tileId) ?? null
}

export function isWetlandsObstructionAllowed(tileId) {
  return TILE_BY_ID.get(tileId)?.canObstruct === true
}

export function normalizeWetlandsObstructions(rawObstructions) {
  if (!Array.isArray(rawObstructions)) return []

  return [...new Set(rawObstructions)]
    .filter(isWetlandsObstructionAllowed)
    .sort((left, right) => {
      const leftTile = TILE_BY_ID.get(left)
      const rightTile = TILE_BY_ID.get(right)
      return leftTile.row - rightTile.row || leftTile.column - rightTile.column
    })
}

function getNeighbor(tile, direction) {
  const [rowOffset, columnOffset] = DIRECTION_VECTORS[direction]
  return TILE_BY_POSITION.get(
    `${tile.row + rowOffset}:${tile.column + columnOffset}`,
  ) ?? null
}

function getFlowWeights(tile, incomingDirection, obstructionSet) {
  if (tile.category === 'source') {
    return [{ direction: tile.direction, weight: 1 }]
  }

  const standardWeights = STANDARD_FLOW_WEIGHTS[tile.kind]
  if (!standardWeights) return []

  const isOpposingFlow = Boolean(
    tile.direction &&
      incomingDirection === OPPOSITE_DIRECTION[tile.direction],
  )
  const [forward, left, right, backward] = isOpposingFlow
    ? OPPOSING_FLOW_WEIGHTS
    : standardWeights
  const facing = tile.direction ?? incomingDirection
  const directionalWeights = [
    [facing, forward],
    [LEFT_DIRECTION[facing], left],
    [RIGHT_DIRECTION[facing], right],
    [OPPOSITE_DIRECTION[facing], backward],
  ]
    .map(([direction, weight]) => {
      const target = getNeighbor(tile, direction)
      const isBlocked = !target || target.category === 'land'
      const obstructionMultiplier = target && obstructionSet.has(target.id)
        ? WETLANDS_OBSTRUCTION_STRENGTH
        : 1

      return {
        direction,
        weight: isBlocked ? 0 : weight * obstructionMultiplier,
      }
    })
    .filter(({ weight }) => weight > 0)
  const totalWeight = directionalWeights.reduce(
    (total, { weight }) => total + weight,
    0,
  )

  if (totalWeight <= 0) return []
  return directionalWeights.map(({ direction, weight }) => ({
    direction,
    weight: weight / totalWeight,
  }))
}

function calculateUncached(obstructions) {
  const obstructionSet = new Set(obstructions)
  const stateCount = WETLANDS_CONNECTION_TILES.length * DIRECTION_ORDER.length
  const tileFlow = new Float64Array(WETLANDS_CONNECTION_TILES.length)
  const tileSalt = new Float64Array(WETLANDS_CONNECTION_TILES.length)
  const tileHorizontalFlow = new Float64Array(
    WETLANDS_CONNECTION_TILES.length,
  )
  const tileVerticalFlow = new Float64Array(
    WETLANDS_CONNECTION_TILES.length,
  )
  let currentFlow = new Float64Array(stateCount)
  let currentSalt = new Float64Array(stateCount)
  let nextFlow = new Float64Array(stateCount)
  let nextSalt = new Float64Array(stateCount)
  const transitions = Array.from({ length: stateCount }, (_, stateIndex) => {
    const tile = WETLANDS_CONNECTION_TILES[
      Math.floor(stateIndex / DIRECTION_ORDER.length)
    ]
    const incomingDirection = DIRECTION_ORDER[
      stateIndex % DIRECTION_ORDER.length
    ]

    if (tile.category === 'outlet') return []
    return getFlowWeights(tile, incomingDirection, obstructionSet).map(
      ({ direction, weight }) => {
        const target = getNeighbor(tile, direction)
        return {
          stateIndex:
            target.index * DIRECTION_ORDER.length +
            DIRECTION_ORDER.indexOf(direction),
          weight,
        }
      },
    )
  })

  SOURCE_TILES.forEach((source) => {
    const target = getNeighbor(source, source.direction)
    const stateIndex =
      target.index * DIRECTION_ORDER.length +
      DIRECTION_ORDER.indexOf(source.direction)
    currentFlow[stateIndex] += source.flow
    currentSalt[stateIndex] += source.flow * source.ppm
  })

  for (let step = 0; step < MAX_FLOW_STEPS; step += 1) {
    let hasFlow = false
    nextFlow.fill(0)
    nextSalt.fill(0)

    for (let stateIndex = 0; stateIndex < stateCount; stateIndex += 1) {
      const flow = currentFlow[stateIndex]
      if (flow <= FLOW_EPSILON) continue
      hasFlow = true

      const tile = WETLANDS_CONNECTION_TILES[
        Math.floor(stateIndex / DIRECTION_ORDER.length)
      ]
      const salt = currentSalt[stateIndex]
      const incomingDirection = DIRECTION_ORDER[
        stateIndex % DIRECTION_ORDER.length
      ]
      const [verticalDirection, horizontalDirection] =
        DIRECTION_VECTORS[incomingDirection]
      // Summing the decaying impulse response gives steady-state throughput
      // when the configured source rates are supplied continuously.
      tileFlow[tile.index] += flow
      tileSalt[tile.index] += salt
      tileHorizontalFlow[tile.index] += horizontalDirection * flow
      tileVerticalFlow[tile.index] += verticalDirection * flow

      transitions[stateIndex].forEach((transition) => {
        nextFlow[transition.stateIndex] += flow * transition.weight
        nextSalt[transition.stateIndex] += salt * transition.weight
      })
    }

    if (!hasFlow) break

    ;[currentFlow, nextFlow] = [nextFlow, currentFlow]
    ;[currentSalt, nextSalt] = [nextSalt, currentSalt]
  }

  const tileMeasurements = WETLANDS_CONNECTION_TILES.map((tile) => {
    const grossFlow = tile.category === 'source'
      ? tile.flow
      : tileFlow[tile.index]
    const salt = tile.category === 'source'
      ? tile.flow * tile.ppm
      : tileSalt[tile.index]
    const sourceVector = tile.category === 'source'
      ? DIRECTION_VECTORS[tile.direction]
      : null
    const horizontalFlow = sourceVector
      ? sourceVector[1] * tile.flow
      : tileHorizontalFlow[tile.index]
    const verticalFlow = sourceVector
      ? sourceVector[0] * tile.flow
      : tileVerticalFlow[tile.index]
    const flow = Math.hypot(horizontalFlow, verticalFlow)
    const ppm = grossFlow > 0 ? salt / grossFlow : null

    return Object.freeze({
      tileId: tile.id,
      flow,
      grossFlow,
      horizontalFlow,
      verticalFlow,
      salt,
      ppm,
    })
  })
  const tileMeasurementsById = Object.freeze(
    Object.fromEntries(
      tileMeasurements.map((measurement) => [measurement.tileId, measurement]),
    ),
  )
  const feedingGrounds = FEEDING_GROUND_TILES.map((tile) => {
    const { flow, ppm } = tileMeasurementsById[tile.id]
    return Object.freeze({
      tileId: tile.id,
      flow,
      ppm,
      isSafe:
        ppm !== null && ppm <= WETLANDS_FEEDING_GROUND_SAFE_PPM,
    })
  })
  const safeFeedingGroundCount = feedingGrounds.filter(
    (ground) => ground.isSafe,
  ).length

  return Object.freeze({
    obstructions: Object.freeze([...obstructions]),
    tileMeasurements: Object.freeze(tileMeasurements),
    tileMeasurementsById,
    feedingGrounds: Object.freeze(feedingGrounds),
    feedingGroundsById: Object.freeze(
      Object.fromEntries(feedingGrounds.map((ground) => [ground.tileId, ground])),
    ),
    safeFeedingGroundCount,
    unsafeFeedingGroundCount: feedingGrounds.length - safeFeedingGroundCount,
    allFeedingGroundsSafe: safeFeedingGroundCount === feedingGrounds.length,
  })
}

export function calculateWetlandsConnection(rawObstructions = []) {
  const obstructions = normalizeWetlandsObstructions(rawObstructions)
  const cacheKey = obstructions.join(',')
  const cachedResult = resultCache.get(cacheKey)

  if (cachedResult) return cachedResult

  const result = calculateUncached(obstructions)
  resultCache.set(cacheKey, result)

  if (resultCache.size > RESULT_CACHE_LIMIT) {
    resultCache.delete(resultCache.keys().next().value)
  }

  return result
}

export function getWetlandsTileFlowDescription(tile) {
  const weights = STANDARD_FLOW_WEIGHTS[tile?.kind]
  if (!weights) return null

  if (!tile.direction) {
    return '25% in each orthogonal direction'
  }

  const [forward, left, , backward] = weights
  return `${forward * 100}% forward, ${left * 100}% to each side, and ${backward * 100}% backward`
}
