import {
  createBlueprint,
  createFarmlandMultipliers,
} from './blueprintLogic.js'
import {
  BLUEPRINT_EXPANSIONS,
  FIELD_RESET_STARTING_COLUMNS,
  GAME_AREA_IDS,
  MISFORTUNE_BLUEPRINT_EXPANSION_MODIFIER,
  STARTING_CROPS,
} from './gameConfig.js'

const VALID_EXPANSION_IDS = new Set(
  BLUEPRINT_EXPANSIONS.map(({ id }) => id),
)

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function toNonNegativeInteger(value, fallback = 0) {
  return Math.floor(toNonNegativeNumber(value, fallback))
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
    crops: STARTING_CROPS,
    hamsters: 0,
    rowDuplicators: 0,
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
  const blueprint = createBlueprint(source.blueprint ?? fallback.blueprint)
  const rawSlots = Array.isArray(source.blueprintSlots)
    ? source.blueprintSlots
    : []
  const blueprintSlots = rawSlots.length > 0
    ? rawSlots.map((slot) =>
        createBlueprint({
          rows: blueprint.rows,
          columns: blueprint.columns,
          cells: slot?.cells,
          mirrorCornTargets: slot?.mirrorCornTargets,
          rootTunnelConnections: slot?.rootTunnelConnections,
        }),
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
