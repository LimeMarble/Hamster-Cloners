import {
  FLOOR_REPLICATOR_COST_TIER_SIZE,
  GAME_AREA_IDS,
  MISFORTUNE_AUGMENTATION_PREREQUISITE_ID,
} from './gameConfig.js'
import {
  getUnlockedCropIds,
  getVisibleCropIds,
  hasUnlockedCanolaInMisfortune,
  hasUnlockedCorn,
  hasVisitedMisfortune,
} from './crops.js'

export const FLOOR_REPLICATOR_MODES = Object.freeze({
  CONSTRUCTION: 'construction',
  SUPPORT: 'support',
})

export const MISFORTUNE_UPGRADE_IDS = Object.freeze({
  UNFORTUNATE_ROW: 'unfortunateRow',
  FORTUNATE_COLUMN: 'fortunateColumn',
  RUSHED_START: 'rushedStart',
  OILY_TREATS: 'oilyTreats',
  ADVERSITY_GROWN_TUBERS: 'adversityGrownTubers',
  BURDENED_FOUNDATIONS: 'burdenedFoundations',
  NOURISHING_MISERY: 'nourishingMisery',
  HUNT_FOR_SOMETHING_GREATER: 'huntForSomethingGreater',
  FINAL_SUPPORT: 'finalSupport',
  NOT_SO_FINAL_SUPPORT: MISFORTUNE_AUGMENTATION_PREREQUISITE_ID,
})

export const MISFORTUNE_UPGRADES = Object.freeze({
  [MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    name: 'Unfortunate Row',
    cost: 2_500_000,
    cropProductionMultiplier: 0.8,
  }),
  [MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
    name: 'Fortunate Column',
    requiredCropPerfectionId: 'sweetPotato',
    requiredMisfortuneUpgradeId: MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    cost: 7.77e51,
    cropProductionMultiplier: 1.25,
  }),
  [MISFORTUNE_UPGRADE_IDS.RUSHED_START]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.RUSHED_START,
    name: 'Rushed Start',
    cost: 250_000_000,
    boostDurationSeconds: 60,
    boostMultiplier: 10,
    penaltyDurationSeconds: 60,
    penaltyMultiplier: 0.5,
  }),
  [MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
    name: 'Adversity-Grown Tubers',
    requiredCropPerfectionId: 'sweetPotato',
    cost: 7e23,
  }),
  [MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    name: 'Burdened Foundations',
    requiredCropPerfectionId: 'sweetPotato',
    cost: 4.44e30,
    passiveEffectBonusPerTier: 0.01,
    floorReplicatorsPerTier: FLOOR_REPLICATOR_COST_TIER_SIZE,
  }),
  [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    name: 'Hunt for Something Greater',
    requiredCropPerfectionId: 'sweetPotato',
    cost: 7.77e41,
    secondsPerTimeMultiplier: 60,
    maximumTimeMultiplier: 10,
  }),
  [MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
    name: 'Nourishing Misery',
    requiredCropPerfectionId: 'sweetPotato',
    requiredMisfortuneUpgradeId: MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    cost: 2e53,
  }),
  [MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    name: 'Final Support',
    requiredCropPerfectionId: 'sweetPotato',
    requiredMisfortuneUpgradeId: MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    cost: 2.5e63,
    passiveEffectBonusPerTier: 0.002,
    floorReplicatorsPerTier: FLOOR_REPLICATOR_COST_TIER_SIZE,
  }),
  [MISFORTUNE_UPGRADE_IDS.OILY_TREATS]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.OILY_TREATS,
    name: 'Oily Treats',
    cost: 1.8e12,
  }),
  [MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT,
    name: 'Not-So-Final Support',
    requiredCropPerfectionId: 'sweetPotato',
    requiresFiveLeafClover: true,
    cost: 1e71,
  }),
})

export const RUSHED_START_TOTAL_DURATION_SECONDS =
  MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.RUSHED_START]
    .boostDurationSeconds +
  MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.RUSHED_START]
    .penaltyDurationSeconds

const VALID_MISFORTUNE_UPGRADE_IDS = new Set(
  Object.keys(MISFORTUNE_UPGRADES),
)

export function createInitialMisfortuneUpgradeState() {
  return []
}

export function normalizeMisfortuneUpgrades(rawUpgradeIds) {
  if (!Array.isArray(rawUpgradeIds)) {
    return createInitialMisfortuneUpgradeState()
  }

  return [...new Set(
    rawUpgradeIds.filter((upgradeId) =>
      VALID_MISFORTUNE_UPGRADE_IDS.has(upgradeId),
    ),
  )]
}

export function hasMisfortuneUpgrade(game, upgradeId) {
  return (
    VALID_MISFORTUNE_UPGRADE_IDS.has(upgradeId) &&
    Array.isArray(game?.completedMisfortuneUpgrades) &&
    game.completedMisfortuneUpgrades.includes(upgradeId)
  )
}

export function isMisfortuneUpgradeVisible(game, upgradeId) {
  const upgrade = MISFORTUNE_UPGRADES[upgradeId]
  return Boolean(upgrade &&
    hasMisfortuneUpgradeProgressRequirements(game, upgrade) && (
      !upgrade.requiredCropPerfectionId ||
      game?.completedCropPerfections?.includes(upgrade.requiredCropPerfectionId)
    ))
}

function hasMisfortuneUpgradeProgressRequirements(game, upgrade) {
  if (hasMisfortuneUpgrade(game, upgrade.id)) return true
  return (
    (!upgrade.requiredMisfortuneUpgradeId ||
      hasMisfortuneUpgrade(game, upgrade.requiredMisfortuneUpgradeId)) &&
    (!upgrade.requiresFiveLeafClover || game?.cloverAssembly?.assembled === true)
  )
}

export function unlockMisfortuneUpgrade(game, upgradeId) {
  const upgrade = MISFORTUNE_UPGRADES[upgradeId]

  if (
    game?.activeArea !== GAME_AREA_IDS.MISFORTUNE ||
    !upgrade ||
    !hasMisfortuneUpgradeProgressRequirements(game, upgrade) ||
    Math.max(0, Number(game.crops) || 0) < upgrade.cost ||
    hasMisfortuneUpgrade(game, upgradeId)
  ) {
    return null
  }

  return {
    ...game,
    crops: Math.max(0, Number(game.crops) || 0) - upgrade.cost,
    completedMisfortuneUpgrades: [
      ...normalizeMisfortuneUpgrades(game.completedMisfortuneUpgrades),
      upgradeId,
    ],
  }
}

export function getMisfortuneUpgradeCost(upgradeId) {
  return MISFORTUNE_UPGRADES[upgradeId]?.cost ?? null
}

export function canUnlockMisfortuneUpgrade(game, upgradeId) {
  const cost = getMisfortuneUpgradeCost(upgradeId)

  return (
    game?.activeArea === GAME_AREA_IDS.MISFORTUNE &&
    cost !== null &&
    hasMisfortuneUpgradeProgressRequirements(game, MISFORTUNE_UPGRADES[upgradeId]) &&
    !hasMisfortuneUpgrade(game, upgradeId) &&
    Math.max(0, Number(game.crops) || 0) >= cost
  )
}

export function getUnfortunateRowCropProductionMultiplier(game) {
  if (!hasMisfortuneUpgrade(
    game,
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
  )) {
    return 1
  }

  return MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW
  ].cropProductionMultiplier
}

export function getFortunateColumnCropProductionMultiplier(game) {
  if (!hasMisfortuneUpgrade(
    game,
    MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
  )) {
    return 1
  }

  return MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN
  ].cropProductionMultiplier
}

export function getMisfortuneUpgradeCropProductionMultiplier(game) {
  return getUnfortunateRowCropProductionMultiplier(game) *
    getFortunateColumnCropProductionMultiplier(game)
}

export function getRushedStartExternalMultiplier(game) {
  if (!hasMisfortuneUpgrade(game, MISFORTUNE_UPGRADE_IDS.RUSHED_START)) {
    return 1
  }

  const upgrade = MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.RUSHED_START]
  const secondsSinceReset = Math.max(
    0,
    Number(game?.secondsSinceAreaReset) || 0,
  )

  if (secondsSinceReset < upgrade.boostDurationSeconds) {
    return upgrade.boostMultiplier
  }

  if (
    secondsSinceReset <
    upgrade.boostDurationSeconds + upgrade.penaltyDurationSeconds
  ) {
    return upgrade.penaltyMultiplier
  }

  return 1
}

function getAreaState(game, areaId) {
  const activeAreaId = game?.activeArea === GAME_AREA_IDS.MISFORTUNE
    ? GAME_AREA_IDS.MISFORTUNE
    : GAME_AREA_IDS.MAIN

  return activeAreaId === areaId
    ? game
    : game?.areaProgress?.[areaId]
}

function getAreaUnlockedCropIds(game, areaId) {
  const area = getAreaState(game, areaId)
  if (!area) return []

  const rabbitUnlocks = new Set(game?.trade?.rabbitUnlocks ?? [])
  const isMisfortune = areaId === GAME_AREA_IDS.MISFORTUNE

  const unlockedCropIds = getUnlockedCropIds(
    area.blueprint,
    game?.unionized === true,
    area.hamsters,
    area.hasUnlockedTurnip,
    area.hasUnlockedAppleTree,
    area.hasUnlockedLentil,
    area.hasUnlockedKnotweed,
    game?.hasUnlockedRootTunnel,
    area.hasUnlockedSunflower,
    area.rowDuplicators,
    rabbitUnlocks.has('carrot'),
    rabbitUnlocks.has('fourLeafClover') &&
      (!isMisfortune || game?.cloverAssembly?.assembled === true),
    area.hasUnlockedWheat,
    [],
    game?.floorReplicators,
    game?.earnedAchievementIds?.includes('makingPeanuts') === true,
    hasUnlockedCanolaInMisfortune(game),
    hasUnlockedCorn({ ...area, activeArea: areaId }),
  )

  return getVisibleCropIds(
    unlockedCropIds,
    game?.totalHamstersHired,
    game?.hasUnlockedRowDuplicators,
    hasUnlockedCanolaInMisfortune(game),
    hasVisitedMisfortune(game),
    areaId,
  ).filter((cropId) => unlockedCropIds.includes(cropId))
}

export function getMissingMisfortuneCropTypeIds(game) {
  if (game?.activeArea !== GAME_AREA_IDS.MISFORTUNE) return []

  const mainCropIds = getAreaUnlockedCropIds(game, GAME_AREA_IDS.MAIN)
  const misfortuneCropIds = new Set(
    getAreaUnlockedCropIds(game, GAME_AREA_IDS.MISFORTUNE),
  )

  return mainCropIds.filter((cropId) => !misfortuneCropIds.has(cropId))
}

export function getHuntForSomethingGreaterMultiplier(game) {
  if (
    !hasMisfortuneUpgrade(
      game,
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    )
  ) {
    return 1
  }

  const upgrade = MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER
  ]
  const minutesSinceReset =
    Math.max(0, Number(game?.secondsSinceAreaReset) || 0) /
    upgrade.secondsPerTimeMultiplier
  const timeMultiplier = Math.max(
    1,
    Math.min(minutesSinceReset, upgrade.maximumTimeMultiplier),
  )
  const missingCropTypeCount =
    game?.activeArea === GAME_AREA_IDS.MISFORTUNE
      ? getMissingMisfortuneCropTypeIds(game).length
      : 0

  return (1 + missingCropTypeCount) * timeMultiplier
}

export function isFloorReplicatorSupportModeAvailable(game) {
  const hasBurdenedFoundations = hasMisfortuneUpgrade(
    game,
    MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
  )
  const hasFinalSupport = hasMisfortuneUpgrade(
    game,
    MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
  )

  return game?.activeArea === GAME_AREA_IDS.MISFORTUNE
    ? hasBurdenedFoundations || hasFinalSupport
    : hasFinalSupport
}

export function isFloorReplicatorSupportModeActive(game) {
  return (
    isFloorReplicatorSupportModeAvailable(game) &&
    game.floorReplicatorMode === FLOOR_REPLICATOR_MODES.SUPPORT
  )
}

export function getBurdenedFoundationsTierCount(game) {
  const upgrade = MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS
  ]

  return Math.floor(
    Math.max(0, Math.floor(Number(game?.floorReplicators) || 0)) /
      upgrade.floorReplicatorsPerTier,
  )
}

export function getBurdenedFoundationsPassiveEffectBonus(game) {
  if (
    !isFloorReplicatorSupportModeActive(game) ||
    game?.activeArea !== GAME_AREA_IDS.MISFORTUNE ||
    !hasMisfortuneUpgrade(
      game,
      MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    )
  ) {
    return 0
  }

  return MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS
  ].passiveEffectBonusPerTier * getBurdenedFoundationsTierCount(game)
}

export function getFinalSupportPassiveEffectBonus(game) {
  if (
    !isFloorReplicatorSupportModeActive(game) ||
    !hasMisfortuneUpgrade(
      game,
      MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    )
  ) {
    return 0
  }

  return MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT
  ].passiveEffectBonusPerTier * getBurdenedFoundationsTierCount(game)
}

export function getFloorReplicatorSupportPassiveEffectBonus(game) {
  return getBurdenedFoundationsPassiveEffectBonus(game) +
    getFinalSupportPassiveEffectBonus(game)
}

export function toggleFloorReplicatorMode(game) {
  if (
    !isFloorReplicatorSupportModeAvailable(game)
  ) {
    return null
  }

  return {
    ...game,
    floorReplicatorMode:
      game.floorReplicatorMode === FLOOR_REPLICATOR_MODES.SUPPORT
        ? FLOOR_REPLICATOR_MODES.CONSTRUCTION
        : FLOOR_REPLICATOR_MODES.SUPPORT,
  }
}
