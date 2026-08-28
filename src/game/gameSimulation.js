import {
  getBlueprintSlots,
  getUnlockedBlueprintSlotCount,
} from './blueprintLogic.js'
import {
  getColumnsProducedForTick,
  getCropHamsterEfficiencyMultiplier,
  getProductionSnapshotForTick,
  getRowsProducedPerSecond,
  getRowDuplicatorEffectivenessMultiplier,
  getRowDuplicatorExternalMultiplier,
} from './cropProduction.js'
import {
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CROP_PERFECTION_UNLOCK_CROP_COUNT,
  KNOTWEED_UNLOCK_CROP_COUNT,
  LENTIL_UNLOCK_CROP_COUNT,
  ROOT_TUNNEL_UNLOCK_CROP_COUNT,
  SUNFLOWER_UNLOCK_CROP_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
  WHEAT_UNLOCK_CROP_COUNT,
} from './crops.js'
import { advanceFortuneState, getFortuneModifiers } from './fortuneLogic.js'
import { SIMULATION_TICK_INTERVAL_MS } from './gameConfig.js'
import {
  advanceRabbitContract,
  hasRabbitUnlock,
  RABBIT_UNLOCK_IDS,
} from './tradeLogic.js'
import { getCapybaraHamsterEfficiencyMultiplier } from './capybaraLogic.js'

export const ACTIVE_SIMULATION_STEP_SECONDS =
  SIMULATION_TICK_INTERVAL_MS / 1000
export const CATCH_UP_COMPRESSION_FACTOR = 15
export const CATCH_UP_SPEED_FACTOR = 2
export const SKIPPED_CATCH_UP_STEPS = 1000

function normalizeElapsedSeconds(value) {
  const elapsedSeconds = Number(value)
  return Number.isFinite(elapsedSeconds) && elapsedSeconds > 0
    ? elapsedSeconds
    : 0
}

export function getSimulationStepSeconds(
  elapsedSeconds,
  mode = 'catch-up',
) {
  const safeElapsedSeconds = normalizeElapsedSeconds(elapsedSeconds)

  if (safeElapsedSeconds === 0 || mode === 'active') {
    return ACTIVE_SIMULATION_STEP_SECONDS
  }

  return ACTIVE_SIMULATION_STEP_SECONDS * CATCH_UP_COMPRESSION_FACTOR
}

export function getSimulationStepCount(elapsedSeconds, mode = 'catch-up') {
  const safeElapsedSeconds = normalizeElapsedSeconds(elapsedSeconds)
  if (safeElapsedSeconds === 0) return 0

  return Math.max(
    1,
    Math.ceil(
      safeElapsedSeconds /
        getSimulationStepSeconds(safeElapsedSeconds, mode) -
        1e-9,
    ),
  )
}

export function advanceGameSimulationStep(
  currentGame,
  elapsedSeconds,
  {
    isEditingBlueprint = false,
    random = Math.random,
  } = {},
) {
  const safeElapsedSeconds = normalizeElapsedSeconds(elapsedSeconds)
  if (safeElapsedSeconds === 0) return currentGame

  const nextPlaytimeSeconds =
    (Number(currentGame.playtimeSeconds) || 0) + safeElapsedSeconds

  if (isEditingBlueprint) {
    return advanceFortuneState(
      {
        ...currentGame,
        playtimeSeconds: nextPlaytimeSeconds,
      },
      safeElapsedSeconds,
      random,
    )
  }

  const fortuneModifiers = getFortuneModifiers(currentGame)
  const productionSnapshotForTick = getProductionSnapshotForTick(
    currentGame.blueprint,
    currentGame.farmland,
    currentGame.completedCropPerfections,
    safeElapsedSeconds * 1000,
    currentGame.testingCheats?.cropMultiplierEnabled ? 10 : 1,
    currentGame.trade?.rabbitContractsCompleted ?? 0,
    fortuneModifiers,
    currentGame.seedAugmentations,
  )
  const productionForTick = productionSnapshotForTick.total
  const nextCrops = currentGame.crops + productionForTick
  const rowDuplicatorEffectivenessMultiplier =
    getRowDuplicatorEffectivenessMultiplier(
      currentGame.blueprint,
      currentGame.completedCropPerfections,
      currentGame.hamsters,
      fortuneModifiers.passiveEffectMultiplier,
      currentGame.seedAugmentations,
    )
  const rowsBuiltPerSecond = currentGame.hasUnlockedRowDuplicators
    ? getRowsProducedPerSecond(
        currentGame.rowDuplicators,
        rowDuplicatorEffectivenessMultiplier,
        getRowDuplicatorExternalMultiplier(
          hasRabbitUnlock(
            currentGame,
            RABBIT_UNLOCK_IDS.ROW_DUPLICATOR_EFFICIENCY,
          )
            ? 2
            : 1,
        ),
      )
    : 0

  const columnsProducedForTick = getColumnsProducedForTick(
    currentGame.hamsters,
    currentGame.postUnionHamstersHired,
    getCropHamsterEfficiencyMultiplier(
      currentGame.blueprint,
      currentGame.completedCropPerfections,
      rowsBuiltPerSecond,
      fortuneModifiers.passiveEffectMultiplier,
      currentGame.seedAugmentations,
    ),
    safeElapsedSeconds * 1000,
    (currentGame.testingCheats?.hamsterEfficiencyEnabled ? 10 : 1) *
      (hasRabbitUnlock(
        currentGame,
        RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY,
      )
        ? 3
        : 1) *
      getCapybaraHamsterEfficiencyMultiplier(currentGame),
  )
  const rowsProducedForTick = rowsBuiltPerSecond * safeElapsedSeconds
  const hasUnlockedRootTunnel =
    currentGame.hasUnlockedRootTunnel ||
    nextCrops >= ROOT_TUNNEL_UNLOCK_CROP_COUNT
  const hasUnlockedWheat =
    currentGame.hasUnlockedWheat ||
    (currentGame.hasUnlockedRowDuplicators === true &&
      nextCrops >= WHEAT_UNLOCK_CROP_COUNT)
  const hasUnlockedSunflower =
    currentGame.hasUnlockedSunflower ||
    nextCrops >= SUNFLOWER_UNLOCK_CROP_COUNT
  const currentBlueprintSlots = getBlueprintSlots(currentGame)
  const activeBlueprintSlot = Math.min(
    Math.max(0, Math.floor(Number(currentGame.activeBlueprintSlot) || 0)),
    currentBlueprintSlots.length - 1,
  )
  const requiredBlueprintSlotCount = getUnlockedBlueprintSlotCount({
    ...currentGame,
    hasUnlockedRootTunnel,
    hasUnlockedSunflower,
  })
  const nextBlueprintSlots = [...currentBlueprintSlots]

  while (nextBlueprintSlots.length < requiredBlueprintSlotCount) {
    nextBlueprintSlots.push(currentGame.blueprint)
  }

  const nextGame = {
    ...currentGame,
    crops: nextCrops,
    totalCropsMade:
      (Number(currentGame.totalCropsMade) || 0) +
      Math.max(0, productionForTick),
    playtimeSeconds: nextPlaytimeSeconds,
    hasUnlockedTurnip:
      currentGame.hasUnlockedTurnip ||
      nextCrops >= TURNIP_UNLOCK_CROP_COUNT,
    hasUnlockedAppleTree:
      currentGame.hasUnlockedAppleTree ||
      nextCrops >= APPLE_TREE_UNLOCK_CROP_COUNT,
    hasUnlockedLentil:
      currentGame.hasUnlockedLentil ||
      nextCrops >= LENTIL_UNLOCK_CROP_COUNT,
    hasUnlockedKnotweed:
      currentGame.hasUnlockedKnotweed ||
      nextCrops >= KNOTWEED_UNLOCK_CROP_COUNT,
    hasUnlockedWheat,
    hasUnlockedRootTunnel,
    hasUnlockedSunflower,
    hasUnlockedCropPerfection:
      currentGame.hasUnlockedCropPerfection ||
      nextCrops >= CROP_PERFECTION_UNLOCK_CROP_COUNT,
    trade: advanceRabbitContract(
      currentGame,
      productionSnapshotForTick.byCrop,
      random,
    ),
    farmland: {
      ...currentGame.farmland,
      columns: currentGame.farmland.columns + columnsProducedForTick,
      rows: currentGame.farmland.rows + rowsProducedForTick,
    },
    blueprintSlots: nextBlueprintSlots,
    activeBlueprintSlot,
  }

  return advanceFortuneState(
    nextGame,
    safeElapsedSeconds,
    random,
  )
}

export function advanceGameByElapsedTime(
  game,
  elapsedSeconds,
  {
    mode = 'catch-up',
    isEditingBlueprint = false,
    random = Math.random,
  } = {},
) {
  const safeElapsedSeconds = normalizeElapsedSeconds(elapsedSeconds)
  const stepCount = getSimulationStepCount(safeElapsedSeconds, mode)

  return advanceGameByStepCount(game, safeElapsedSeconds, stepCount, {
    isEditingBlueprint,
    random,
  })
}

export function advanceGameByStepCount(
  game,
  elapsedSeconds,
  stepCount,
  {
    isEditingBlueprint = false,
    random = Math.random,
  } = {},
) {
  const safeElapsedSeconds = normalizeElapsedSeconds(elapsedSeconds)
  const safeStepCount = Math.max(0, Math.floor(Number(stepCount) || 0))

  if (safeElapsedSeconds === 0 || safeStepCount === 0) return game

  const secondsPerStep = safeElapsedSeconds / safeStepCount
  let nextGame = game

  for (let stepIndex = 0; stepIndex < safeStepCount; stepIndex += 1) {
    nextGame = advanceGameSimulationStep(nextGame, secondsPerStep, {
      isEditingBlueprint,
      random,
    })
  }

  return nextGame
}
