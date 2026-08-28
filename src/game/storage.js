import { normalizeTradeState, RABBIT_UNLOCK_IDS } from './tradeLogic.js'
import { normalizeFortuneState } from './fortuneLogic.js'
import { normalizeCapybaraState } from './capybaraLogic.js'
import { normalizeSeedAugmentationState } from './augmentationLogic.js'
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
  SUNFLOWER_UNLOCK_CROP_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
  WHEAT_UNLOCK_CROP_COUNT,
  isCropPerfectionTemporarilyUnavailable,
  isCropTemporarilyUnavailable,
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

function removeUnavailableCrops(blueprint, hasUnlockedSunflower) {
  return createBlueprint({
    ...blueprint,
    cells: blueprint.cells.map((cropId) =>
      isCropTemporarilyUnavailable(cropId) ||
      (cropId === 'sunflower' && !hasUnlockedSunflower)
        ? null
        : cropId,
    ),
  })
}

function getRabbitBlueprintExpansionCounts(rawGame, trade) {
  const storedCounts = rawGame.rabbitBlueprintExpansions
  const hasStoredCounts = storedCounts && typeof storedCounts === 'object'
  const getCount = (trackId, unlockId) =>
    toNonNegativeInteger(
      storedCounts?.[trackId],
      hasStoredCounts || !trade.rabbitUnlocks.includes(unlockId) ? 0 : 1,
    )

  return {
    row: getCount('row', RABBIT_UNLOCK_IDS.ROW_EXPANSION),
    column: getCount('column', RABBIT_UNLOCK_IDS.COLUMN_EXPANSION),
  }
}

export function normalizeGame(rawGame) {
  const initialGame = createInitialGame()

  if (!rawGame || typeof rawGame !== 'object') {
    return initialGame
  }

  const hasCurrentBlueprintAxes = rawGame.blueprintExpansionAxesSwapped === true
  const trade = normalizeTradeState(rawGame.trade)
  const currentCrops = toNonNegativeNumber(rawGame.crops, initialGame.crops)
  const hasUnlockedSunflower =
    rawGame.hasUnlockedSunflower === true ||
    currentCrops >= SUNFLOWER_UNLOCK_CROP_COUNT
  let blueprint = hasCurrentBlueprintAxes
    ? removeUnavailableCrops(
        createBlueprint(rawGame.blueprint),
        hasUnlockedSunflower,
      )
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
  const rabbitBlueprintExpansions = getRabbitBlueprintExpansionCounts(
    rawGame,
    trade,
  )

  // Earlier Rabbit expansion purchases consumed the next reset milestone.
  // Preserve their grid size while restoring that milestone to the paid track.
  if (
    hasCurrentBlueprintAxes &&
    !(rawGame.rabbitBlueprintExpansions &&
      typeof rawGame.rabbitBlueprintExpansions === 'object')
  ) {
    BLUEPRINT_EXPANSION_TRACKS.forEach((track) => {
      const freeExpansionCount = rabbitBlueprintExpansions[track.id]

      for (let index = 0; index < freeExpansionCount; index += 1) {
        const lastCompletedStage = [...track.stages]
          .reverse()
          .find((stage) => completedExpansionIds.has(stage.id))

        if (lastCompletedStage) {
          completedExpansionIds.delete(lastCompletedStage.id)
        }
      }
    })
  }

  const completedCropPerfections = Array.isArray(rawGame.completedCropPerfections)
    ? rawGame.completedCropPerfections.filter((perfectionId) =>
        CROP_PERFECTION_IDS.includes(perfectionId) &&
        !isCropPerfectionTemporarilyUnavailable(perfectionId),
      )
    : []

  if (completedCropPerfections.includes('splitweed')) {
    blueprint = removeUnavailableCrops(
      createBlueprint({
        ...blueprint,
        requireSplitweedFootprints: true,
      }),
      hasUnlockedSunflower,
    )
  }

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
  const unlockedBlueprintSlotCount = getUnlockedBlueprintSlotCount({
    blueprint,
    unionized: rawGame.unionized === true,
    hamsters: toNonNegativeInteger(rawGame.hamsters, initialGame.hamsters),
    hasUnlockedSunflower,
  })
  const blueprintSlotCount = Math.max(
    unlockedBlueprintSlotCount,
    Math.min(3, rawBlueprintSlots.length),
  )
  const blueprintSlots = Array.from(
    { length: blueprintSlotCount },
    (_, slotIndex) => {
      const rawSlot = rawBlueprintSlots[slotIndex]

      return rawSlot && typeof rawSlot === 'object'
        ? removeUnavailableCrops(
            createBlueprint({
              rows: blueprint.rows,
              columns: blueprint.columns,
              cells: rawSlot.cells,
              mirrorCornTargets: rawSlot.mirrorCornTargets,
              requireSplitweedFootprints:
                completedCropPerfections.includes('splitweed'),
            }),
            hasUnlockedSunflower,
          )
        : createBlueprint(blueprint)
    },
  )
  const activeBlueprintSlot = Math.min(
    Math.max(0, Math.floor(Number(rawGame.activeBlueprintSlot) || 0)),
    unlockedBlueprintSlotCount - 1,
  )
  const activeBlueprint = blueprintSlots[activeBlueprintSlot]
  const hasReachedLimit = hasReachedMonocropLimit(
    activeBlueprint,
    completedCropPerfections,
  )
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
      const completedExpansionCount = Math.max(
        0,
        (track.id === 'row' ? blueprint.rows : blueprint.columns) -
          1 -
          rabbitBlueprintExpansions[track.id],
      )

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
    crops: currentCrops,
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
    hasUnlockedWheat:
      rawGame.hasUnlockedWheat === true ||
      (rawGame.hasUnlockedRowDuplicators === true &&
        toNonNegativeNumber(rawGame.crops, 0) >= WHEAT_UNLOCK_CROP_COUNT),
    hasUnlockedRootTunnel:
      hasUnlockedRootTunnel,
    hasUnlockedSunflower,
    hasUnlockedCropPerfection:
      rawGame.hasUnlockedCropPerfection === true ||
      toNonNegativeNumber(rawGame.crops, 0) >= CROP_PERFECTION_UNLOCK_CROP_COUNT,
    hasUnlockedRowDuplicators: rawGame.hasUnlockedRowDuplicators === true,
    rowDuplicators: toNonNegativeInteger(rawGame.rowDuplicators, 0),
    fortune: normalizeFortuneState(rawGame.fortune),
    capybara: normalizeCapybaraState(rawGame.capybara),
    seedAugmentations: normalizeSeedAugmentationState(
      rawGame.seedAugmentations,
    ),
    trade,
    numberNotation:
      rawGame.numberNotation === 'scientific' ? 'scientific' : 'suffix',
    testingPanelUnlocked: rawGame.testingPanelUnlocked === true,
    testingPanelVisible:
      rawGame.testingPanelUnlocked === true &&
      rawGame.testingPanelVisible !== false,
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
    rabbitBlueprintExpansions,
    blueprint: activeBlueprint,
    blueprintSlots,
    activeBlueprintSlot,
    farmland,
  }
}

function parseSavePayload(saveCode) {
  let payload

  try {
    payload = JSON.parse(decodeBase64(saveCode))
  } catch (error) {
    throw new Error(
      error instanceof Error &&
        error.message === 'The save code is not valid Base64.'
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

  return payload
}

export function exportGame(game, savedAt = Date.now()) {
  return encodeBase64(
    JSON.stringify({
      version: SAVE_FORMAT_VERSION,
      savedAt: toNonNegativeNumber(savedAt, Date.now()),
      game,
    }),
  )
}

export function importGameSnapshot(saveCode, currentTime = Date.now()) {
  const payload = parseSavePayload(saveCode)
  const now = toNonNegativeNumber(currentTime, Date.now())

  return {
    game: normalizeGame(payload.game),
    savedAt: Math.min(
      toNonNegativeNumber(payload.savedAt, now),
      now,
    ),
  }
}

export function importGame(saveCode) {
  return importGameSnapshot(saveCode).game
}

export function loadGameSnapshot() {
  const now = Date.now()

  try {
    const rawSave =
      window.localStorage.getItem(SAVE_KEY) ??
      (SAVE_KEY === DEFAULT_SAVE_KEY
        ? window.localStorage.getItem(LEGACY_SAVE_KEY)
        : null)

    if (!rawSave) {
      return { game: createInitialGame(), savedAt: now }
    }

    try {
      return importGameSnapshot(rawSave, now)
    } catch {
      // Migrate pre-save-code JSON saves without taking away existing progress.
      const migratedGame = normalizeGame(JSON.parse(rawSave))
      saveGame(migratedGame, now)
      return { game: migratedGame, savedAt: now }
    }
  } catch {
    return { game: createInitialGame(), savedAt: now }
  }
}

export function loadGame() {
  return loadGameSnapshot().game
}

export function saveGame(game, savedAt = Date.now()) {
  try {
    window.localStorage.setItem(SAVE_KEY, exportGame(game, savedAt))
  } catch {
    // The game remains playable if storage is unavailable or full.
  }
}
