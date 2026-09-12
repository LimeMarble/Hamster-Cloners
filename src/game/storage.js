import { normalizeTradeState, RABBIT_UNLOCK_IDS } from './tradeLogic.js'
import { normalizeFortuneState } from './fortuneLogic.js'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  normalizeCapybaraState,
} from './capybaraLogic.js'
import {
  createInitialMisfortuneAreaState,
  normalizeStoredAreaState,
  removeLockedAreaCrops,
} from './areaLogic.js'
import { normalizeSeedAugmentationState } from './augmentationLogic.js'
import { normalizeManateeState } from './manateeLogic.js'
import { normalizeMangroveSaplingCells } from './mangroveSaplingLogic.js'
import { normalizeBlueprintBlocks } from './blueprintBlockLogic.js'
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
import {
  GAME_AREA_IDS,
  MISFORTUNE_AREA_STATE_VERSION,
} from './gameConfig.js'
import {
  FLOOR_REPLICATOR_MODES,
  MISFORTUNE_UPGRADE_IDS,
  normalizeMisfortuneUpgrades,
  RUSHED_START_TOTAL_DURATION_SECONDS,
} from './misfortuneUpgrades.js'

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

function getAreaCropUnlocks(rawState, includeStoredUnlocks = true) {
  const crops = toNonNegativeNumber(rawState?.crops, 0)
  const hasStoredUnlock = (field) =>
    includeStoredUnlocks && rawState?.[field] === true
  const hasLegacyAppleTreeUnlock =
    includeStoredUnlocks &&
    Array.isArray(rawState?.completedCropUnlocks) &&
    rawState.completedCropUnlocks.includes('appleTree')

  return {
    hasUnlockedTurnip:
      hasStoredUnlock('hasUnlockedTurnip') ||
      (includeStoredUnlocks && rawState?.hasUnlockedPumpkin === true) ||
      crops >= TURNIP_UNLOCK_CROP_COUNT,
    hasUnlockedAppleTree:
      hasStoredUnlock('hasUnlockedAppleTree') ||
      hasLegacyAppleTreeUnlock ||
      crops >= APPLE_TREE_UNLOCK_CROP_COUNT,
    hasUnlockedLentil:
      hasStoredUnlock('hasUnlockedLentil') ||
      crops >= LENTIL_UNLOCK_CROP_COUNT,
    hasUnlockedKnotweed:
      hasStoredUnlock('hasUnlockedKnotweed') ||
      crops >= KNOTWEED_UNLOCK_CROP_COUNT,
    hasUnlockedWheat:
      hasStoredUnlock('hasUnlockedWheat') ||
      (rawState?.hasUnlockedRowDuplicators === true &&
        crops >= WHEAT_UNLOCK_CROP_COUNT),
    hasUnlockedSunflower:
      hasStoredUnlock('hasUnlockedSunflower') ||
      crops >= SUNFLOWER_UNLOCK_CROP_COUNT,
  }
}

function removeUnavailableCrops(blueprint, cropUnlocks) {
  const areaAvailableBlueprint = removeLockedAreaCrops(
    blueprint,
    cropUnlocks,
  )

  return createBlueprint({
    ...areaAvailableBlueprint,
    cells: normalizeMangroveSaplingCells(
      areaAvailableBlueprint.cells.map((cropId) =>
        isCropTemporarilyUnavailable(cropId) ? null : cropId,
      ),
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
  const activeArea = rawGame.activeArea === GAME_AREA_IDS.MISFORTUNE
    ? GAME_AREA_IDS.MISFORTUNE
    : GAME_AREA_IDS.MAIN
  const completedMisfortuneUpgrades = normalizeMisfortuneUpgrades(
    rawGame.completedMisfortuneUpgrades,
  )
  const shouldResetMisfortuneProgress =
    rawGame.misfortuneAreaStateVersion !== MISFORTUNE_AREA_STATE_VERSION
  const hasSeparatedAreaCropUnlocks =
    rawGame.areaCropUnlocksSeparated === true
  const legacySharedAreaCropUnlocks = getAreaCropUnlocks(rawGame)
  const activeAreaCropUnlocks = getAreaCropUnlocks(
    rawGame,
    hasSeparatedAreaCropUnlocks || activeArea === GAME_AREA_IDS.MAIN,
  )
  const hasUnlockedSunflower =
    activeAreaCropUnlocks.hasUnlockedSunflower
  let blueprint = hasCurrentBlueprintAxes
    ? removeUnavailableCrops(
        createBlueprint(rawGame.blueprint),
        activeAreaCropUnlocks,
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
  const seedAugmentations = normalizeSeedAugmentationState(
    rawGame.seedAugmentations,
  )
  const manatees = normalizeManateeState(rawGame.manatees)
  const capybara = normalizeCapybaraState(rawGame.capybara)
  const normalizeOptionalArea = (rawArea, areaId) => {
    if (!rawArea || typeof rawArea !== 'object') return null

    const areaSource =
      !hasSeparatedAreaCropUnlocks &&
      activeArea === GAME_AREA_IDS.MISFORTUNE &&
      areaId === GAME_AREA_IDS.MAIN
        ? { ...rawArea, ...legacySharedAreaCropUnlocks }
        : rawArea

    return normalizeStoredAreaState(areaSource)
  }
  const areaProgress = {
    main: normalizeOptionalArea(
      rawGame.areaProgress?.main,
      GAME_AREA_IDS.MAIN,
    ),
    misfortune: shouldResetMisfortuneProgress
      ? null
      : normalizeOptionalArea(
          rawGame.areaProgress?.misfortune,
          GAME_AREA_IDS.MISFORTUNE,
        ),
  }

  if (completedCropPerfections.includes('splitweed')) {
    blueprint = removeUnavailableCrops(
      createBlueprint({
        ...blueprint,
        requireSplitweedFootprints: true,
      }),
      activeAreaCropUnlocks,
    )
  }

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
    manatees,
  })
  const blueprintSlotCount = Math.max(
    unlockedBlueprintSlotCount,
    Math.min(4, rawBlueprintSlots.length),
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
              rootTunnelConnections: rawSlot.rootTunnelConnections,
              leechingVines: rawSlot.leechingVines,
              requireSplitweedFootprints:
                completedCropPerfections.includes('splitweed'),
            }),
            activeAreaCropUnlocks,
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
    seedAugmentations,
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
          rabbitBlueprintExpansions[track.id] -
          (track.id === 'row' &&
          completedMisfortuneUpgrades.includes(
            MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
          )
            ? 1
            : 0),
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

  const normalizedGame = {
    crops: currentCrops,
    totalCropsMade: toNonNegativeNumber(
      rawGame.totalCropsMade,
      toNonNegativeNumber(rawGame.crops, 0),
    ),
    playtimeSeconds: toNonNegativeNumber(rawGame.playtimeSeconds, 0),
    secondsSinceAreaReset: Math.min(
      RUSHED_START_TOTAL_DURATION_SECONDS,
      toNonNegativeNumber(
        rawGame.secondsSinceAreaReset,
        RUSHED_START_TOTAL_DURATION_SECONDS,
      ),
    ),
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
    ...activeAreaCropUnlocks,
    hasUnlockedRootTunnel:
      hasUnlockedRootTunnel,
    hasUnlockedCropPerfection:
      rawGame.hasUnlockedCropPerfection === true ||
      toNonNegativeNumber(rawGame.crops, 0) >= CROP_PERFECTION_UNLOCK_CROP_COUNT,
    hasUnlockedRowDuplicators: rawGame.hasUnlockedRowDuplicators === true,
    rowDuplicators: toNonNegativeInteger(rawGame.rowDuplicators, 0),
    hasUnlockedFloorReplicators:
      rawGame.hasUnlockedFloorReplicators === true ||
      capybara.completedDemonstrations.includes(
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
      ),
    floorReplicators: toNonNegativeInteger(rawGame.floorReplicators, 0),
    floorReplicatorMode:
      rawGame.floorReplicatorMode === FLOOR_REPLICATOR_MODES.SUPPORT
        ? FLOOR_REPLICATOR_MODES.SUPPORT
        : FLOOR_REPLICATOR_MODES.CONSTRUCTION,
    fortune: normalizeFortuneState(rawGame.fortune),
    capybara,
    seedAugmentations,
    manatees,
    trade,
    numberNotation:
      rawGame.numberNotation === 'scientific' ? 'scientific' : 'suffix',
    suffixScientificExponent: [33, 303, 3003].includes(
      Number(rawGame.suffixScientificExponent),
    )
      ? Number(rawGame.suffixScientificExponent)
      : 303,
    testingPanelUnlocked: rawGame.testingPanelUnlocked === true,
    testingPanelVisible:
      rawGame.testingPanelUnlocked === true &&
      rawGame.testingPanelVisible !== false,
    testingCheats: {
      cropMultiplierEnabled:
        rawGame.testingCheats?.cropMultiplierEnabled === true,
      hamsterEfficiencyEnabled:
        rawGame.testingCheats?.hamsterEfficiencyEnabled === true,
      oneSecondManateeSurveysEnabled:
        rawGame.testingCheats?.oneSecondManateeSurveysEnabled === true,
    },
    completedCropPerfections,
    hamstersBuildColumns: true,
    areaCropUnlocksSeparated: true,
    misfortuneAreaStateVersion: MISFORTUNE_AREA_STATE_VERSION,
    activeArea,
    areaProgress,
    completedMisfortuneUpgrades,
    blueprintExpansionAxesSwapped: true,
    completedBlueprintExpansions: BLUEPRINT_EXPANSIONS.map(
      (expansion) => expansion.id,
    ).filter((expansionId) => completedExpansionIds.has(expansionId)),
    rabbitBlueprintExpansions,
    blueprint: activeBlueprint,
    blueprintSlots,
    blueprintBlocks: normalizeBlueprintBlocks(rawGame.blueprintBlocks),
    activeBlueprintSlot,
    farmland,
  }

  if (
    !shouldResetMisfortuneProgress ||
    activeArea !== GAME_AREA_IDS.MISFORTUNE
  ) {
    return normalizedGame
  }

  return {
    ...normalizedGame,
    ...createInitialMisfortuneAreaState(rabbitBlueprintExpansions),
    areaProgress: {
      ...normalizedGame.areaProgress,
      misfortune: null,
    },
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
  const savedAt = Math.min(
    toNonNegativeNumber(payload.savedAt, now),
    now,
  )

  return {
    game: normalizeGame(payload.game),
    savedAt,
    lastSavedAt: savedAt,
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
      return {
        game: createInitialGame(),
        savedAt: now,
        lastSavedAt: null,
      }
    }

    try {
      return importGameSnapshot(rawSave, now)
    } catch {
      // Migrate pre-save-code JSON saves without taking away existing progress.
      const migratedGame = normalizeGame(JSON.parse(rawSave))
      const didSave = saveGame(migratedGame, now)
      return {
        game: migratedGame,
        savedAt: now,
        lastSavedAt: didSave ? now : null,
      }
    }
  } catch {
    return {
      game: createInitialGame(),
      savedAt: now,
      lastSavedAt: null,
    }
  }
}

export function loadGame() {
  return loadGameSnapshot().game
}

export function saveGame(game, savedAt = Date.now()) {
  try {
    window.localStorage.setItem(SAVE_KEY, exportGame(game, savedAt))
    return true
  } catch {
    // The game remains playable if storage is unavailable or full.
    return false
  }
}
