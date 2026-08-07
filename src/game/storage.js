import {
  BLUEPRINT_EXPANSIONS,
  BLUEPRINT_EXPANSION_TRACKS,
  createBlueprint,
  createFarmlandMultipliers,
  createInitialGame,
  hasReachedMonocropLimit,
} from './gameLogic.js'
import {
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CROP_PERFECTION_IDS,
  CROP_PERFECTION_UNLOCK_CROP_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
} from './crops.js'

export const SAVE_KEY = 'hamster-field-cloners-save-v1'

function toNonNegativeNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function toNonNegativeInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function normalizeGame(rawGame) {
  const initialGame = createInitialGame()

  if (!rawGame || typeof rawGame !== 'object') {
    return initialGame
  }

  const hasCurrentBlueprintAxes = rawGame.blueprintExpansionAxesSwapped === true
  const blueprint = hasCurrentBlueprintAxes
    ? createBlueprint(rawGame.blueprint)
    : createBlueprint({ cells: ['leek'] })
  const hasReachedLimit = hasReachedMonocropLimit(blueprint)
  const validExpansionIds = new Set(
    BLUEPRINT_EXPANSIONS.map((expansion) => expansion.id),
  )
  const completedExpansionIds = new Set(
    hasCurrentBlueprintAxes && Array.isArray(rawGame.completedBlueprintExpansions)
      ? rawGame.completedBlueprintExpansions.filter((expansionId) =>
          validExpansionIds.has(expansionId),
        )
      : [],
  )
  const completedCropPerfections = Array.isArray(rawGame.completedCropPerfections)
    ? rawGame.completedCropPerfections.filter((perfectionId) =>
        CROP_PERFECTION_IDS.includes(perfectionId),
      )
    : []
  const hasLegacyAppleTreeUnlock =
    Array.isArray(rawGame.completedCropUnlocks) &&
    rawGame.completedCropUnlocks.includes('appleTree')
  const rawFarmland =
    rawGame.farmland && typeof rawGame.farmland === 'object'
      ? rawGame.farmland
      : {}
  const farmland =
    rawGame.hamstersBuildColumns === true
      ? createFarmlandMultipliers(rawFarmland)
      : createFarmlandMultipliers({
          ...rawFarmland,
          rows: 1,
          columns: toNonNegativeNumber(rawFarmland.rows, 0),
        })

  if (hasCurrentBlueprintAxes) {
    BLUEPRINT_EXPANSION_TRACKS.forEach((track) => {
      const completedExpansionCount =
        (track.id === 'row' ? blueprint.rows : blueprint.columns) - 1

      track.stages.forEach((stage, stageIndex) => {
        if (
          rawGame[`${stage.id}ExpansionUnlocked`] === true ||
          completedExpansionCount > stageIndex
        ) {
          completedExpansionIds.add(stage.id)
        }
      })
    })
  }

  return {
    crops: toNonNegativeNumber(rawGame.crops, initialGame.crops),
    hamsters: toNonNegativeInteger(rawGame.hamsters, initialGame.hamsters),
    totalHamstersHired: toNonNegativeInteger(
      rawGame.totalHamstersHired,
      toNonNegativeInteger(rawGame.hamsters, initialGame.totalHamstersHired),
    ),
    unionized: rawGame.unionized === true,
    postUnionHamstersHired: toNonNegativeInteger(
      rawGame.postUnionHamstersHired,
      0,
    ),
    hasSeenMonocropLimit:
      rawGame.hasSeenMonocropLimit === true || hasReachedLimit,
    hasVisitedInventions: rawGame.hasVisitedInventions === true,
    hasUnlockedTurnip:
      rawGame.hasUnlockedTurnip === true ||
      // The former Pumpkin milestone now unlocks Turnip instead.
      rawGame.hasUnlockedPumpkin === true ||
      toNonNegativeNumber(rawGame.crops, 0) >= TURNIP_UNLOCK_CROP_COUNT,
    hasUnlockedAppleTree:
      rawGame.hasUnlockedAppleTree === true ||
      hasLegacyAppleTreeUnlock ||
      toNonNegativeNumber(rawGame.crops, 0) >= APPLE_TREE_UNLOCK_CROP_COUNT,
    hasUnlockedCropPerfection:
      rawGame.hasUnlockedCropPerfection === true ||
      toNonNegativeNumber(rawGame.crops, 0) >= CROP_PERFECTION_UNLOCK_CROP_COUNT,
    hasUnlockedRowDuplicators: rawGame.hasUnlockedRowDuplicators === true,
    completedCropPerfections,
    hamstersBuildColumns: true,
    blueprintExpansionAxesSwapped: true,
    completedBlueprintExpansions: BLUEPRINT_EXPANSIONS.map(
      (expansion) => expansion.id,
    ).filter((expansionId) => completedExpansionIds.has(expansionId)),
    blueprint,
    farmland,
  }
}

export function loadGame() {
  try {
    const rawSave = window.localStorage.getItem(SAVE_KEY)
    return rawSave ? normalizeGame(JSON.parse(rawSave)) : createInitialGame()
  } catch {
    return createInitialGame()
  }
}

export function saveGame(game) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  } catch {
    // The game remains playable if storage is unavailable or full.
  }
}
