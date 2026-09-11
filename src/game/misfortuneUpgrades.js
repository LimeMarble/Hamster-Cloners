import { GAME_AREA_IDS } from './gameConfig.js'

export const MISFORTUNE_UPGRADE_IDS = Object.freeze({
  UNFORTUNATE_ROW: 'unfortunateRow',
})

export const MISFORTUNE_UPGRADES = Object.freeze({
  [MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW]: Object.freeze({
    id: MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    name: 'Unfortunate Row',
    cost: 250_000,
    cropProductionMultiplier: 0.8,
  }),
})

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

export function getMisfortuneCropProductionMultiplier(game) {
  if (
    game?.activeArea !== GAME_AREA_IDS.MISFORTUNE ||
    !hasMisfortuneUpgrade(
      game,
      MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    )
  ) {
    return 1
  }

  return MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW
  ].cropProductionMultiplier
}
