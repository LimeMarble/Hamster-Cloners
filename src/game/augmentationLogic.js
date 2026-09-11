export const SEED_AUGMENTATION_IDS = Object.freeze({
  LEEK_ENRICHMENT: 'leekEnrichment',
  LEEK_DIAGONAL: 'leekDiagonal',
  MIRROR_CORN_DEBUFF_REMOVAL: 'mirrorCornDebuffRemoval',
  MIRROR_CORN_EFFECTIVENESS: 'mirrorCornEffectiveness',
  MIRROR_CORN_REFLECTION_LIMIT: 'mirrorCornReflectionLimit',
  SPLITWEED_MONOCROP_LIMIT: 'splitweedMonocropLimit',
  SWEETER_BOND: 'sweeterBond',
  LOOSENED_BOUNDARIES: 'loosenedBoundaries',
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
  [SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL,
    name: 'Safe Handling',
    cost: 2.5e72,
  }),
  [SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS,
    name: 'Brighter Reflection',
    baseCost: 4e73,
    costGrowth: 10,
    maximumLevel: 8,
    }),
  [SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT,
    name: 'Heat-Resistant Crops',
    cost: 1e78,
  }),
  [SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT,
    name: 'Sterile Symbiosis',
    baseCost: 1e180,
    costGrowth: 50,
    maximumLevel: 4,
    monocropLimitBonusPerAdjacentNonHarvestingCropPerLevel: 1,
    requiredDemonstrationId: 'misfortuneTrial',
  }),
  [SEED_AUGMENTATION_IDS.SWEETER_BOND]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.SWEETER_BOND,
    name: 'Sweeter Bond',
    baseCost: 7e102,
    costGrowth: 1000,
    maximumLevel: 3,
    growthExponentCapBonusPerLevel: 4,
    requiredMisfortuneUpgradeId: 'adversityGrownTubers',
  }),
  [SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES,
    name: 'Loosened Boundaries',
    baseCost: 1e107,
    costGrowth: 500,
    maximumLevel: 4,
    crowdingBaseBonusPerLevel: 0.05,
    requiredMisfortuneUpgradeId: 'adversityGrownTubers',
  }),
})

export function createInitialSeedAugmentationState() {
  return {
    leekEnrichmentLevel: 0,
    leekDiagonalUnlocked: false,
    mirrorCornDebuffRemovalUnlocked: false,
    mirrorCornDebuffRemovalEnabled: false,
    mirrorCornEffectivenessLevel: 0,
    mirrorCornReflectionLimitUnlocked: false,
    splitweedMonocropLimitLevel: 0,
    sweeterBondLevel: 0,
    loosenedBoundariesLevel: 0,
  }
}

export function normalizeSeedAugmentationState(rawState) {
  const maximumLevel =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT].maximumLevel
  const parsedLevel = Math.floor(Number(rawState?.leekEnrichmentLevel) || 0)

  const mirrorCornDebuffRemovalUnlocked =
    rawState?.mirrorCornDebuffRemovalUnlocked === true
  const mirrorCornEffectiveness =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS]
  const rawMirrorCornEffectivenessLevel =
    rawState?.mirrorCornEffectivenessLevel
  const parsedMirrorCornEffectivenessLevel = Math.floor(
    rawMirrorCornEffectivenessLevel === undefined
      ? rawState?.mirrorCornEffectivenessUnlocked === true
        ? 1
        : 0
      : Number(rawMirrorCornEffectivenessLevel) || 0,
  )
  const splitweedMonocropLimit =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT]
  const rawSplitweedMonocropLimitLevel =
    rawState?.splitweedMonocropLimitLevel
  const parsedSplitweedMonocropLimitLevel = Math.floor(
    rawSplitweedMonocropLimitLevel === undefined
      ? rawState?.splitweedMonocropLimitUnlocked === true
        ? 2
        : 0
      : Number(rawSplitweedMonocropLimitLevel) || 0,
  )
  const sweeterBond =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SWEETER_BOND]
  const loosenedBoundaries =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES]

  return {
    leekEnrichmentLevel: Math.min(maximumLevel, Math.max(0, parsedLevel)),
    leekDiagonalUnlocked: rawState?.leekDiagonalUnlocked === true,
    mirrorCornDebuffRemovalUnlocked,
    mirrorCornDebuffRemovalEnabled:
      mirrorCornDebuffRemovalUnlocked &&
      rawState?.mirrorCornDebuffRemovalEnabled === true,
    mirrorCornEffectivenessLevel: Math.min(
      mirrorCornEffectiveness.maximumLevel,
      Math.max(0, parsedMirrorCornEffectivenessLevel),
    ),
    mirrorCornReflectionLimitUnlocked:
      rawState?.mirrorCornReflectionLimitUnlocked === true,
    splitweedMonocropLimitLevel: Math.min(
      splitweedMonocropLimit.maximumLevel,
      Math.max(0, parsedSplitweedMonocropLimitLevel),
    ),
    sweeterBondLevel: Math.min(
      sweeterBond.maximumLevel,
      Math.max(0, Math.floor(Number(rawState?.sweeterBondLevel) || 0)),
    ),
    loosenedBoundariesLevel: Math.min(
      loosenedBoundaries.maximumLevel,
      Math.max(
        0,
        Math.floor(Number(rawState?.loosenedBoundariesLevel) || 0),
      ),
    ),
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

export function hasMirrorCornDebuffRemovalAugmentation(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .mirrorCornDebuffRemovalUnlocked
}

export function isMirrorCornDebuffRemovalEnabled(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .mirrorCornDebuffRemovalEnabled
}

export function getMirrorCornEffectivenessLevel(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .mirrorCornEffectivenessLevel
}

export function getMirrorCornEffectivenessBonus(seedAugmentations) {
  return getMirrorCornEffectivenessLevel(seedAugmentations)
}

export function getMirrorCornReflectionLimitBonus(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .mirrorCornReflectionLimitUnlocked
    ? 1
    : 0
}

export function hasSplitweedMonocropLimitAugmentation(seedAugmentations) {
  return getSplitweedMonocropLimitLevel(seedAugmentations) > 0
}

export function getSplitweedMonocropLimitLevel(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .splitweedMonocropLimitLevel
}

export function getSweeterBondLevel(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations).sweeterBondLevel
}

export function getSweetPotatoGrowthExponentCapBonus(seedAugmentations) {
  const augmentation = SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SWEETER_BOND]
  return getSweeterBondLevel(seedAugmentations) *
    augmentation.growthExponentCapBonusPerLevel
}

export function getLoosenedBoundariesLevel(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .loosenedBoundariesLevel
}

export function getSweetPotatoCrowdingBaseBonus(seedAugmentations) {
  const augmentation =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES]
  return getLoosenedBoundariesLevel(seedAugmentations) *
    augmentation.crowdingBaseBonusPerLevel
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

  if (augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.mirrorCornEffectivenessLevel >= augmentation.maximumLevel
      ? null
      : augmentation.baseCost *
          augmentation.costGrowth ** state.mirrorCornEffectivenessLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.splitweedMonocropLimitLevel >= augmentation.maximumLevel
      ? null
      : augmentation.baseCost *
          augmentation.costGrowth ** state.splitweedMonocropLimitLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.SWEETER_BOND) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.sweeterBondLevel >= augmentation.maximumLevel
      ? null
      : augmentation.baseCost *
          augmentation.costGrowth ** state.sweeterBondLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.loosenedBoundariesLevel >= augmentation.maximumLevel
      ? null
      : augmentation.baseCost *
          augmentation.costGrowth ** state.loosenedBoundariesLevel
  }

  const oneTimeAugmentationStateKeys = {
    [SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL]:
      'mirrorCornDebuffRemovalUnlocked',

      [SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT]:
      'mirrorCornReflectionLimitUnlocked',
  }
  const stateKey = oneTimeAugmentationStateKeys[augmentationId]

  return stateKey && !state[stateKey]
    ? SEED_AUGMENTATIONS[augmentationId].cost
    : null
}

export function isSeedAugmentationVisible(game, augmentationId) {
  const augmentation = SEED_AUGMENTATIONS[augmentationId]
  if (!augmentation) return false

  const requiredDemonstrationId = augmentation.requiredDemonstrationId
  const requiredMisfortuneUpgradeId =
    augmentation.requiredMisfortuneUpgradeId

  return (
    (!requiredDemonstrationId ||
      game.capybara?.completedDemonstrations?.includes(
        requiredDemonstrationId,
      ) === true) &&
    (!requiredMisfortuneUpgradeId ||
      game.completedMisfortuneUpgrades?.includes(
        requiredMisfortuneUpgradeId,
      ) === true)
  )
}

function canPurchaseSeedAugmentation(game, augmentationId) {
  if (
    game.capybara?.completedDemonstrations?.includes('introduction') !== true ||
    !isSeedAugmentationVisible(game, augmentationId)
  ) {
    return false
  }

  const isLeekAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT ||
    augmentationId === SEED_AUGMENTATION_IDS.LEEK_DIAGONAL
  const isCornAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL ||
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS ||
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT
  const isSplitweedAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT
  const isSweetPotatoAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.SWEETER_BOND ||
    augmentationId === SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES

  return (
    (isLeekAugmentation &&
      game.completedCropPerfections?.includes('enrichingLeek') === true) ||
    (isCornAugmentation &&
      game.completedCropPerfections?.includes('mirrorCorn') === true) ||
    (isSweetPotatoAugmentation &&
      game.completedCropPerfections?.includes('sweetPotato') === true) ||
    (isSplitweedAugmentation &&
      game.completedCropPerfections?.includes('splitweed') === true)
  )
}

export function purchaseSeedAugmentation(game, augmentationId) {
  if (!canPurchaseSeedAugmentation(game, augmentationId)) return null

  const cost = getNextSeedAugmentationCost(game, augmentationId)
  if (cost === null || game.crops < cost) return null

  const state = normalizeSeedAugmentationState(game.seedAugmentations)
  let seedAugmentations = null

  if (augmentationId === SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT) {
    seedAugmentations = {
      ...state,
      leekEnrichmentLevel: state.leekEnrichmentLevel + 1,
    }
  } else if (augmentationId === SEED_AUGMENTATION_IDS.LEEK_DIAGONAL) {
    seedAugmentations = { ...state, leekDiagonalUnlocked: true }
  } else if (
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL
  ) {
    seedAugmentations = {
      ...state,
      mirrorCornDebuffRemovalUnlocked: true,
      mirrorCornDebuffRemovalEnabled: true,
    }
  } else if (
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS
  ) {
    seedAugmentations = {
      ...state,
      mirrorCornEffectivenessLevel: state.mirrorCornEffectivenessLevel + 1,
    }
  } else if (
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT
  ) {
    seedAugmentations = { ...state, mirrorCornReflectionLimitUnlocked: true }
  } else if (
    augmentationId === SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT
  ) {
    seedAugmentations = {
      ...state,
      splitweedMonocropLimitLevel:
        state.splitweedMonocropLimitLevel + 1,
    }
  } else if (augmentationId === SEED_AUGMENTATION_IDS.SWEETER_BOND) {
    seedAugmentations = {
      ...state,
      sweeterBondLevel: state.sweeterBondLevel + 1,
    }
  } else if (
    augmentationId === SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES
  ) {
    seedAugmentations = {
      ...state,
      loosenedBoundariesLevel: state.loosenedBoundariesLevel + 1,
    }
  }

  return seedAugmentations
    ? { ...game, crops: game.crops - cost, seedAugmentations }
    : null
}

export function toggleSeedAugmentation(game, augmentationId) {
  if (
    augmentationId !== SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL
  ) {
    return null
  }

  const state = normalizeSeedAugmentationState(game.seedAugmentations)
  if (!state.mirrorCornDebuffRemovalUnlocked) return null

  return {
    ...game,
    seedAugmentations: {
      ...state,
      mirrorCornDebuffRemovalEnabled:
        !state.mirrorCornDebuffRemovalEnabled,
    },
  }
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
