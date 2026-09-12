import { GAME_AREA_IDS } from './gameConfig.js'

export const GREATER_BLUEPRINTING_COST = 1e146
export const CLOVER_ASSEMBLY_PART_REQUIREMENT = 7.77e58
export const CLOVER_ASSEMBLY_RABBIT_UNLOCK_ID = 'rabbitsCharm'

export const CLOVER_ASSEMBLY_PARTS = Object.freeze([
  Object.freeze({
    id: 'resilientStem',
    name: 'Resilient Stem',
    cropId: 'appleTree',
  }),
  Object.freeze({
    id: 'protectiveCoating',
    name: 'Protective Coating',
    cropId: 'canola',
  }),
  Object.freeze({
    id: 'rootLubricant',
    name: 'Root Lubricant',
    cropId: 'soybean',
  }),
  Object.freeze({
    id: 'charmFitting',
    name: 'Charm Fitting',
    cropId: 'carrot',
  }),
])

function toNonNegativeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function createInitialCloverAssemblyState() {
  return {
    progress: 0,
    assembled: false,
  }
}

export function normalizeCloverAssemblyState(rawAssembly) {
  const initial = createInitialCloverAssemblyState()

  if (!rawAssembly || typeof rawAssembly !== 'object') return initial

  const legacyPartProgress = rawAssembly.partProgress &&
    typeof rawAssembly.partProgress === 'object'
    ? Math.min(
        ...CLOVER_ASSEMBLY_PARTS.map(({ id }) =>
          toNonNegativeNumber(rawAssembly.partProgress[id]),
        ),
      )
    : 0

  return {
    progress: Math.min(
      CLOVER_ASSEMBLY_PART_REQUIREMENT,
      rawAssembly.progress === undefined
        ? legacyPartProgress
        : toNonNegativeNumber(rawAssembly.progress),
    ),
    assembled: rawAssembly.assembled === true,
  }
}

export function canUnlockGreaterBlueprinting(game) {
  return (
    game?.activeArea === GAME_AREA_IDS.MAIN &&
    game?.hasUnlockedGreaterBlueprinting !== true &&
    toNonNegativeNumber(game?.crops) >= GREATER_BLUEPRINTING_COST
  )
}

export function unlockGreaterBlueprinting(game) {
  if (!canUnlockGreaterBlueprinting(game)) return null

  return {
    ...game,
    crops: toNonNegativeNumber(game.crops) - GREATER_BLUEPRINTING_COST,
    hasUnlockedGreaterBlueprinting: true,
  }
}

export function advanceCloverAssemblyState(
  rawAssembly,
  productionPerSecondByCrop,
  elapsedSeconds,
  canProgress,
) {
  const assembly = normalizeCloverAssemblyState(rawAssembly)
  const safeElapsedSeconds = toNonNegativeNumber(elapsedSeconds)

  if (!canProgress || assembly.assembled || safeElapsedSeconds === 0) {
    return assembly
  }

  const limitingProductionPerSecond = Math.min(
    ...CLOVER_ASSEMBLY_PARTS.map(({ cropId }) =>
      toNonNegativeNumber(productionPerSecondByCrop?.[cropId]),
    ),
  )

  return {
    ...assembly,
    progress: Math.min(
      CLOVER_ASSEMBLY_PART_REQUIREMENT,
      assembly.progress + limitingProductionPerSecond * safeElapsedSeconds,
    ),
  }
}

export function isCloverAssemblyReady(rawAssembly) {
  const assembly = normalizeCloverAssemblyState(rawAssembly)

  return assembly.progress >= CLOVER_ASSEMBLY_PART_REQUIREMENT
}

export function completeCloverAssembly(game) {
  if (
    game?.hasUnlockedGreaterBlueprinting !== true ||
    game?.trade?.rabbitUnlocks?.includes(
      CLOVER_ASSEMBLY_RABBIT_UNLOCK_ID,
    ) !== true ||
    game?.cloverAssembly?.assembled === true ||
    !isCloverAssemblyReady(game?.cloverAssembly)
  ) {
    return null
  }

  return {
    ...game,
    cloverAssembly: {
      ...normalizeCloverAssemblyState(game.cloverAssembly),
      assembled: true,
    },
  }
}
