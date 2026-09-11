import {
  createBlueprint,
  createFarmlandMultipliers,
} from './blueprintLogic.js'
import {
  BLUEPRINT_EXPANSIONS,
  canPurchaseFloorReplicatorsInArea,
  FIELD_RESET_STARTING_COLUMNS,
  GAME_AREA_IDS,
  MISFORTUNE_BLUEPRINT_EXPANSION_MODIFIER,
} from './gameConfig.js'

const VALID_EXPANSION_IDS = new Set(
  BLUEPRINT_EXPANSIONS.map(({ id }) => id),
)

export const AREA_CROP_UNLOCK_FIELDS = Object.freeze([
  'hasUnlockedTurnip',
  'hasUnlockedAppleTree',
  'hasUnlockedLentil',
  'hasUnlockedKnotweed',
  'hasUnlockedWheat',
  'hasUnlockedSunflower',
])

const AREA_CROP_UNLOCK_FIELD_BY_CROP_ID = Object.freeze({
  turnip: 'hasUnlockedTurnip',
  appleTree: 'hasUnlockedAppleTree',
  lentil: 'hasUnlockedLentil',
  knotweed: 'hasUnlockedKnotweed',
  splitweedPart: 'hasUnlockedKnotweed',
  wheat: 'hasUnlockedWheat',
  sunflower: 'hasUnlockedSunflower',
})

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function toNonNegativeInteger(value, fallback = 0) {
  return Math.floor(toNonNegativeNumber(value, fallback))
}

function getAreaCropUnlockState(source = {}, fallback = {}) {
  return Object.fromEntries(
    AREA_CROP_UNLOCK_FIELDS.map((field) => [
      field,
      source[field] === undefined
        ? fallback[field] === true
        : source[field] === true,
    ]),
  )
}

export function removeLockedAreaCrops(blueprint, cropUnlocks = {}) {
  const normalizedBlueprint = createBlueprint(blueprint)

  return createBlueprint({
    ...normalizedBlueprint,
    cells: normalizedBlueprint.cells.map((cropId) => {
      const unlockField = AREA_CROP_UNLOCK_FIELD_BY_CROP_ID[cropId]
      return unlockField && cropUnlocks[unlockField] !== true ? null : cropId
    }),
  })
}

export function createInitialMisfortuneAreaState(
  rabbitBlueprintExpansions = {},
) {
  const getStartingSize = (direction) =>
    Math.max(
      1,
      1 +
        toNonNegativeInteger(rabbitBlueprintExpansions[direction]) +
        MISFORTUNE_BLUEPRINT_EXPANSION_MODIFIER[direction],
    )
  const blueprint = createBlueprint({
    rows: getStartingSize('row'),
    columns: getStartingSize('column'),
    cells: ['leek'],
  })

  return {
    crops: 0,
    hamsters: 1,
    rowDuplicators: 0,
    ...getAreaCropUnlockState(),
    farmland: createFarmlandMultipliers({
      columns: FIELD_RESET_STARTING_COLUMNS,
    }),
    completedBlueprintExpansions: [],
    blueprint,
    blueprintSlots: [blueprint],
    activeBlueprintSlot: 0,
  }
}

export function captureCurrentAreaState(game) {
  return {
    crops: toNonNegativeNumber(game.crops),
    hamsters: toNonNegativeInteger(game.hamsters),
    rowDuplicators: toNonNegativeInteger(game.rowDuplicators),
    ...getAreaCropUnlockState(game),
    farmland: createFarmlandMultipliers(game.farmland),
    completedBlueprintExpansions: Array.isArray(
      game.completedBlueprintExpansions,
    )
      ? game.completedBlueprintExpansions.filter((id) =>
          VALID_EXPANSION_IDS.has(id),
        )
      : [],
    blueprint: createBlueprint(game.blueprint),
    blueprintSlots: Array.isArray(game.blueprintSlots)
      ? game.blueprintSlots.map((blueprint) => createBlueprint(blueprint))
      : [createBlueprint(game.blueprint)],
    activeBlueprintSlot: toNonNegativeInteger(game.activeBlueprintSlot),
  }
}

export function normalizeStoredAreaState(rawArea, fallbackArea) {
  const fallback = fallbackArea ?? createInitialMisfortuneAreaState()
  const source = rawArea && typeof rawArea === 'object' ? rawArea : fallback
  const cropUnlocks = getAreaCropUnlockState(source, fallback)
  const blueprint = removeLockedAreaCrops(
    source.blueprint ?? fallback.blueprint,
    cropUnlocks,
  )
  const rawSlots = Array.isArray(source.blueprintSlots)
    ? source.blueprintSlots
    : []
  const blueprintSlots = rawSlots.length > 0
    ? rawSlots.map((slot) =>
        removeLockedAreaCrops({
          rows: blueprint.rows,
          columns: blueprint.columns,
          cells: slot?.cells,
          mirrorCornTargets: slot?.mirrorCornTargets,
          rootTunnelConnections: slot?.rootTunnelConnections,
        }, cropUnlocks),
      )
    : [blueprint]
  const activeBlueprintSlot = Math.min(
    toNonNegativeInteger(source.activeBlueprintSlot),
    blueprintSlots.length - 1,
  )

  return {
    crops: toNonNegativeNumber(source.crops, fallback.crops),
    hamsters: toNonNegativeInteger(source.hamsters, fallback.hamsters),
    rowDuplicators: toNonNegativeInteger(
      source.rowDuplicators,
      fallback.rowDuplicators,
    ),
    ...cropUnlocks,
    farmland: createFarmlandMultipliers(
      source.farmland ?? fallback.farmland,
    ),
    completedBlueprintExpansions: Array.isArray(
      source.completedBlueprintExpansions,
    )
      ? source.completedBlueprintExpansions.filter((id) =>
          VALID_EXPANSION_IDS.has(id),
        )
      : [],
    blueprint: blueprintSlots[activeBlueprintSlot],
    blueprintSlots,
    activeBlueprintSlot,
  }
}

export function isMisfortuneAreaActive(game) {
  return game?.activeArea === GAME_AREA_IDS.MISFORTUNE
}

export function getMisfortuneAreaCrops(game) {
  if (isMisfortuneAreaActive(game)) {
    return toNonNegativeNumber(game.crops)
  }

  return toNonNegativeNumber(game.areaProgress?.misfortune?.crops)
}

export function wipeMisfortuneAreaProgress(game) {
  const clearedAreaProgress = {
    main: game.areaProgress?.main ?? null,
    misfortune: null,
  }

  if (!isMisfortuneAreaActive(game)) {
    return {
      ...game,
      floorReplicators: canPurchaseFloorReplicatorsInArea(
        GAME_AREA_IDS.MAIN,
      )
        ? game.floorReplicators
        : 0,
      areaProgress: clearedAreaProgress,
    }
  }

  return {
    ...game,
    ...createInitialMisfortuneAreaState(game.rabbitBlueprintExpansions),
    floorReplicators: canPurchaseFloorReplicatorsInArea(
      GAME_AREA_IDS.MAIN,
    )
      ? game.floorReplicators
      : 0,
    areaProgress: clearedAreaProgress,
  }
}

export function switchGameArea(game, targetAreaId) {
  const currentAreaId = isMisfortuneAreaActive(game)
    ? GAME_AREA_IDS.MISFORTUNE
    : GAME_AREA_IDS.MAIN
  const targetArea = targetAreaId === GAME_AREA_IDS.MISFORTUNE
    ? GAME_AREA_IDS.MISFORTUNE
    : GAME_AREA_IDS.MAIN

  if (targetArea === currentAreaId) return game

  const currentAreaState = captureCurrentAreaState(game)
  const storedTarget = game.areaProgress?.[targetArea]
  const targetFallback = targetArea === GAME_AREA_IDS.MISFORTUNE
    ? createInitialMisfortuneAreaState(game.rabbitBlueprintExpansions)
    : currentAreaState
  const targetState = normalizeStoredAreaState(storedTarget, targetFallback)

  return {
    ...game,
    ...targetState,
    activeArea: targetArea,
    areaProgress: {
      main: game.areaProgress?.main ?? null,
      misfortune: game.areaProgress?.misfortune ?? null,
      [currentAreaId]: currentAreaState,
    },
  }
}
