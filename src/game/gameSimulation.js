import { getUnlockedBlueprintSlotCount } from './blueprintLogic.js'
import {
  getColumnsProducedForTick,
  getCropHamsterEfficiencyMultiplier,
  getCropProductionSnapshotPerSecond,
  getFloorsProducedPerSecond,
  getHamsterCoordinationMultiplier,
  getRowsProducedPerSecond,
  getRowDuplicatorEffectivenessMultiplier,
  getRowDuplicatorExternalMultiplier,
} from './cropProduction.js'
import {
  getCropUnlockRequirement,
  ROOT_TUNNEL_UNLOCK_CROP_COUNT,
  hasUnlockedCorn,
} from './crops.js'
import { advanceFortuneState, getFortuneModifiers } from './fortuneLogic.js'
import {
  GAME_AREA_IDS,
  SIMULATION_TICK_INTERVAL_MS,
} from './gameConfig.js'
import {
  advanceRabbitContract,
  hasRabbitUnlock,
  RABBIT_UNLOCK_IDS,
} from './tradeLogic.js'
import { getCapybaraHamsterEfficiencyMultiplier } from './capybaraLogic.js'
import {
  getBlazingCarrotSurveyDurationMultiplier,
  getMangroveNurseryEffect,
  getSoybeanMachineryEffect,
} from './cropEffects.js'
import {
  advanceManateeSurveyState,
  getManateeAssignedHamsterCount,
} from './manateeLogic.js'
import { advanceWetlandsConnectionState } from './wetlandsConnectionState.js'
import {
  getHuntForSomethingGreaterMultiplier,
  getRushedStartExternalMultiplier,
  isFloorReplicatorSupportModeActive,
} from './misfortuneUpgrades.js'
import { advanceCloverAssemblyState } from './cloverAssemblyLogic.js'
import { advanceFalseStartProgress, awardAchievements } from './achievementLogic.js'
import { getAchievementHamsterMultiplier, getOilyTreatsFloorMultiplier } from './achievementState.js'

export const ACTIVE_SIMULATION_STEP_SECONDS =
  SIMULATION_TICK_INTERVAL_MS / 1000
export const CATCH_UP_COMPRESSION_FACTOR = 150
export const CATCH_UP_SPEED_FACTOR = 2
export const SKIPPED_CATCH_UP_STEPS = 100

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

  currentGame = awardAchievements(currentGame)

  const nextPlaytimeSeconds =
    (Number(currentGame.playtimeSeconds) || 0) + safeElapsedSeconds
  const nextSecondsSinceAreaReset =
    Math.max(0, Number(currentGame.secondsSinceAreaReset) || 0) +
    safeElapsedSeconds

  if (isEditingBlueprint) {
    return advanceFortuneState(
      advanceFalseStartProgress(currentGame, {
        ...currentGame,
        playtimeSeconds: nextPlaytimeSeconds,
        secondsSinceAreaReset: nextSecondsSinceAreaReset,
      }),
      safeElapsedSeconds,
      random,
    )
  }

  const fortuneModifiers = getFortuneModifiers(currentGame)
  const rushedStartExternalMultiplier =
    getRushedStartExternalMultiplier(currentGame)
  const huntForSomethingGreaterMultiplier =
    getHuntForSomethingGreaterMultiplier(currentGame)
  const manateeSurveyDurationMultiplier =
    getBlazingCarrotSurveyDurationMultiplier(
      currentGame.blueprint,
      currentGame.completedCropPerfections,
      currentGame.trade?.totalRabbitRelationsEarned ?? 0,
      fortuneModifiers.passiveEffectMultiplier,
      currentGame.seedAugmentations,
    )
  const manateeFindValueMultiplier = getMangroveNurseryEffect(
    currentGame.blueprint,
    currentGame.completedCropPerfections,
    fortuneModifiers.passiveEffectMultiplier,
    currentGame.seedAugmentations,
  ).multiplier
  const productionSnapshotPerSecond = getCropProductionSnapshotPerSecond(
    currentGame.blueprint,
    currentGame.farmland,
    currentGame.completedCropPerfections,
    currentGame.testingCheats?.cropMultiplierEnabled ? 10 : 1,
    currentGame.trade?.rabbitContractsCompleted ?? 0,
    fortuneModifiers,
    currentGame.seedAugmentations,
    currentGame.trade?.totalRabbitRelationsEarned ?? 0,
  )
  const productionForTick =
    productionSnapshotPerSecond.total * safeElapsedSeconds
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
          (hasRabbitUnlock(
            currentGame,
            RABBIT_UNLOCK_IDS.ROW_DUPLICATOR_EFFICIENCY,
          )
            ? 2
            : 1) * rushedStartExternalMultiplier *
          huntForSomethingGreaterMultiplier,
        ),
      )
    : 0

  const hamsterCoordinationMultiplier = getHamsterCoordinationMultiplier(
    currentGame.hamsters,
    currentGame.postUnionHamstersHired,
  )
  const assignedManateeHamsters =
    getManateeAssignedHamsterCount(currentGame)
  const productiveHamsters = Math.max(
    0,
    Math.floor(Number(currentGame.hamsters) || 0) - assignedManateeHamsters,
  )
  const columnsProducedForTick = getColumnsProducedForTick(
    productiveHamsters,
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
      getCapybaraHamsterEfficiencyMultiplier(currentGame) *
        getAchievementHamsterMultiplier(currentGame, fortuneModifiers.passiveEffectMultiplier) *
        rushedStartExternalMultiplier *
          huntForSomethingGreaterMultiplier,
    currentGame.hamsters,
  )
  const rowsProducedForTick = rowsBuiltPerSecond * safeElapsedSeconds
  const floorReplicatorEffectivenessMultiplier =
    getSoybeanMachineryEffect(
      currentGame.blueprint,
      currentGame.completedCropPerfections,
      fortuneModifiers.passiveEffectMultiplier,
      currentGame.seedAugmentations,
    ).floorProductionMultiplier
  const floorsProducedForTick = currentGame.hasUnlockedFloorReplicators
    && !isFloorReplicatorSupportModeActive(currentGame)
    ? getFloorsProducedPerSecond(
      currentGame.floorReplicators,
      rushedStartExternalMultiplier *
        huntForSomethingGreaterMultiplier *
        getOilyTreatsFloorMultiplier(currentGame, fortuneModifiers.passiveEffectMultiplier),
      floorReplicatorEffectivenessMultiplier,
    ) *
      safeElapsedSeconds
    : 0
  const hasUnlockedRootTunnel =
    currentGame.hasUnlockedRootTunnel ||
    nextCrops >= ROOT_TUNNEL_UNLOCK_CROP_COUNT
  const hasUnlockedWheat =
    currentGame.hasUnlockedWheat ||
    (currentGame.hasUnlockedRowDuplicators === true &&
      nextCrops >= getCropUnlockRequirement('wheat', currentGame.activeArea))
  const hasUnlockedSunflower =
    currentGame.hasUnlockedSunflower ||
    nextCrops >= getCropUnlockRequirement('sunflower', currentGame.activeArea)
  const currentBlueprintSlots =
    Array.isArray(currentGame.blueprintSlots) &&
    currentGame.blueprintSlots.length > 0
      ? currentGame.blueprintSlots
      : [currentGame.blueprint]
  const activeBlueprintSlot = Math.min(
    Math.max(0, Math.floor(Number(currentGame.activeBlueprintSlot) || 0)),
    currentBlueprintSlots.length - 1,
  )
  const requiredBlueprintSlotCount = getUnlockedBlueprintSlotCount({
    ...currentGame,
    hasUnlockedRootTunnel,
    hasUnlockedSunflower,
  })
  let nextBlueprintSlots = currentBlueprintSlots

  if (currentBlueprintSlots.length < requiredBlueprintSlotCount) {
    nextBlueprintSlots = [...currentBlueprintSlots]

    while (nextBlueprintSlots.length < requiredBlueprintSlotCount) {
      nextBlueprintSlots.push(currentGame.blueprint)
    }
  }

  const nextGame = {
    ...currentGame,
    crops: nextCrops,
    totalCropsMade:
      (Number(currentGame.totalCropsMade) || 0) +
      Math.max(0, productionForTick),
    playtimeSeconds: nextPlaytimeSeconds,
    secondsSinceAreaReset: nextSecondsSinceAreaReset,
    hasUnlockedCorn: hasUnlockedCorn(currentGame, nextCrops),
    hasUnlockedTurnip:
      currentGame.hasUnlockedTurnip ||
      nextCrops >= getCropUnlockRequirement('turnip', currentGame.activeArea),
    hasUnlockedAppleTree:
      currentGame.hasUnlockedAppleTree ||
      nextCrops >= getCropUnlockRequirement('appleTree', currentGame.activeArea),
    hasUnlockedLentil:
      currentGame.hasUnlockedLentil ||
      nextCrops >= getCropUnlockRequirement('lentil', currentGame.activeArea),
    hasUnlockedKnotweed:
      currentGame.hasUnlockedKnotweed ||
      nextCrops >= getCropUnlockRequirement('knotweed', currentGame.activeArea),
    hasUnlockedWheat,
    hasUnlockedRootTunnel,
    hasUnlockedSunflower,
    hasUnlockedCropPerfection:
      currentGame.hasUnlockedCropPerfection ||
      nextCrops >= getCropUnlockRequirement('cropPerfection', currentGame.activeArea),
    manatees: advanceWetlandsConnectionState(
      advanceManateeSurveyState(
        currentGame.manatees,
        safeElapsedSeconds,
        hamsterCoordinationMultiplier,
        random,
        manateeSurveyDurationMultiplier,
        manateeFindValueMultiplier,
        currentGame.testingCheats?.oneSecondManateeSurveysEnabled === true,
      ),
      safeElapsedSeconds,
    ),
    trade: advanceRabbitContract(
      currentGame,
      productionSnapshotPerSecond.byCrop,
      random,
      safeElapsedSeconds,
      true,
    ),
    cloverAssembly: advanceCloverAssemblyState(
      currentGame.cloverAssembly,
      productionSnapshotPerSecond.byCrop,
      safeElapsedSeconds,
      currentGame.activeArea === GAME_AREA_IDS.MISFORTUNE &&
        currentGame.hasUnlockedGreaterBlueprinting === true &&
        hasRabbitUnlock(currentGame, RABBIT_UNLOCK_IDS.RABBITS_CHARM),
    ),
    farmland: {
      ...currentGame.farmland,
      columns: currentGame.farmland.columns + columnsProducedForTick,
      rows: currentGame.farmland.rows + rowsProducedForTick,
      floors: currentGame.farmland.floors + floorsProducedForTick,
    },
    blueprintSlots: nextBlueprintSlots,
    activeBlueprintSlot,
  }

  return advanceFortuneState(
    advanceFalseStartProgress(currentGame, nextGame, columnsProducedForTick),
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
