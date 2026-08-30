import {
  CROP_PERFECTIONS,
  CROP_PERFECTION_IDS,
  SWEET_POTATO_UNLOCK_HAMSTER_COUNT,
  hasCropPerfection,
  isCropPerfectionTemporarilyUnavailable,
  isKnownCrop,
  normalizeCropId,
} from './crops.js'
import {
  BLUEPRINT_EXPANSIONS,
  BLUEPRINT_EXPANSION_TRACKS,
  INITIAL_BLUEPRINT_SIZE,
  ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  STARTING_CROPS,
} from './gameConfig.js'
import { createInitialFortuneState } from './fortuneLogic.js'
import { createInitialSeedAugmentationState } from './augmentationLogic.js'
import { createInitialManateeState } from './manateeLogic.js'
import { normalizeMultiTileCropCells } from './cropFootprintLogic.js'

function normalizeUniqueCloverCells(cells) {
  let hasClover = false

  return cells.map((crop) => {
    if (crop !== 'fourLeafClover') return crop
    if (hasClover) return null

    hasClover = true
    return crop
  })
}

export function createBlueprint({
  rows = INITIAL_BLUEPRINT_SIZE.rows,
  columns = INITIAL_BLUEPRINT_SIZE.columns,
  cells,
  mirrorCornTargets,
  requireSplitweedFootprints = false,
} = {}) {
  const safeRows = Math.max(1, Math.floor(Number(rows) || 1))
  const safeColumns = Math.max(1, Math.floor(Number(columns) || 1))
  const totalCells = safeRows * safeColumns
  const sourceCells = Array.isArray(cells) ? cells : []
  const normalizedCells = normalizeUniqueCloverCells(
    normalizeMultiTileCropCells(
      Array.from(
        { length: totalCells },
        (_, index) => {
          const cropId = normalizeCropId(sourceCells[index])
          return isKnownCrop(cropId) ? cropId : null
        },
      ),
      safeRows,
      safeColumns,
      { requireSplitweedFootprints },
    ),
  )
  const sourceMirrorCornTargets = Array.isArray(mirrorCornTargets)
    ? mirrorCornTargets
    : []
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

    return hasValidTarget ? targetIndex : null
  })

  return {
    rows: safeRows,
    columns: safeColumns,
    cells: normalizedCells,
    mirrorCornTargets: normalizedMirrorCornTargets,
  }
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
    hasUnlockedWheat: false,
    hasUnlockedRootTunnel: false,
    hasUnlockedSunflower: false,
    hasUnlockedCropPerfection: false,
    hasUnlockedRowDuplicators: false,
    rowDuplicators: 0,
    fortune: createInitialFortuneState(),
    capybara: {
      completedDemonstrations: [],
      completedSecondaryObjectives: [],
    },
    seedAugmentations: createInitialSeedAugmentationState(),
    manatees: createInitialManateeState(),
    trade: {
      established: false,
      rabbitRelations: 0,
      totalRabbitRelationsEarned: 0,
      rabbitContractsCompleted: 0,
      rabbitContracts: [],
      rabbitUnlocks: [],
    },
    numberNotation: 'suffix',
    suffixScientificExponent: 303,
    testingPanelUnlocked: false,
    testingPanelVisible: false,
    testingCheats: {
      cropMultiplierEnabled: false,
      hamsterEfficiencyEnabled: false,
    },
    completedCropPerfections: [],
    blueprintExpansionAxesSwapped: true,
    completedBlueprintExpansions: [],
    rabbitBlueprintExpansions: {
      row: 0,
      column: 0,
    },
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

export function getRabbitBlueprintExpansionCounts(game) {
  const storedCounts = game.rabbitBlueprintExpansions
  const toNonNegativeInteger = (value) =>
    Math.max(0, Math.floor(Number(value) || 0))

  return {
    row: toNonNegativeInteger(storedCounts?.row),
    column: toNonNegativeInteger(storedCounts?.column),
  }
}

export function hasCompletedBlueprintExpansion(game, expansionId) {
  return getCompletedBlueprintExpansions(game).includes(expansionId)
}

function getCompletedCropPerfections(game) {
  return Array.isArray(game.completedCropPerfections)
    ? game.completedCropPerfections.filter((perfectionId) =>
        CROP_PERFECTION_IDS.includes(perfectionId) &&
        !isCropPerfectionTemporarilyUnavailable(perfectionId),
      )
    : []
}

export function getCropPerfectionCost(perfectionId) {
  return CROP_PERFECTIONS[perfectionId]?.cost ?? null
}

export function getCropPerfectionCurrency(perfectionId) {
  return CROP_PERFECTIONS[perfectionId]?.costCurrency === 'rabbitRelations'
    ? 'rabbitRelations'
    : 'crops'
}

function hasRequiredPerfectionDemonstration(game, perfectionId) {
  const requiredDemonstration =
    CROP_PERFECTIONS[perfectionId]?.requiresCapybaraDemonstration

  return (
    !requiredDemonstration ||
    game.capybara?.completedDemonstrations?.includes(
      requiredDemonstration,
    ) === true
  )
}

function getCropPerfectionBalance(game, perfectionId) {
  return getCropPerfectionCurrency(perfectionId) === 'rabbitRelations'
    ? Math.max(0, Number(game.trade?.rabbitRelations) || 0)
    : Math.max(0, Number(game.crops) || 0)
}

export function canUnlockCropPerfection(game, perfectionId) {
  const cost = getCropPerfectionCost(perfectionId)

  return (
    game.hasUnlockedCropPerfection === true &&
    cost !== null &&
    !isCropPerfectionTemporarilyUnavailable(perfectionId) &&
    (CROP_PERFECTIONS[perfectionId]?.requiresRowDuplicators !== true ||
      game.hasUnlockedRowDuplicators === true) &&
    hasRequiredPerfectionDemonstration(game, perfectionId) &&
    !hasCropPerfection(getCompletedCropPerfections(game), perfectionId) &&
    getCropPerfectionBalance(game, perfectionId) >= cost
  )
}

export function unlockCropPerfection(game, perfectionId) {
  const cost = getCropPerfectionCost(perfectionId)

  if (!canUnlockCropPerfection(game, perfectionId) || cost === null) {
    return null
  }

  const completedCropPerfections = [
    ...getCompletedCropPerfections(game),
    perfectionId,
  ]
  const perfectionCurrency = getCropPerfectionCurrency(perfectionId)
  const paymentState =
    perfectionCurrency === 'rabbitRelations'
      ? {
          trade: {
            ...game.trade,
            rabbitRelations:
              getCropPerfectionBalance(game, perfectionId) - cost,
          },
        }
      : { crops: game.crops - cost }
  const shouldNormalizeSplitweed = perfectionId === 'splitweed'
  const normalizeUnlockedBlueprint = (blueprint) =>
    shouldNormalizeSplitweed && blueprint
      ? createBlueprint({ ...blueprint, requireSplitweedFootprints: true })
      : blueprint

  return {
    ...game,
    ...paymentState,
    completedCropPerfections,
    ...(game.blueprint
      ? { blueprint: normalizeUnlockedBlueprint(game.blueprint) }
      : {}),
    ...(Array.isArray(game.blueprintSlots)
      ? {
          blueprintSlots: game.blueprintSlots.map(normalizeUnlockedBlueprint),
        }
      : {}),
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

function removeBlueprintRow(blueprint, requireSplitweedFootprints = false) {
  if (blueprint.rows <= 1) {
    return blueprint
  }

  const totalCells = (blueprint.rows - 1) * blueprint.columns

  return createBlueprint({
    rows: blueprint.rows - 1,
    columns: blueprint.columns,
    cells: blueprint.cells.slice(0, totalCells),
    mirrorCornTargets: blueprint.mirrorCornTargets.slice(0, totalCells),
    requireSplitweedFootprints,
  })
}

function removeBlueprintColumn(blueprint, requireSplitweedFootprints = false) {
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
    requireSplitweedFootprints,
  })
}

function applyBlueprintSpace(game, direction) {
  const requireSplitweedFootprints = hasCropPerfection(
    getCompletedCropPerfections(game),
    'splitweed',
  )
  const currentBlueprint = createBlueprint({
    ...game.blueprint,
    requireSplitweedFootprints,
  })
  const storedBlueprintSlots = getBlueprintSlots(game).map((blueprint) =>
    createBlueprint({ ...blueprint, requireSplitweedFootprints }),
  )
  const activeBlueprintSlot = Math.min(
    Math.max(0, Math.floor(Number(game.activeBlueprintSlot) || 0)),
    storedBlueprintSlots.length - 1,
  )
  const currentBlueprintSlots = storedBlueprintSlots.map((blueprint, slotIndex) =>
    slotIndex === activeBlueprintSlot ? currentBlueprint : blueprint,
  )
  const expandBlueprint = direction === 'row' ? addBlueprintRow : addBlueprintColumn
  const expandedBlueprintSlots = currentBlueprintSlots.map(expandBlueprint)
  const nextBlueprint = expandedBlueprintSlots[activeBlueprintSlot] ??
    expandBlueprint(currentBlueprint)
  const nextBlueprintSlotCount = getUnlockedBlueprintSlotCount({
    ...game,
    blueprint: nextBlueprint,
  })

  while (expandedBlueprintSlots.length < nextBlueprintSlotCount) {
    expandedBlueprintSlots.push(
      createBlueprint({ ...nextBlueprint, requireSplitweedFootprints }),
    )
  }

  return {
    blueprint: nextBlueprint,
    blueprintSlots: expandedBlueprintSlots,
    activeBlueprintSlot,
  }
}

function applyBlueprintExpansion(game, expansion) {
  return {
    ...applyBlueprintSpace(game, expansion.direction),
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

export function grantFreeBlueprintExpansion(game, trackId) {
  const track = BLUEPRINT_EXPANSION_TRACKS.find(
    (candidateTrack) => candidateTrack.id === trackId,
  )

  if (!track) {
    return null
  }

  const rabbitBlueprintExpansions = getRabbitBlueprintExpansionCounts(game)

  return {
    ...game,
    ...applyBlueprintSpace(game, trackId),
    rabbitBlueprintExpansions: {
      ...rabbitBlueprintExpansions,
      [trackId]: rabbitBlueprintExpansions[trackId] + 1,
    },
  }
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
  const requireSplitweedFootprints = hasCropPerfection(
    getCompletedCropPerfections(game),
    'splitweed',
  )
  const currentSlots = getBlueprintSlots(game)
  const shrunkSlots = currentSlots.map((blueprint) =>
    shrinkBlueprint(blueprint, requireSplitweedFootprints),
  )
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
