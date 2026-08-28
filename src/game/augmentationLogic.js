export const SEED_AUGMENTATION_IDS = Object.freeze({
  LEEK_ENRICHMENT: 'leekEnrichment',
  LEEK_DIAGONAL: 'leekDiagonal',
})

export const SEED_AUGMENTATIONS = Object.freeze({
  [SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
    name: 'Layered Enrichment',
    baseCost: 1e66,
    costGrowth: 2,
    maximumLevel: 5,
  }),
  [SEED_AUGMENTATION_IDS.LEEK_DIAGONAL]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LEEK_DIAGONAL,
    name: 'Diagonal Enrichment',
    cost: 1e68,
  }),
})

export function createInitialSeedAugmentationState() {
  return {
    leekEnrichmentLevel: 0,
    leekDiagonalUnlocked: false,
  }
}

export function normalizeSeedAugmentationState(rawState) {
  const maximumLevel =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT].maximumLevel
  const parsedLevel = Math.floor(Number(rawState?.leekEnrichmentLevel) || 0)

  return {
    leekEnrichmentLevel: Math.min(maximumLevel, Math.max(0, parsedLevel)),
    leekDiagonalUnlocked: rawState?.leekDiagonalUnlocked === true,
  }
}

export function getLeekEnrichmentLevel(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations).leekEnrichmentLevel
}

export function getLeekAugmentationYieldBonus(seedAugmentations) {
  const level = getLeekEnrichmentLevel(seedAugmentations)
  return (5 * level * (level + 1)) / 2
}

export function hasLeekDiagonalAugmentation(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .leekDiagonalUnlocked
}

export function getNextSeedAugmentationCost(game, augmentationId) {
  const state = normalizeSeedAugmentationState(game.seedAugmentations)

  if (augmentationId === SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.leekEnrichmentLevel >= augmentation.maximumLevel
      ? null
      : augmentation.baseCost *
          augmentation.costGrowth ** state.leekEnrichmentLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.LEEK_DIAGONAL) {
    return state.leekDiagonalUnlocked
      ? null
      : SEED_AUGMENTATIONS[augmentationId].cost
  }

  return null
}

function canAugmentEnrichingLeek(game) {
  return (
    game.capybara?.completedDemonstrations?.includes('introduction') === true &&
    game.completedCropPerfections?.includes('enrichingLeek') === true
  )
}

export function purchaseSeedAugmentation(game, augmentationId) {
  if (!canAugmentEnrichingLeek(game)) return null

  const cost = getNextSeedAugmentationCost(game, augmentationId)
  if (cost === null || game.crops < cost) return null

  const state = normalizeSeedAugmentationState(game.seedAugmentations)
  const seedAugmentations =
    augmentationId === SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT
      ? {
          ...state,
          leekEnrichmentLevel: state.leekEnrichmentLevel + 1,
        }
      : augmentationId === SEED_AUGMENTATION_IDS.LEEK_DIAGONAL
        ? { ...state, leekDiagonalUnlocked: true }
        : null

  return seedAugmentations
    ? { ...game, crops: game.crops - cost, seedAugmentations }
    : null
}

export function getAugmentedHarvestConnections(
  blueprint,
  targetIndex,
  baseConnections,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  if (
    !completedCropPerfections.includes('enrichingLeek') ||
    !hasLeekDiagonalAugmentation(seedAugmentations)
  ) {
    return baseConnections
  }

  const row = Math.floor(targetIndex / blueprint.columns)
  const column = targetIndex % blueprint.columns
  const connections = new Map(
    baseConnections.map(({ index, adjacencyDistance }) => [
      index,
      adjacencyDistance,
    ]),
  )

  for (const rowOffset of [-1, 1]) {
    for (const columnOffset of [-1, 1]) {
      const sourceRow = row + rowOffset
      const sourceColumn = column + columnOffset
      if (
        sourceRow < 0 ||
        sourceRow >= blueprint.rows ||
        sourceColumn < 0 ||
        sourceColumn >= blueprint.columns
      ) {
        continue
      }

      const sourceIndex = sourceRow * blueprint.columns + sourceColumn
      if (blueprint.cells[sourceIndex] === 'leek') {
        connections.set(sourceIndex, 0)
      }
    }
  }

  return [...connections.entries()]
    .map(([index, adjacencyDistance]) => ({ index, adjacencyDistance }))
    .sort((left, right) => left.index - right.index)
}
