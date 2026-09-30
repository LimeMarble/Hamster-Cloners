export const FIVE_LEAF_LOADOUT_COUNT = 3
export const FIVE_LEAF_MIN_CHANCE_PERCENT = 10
export const FIVE_LEAF_MAX_BATCH_SIZE = 5
export const FIVE_LEAF_BASE_INTERVAL_SECONDS = 30

export const FIVE_LEAF_FORTUNES = Object.freeze([
  Object.freeze({ id: 'opus', pointCost: 1 }),
  Object.freeze({ id: 'bounty', pointCost: 1 }),
  Object.freeze({ id: 'fortuneOpus', pointCost: 2 }),
])

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
    batchSize: 2,
    allocations: { opus: 50, bounty: 0, fortuneOpus: 50 },
  }
}

export function createInitialFiveLeafState() {
  return {
    activeLoadoutIndex: 0,
    loadouts: Array.from(
      { length: FIVE_LEAF_LOADOUT_COUNT },
      (_, index) => createLoadout(index),
    ),
  }
}

export function normalizeFiveLeafState(rawState) {
  const initial = createInitialFiveLeafState()
  const rawLoadouts = Array.isArray(rawState?.loadouts)
    ? rawState.loadouts
    : []

  return {
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
  const demonstrations = new Set(
    game?.capybara?.completedDemonstrations ?? [],
  ).size
  const utilizedFortunes = new Set(
    game?.fortune?.discoveredEffects ?? [],
  ).size
  return demonstrations * 50 + utilizedFortunes * 25
}

export function getFiveLeafLoadoutCost(loadout) {
  return Object.entries(loadout.allocations).reduce(
    (total, [id, percentage]) =>
      total + (FORTUNE_COSTS[id] ?? 0) * percentage,
    0,
  )
}

export function getFiveLeafSchedule(loadout, pointBudget = Infinity) {
  const batchFactor = 2 ** (loadout.batchSize - 1)
  const pointCost = getFiveLeafLoadoutCost(loadout)
  const overloadFactor = Number.isFinite(pointBudget)
    ? Math.max(1, pointCost / Math.max(1, pointBudget)) ** 2
    : 1
  const baseSeconds = FIVE_LEAF_BASE_INTERVAL_SECONDS * batchFactor * overloadFactor
  const rollIntervalSeconds =
    baseSeconds * loadout.chancePercent / 100

  return {
    baseSeconds,
    overloadFactor,
    minimumSeconds: baseSeconds / 2,
    maximumSeconds: baseSeconds * 2,
    rollIntervalSeconds,
    firstRollSeconds: Math.max(baseSeconds / 2, rollIntervalSeconds),
  }
}

export function chooseFiveLeafEffect(loadout, randomValue) {
  const roll = Math.max(0, Math.min(0.9999999999999999, Number(randomValue) || 0)) * 100
  let cumulative = 0
  for (const { id } of FIVE_LEAF_FORTUNES) {
    cumulative += loadout.allocations[id] ?? 0
    if (roll < cumulative) return id
  }
  return 'fortuneMirage'
}

export function updateFiveLeafLoadout(game, loadoutIndex, changes) {
  if (game?.cloverAssembly?.assembled !== true) return game
  const state = normalizeFiveLeafState(game.fortune?.fiveLeaf)
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
  })
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
  const state = normalizeFiveLeafState(game.fortune?.fiveLeaf)
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
