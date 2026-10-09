import { getHamsterTreats } from './achievementAwards.js'
import { hasRichSoilAugmentation } from './augmentationLogic.js'

export const FIVE_LEAF_LOADOUT_COUNT = 3
export const FIVE_LEAF_MIN_CHANCE_PERCENT = 10
export const FIVE_LEAF_MAX_BATCH_SIZE = 5
export const FIVE_LEAF_FREE_BATCH_SIZE = 1
export const FIVE_LEAF_BASE_INTERVAL_SECONDS = 15
export const FIVE_LEAF_MINIMUM_INTERVAL_FACTOR = 0.25
export const FIVE_LEAF_MAXIMUM_INTERVAL_FACTOR = 2
export const FIVE_LEAF_MINIMUM_SPAWN_SECONDS = 5
export const FIVE_LEAF_MINIMUM_ATTEMPT_SECONDS = 1
export const FIVE_LEAF_MINIMUM_POINT_TIME_FACTOR = 0.25
export const FIVE_LEAF_LOADOUT_VERSION = 2

export const DEFAULT_CLOVER_FORTUNE_PERCENTAGES = Object.freeze({
  opus: 17,
  bounty: 52,
  mirage: 20,
  fortuneOpus: 11,
  leekFortuneCookie: 0,
})

export const FIVE_LEAF_FORTUNES = Object.freeze([
  Object.freeze({ id: 'opus', pointCost: 1 }),
  Object.freeze({ id: 'bounty', pointCost: 1 }),
  Object.freeze({ id: 'mirage', pointCost: 2 }),
  Object.freeze({ id: 'fortuneOpus', pointCost: 2 }),
  Object.freeze({ id: 'leekFortuneCookie', pointCost: 3, temporarilyUnavailable: true }),
])

export function getAvailableFiveLeafFortunes(game) {
  return FIVE_LEAF_FORTUNES.filter(({ id, temporarilyUnavailable }) =>
    !temporarilyUnavailable &&
    (id !== 'leekFortuneCookie' || hasRichSoilAugmentation(game?.seedAugmentations)),
  )
}

const FORTUNE_COSTS = Object.fromEntries(
  FIVE_LEAF_FORTUNES.map(({ id, pointCost }) => [id, pointCost]),
)

function clampInteger(value, minimum, maximum) {
  const number = Number(value)
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, Math.floor(number)))
    : minimum
}

function createLoadout(index) {
  return {
    name: `Loadout ${index + 1}`,
    chancePercent: 100,
    batchSize: 1,
    allocations: { ...DEFAULT_CLOVER_FORTUNE_PERCENTAGES },
  }
}

export function createInitialFiveLeafState() {
  return {
    version: FIVE_LEAF_LOADOUT_VERSION,
    activeLoadoutIndex: 0,
    loadouts: Array.from(
      { length: FIVE_LEAF_LOADOUT_COUNT },
      (_, index) => createLoadout(index),
    ),
  }
}

export function normalizeFiveLeafState(rawState, game) {
  const initial = createInitialFiveLeafState()
  const rawLoadouts = Array.isArray(rawState?.loadouts)
    ? rawState.loadouts
    : []
  const hasUntouchedLegacyLoadouts =
    rawState?.version !== FIVE_LEAF_LOADOUT_VERSION &&
    rawLoadouts.length === FIVE_LEAF_LOADOUT_COUNT &&
    rawLoadouts.every((loadout) =>
      loadout?.chancePercent === 100 &&
      loadout?.batchSize === 2 &&
      loadout?.allocations?.opus === 50 &&
      loadout?.allocations?.bounty === 0 &&
      loadout?.allocations?.fortuneOpus === 50 &&
      (loadout?.allocations?.mirage ?? 0) === 0,
    )

  if (hasUntouchedLegacyLoadouts) {
    return {
      ...initial,
      activeLoadoutIndex: clampInteger(
        rawState.activeLoadoutIndex,
        0,
        FIVE_LEAF_LOADOUT_COUNT - 1,
      ),
    }
  }

  return {
    version: FIVE_LEAF_LOADOUT_VERSION,
    activeLoadoutIndex: clampInteger(
      rawState?.activeLoadoutIndex,
      0,
      FIVE_LEAF_LOADOUT_COUNT - 1,
    ),
    loadouts: initial.loadouts.map((fallback, index) => {
      const raw = rawLoadouts[index]
      if (!raw || typeof raw !== 'object') return fallback

      const allocations = Object.fromEntries(
        FIVE_LEAF_FORTUNES.map(({ id }) => [
          id,
          clampInteger(raw.allocations?.[id], 0, 100),
        ]),
      )
      for (const { id, temporarilyUnavailable } of FIVE_LEAF_FORTUNES) {
        if (temporarilyUnavailable) allocations[id] = 0
      }
      if (game !== undefined) {
        const availableIds = new Set(getAvailableFiveLeafFortunes(game).map(({ id }) => id))
        for (const { id } of FIVE_LEAF_FORTUNES) {
          if (!availableIds.has(id)) allocations[id] = 0
        }
      }
      // A malformed imported loadout cannot create more than 100% chance.
      let available = 100
      for (const { id } of FIVE_LEAF_FORTUNES) {
        allocations[id] = Math.min(available, allocations[id])
        available -= allocations[id]
      }

      return {
        name: typeof raw.name === 'string' && raw.name.trim()
          ? raw.name.trim().slice(0, 32)
          : fallback.name,
        chancePercent: clampInteger(
          raw.chancePercent,
          FIVE_LEAF_MIN_CHANCE_PERCENT,
          100,
        ),
        batchSize: clampInteger(raw.batchSize, 1, FIVE_LEAF_MAX_BATCH_SIZE),
        allocations,
      }
    }),
  }
}

export function getFiveLeafPointBudget(game) {
  return getHamsterTreats(game)
}

export function getFiveLeafLoadoutCost(loadout) {
  return Object.entries(loadout.allocations).reduce(
    (total, [id, percentage]) =>
      total + (FORTUNE_COSTS[id] ?? 0) * percentage,
    0,
  )
}

export function getFiveLeafBatchEffectCount(loadout) {
  return clampInteger(loadout?.batchSize, 1, FIVE_LEAF_MAX_BATCH_SIZE) +
    FIVE_LEAF_FREE_BATCH_SIZE
}

export function getFiveLeafSchedule(loadout, pointBudget = Infinity) {
  // Only the selected base size adds waiting time; the bonus bundle is free.
  const batchFactor = clampInteger(loadout.batchSize, 1, FIVE_LEAF_MAX_BATCH_SIZE)
  const pointCost = getFiveLeafLoadoutCost(loadout)
  const pointRatio = Number.isFinite(pointBudget)
    ? pointCost / Math.max(1, pointBudget)
    : 1
  const pointTimeFactor = Math.max(
    FIVE_LEAF_MINIMUM_POINT_TIME_FACTOR,
    Math.min(1, pointRatio),
  )
  const overloadFactor = Number.isFinite(pointBudget)
    ? Math.max(1, pointRatio) ** 2
    : 1
  const baseSeconds = FIVE_LEAF_BASE_INTERVAL_SECONDS * batchFactor *
    pointTimeFactor * overloadFactor
  const rollIntervalSeconds = Math.max(
    FIVE_LEAF_MINIMUM_ATTEMPT_SECONDS,
    baseSeconds * loadout.chancePercent / 100,
  )
  const minimumSeconds = Math.max(
    FIVE_LEAF_MINIMUM_SPAWN_SECONDS,
    baseSeconds * FIVE_LEAF_MINIMUM_INTERVAL_FACTOR,
  )

  return {
    baseSeconds,
    pointTimeFactor,
    overloadFactor,
    minimumSeconds,
    maximumSeconds: Math.max(
      FIVE_LEAF_MINIMUM_SPAWN_SECONDS,
      baseSeconds * FIVE_LEAF_MAXIMUM_INTERVAL_FACTOR,
    ),
    rollIntervalSeconds,
    firstRollSeconds: Math.max(minimumSeconds, rollIntervalSeconds),
  }
}

export function chooseFiveLeafEffect(loadout, randomValue, game) {
  const roll = Math.max(0, Math.min(0.9999999999999999, Number(randomValue) || 0)) * 100
  let cumulative = 0
  for (const { id } of getAvailableFiveLeafFortunes(game)) {
    cumulative += loadout.allocations[id] ?? 0
    if (roll < cumulative) return id
  }
  return 'fortuneMirage'
}

export function updateFiveLeafLoadout(game, loadoutIndex, changes) {
  if (game?.cloverAssembly?.assembled !== true) return game
  const state = normalizeFiveLeafState(game.fortune?.fiveLeaf, game)
  if (!Number.isInteger(loadoutIndex) || !state.loadouts[loadoutIndex]) return game
  const previous = state.loadouts[loadoutIndex]
  const next = {
    ...previous,
    ...changes,
    allocations: {
      ...previous.allocations,
      ...changes.allocations,
    },
  }
  const normalized = normalizeFiveLeafState({
    ...state,
    loadouts: state.loadouts.map((loadout, index) =>
      index === loadoutIndex ? next : loadout,
    ),
  }, game)
  return {
    ...game,
    fortune: {
      ...game.fortune,
      fiveLeaf: normalized,
      ...(loadoutIndex === state.activeLoadoutIndex
        ? { bundles: [], activeEffects: [], notice: null,
            secondsTowardBundleRoll: 0, nextRollSeconds: 0 }
        : {}),
    },
  }
}

export function selectFiveLeafLoadout(game, loadoutIndex) {
  if (game?.cloverAssembly?.assembled !== true) return game
  const state = normalizeFiveLeafState(game.fortune?.fiveLeaf, game)
  if (!Number.isInteger(loadoutIndex) || !state.loadouts[loadoutIndex] ||
      loadoutIndex === state.activeLoadoutIndex) return game

  return {
    ...game,
    fortune: {
      ...game.fortune,
      fiveLeaf: { ...state, activeLoadoutIndex: loadoutIndex },
      bundles: [],
      activeEffects: [],
      notice: null,
      secondsTowardBundleRoll: 0,
      nextRollSeconds: 0,
    },
  }
}
