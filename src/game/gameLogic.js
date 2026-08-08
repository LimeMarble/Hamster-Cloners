import {
  getMonocropThreshold,
  getMonocropYieldMultiplier,
} from './monocropPenalty.js'
import {
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  CROP_PERFECTION_IDS,
  canBeMirrorCornTarget,
  getAdjacentCropYieldBonus,
  getCropPerfection,
  hasCropPerfection,
  isCropEffectModifier,
  isKnownCrop,
} from './crops.js'

export const SIMULATION_TICK_INTERVAL_MS = 1000 / 60
export const VISUAL_UPDATE_INTERVAL_MS = 100
export const BASE_CROP_YIELD_PER_PLOT = 1
export const INITIAL_BLUEPRINT_SIZE = { rows: 1, columns: 1 }
export const STARTING_CROPS = 10
export const HAMSTER_BASE_COST = 5
export const HAMSTER_COST_GROWTH = 1.1
export const COLUMNS_PER_HAMSTER_PER_SECOND = 0.1
export const POST_UNION_HAMSTER_EFFICIENCY_GROWTH = 1.03
export const UNIONIZATION_HAMSTER_COUNT = 1000
export const UNIONIZED_HAMSTER_COUNT = 100
export const HIRE_MAX_UNLOCK_COUNT = 10
export const UNION_STATUS_RETIRE_HIRE_COUNT = 20
export const INVENTIONS_HAMSTER_UNLOCK_COUNT = 50
export const ROW_DUPLICATORS_UNLOCK_CROP_COUNT = 404e21
export const ROW_DUPLICATOR_BASE_COST = 1e12
export const ROW_DUPLICATOR_COST_GROWTH = 1.2
export const ROW_DUPLICATOR_INCOME_GROWTH = 1.02
export const BLUEPRINT_EXPANSION_CONFIG = [
  {
    id: 'column',
    title: 'Blueprint Column Expansion',
    maximumExpansions: 6,
    baseCost: 1e4,
    costScale: 1e4,
    acceleratedScalingAfter: 4,
    initialPrerequisiteIds: [],
  },
  {
    id: 'row',
    title: 'Blueprint Row Expansion',
    maximumExpansions: 8,
    baseCost: 1e7,
    costScale: 1e2,
    acceleratedScalingAfter: 5,
    initialPrerequisiteIds: ['firstColumn'],
  },
]

const EXPANSION_ORDINAL_IDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
]

function getExpansionStageCost(config, stageIndex) {
  const regularScaleSteps = Math.min(
    stageIndex,
    config.acceleratedScalingAfter - 1,
  )
  const acceleratedScaleStepCount = Math.max(
    0,
    stageIndex - config.acceleratedScalingAfter + 1,
  )
  const acceleratedScalePowers =
    (acceleratedScaleStepCount * (acceleratedScaleStepCount + 3)) / 2
  const baseCostExponent = Math.round(Math.log10(config.baseCost))
  const costScaleExponent = Math.round(Math.log10(config.costScale))
  const totalCostExponent =
    baseCostExponent +
    regularScaleSteps * costScaleExponent +
    acceleratedScalePowers * costScaleExponent

  return Number.parseFloat(`1e${totalCostExponent}`)
}

function createBlueprintExpansionTrack(config) {
  const expansionLabel = config.id === 'column' ? 'column' : 'row'
  const expansionTitle = `${expansionLabel[0].toUpperCase()}${expansionLabel.slice(1)}`

  return {
    id: config.id,
    title: config.title,
    stages: Array.from({ length: config.maximumExpansions }, (_, stageIndex) => {
      const stageId = `${EXPANSION_ORDINAL_IDS[stageIndex]}${expansionTitle}`
      const previousStageId =
        stageIndex > 0
          ? `${EXPANSION_ORDINAL_IDS[stageIndex - 1]}${expansionTitle}`
          : null

      return {
        id: stageId,
        cost: getExpansionStageCost(config, stageIndex),
        prerequisiteIds: previousStageId
          ? [previousStageId]
          : config.initialPrerequisiteIds,
        rewardDescription:
          stageIndex === 0 && config.id === 'column'
            ? 'gain one permanent blueprint column and unlock Corn'
            : `gain another permanent blueprint ${expansionLabel}`,
      }
    }),
  }
}

export const BLUEPRINT_EXPANSION_TRACKS = BLUEPRINT_EXPANSION_CONFIG.map(
  createBlueprintExpansionTrack,
)

export const BLUEPRINT_EXPANSIONS = BLUEPRINT_EXPANSION_TRACKS.flatMap(
  (track) =>
    track.stages.map((stage) => ({
      ...stage,
      trackId: track.id,
      direction: track.id,
      title: track.title,
    })),
)

function isLeechingGourdAnchor(crop) {
  return CROP_DEFINITIONS[crop]?.isLeechingGourdAnchor === true
}

function isLeechingGourdPart(crop) {
  return CROP_DEFINITIONS[crop]?.isLeechingGourdPart === true
}

function isLeechingGourdCell(crop) {
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

  return {
    rows: safeRows,
    columns: safeColumns,
    cells: normalizedCells,
    mirrorCornTargets: normalizedCells.map((crop, sourceIndex) => {
      const targetIndex = sourceMirrorCornTargets[sourceIndex]
      const sourceRow = Math.floor(sourceIndex / safeColumns)
      const sourceColumn = sourceIndex % safeColumns
      const targetRow = Math.floor(targetIndex / safeColumns)
      const targetColumn = targetIndex % safeColumns

      return (
        crop === 'corn' &&
        Number.isInteger(targetIndex) &&
        targetIndex >= 0 &&
        targetIndex < totalCells &&
        normalizedCells[targetIndex] &&
        canBeMirrorCornTarget(normalizedCells[targetIndex]) &&
        Math.abs(sourceRow - targetRow) === 1 &&
        Math.abs(sourceColumn - targetColumn) === 1
      )
        ? targetIndex
        : null
    }),
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
    hasUnlockedCropPerfection: false,
    hasUnlockedRowDuplicators: false,
    rowDuplicators: 0,
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
  const blueprint = createBlueprint(game.blueprint)

  if (game.hasUnlockedRootTunnel === true) {
    return 3
  }

  return blueprint.columns > 1 ? 2 : 1
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

export function getNextHamsterCost(hamsters, unionized = false) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))

  if (!unionized) {
    return HAMSTER_BASE_COST + safeHamsters
  }

  return Math.ceil(HAMSTER_BASE_COST * HAMSTER_COST_GROWTH ** safeHamsters)
}

export function getNextRowDuplicatorCost(rowDuplicators = 0) {
  const safeRowDuplicators = Math.max(
    0,
    Math.floor(Number(rowDuplicators) || 0),
  )

  return Math.ceil(
    ROW_DUPLICATOR_BASE_COST *
      ROW_DUPLICATOR_COST_GROWTH ** safeRowDuplicators,
  )
}

export function getRowDuplicatorIncomeMultiplier(
  rowDuplicators = 0,
  blueprint = null,
  completedCropPerfections = [],
) {
  const safeRowDuplicators = Math.max(
    0,
    Math.floor(Number(rowDuplicators) || 0),
  )
  const effectivenessMultiplier = blueprint
    ? getRowDuplicatorEffectivenessMultiplier(
        blueprint,
        completedCropPerfections,
      )
    : 1

  return (
    1 +
    (ROW_DUPLICATOR_INCOME_GROWTH - 1) * effectivenessMultiplier
  ) ** safeRowDuplicators
}

export function getHamsterStateAfterHire({
  hamsters = 0,
  totalHamstersHired = 0,
  unionized = false,
  postUnionHamstersHired = 0,
} = {}) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))
  const safeTotalHired = Math.max(
    safeHamsters,
    Math.floor(Number(totalHamstersHired) || 0),
  )
  const nextTotalHired = safeTotalHired + 1
  const safePostUnionHires = Math.max(
    0,
    Math.floor(Number(postUnionHamstersHired) || 0),
  )

  if (!unionized && nextTotalHired >= UNIONIZATION_HAMSTER_COUNT) {
    return {
      hamsters: UNIONIZED_HAMSTER_COUNT,
      totalHamstersHired: nextTotalHired,
      unionized: true,
      postUnionHamstersHired: 0,
    }
  }

  return {
    hamsters: safeHamsters + 1,
    totalHamstersHired: nextTotalHired,
    unionized: Boolean(unionized),
    postUnionHamstersHired: unionized ? safePostUnionHires + 1 : 0,
  }
}

export function getMaxHamsterPurchase(game) {
  let nextGame = {
    hamsters: Math.max(0, Math.floor(Number(game.hamsters) || 0)),
    totalHamstersHired: Math.max(
      0,
      Math.floor(Number(game.totalHamstersHired) || 0),
    ),
    unionized: game.unionized === true,
    postUnionHamstersHired: Math.max(
      0,
      Math.floor(Number(game.postUnionHamstersHired) || 0),
    ),
  }
  let remainingCrops = Math.max(0, Number(game.crops) || 0)
  let purchased = 0

  while (purchased < 10000) {
    if (
      !nextGame.unionized &&
      nextGame.totalHamstersHired >= UNIONIZATION_HAMSTER_COUNT - 1
    ) {
      break
    }

    const cost = getNextHamsterCost(nextGame.hamsters, nextGame.unionized)
    if (!Number.isFinite(cost) || cost > remainingCrops) {
      break
    }

    remainingCrops -= cost
    nextGame = getHamsterStateAfterHire(nextGame)
    purchased += 1
  }

  return {
    ...nextGame,
    crops: remainingCrops,
    purchased,
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
      rows: 0,
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

export function resetForBlueprintExpansion(game, expansionId) {
  const expansion = getBlueprintExpansion(expansionId)
  const currentBlueprint = createBlueprint(game.blueprint)
  const storedBlueprintSlots = getBlueprintSlots(game)
  const activeBlueprintSlot = Math.min(
    Math.max(0, Math.floor(Number(game.activeBlueprintSlot) || 0)),
    storedBlueprintSlots.length - 1,
  )
  const currentBlueprintSlots = storedBlueprintSlots.map((blueprint, slotIndex) =>
    slotIndex === activeBlueprintSlot ? currentBlueprint : blueprint,
  )
  const expansionCost = getBlueprintExpansionCost(game, expansionId)
  const currentCrops = Math.max(0, Number(game.crops) || 0)

  if (!expansion || expansionCost === null || currentCrops < expansionCost) {
    return null
  }

  const expandBlueprint =
    expansion.direction === 'row' ? addBlueprintRow : addBlueprintColumn
  const expandedBlueprintSlots = currentBlueprintSlots.map(expandBlueprint)
  const nextBlueprint = expandedBlueprintSlots[activeBlueprintSlot] ??
    expandBlueprint(currentBlueprint)
  const nextBlueprintSlotCount = getUnlockedBlueprintSlotCount({
    blueprint: nextBlueprint,
    hasUnlockedRootTunnel: game.hasUnlockedRootTunnel,
  })

  while (expandedBlueprintSlots.length < nextBlueprintSlotCount) {
    expandedBlueprintSlots.push(createBlueprint(nextBlueprint))
  }

  return {
    ...game,
    crops: 0,
    farmland: {
      ...createFarmlandMultipliers(game.farmland),
      columns: 0,
    },
    blueprint: nextBlueprint,
    blueprintSlots: expandedBlueprintSlots,
    activeBlueprintSlot,
    completedBlueprintExpansions: [
      ...getCompletedBlueprintExpansions(game),
      expansionId,
    ],
  }
}

export function getPlantedCropCount(blueprint, crop = 'leek') {
  return blueprint.cells.filter((cell) => cell === crop).length
}

export function hasReachedMonocropLimit(blueprint) {
  const fieldSize = blueprint.rows * blueprint.columns

  return Object.keys(CROP_DEFINITIONS)
    .filter((crop) => CROP_DEFINITIONS[crop].internalOnly !== true)
    .some(
    (crop) =>
      getPlantedCropCount(blueprint, crop) >=
      getMonocropThreshold(fieldSize),
    )
}

function getOrthogonalIndexes(blueprint, index) {
  const { rows, columns } = blueprint
  const row = Math.floor(index / columns)
  const column = index % columns
  const neighboringIndexes = []

  if (row > 0) {
    neighboringIndexes.push(index - columns)
  }
  if (row < rows - 1) {
    neighboringIndexes.push(index + columns)
  }
  if (column > 0) {
    neighboringIndexes.push(index - 1)
  }
  if (column < columns - 1) {
    neighboringIndexes.push(index + 1)
  }

  return neighboringIndexes
}

function isRootTunnel(crop) {
  return CROP_DEFINITIONS[crop]?.transfersAdjacencies === true
}

function getLeechingGourdAdjacentCropIndexes(blueprint) {
  const anchorIndex = blueprint.cells.findIndex(isLeechingGourdAnchor)

  if (anchorIndex === -1) {
    return []
  }

  const footprint = getLeechingGourdFootprint(blueprint, anchorIndex)

  if (footprint.length !== 4) {
    return []
  }

  return [
    ...new Set(
      footprint.flatMap((footprintIndex) =>
        getOrthogonalIndexes(blueprint, footprintIndex),
      ),
    ),
  ].filter((index) => {
    const crop = blueprint.cells[index]

    return crop && !isLeechingGourdCell(crop)
  })
}

function getLeechingGourdTurnipEffect(blueprint) {
  const debuffContribution = getLeechingGourdAdjacentCropIndexes(
    blueprint,
  ).reduce((total, index) => {
    const definition = CROP_DEFINITIONS[blueprint.cells[index]]

    if (!definition?.hasDebuff) {
      return total
    }

    return total + (definition.isHarmful ? 2 : 1)
  }, 0)

  return {
    debuffContribution,
    multiplier: 1 + debuffContribution * 0.05,
  }
}

function getConnectedRootTunnelIndexes(blueprint, startingIndexes) {
  const { cells } = blueprint
  const visitedIndexes = new Set()
  const pendingIndexes = [...startingIndexes]

  while (pendingIndexes.length > 0) {
    const tunnelIndex = pendingIndexes.pop()

    if (visitedIndexes.has(tunnelIndex) || !isRootTunnel(cells[tunnelIndex])) {
      continue
    }

    visitedIndexes.add(tunnelIndex)
    getOrthogonalIndexes(blueprint, tunnelIndex).forEach((neighborIndex) => {
      if (isRootTunnel(cells[neighborIndex])) {
        pendingIndexes.push(neighborIndex)
      }
    })
  }

  return [...visitedIndexes]
}

function getAdjacentCropIndexes(blueprint, index) {
  const { cells } = blueprint
  const crop = cells[index]
  const orthogonalIndexes = getOrthogonalIndexes(blueprint, index)
  const directCropIndexes = orthogonalIndexes.filter(
    (neighborIndex) =>
      cells[neighborIndex] &&
      !isRootTunnel(cells[neighborIndex]) &&
      !isLeechingGourdCell(cells[neighborIndex]),
  )

  if (!crop || isCropEffectModifier(crop)) {
    return directCropIndexes
  }

  const connectedRootTunnelIndexes = getConnectedRootTunnelIndexes(
    blueprint,
    orthogonalIndexes.filter((neighborIndex) => isRootTunnel(cells[neighborIndex])),
  )
  const transferredCropIndexes = connectedRootTunnelIndexes.flatMap(
    (tunnelIndex) =>
      getOrthogonalIndexes(blueprint, tunnelIndex).filter(
      (tunnelNeighborIndex) => {
        const tunnelNeighborCrop = cells[tunnelNeighborIndex]

        return (
          tunnelNeighborIndex !== index &&
          tunnelNeighborCrop &&
          !isRootTunnel(tunnelNeighborCrop) &&
          !isLeechingGourdCell(tunnelNeighborCrop) &&
          !isCropEffectModifier(tunnelNeighborCrop)
        )
      },
      ),
  )

  return [...new Set([...directCropIndexes, ...transferredCropIndexes])]
}

export function getDiagonalCropIndexes(blueprint, index) {
  const { rows, columns, cells } = blueprint
  const row = Math.floor(index / columns)
  const column = index % columns
  const diagonalIndexes = []

  for (const rowOffset of [-1, 1]) {
    for (const columnOffset of [-1, 1]) {
      const targetRow = row + rowOffset
      const targetColumn = column + columnOffset

      if (
        targetRow >= 0 &&
        targetRow < rows &&
        targetColumn >= 0 &&
        targetColumn < columns
      ) {
        const targetIndex = targetRow * columns + targetColumn
        if (cells[targetIndex] && canBeMirrorCornTarget(cells[targetIndex])) {
          diagonalIndexes.push(targetIndex)
        }
      }
    }
  }

  return diagonalIndexes
}

function getAdjacentCropEffectMultiplier(blueprint, index, crop) {
  if (isCropEffectModifier(crop)) {
    return 1
  }

  return getAdjacentCropIndexes(blueprint, index).reduce(
    (multiplier, neighborIndex) =>
      multiplier *
      getAdjacentCropEffectModifier(
        blueprint,
        blueprint.cells[neighborIndex],
        crop,
      ),
    1,
  )
}

function destroysAdjacentHarvests(crop) {
  return CROP_DEFINITIONS[crop]?.destroysAdjacentHarvests === true
}

function doesNotHarvest(crop) {
  return CROP_DEFINITIONS[crop]?.doesNotHarvest === true
}

function getMirrorCornTargetCount(
  blueprint,
  targetIndex,
  completedCropPerfections,
) {
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)

  if (!mirrorCorn?.diagonalTargetEffectBonus) {
    return 0
  }

  // Percentage passives which modify other crop effects (such as Turnip and
  // Pumpkin) are protected from other crop buffs, including Mirror Corn.
  if (isCropEffectModifier(blueprint.cells[targetIndex])) {
    return 0
  }

  if (!canBeMirrorCornTarget(blueprint.cells[targetIndex])) {
    return 0
  }

  return (blueprint.mirrorCornTargets ?? []).reduce(
    (targetCount, linkedTargetIndex, sourceIndex) =>
      linkedTargetIndex === targetIndex && blueprint.cells[sourceIndex] === 'corn'
        ? targetCount + 1
        : targetCount,
    0,
  )
}

function getMirrorCornEffectMultiplier(
  blueprint,
  targetIndex,
  completedCropPerfections,
) {
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)
  const mirrorCornTargetCount = getMirrorCornTargetCount(
    blueprint,
    targetIndex,
    completedCropPerfections,
  )

  return (
    1 + (mirrorCorn?.diagonalTargetEffectBonus ?? 0)
  ) ** mirrorCornTargetCount
}

function getCropBaseYield(crop, completedCropPerfections) {
  return (
    getCropPerfection(crop, completedCropPerfections)?.baseYield ??
    CROP_DEFINITIONS[crop]?.baseYield ??
    0
  )
}

function getCropHamsterEfficiencyBonus(crop, completedCropPerfections) {
  return (
    getCropPerfection(crop, completedCropPerfections)?.hamsterEfficiencyBonus ??
    CROP_DEFINITIONS[crop]?.hamsterEfficiencyBonus ??
    0
  )
}

function getAdjacentCropEffectModifier(blueprint, crop, targetCrop) {
  const adjacentCropEffectModifier =
    CROP_DEFINITIONS[crop]?.adjacentCropEffectModifier

  // These effect modifiers are protected passive effects, so they never
  // receive a Mirror Corn boost.
  if (adjacentCropEffectModifier === undefined) {
    return 1
  }

  if (crop === 'turnip' && targetCrop === 'lentil') {
    return 1
  }

  if (crop === 'turnip') {
    return (
      adjacentCropEffectModifier *
      getLeechingGourdTurnipEffect(blueprint).multiplier
    )
  }

  return adjacentCropEffectModifier
}

function getGlobalHarvestEffects(blueprint) {
  const fieldSize = blueprint.rows * blueprint.columns
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getPlantedCropCount(blueprint, crop),
    ]),
  )

  return blueprint.cells.flatMap((crop, index) => {
    const globalHarvestMultiplier =
      CROP_DEFINITIONS[crop]?.globalHarvestMultiplier

    if (globalHarvestMultiplier === undefined) {
      return []
    }

    const monocropMultiplier = getMonocropYieldMultiplier(
      cropCounts[crop],
      fieldSize,
    )
    const adjustedBonus =
      (globalHarvestMultiplier - 1) *
      monocropMultiplier *
      getAdjacentCropEffectMultiplier(blueprint, index, crop)

    return [
      {
        sourceCropId: crop,
        bonus: adjustedBonus,
      },
    ]
  })
}

function getGlobalHarvestMultiplier(blueprint) {
  return 1 + getGlobalHarvestEffects(blueprint).reduce(
    (totalBonus, effect) => totalBonus + effect.bonus,
    0,
  )
}

function getGroupedGlobalHarvestEffects(blueprint) {
  const effectsByCrop = new Map()

  getGlobalHarvestEffects(blueprint).forEach(({ sourceCropId, bonus }) => {
    const currentEffect = effectsByCrop.get(sourceCropId) ?? {
      count: 0,
      bonus: 0,
    }

    effectsByCrop.set(sourceCropId, {
      count: currentEffect.count + 1,
      bonus: currentEffect.bonus + bonus,
    })
  })

  return Array.from(effectsByCrop, ([sourceCropId, effect]) => ({
    sourceCropId,
    count: effect.count,
    multiplier: 1 + effect.bonus,
  }))
}

function getAdjacentHarvestModifier(crop, completedCropPerfections) {
  return (
    getAdjacentCropYieldBonus(crop, completedCropPerfections) +
    (CROP_DEFINITIONS[crop]?.adjacentHarvestModifier ?? 0)
  )
}

function getExternalCropBuffMultiplier(
  blueprint,
  index,
  crop,
  completedCropPerfections,
) {
  const baseExternalCropBuffMultiplier =
    CROP_DEFINITIONS[crop]?.externalCropBuffMultiplier

  if (baseExternalCropBuffMultiplier === undefined) {
    return 1
  }

  const adjacentEffectSourceMultipliers = getAdjacentCropIndexes(
    blueprint,
    index,
  ).flatMap((neighborIndex) => {
    const baseAdjacentCropEffectModifier =
      CROP_DEFINITIONS[blueprint.cells[neighborIndex]]
        ?.adjacentCropEffectModifier

    return baseAdjacentCropEffectModifier === undefined
      ? []
      : [
          baseExternalCropBuffMultiplier *
            getAdjacentCropEffectModifier(
              blueprint,
              blueprint.cells[neighborIndex],
              crop,
            ),
        ]
  })
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)
  const mirrorCornTargetCount = getMirrorCornTargetCount(
    blueprint,
    index,
    completedCropPerfections,
  )
  const mirrorCornSourceMultiplier =
    baseExternalCropBuffMultiplier *
    (1 + (mirrorCorn?.diagonalTargetEffectBonus ?? 0))
  const externalEffectSourceMultipliers = [
    ...adjacentEffectSourceMultipliers,
    ...Array(mirrorCornTargetCount).fill(mirrorCornSourceMultiplier),
  ]

  // Apple Tree's receiver bonus applies to every external passive separately.
  // A Turnip therefore supplies ×4 (its ×2 effect received at ×2), while a
  // current Mirror Corn supplies ×4 after its percentage passive is received
  // by the tree.
  return externalEffectSourceMultipliers.length > 0
    ? externalEffectSourceMultipliers.reduce(
        (multiplier, sourceMultiplier) => multiplier * sourceMultiplier,
        1,
      )
    : baseExternalCropBuffMultiplier
}

export function getCropHamsterEfficiencyMultiplier(
  blueprint,
  completedCropPerfections = [],
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getPlantedCropCount(blueprint, crop),
    ]),
  )
  const additiveCropBonus = blueprint.cells.reduce((totalBonus, crop, index) => {
    const baseHamsterEfficiencyBonus = getCropHamsterEfficiencyBonus(
      crop,
      completedCropPerfections,
    )

    if (baseHamsterEfficiencyBonus === 0) {
      return totalBonus
    }

    const monocropMultiplier = getMonocropYieldMultiplier(
      cropCounts[crop],
      fieldSize,
    )
    const adjustForMonocrop = (bonus) =>
      bonus > 0 ? bonus * monocropMultiplier : bonus / monocropMultiplier
    const adjacentCropBonusMultiplier =
      baseHamsterEfficiencyBonus > 0
        ? getAdjacentCropEffectMultiplier(
            blueprint,
            index,
            crop,
          )
        : 1
    const mirrorCornEffectMultiplier = getMirrorCornEffectMultiplier(
      blueprint,
      index,
      completedCropPerfections,
    )

    return (
      totalBonus +
      adjustForMonocrop(baseHamsterEfficiencyBonus) *
        adjacentCropBonusMultiplier *
        mirrorCornEffectMultiplier
    )
  }, 0)

  return Math.max(0, 1 + additiveCropBonus)
}

export function getRowDuplicatorEffectivenessMultiplier(
  blueprint,
  completedCropPerfections = [],
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getPlantedCropCount(blueprint, crop),
    ]),
  )
  const additiveEffectivenessBonus = blueprint.cells.reduce(
    (totalBonus, crop, index) => {
      const baseEffectivenessBonus =
        CROP_DEFINITIONS[crop]?.rowDuplicatorEffectivenessBonus ?? 0

      if (baseEffectivenessBonus === 0) {
        return totalBonus
      }

      const monocropMultiplier = getMonocropYieldMultiplier(
        cropCounts[crop],
        fieldSize,
      )
      const adjustedBonus =
        baseEffectivenessBonus > 0
          ? baseEffectivenessBonus * monocropMultiplier
          : baseEffectivenessBonus / monocropMultiplier
      const adjacentCropBonusMultiplier =
        baseEffectivenessBonus > 0
          ? getAdjacentCropEffectMultiplier(blueprint, index, crop)
          : 1
      const mirrorCornEffectMultiplier = getMirrorCornEffectMultiplier(
        blueprint,
        index,
        completedCropPerfections,
      )

      return (
        totalBonus +
        adjustedBonus *
          adjacentCropBonusMultiplier *
          mirrorCornEffectMultiplier
      )
    },
    0,
  )

  return Math.max(0, 1 + additiveEffectivenessBonus)
}

export function getBaseFieldIncome(blueprint, completedCropPerfections = []) {
  const fieldSize = blueprint.rows * blueprint.columns
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getPlantedCropCount(blueprint, crop),
    ]),
  )

  const baseIncome = blueprint.cells.reduce((totalIncome, crop, index) => {
    const definition = CROP_DEFINITIONS[crop]

    if (!definition) {
      return totalIncome
    }

    if (doesNotHarvest(crop)) {
      return totalIncome
    }

    if (
      getAdjacentCropIndexes(blueprint, index).some((neighborIndex) =>
        destroysAdjacentHarvests(blueprint.cells[neighborIndex]),
      )
    ) {
      return totalIncome
    }

    const adjacentYieldBonus = getAdjacentCropIndexes(
      blueprint,
      index,
    ).reduce((totalBonus, neighborIndex) => {
      const neighborCrop = blueprint.cells[neighborIndex]
      const baseCropYieldBonus = getAdjacentHarvestModifier(
        neighborCrop,
        completedCropPerfections,
      )

      return (
        totalBonus +
        baseCropYieldBonus *
          getAdjacentCropEffectMultiplier(
            blueprint,
            neighborIndex,
            neighborCrop,
          ) *
          getMirrorCornEffectMultiplier(
            blueprint,
            neighborIndex,
            completedCropPerfections,
          )
      )
    }, 0)
    const externalCropBuffMultiplier = getExternalCropBuffMultiplier(
      blueprint,
      index,
      crop,
      completedCropPerfections,
    )
    const monocropMultiplier = getMonocropYieldMultiplier(
      cropCounts[crop],
      fieldSize,
    )

    return (
      totalIncome +
      (getCropBaseYield(crop, completedCropPerfections) +
        adjacentYieldBonus * externalCropBuffMultiplier) *
        BASE_CROP_YIELD_PER_PLOT *
        monocropMultiplier
    )
  }, 0)

  return baseIncome * getGlobalHarvestMultiplier(blueprint)
}

export function getBlueprintCropStats(
  blueprint,
  index,
  completedCropPerfections = [],
) {
  const crop = blueprint.cells[index]
  const definition = CROP_DEFINITIONS[crop]

  if (!definition) {
    return null
  }

  const neighboringIndexes = getAdjacentCropIndexes(blueprint, index)
  const baseHamsterEfficiencyBonus = getCropHamsterEfficiencyBonus(
    crop,
    completedCropPerfections,
  )
  const receivedEffects = []
  const fieldSize = blueprint.rows * blueprint.columns
  const cropCount = getPlantedCropCount(blueprint, crop)
  const monocropMultiplier = getMonocropYieldMultiplier(cropCount, fieldSize)

  if (!isCropEffectModifier(crop)) {
    const modifierStacksByCrop = new Map()

    neighboringIndexes.forEach((neighborIndex) => {
      const sourceCropId = blueprint.cells[neighborIndex]
      const baseMultiplier =
        CROP_DEFINITIONS[sourceCropId]?.adjacentCropEffectModifier

      if (baseMultiplier !== undefined) {
        const multiplier = getAdjacentCropEffectModifier(
          blueprint,
          sourceCropId,
          crop,
        )

        if (multiplier === 1) {
          return
        }

        const currentStack = modifierStacksByCrop.get(sourceCropId) ?? {
          count: 0,
          multiplier,
        }

        modifierStacksByCrop.set(sourceCropId, {
          ...currentStack,
          count: currentStack.count + 1,
        })
      }
    })

    modifierStacksByCrop.forEach(({ count, multiplier }, sourceCropId) => {
      receivedEffects.push({
        type: 'crop-effect-modifier',
        sourceCropId,
        count,
        multiplier: multiplier ** count,
      })
    })
  }

  if (crop === 'turnip') {
    const leechingGourdEffect = getLeechingGourdTurnipEffect(blueprint)

    if (leechingGourdEffect.debuffContribution > 0) {
      receivedEffects.push({
        type: 'leeching-gourd',
        count: leechingGourdEffect.debuffContribution,
        multiplier: leechingGourdEffect.multiplier,
      })
    }
  }

  const mirrorCornTargetCount = getMirrorCornTargetCount(
    blueprint,
    index,
    completedCropPerfections,
  )
  if (mirrorCornTargetCount > 0) {
    receivedEffects.push({
      type: 'mirror-corn',
      count: mirrorCornTargetCount,
      multiplier: getMirrorCornEffectMultiplier(
        blueprint,
        index,
        completedCropPerfections,
      ),
    })
  }

  const cropYieldBonusesByCrop = new Map()

  neighboringIndexes.forEach((neighborIndex) => {
    const sourceCropId = blueprint.cells[neighborIndex]
    const baseCropYieldBonus = getAdjacentHarvestModifier(
      sourceCropId,
      completedCropPerfections,
    )
    const cropYieldBonus =
      baseCropYieldBonus *
        getAdjacentCropEffectMultiplier(
          blueprint,
          neighborIndex,
          sourceCropId,
        ) *
        getMirrorCornEffectMultiplier(
          blueprint,
          neighborIndex,
          completedCropPerfections,
        )

    if (cropYieldBonus !== 0) {
      const currentBonus = cropYieldBonusesByCrop.get(sourceCropId) ?? {
        count: 0,
        bonus: 0,
      }

      cropYieldBonusesByCrop.set(sourceCropId, {
        count: currentBonus.count + 1,
        bonus: currentBonus.bonus + cropYieldBonus,
      })
    }
  })

  cropYieldBonusesByCrop.forEach(({ count, bonus }, sourceCropId) => {
    receivedEffects.push({
      type: 'crop-yield',
      sourceCropId,
      count,
      bonus,
    })
  })

  const harvestDestroyedByAppleTree = neighboringIndexes.some(
    (neighborIndex) => destroysAdjacentHarvests(blueprint.cells[neighborIndex]),
  )
  const adjacentYieldBonus = neighboringIndexes.reduce(
    (totalBonus, neighborIndex) => {
      const sourceCropId = blueprint.cells[neighborIndex]
      const baseCropYieldBonus = getAdjacentHarvestModifier(
        sourceCropId,
        completedCropPerfections,
      )

      return (
        totalBonus +
        baseCropYieldBonus *
          getAdjacentCropEffectMultiplier(
            blueprint,
            neighborIndex,
            sourceCropId,
          ) *
          getMirrorCornEffectMultiplier(
            blueprint,
            neighborIndex,
            completedCropPerfections,
          )
      )
    },
    0,
  )
  const externalCropBuffMultiplier = definition.externalCropBuffMultiplier
    ? getExternalCropBuffMultiplier(
        blueprint,
        index,
        crop,
        completedCropPerfections,
      )
    : null
  const cropEffectMultiplier =
    baseHamsterEfficiencyBonus > 0
      ? getAdjacentCropEffectMultiplier(blueprint, index, crop)
      : 1
  const adjustForMonocrop = (bonus) =>
    bonus > 0 ? bonus * monocropMultiplier : bonus / monocropMultiplier
  const hamsterEfficiencyBonus =
    adjustForMonocrop(baseHamsterEfficiencyBonus) *
    cropEffectMultiplier *
    getMirrorCornEffectMultiplier(
      blueprint,
      index,
      completedCropPerfections,
    )
  const globalHarvestEffects = getGroupedGlobalHarvestEffects(blueprint)
  const globalHarvestMultiplier = getGlobalHarvestMultiplier(blueprint)
  const harvestYield = doesNotHarvest(crop) || harvestDestroyedByAppleTree
    ? 0
    : (getCropBaseYield(crop, completedCropPerfections) +
        adjacentYieldBonus * (externalCropBuffMultiplier ?? 1)) *
      monocropMultiplier *
      globalHarvestMultiplier

  globalHarvestEffects.forEach((effect) => {
    receivedEffects.push({ type: 'global-harvest', ...effect })
  })

  if (harvestDestroyedByAppleTree) {
    receivedEffects.push({ type: 'harvest-destruction' })
  }

  if (monocropMultiplier !== 1) {
    receivedEffects.push({
      type: 'monocrop',
      multiplier: monocropMultiplier,
    })
  }

  return {
    crop,
    baseYield: getCropBaseYield(crop, completedCropPerfections),
    harvestYield,
    hamsterEfficiencyBonus,
    harvestDestroyedByAppleTree,
    externalCropBuffMultiplier,
    receivedEffects,
  }
}

export function getIncomeMultiplier(farmland) {
  const multipliers = createFarmlandMultipliers(farmland)

  return (
    getFieldsPlanted(multipliers) * multipliers.otherMultiplier
  )
}

export function getFieldsPlanted(farmland) {
  const multipliers = createFarmlandMultipliers(farmland)

  return (
    multipliers.rows *
    multipliers.columns *
    multipliers.floors *
    multipliers.farms
  )
}

export function getCropProductionPerSecond(
  blueprint,
  farmland,
  completedCropPerfections = [],
  rowDuplicators = 0,
) {
  return (
    getBaseFieldIncome(blueprint, completedCropPerfections) *
    getIncomeMultiplier(farmland) *
    getRowDuplicatorIncomeMultiplier(
      rowDuplicators,
      blueprint,
      completedCropPerfections,
    )
  )
}

export function getColumnsProducedPerSecond(
  hamsters,
  postUnionHamstersHired = 0,
  cropHamsterEfficiencyMultiplier = 1,
) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))

  return (
    safeHamsters *
    COLUMNS_PER_HAMSTER_PER_SECOND *
    getHamsterCoordinationMultiplier(safeHamsters, postUnionHamstersHired) *
    getHamsterExternalMultiplier() *
    Math.max(0, Number(cropHamsterEfficiencyMultiplier) || 0)
  )
}

// The post-union hiring boost is separate from other construction bonuses so
// the UI can show exactly what the hamster workforce itself contributes.
export function getHamsterCoordinationMultiplier(
  hamsters,
  postUnionHamstersHired = 0,
) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))

  return Number(postUnionHamstersHired) > 0
    ? POST_UNION_HAMSTER_EFFICIENCY_GROWTH ** safeHamsters
    : 1
}

// Future inventions and other global construction effects belong here.
export function getHamsterExternalMultiplier() {
  return 1
}

export function getProductionForTick(
  blueprint,
  farmland,
  completedCropPerfections = [],
  rowDuplicators = 0,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
) {
  return (
    getCropProductionPerSecond(
      blueprint,
      farmland,
      completedCropPerfections,
      rowDuplicators,
    ) *
    (tickIntervalMs / 1000)
  )
}

export function getColumnsProducedForTick(
  hamsters,
  postUnionHamstersHired = 0,
  cropHamsterEfficiencyMultiplier = 1,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
) {
  return (
    getColumnsProducedPerSecond(
      hamsters,
      postUnionHamstersHired,
      cropHamsterEfficiencyMultiplier,
    ) *
    (tickIntervalMs / 1000)
  )
}
