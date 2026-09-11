import {
  FLOOR_REPLICATOR_COST_TIER_SIZE,
  GAME_AREA_IDS,
} from './gameConfig.js'

export const FLOOR_REPLICATOR_MODES = Object.freeze({
  CONSTRUCTION: 'construction',
  SUPPORT: 'support',
})

export const MISFORTUNE_UPGRADE_IDS = Object.freeze({
  UNFORTUNATE_ROW: 'unfortunateRow',
  RUSHED_START: 'rushedStart',
  ADVERSITY_GROWN_TUBERS: 'adversityGrownTubers',
  BURDENED_FOUNDATIONS: 'burdenedFoundations',
})

export const MISFORTUNE_UPGRADES = Object.freeze({
  [MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    name: 'Unfortunate Row',
    cost: 250_000,
    cropProductionMultiplier: 0.8,
  }),
  [MISFORTUNE_UPGRADE_IDS.RUSHED_START]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.RUSHED_START,
    name: 'Rushed Start',
    cost: 25_000_000,
    boostDurationSeconds: 60,
    boostMultiplier: 10,
    penaltyDurationSeconds: 60,
    penaltyMultiplier: 0.5,
  }),
  [MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
    name: 'Adversity-Grown Tubers',
    cost: 7e22,
  }),
  [MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    name: 'Burdened Foundations',
    cost: 4.44e29,
    cropProductionMultiplierPerTier: 1.24,
    floorReplicatorsPerTier: FLOOR_REPLICATOR_COST_TIER_SIZE,
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

export function unlockMisfortuneUpgrade(game, upgradeId) {
  const upgrade = MISFORTUNE_UPGRADES[upgradeId]

  if (
    game?.activeArea !== GAME_AREA_IDS.MISFORTUNE ||
    !upgrade ||
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

export function isFloorReplicatorSupportModeActive(game) {
  return (
    game?.activeArea === GAME_AREA_IDS.MISFORTUNE &&
    hasMisfortuneUpgrade(
      game,
      MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    ) &&
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

export function getBurdenedFoundationsCropProductionMultiplier(game) {
  if (!isFloorReplicatorSupportModeActive(game)) return 1

  const upgrade = MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS
  ]

  return upgrade.cropProductionMultiplierPerTier **
    getBurdenedFoundationsTierCount(game)
}

export function toggleFloorReplicatorMode(game) {
  if (
    game?.activeArea !== GAME_AREA_IDS.MISFORTUNE ||
    !hasMisfortuneUpgrade(
      game,
      MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    )
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
