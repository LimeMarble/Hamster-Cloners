import {
  BLUEPRINT_EXPANSIONS,
  BLUEPRINT_EXPANSION_TRACKS,
  createBlueprint,
  createFarmlandMultipliers,
  createInitialGame,
  getUnlockedBlueprintSlotCount,
  hasReachedMonocropLimit,
} from './gameLogic.js'
import {
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CROP_PERFECTION_IDS,
  CROP_PERFECTION_UNLOCK_CROP_COUNT,
  LENTIL_UNLOCK_CROP_COUNT,
  KNOTWEED_UNLOCK_CROP_COUNT,
  ROOT_TUNNEL_UNLOCK_CROP_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
} from './crops.js'

export const DEFAULT_SAVE_KEY = 'hamster-cloners-save-v1'
export const SAVE_KEY =
  import.meta.env?.VITE_SAVE_KEY || DEFAULT_SAVE_KEY
const LEGACY_SAVE_KEY = 'hamster-field-cloners-save-v1'
export const SAVE_FORMAT_VERSION = 1

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return globalThis.btoa(binary)
}

function decodeBase64(value) {
  const saveCode = value.trim()

  if (
    !saveCode ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      saveCode,
    )
  ) {
    throw new Error('The save code is not valid Base64.')
  }

  const binary = globalThis.atob(saveCode)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

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
  const hasUnlockedRootTunnel =
    rawGame.hasUnlockedRootTunnel === true ||
    toNonNegativeNumber(rawGame.crops, 0) >= ROOT_TUNNEL_UNLOCK_CROP_COUNT
  const rawBlueprintSlots =
    hasCurrentBlueprintAxes && Array.isArray(rawGame.blueprintSlots)
      ? rawGame.blueprintSlots
      : []
  const blueprintSlotCount = getUnlockedBlueprintSlotCount({
    blueprint,
    hasUnlockedRootTunnel,
  })
  const blueprintSlots = Array.from(
    { length: blueprintSlotCount },
    (_, slotIndex) => {
      const rawSlot = rawBlueprintSlots[slotIndex]

      return rawSlot && typeof rawSlot === 'object'
        ? createBlueprint({
            rows: blueprint.rows,
            columns: blueprint.columns,
            cells: rawSlot.cells,
            mirrorCornTargets: rawSlot.mirrorCornTargets,
          })
        : createBlueprint(blueprint)
    },
  )
  const activeBlueprintSlot = Math.min(
    Math.max(0, Math.floor(Number(rawGame.activeBlueprintSlot) || 0)),
    blueprintSlots.length - 1,
  )
  const activeBlueprint = blueprintSlots[activeBlueprintSlot]
  const hasReachedLimit = hasReachedMonocropLimit(activeBlueprint)
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
    totalCropsMade: toNonNegativeNumber(
      rawGame.totalCropsMade,
      toNonNegativeNumber(rawGame.crops, 0),
    ),
    playtimeSeconds: toNonNegativeNumber(rawGame.playtimeSeconds, 0),
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
    hasSeenBlueprintMastery: rawGame.hasSeenBlueprintMastery === true,
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
    hasUnlockedLentil:
      rawGame.hasUnlockedLentil === true ||
      toNonNegativeNumber(rawGame.crops, 0) >= LENTIL_UNLOCK_CROP_COUNT,
    hasUnlockedKnotweed:
      rawGame.hasUnlockedKnotweed === true ||
      toNonNegativeNumber(rawGame.crops, 0) >= KNOTWEED_UNLOCK_CROP_COUNT,
    hasUnlockedRootTunnel:
      hasUnlockedRootTunnel,
    hasUnlockedCropPerfection:
      rawGame.hasUnlockedCropPerfection === true ||
      toNonNegativeNumber(rawGame.crops, 0) >= CROP_PERFECTION_UNLOCK_CROP_COUNT,
    hasUnlockedRowDuplicators: rawGame.hasUnlockedRowDuplicators === true,
    rowDuplicators: toNonNegativeInteger(rawGame.rowDuplicators, 0),
    testingPanelUnlocked: rawGame.testingPanelUnlocked === true,
    testingCheats: {
      cropMultiplierEnabled:
        rawGame.testingCheats?.cropMultiplierEnabled === true,
      hamsterEfficiencyEnabled:
        rawGame.testingCheats?.hamsterEfficiencyEnabled === true,
    },
    completedCropPerfections,
    hamstersBuildColumns: true,
    blueprintExpansionAxesSwapped: true,
    completedBlueprintExpansions: BLUEPRINT_EXPANSIONS.map(
      (expansion) => expansion.id,
    ).filter((expansionId) => completedExpansionIds.has(expansionId)),
    blueprint: activeBlueprint,
    blueprintSlots,
    activeBlueprintSlot,
    farmland,
  }
}

export function exportGame(game) {
  return encodeBase64(
    JSON.stringify({
      version: SAVE_FORMAT_VERSION,
      game,
    }),
  )
}

export function importGame(saveCode) {
  let payload

  try {
    payload = JSON.parse(decodeBase64(saveCode))
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message === 'The save code is not valid Base64.'
        ? error.message
        : 'The save code is invalid or corrupted.',
      { cause: error },
    )
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.version !== SAVE_FORMAT_VERSION ||
    !payload.game ||
    typeof payload.game !== 'object'
  ) {
    throw new Error('This save code is from an unsupported version of the game.')
  }

  return normalizeGame(payload.game)
}

export function loadGame() {
  try {
    const rawSave =
      window.localStorage.getItem(SAVE_KEY) ??
      (SAVE_KEY === DEFAULT_SAVE_KEY
        ? window.localStorage.getItem(LEGACY_SAVE_KEY)
        : null)

    if (!rawSave) {
      return createInitialGame()
    }

    try {
      return importGame(rawSave)
    } catch {
      // Migrate pre-save-code JSON saves without taking away existing progress.
      const migratedGame = normalizeGame(JSON.parse(rawSave))
      saveGame(migratedGame)
      return migratedGame
    }
  } catch {
    return createInitialGame()
  }
}

export function saveGame(game) {
  try {
    window.localStorage.setItem(SAVE_KEY, exportGame(game))
  } catch {
    // The game remains playable if storage is unavailable or full.
  }
}
