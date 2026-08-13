import {
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  CROP_PERFECTION_IDS,
  SWEET_POTATO_UNLOCK_HAMSTER_COUNT,
  hasCropPerfection,
  isKnownCrop,
} from './crops.js'
import {
  BLUEPRINT_EXPANSIONS,
  BLUEPRINT_EXPANSION_TRACKS,
  INITIAL_BLUEPRINT_SIZE,
  ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  STARTING_CROPS,
} from './gameConfig.js'

export function isLeechingGourdAnchor(crop) {
  return CROP_DEFINITIONS[crop]?.isLeechingGourdAnchor === true
}

function isLeechingGourdPart(crop) {
  return CROP_DEFINITIONS[crop]?.isLeechingGourdPart === true
}

export function isLeechingGourdCell(crop) {
  return isLeechingGourdAnchor(crop) || isLeechingGourdPart(crop)
}

function normalizeLeechingGourdCells(cells, rows, columns) {
  const anchorIndexes = cells.flatMap((crop, index) =>
    isLeechingGourdAnchor(crop) ? [index] : [],
  )
  const clearGourdCells = () =>
    cells.map((crop) => (isLeechingGourdCell(crop) ? null : crop))

  if (anchorIndexes.length === 0) {
    return cells.some(isLeechingGourdPart) ? clearGourdCells() : cells
  }

  if (anchorIndexes.length !== 1) {
    return clearGourdCells()
  }

  const anchorIndex = anchorIndexes[0]
  const row = Math.floor(anchorIndex / columns)
  const column = anchorIndex % columns

  if (row >= rows - 1 || column >= columns - 1) {
    return clearGourdCells()
  }

  const footprint = [
    anchorIndex,
    anchorIndex + 1,
    anchorIndex + columns,
    anchorIndex + columns + 1,
  ]
  const hasValidFootprint = footprint.every((index, footprintIndex) =>
    cells[index] ===
    (footprintIndex === 0 ? 'leechingGourd' : 'leechingGourdPart'),
  )

  return hasValidFootprint ? cells : clearGourdCells()
}

export function createBlueprint({
  rows = INITIAL_BLUEPRINT_SIZE.rows,
  columns = INITIAL_BLUEPRINT_SIZE.columns,
  cells,
  mirrorCornTargets,
} = {}) {
  const safeRows = Math.max(1, Math.floor(Number(rows) || 1))
  const safeColumns = Math.max(1, Math.floor(Number(columns) || 1))
  const totalCells = safeRows * safeColumns
  const sourceCells = Array.isArray(cells) ? cells : []
  const normalizedCells = normalizeLeechingGourdCells(Array.from(
    { length: totalCells },
    (_, index) => (isKnownCrop(sourceCells[index]) ? sourceCells[index] : null),
  ), safeRows, safeColumns)
  const sourceMirrorCornTargets = Array.isArray(mirrorCornTargets)
    ? mirrorCornTargets
    : []
  const mirrorCornTargetCounts = new Map()
  const maximumReflectionsPerTile =
    CROP_PERFECTIONS.mirrorCorn.maximumReflectionsPerTile
  const normalizedMirrorCornTargets = normalizedCells.map((crop, sourceIndex) => {
    const targetIndex = sourceMirrorCornTargets[sourceIndex]
    const sourceRow = Math.floor(sourceIndex / safeColumns)
    const sourceColumn = sourceIndex % safeColumns
    const targetRow = Math.floor(targetIndex / safeColumns)
    const targetColumn = targetIndex % safeColumns
    const hasValidTarget =
      crop === 'corn' &&
      Number.isInteger(targetIndex) &&
      targetIndex >= 0 &&
      targetIndex < totalCells &&
      Math.abs(sourceRow - targetRow) === 1 &&
      Math.abs(sourceColumn - targetColumn) === 1

    if (!hasValidTarget) return null

    const currentTargetCount = mirrorCornTargetCounts.get(targetIndex) ?? 0
    if (currentTargetCount >= maximumReflectionsPerTile) return null

    mirrorCornTargetCounts.set(targetIndex, currentTargetCount + 1)
    return targetIndex
  })

  return {
    rows: safeRows,
    columns: safeColumns,
    cells: normalizedCells,
    mirrorCornTargets: normalizedMirrorCornTargets,
  }
}

export function getLeechingGourdFootprint(blueprint, anchorIndex) {
  const { rows, columns } = blueprint
  const safeAnchorIndex = Number(anchorIndex)

  if (
    !Number.isInteger(safeAnchorIndex) ||
    safeAnchorIndex < 0 ||
    safeAnchorIndex >= rows * columns
  ) {
    return []
  }

  const row = Math.floor(safeAnchorIndex / columns)
  const column = safeAnchorIndex % columns

  if (row >= rows - 1 || column >= columns - 1) {
    return []
  }

  return [
    safeAnchorIndex,
    safeAnchorIndex + 1,
    safeAnchorIndex + columns,
    safeAnchorIndex + columns + 1,
  ]
}

export function createInitialGame() {
  const blueprint = createBlueprint({ cells: ['leek'] })

  return {
    crops: STARTING_CROPS,
    totalCropsMade: 0,
    playtimeSeconds: 0,
    hamsters: 0,
    totalHamstersHired: 0,
    unionized: false,
    postUnionHamstersHired: 0,
    hasSeenMonocropLimit: false,
    hasSeenBlueprintMastery: false,
    hasVisitedInventions: false,
    hasUnlockedTurnip: false,
    hasUnlockedAppleTree: false,
    hasUnlockedLentil: false,
    hasUnlockedKnotweed: false,
    hasUnlockedRootTunnel: false,
    hasUnlockedSunflower: false,
    hasUnlockedCropPerfection: false,
    hasUnlockedRowDuplicators: false,
    rowDuplicators: 0,
    numberNotation: 'suffix',
    testingPanelUnlocked: false,
    testingCheats: {
      cropMultiplierEnabled: false,
      hamsterEfficiencyEnabled: false,
    },
    completedCropPerfections: [],
    blueprintExpansionAxesSwapped: true,
    completedBlueprintExpansions: [],
    blueprint,
    blueprintSlots: [blueprint],
    activeBlueprintSlot: 0,
    hamstersBuildColumns: true,
    farmland: createFarmlandMultipliers({ columns: 0 }),
  }
}

export function getUnlockedBlueprintSlotCount(game) {
  if (game.hasUnlockedSunflower === true) {
    return 3
  }

  return game.unionized === true &&
    Math.max(0, Math.floor(Number(game.hamsters) || 0)) >=
      SWEET_POTATO_UNLOCK_HAMSTER_COUNT
    ? 2
    : 1
}

export function getBlueprintSlots(game) {
  const fallbackBlueprint = createBlueprint(game.blueprint)
  const storedSlots = Array.isArray(game.blueprintSlots)
    ? game.blueprintSlots
    : []
  const slots = storedSlots
    .slice(0, 3)
    .filter((slot) => slot && typeof slot === 'object')
    .map((slot) => createBlueprint(slot))

  return slots.length > 0 ? slots : [fallbackBlueprint]
}

export function createFarmlandMultipliers({
  rows = 1,
  columns = 1,
  floors = 1,
  farms = 1,
  otherMultiplier = 1,
} = {}) {
  const toNonNegativeValue = (value, fallback) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
  }

  return {
    rows: toNonNegativeValue(rows, 0),
    columns: toNonNegativeValue(columns, 1),
    floors: toNonNegativeValue(floors, 1),
    farms: toNonNegativeValue(farms, 1),
    otherMultiplier: toNonNegativeValue(otherMultiplier, 1),
  }
}


export function getBlueprintExpansion(expansionId) {
  return BLUEPRINT_EXPANSIONS.find(
    (expansion) => expansion.id === expansionId,
  )
}

function getCompletedBlueprintExpansions(game) {
  return Array.isArray(game.completedBlueprintExpansions)
    ? game.completedBlueprintExpansions
    : []
}

export function hasCompletedBlueprintExpansion(game, expansionId) {
  return getCompletedBlueprintExpansions(game).includes(expansionId)
}

function getCompletedCropPerfections(game) {
  return Array.isArray(game.completedCropPerfections)
    ? game.completedCropPerfections.filter((perfectionId) =>
        CROP_PERFECTION_IDS.includes(perfectionId),
      )
    : []
}

export function getCropPerfectionCost(perfectionId) {
  return CROP_PERFECTIONS[perfectionId]?.cost ?? null
}

export function canUnlockCropPerfection(game, perfectionId) {
  const cost = getCropPerfectionCost(perfectionId)

  return (
    game.hasUnlockedCropPerfection === true &&
    cost !== null &&
    (CROP_PERFECTIONS[perfectionId]?.requiresRowDuplicators !== true ||
      game.hasUnlockedRowDuplicators === true) &&
    !hasCropPerfection(getCompletedCropPerfections(game), perfectionId) &&
    Math.max(0, Number(game.crops) || 0) >= cost
  )
}

export function unlockCropPerfection(game, perfectionId) {
  const cost = getCropPerfectionCost(perfectionId)

  if (!canUnlockCropPerfection(game, perfectionId) || cost === null) {
    return null
  }

  return {
    ...game,
    crops: game.crops - cost,
    completedCropPerfections: [
      ...getCompletedCropPerfections(game),
      perfectionId,
    ],
  }
}

export function canUnlockRowDuplicators(game) {
  return (
    game.hasUnlockedRowDuplicators !== true &&
    Math.max(0, Number(game.crops) || 0) >= ROW_DUPLICATORS_UNLOCK_CROP_COUNT
  )
}

export function resetForRowDuplicators(game) {
  if (!canUnlockRowDuplicators(game)) {
    return null
  }

  return {
    ...game,
    crops: 0,
    hasUnlockedRowDuplicators: true,
    farmland: {
      ...createFarmlandMultipliers(game.farmland),
      rows: 1,
      columns: 0,
    },
  }
}

export function getBlueprintExpansionCost(game, expansionId) {
  const expansion = getBlueprintExpansion(expansionId)

  if (
    !expansion ||
    hasCompletedBlueprintExpansion(game, expansionId) ||
    !expansion.prerequisiteIds.every((prerequisiteId) =>
      hasCompletedBlueprintExpansion(game, prerequisiteId),
    )
  ) {
    return null
  }

  return expansion.cost
}

export function getBlueprintExpansionTrackProgress(game) {
  return BLUEPRINT_EXPANSION_TRACKS.map((track) => {
    const stages = track.stages.map((stage) => getBlueprintExpansion(stage.id))
    const completedStageCount = stages.filter((stage) =>
      hasCompletedBlueprintExpansion(game, stage.id),
    ).length
    const nextExpansion = stages.find(
      (stage) => !hasCompletedBlueprintExpansion(game, stage.id),
    )

    return {
      ...track,
      stages,
      completedStageCount,
      nextExpansion,
      nextCost: nextExpansion
        ? getBlueprintExpansionCost(game, nextExpansion.id)
        : null,
    }
  })
}

function addBlueprintRow(blueprint) {
  return {
    ...blueprint,
    rows: blueprint.rows + 1,
    cells: [...blueprint.cells, ...Array(blueprint.columns).fill(null)],
    mirrorCornTargets: [
      ...blueprint.mirrorCornTargets,
      ...Array(blueprint.columns).fill(null),
    ],
  }
}

function addBlueprintColumn(blueprint) {
  const expandedCells = Array.from({ length: blueprint.rows }, (_, rowIndex) => {
    const rowStart = rowIndex * blueprint.columns
    const rowEnd = rowStart + blueprint.columns

    return [...blueprint.cells.slice(rowStart, rowEnd), null]
  }).flat()

  const remapIndex = (index) =>
    Math.floor(index / blueprint.columns) * (blueprint.columns + 1) +
    (index % blueprint.columns)
  const remappedMirrorCornTargets = Array(
    blueprint.rows * (blueprint.columns + 1),
  ).fill(null)

  blueprint.mirrorCornTargets.forEach((targetIndex, sourceIndex) => {
    if (targetIndex !== null) {
      remappedMirrorCornTargets[remapIndex(sourceIndex)] = remapIndex(targetIndex)
    }
  })

  return {
    ...blueprint,
    columns: blueprint.columns + 1,
    cells: expandedCells,
    mirrorCornTargets: remappedMirrorCornTargets,
  }
}

function removeBlueprintRow(blueprint) {
  if (blueprint.rows <= 1) {
    return blueprint
  }

  const totalCells = (blueprint.rows - 1) * blueprint.columns

  return createBlueprint({
    rows: blueprint.rows - 1,
    columns: blueprint.columns,
    cells: blueprint.cells.slice(0, totalCells),
    mirrorCornTargets: blueprint.mirrorCornTargets.slice(0, totalCells),
  })
}

function removeBlueprintColumn(blueprint) {
  if (blueprint.columns <= 1) {
    return blueprint
  }

  const nextColumnCount = blueprint.columns - 1
  const cells = []
  const mirrorCornTargets = []

  blueprint.cells.forEach((crop, sourceIndex) => {
    const sourceColumn = sourceIndex % blueprint.columns

    if (sourceColumn >= nextColumnCount) {
      return
    }

    const targetIndex = blueprint.mirrorCornTargets[sourceIndex]
    const targetRow = Math.floor(targetIndex / blueprint.columns)
    const targetColumn = targetIndex % blueprint.columns

    cells.push(crop)
    mirrorCornTargets.push(
      Number.isInteger(targetIndex) && targetColumn < nextColumnCount
        ? targetRow * nextColumnCount + targetColumn
        : null,
    )
  })

  return createBlueprint({
    rows: blueprint.rows,
    columns: nextColumnCount,
    cells,
    mirrorCornTargets,
  })
}

function applyBlueprintExpansion(game, expansion) {
  const currentBlueprint = createBlueprint(game.blueprint)
  const storedBlueprintSlots = getBlueprintSlots(game)
  const activeBlueprintSlot = Math.min(
    Math.max(0, Math.floor(Number(game.activeBlueprintSlot) || 0)),
    storedBlueprintSlots.length - 1,
  )
  const currentBlueprintSlots = storedBlueprintSlots.map((blueprint, slotIndex) =>
    slotIndex === activeBlueprintSlot ? currentBlueprint : blueprint,
  )
  const expandBlueprint =
    expansion.direction === 'row' ? addBlueprintRow : addBlueprintColumn
  const expandedBlueprintSlots = currentBlueprintSlots.map(expandBlueprint)
  const nextBlueprint = expandedBlueprintSlots[activeBlueprintSlot] ??
    expandBlueprint(currentBlueprint)
  const nextBlueprintSlotCount = getUnlockedBlueprintSlotCount({
    ...game,
    blueprint: nextBlueprint,
  })

  while (expandedBlueprintSlots.length < nextBlueprintSlotCount) {
    expandedBlueprintSlots.push(createBlueprint(nextBlueprint))
  }

  return {
    blueprint: nextBlueprint,
    blueprintSlots: expandedBlueprintSlots,
    activeBlueprintSlot,
    completedBlueprintExpansions: [
      ...getCompletedBlueprintExpansions(game),
      expansion.id,
    ],
  }
}

export function grantNextBlueprintExpansion(game, trackId) {
  const track = BLUEPRINT_EXPANSION_TRACKS.find(
    (candidateTrack) => candidateTrack.id === trackId,
  )
  const nextExpansionStage = track?.stages.find(
    (stage) => !hasCompletedBlueprintExpansion(game, stage.id),
  )
  const nextExpansion = nextExpansionStage
    ? getBlueprintExpansion(nextExpansionStage.id)
    : null

  return nextExpansion
    ? { ...game, ...applyBlueprintExpansion(game, nextExpansion) }
    : null
}

export function revokeLastBlueprintExpansion(game, trackId) {
  const track = BLUEPRINT_EXPANSION_TRACKS.find(
    (candidateTrack) => candidateTrack.id === trackId,
  )
  const completedExpansion = [...(track?.stages ?? [])]
    .reverse()
    .find((stage) => hasCompletedBlueprintExpansion(game, stage.id))

  if (!completedExpansion) {
    return null
  }

  const shrinkBlueprint =
    trackId === 'row' ? removeBlueprintRow : removeBlueprintColumn
  const currentSlots = getBlueprintSlots(game)
  const shrunkSlots = currentSlots.map(shrinkBlueprint)
  const previousActiveSlot = Math.min(
    Math.max(0, Math.floor(Number(game.activeBlueprintSlot) || 0)),
    shrunkSlots.length - 1,
  )
  const previousActiveBlueprint = shrunkSlots[previousActiveSlot]
  const unlockedSlotCount = getUnlockedBlueprintSlotCount({
    ...game,
    blueprint: previousActiveBlueprint,
  })
  const blueprintSlots = shrunkSlots.slice(0, unlockedSlotCount)
  const activeBlueprintSlot = Math.min(
    previousActiveSlot,
    blueprintSlots.length - 1,
  )

  return {
    ...game,
    blueprint: blueprintSlots[activeBlueprintSlot],
    blueprintSlots,
    activeBlueprintSlot,
    completedBlueprintExpansions: getCompletedBlueprintExpansions(game).filter(
      (expansionId) => expansionId !== completedExpansion.id,
    ),
  }
}

export function resetForBlueprintExpansion(game, expansionId) {
  const expansion = getBlueprintExpansion(expansionId)
  const expansionCost = getBlueprintExpansionCost(game, expansionId)
  const currentCrops = Math.max(0, Number(game.crops) || 0)

  if (!expansion || expansionCost === null || currentCrops < expansionCost) {
    return null
  }

  return {
    ...game,
    ...applyBlueprintExpansion(game, expansion),
    crops: 0,
    farmland: {
      ...createFarmlandMultipliers(game.farmland),
      columns: 0,
    },
  }
}
