import { GAME_AREA_IDS } from './gameConfig.js'
import { getAreaCropValue } from './cropRequirements.js'

export const SEED_AUGMENTATION_IDS = Object.freeze({
  LEEK_ENRICHMENT: 'leekEnrichment',
  LEEK_DIAGONAL: 'leekDiagonal',
  LEEK_ORTHOGONAL_SQUARED: 'leekOrthogonalSquared',
  RICH_SOIL: 'richSoil',
  MIRROR_CORN_DEBUFF_REMOVAL: 'mirrorCornDebuffRemoval',
  MIRROR_CORN_EFFECTIVENESS: 'mirrorCornEffectiveness',
  MIRROR_CORN_REFLECTION_LIMIT: 'mirrorCornReflectionLimit',
  SPLITWEED_MONOCROP_LIMIT: 'splitweedMonocropLimit',
  SWEETER_BOND: 'sweeterBond',
  LOOSENED_BOUNDARIES: 'loosenedBoundaries',
  RESTORED_CONNECTIONS: 'restoredConnections',
  LEECHING_VINE: 'leechingVine',
  // Retain the original ID and save flag for existing Branchier Branches purchases.
  SNEAKY_CRAWLER: 'sneakyCrawler',
  GREATER_ABSORPTION: 'greaterAbsorption',
})

export const SEED_AUGMENTATIONS = Object.freeze({
  [SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
    cropId: 'leek',
    name: 'Layered Enrichment',
    baseCost: 1e66,
    misfortuneCost: 1e67,
    costGrowth: 2,
    maximumLevel: 5,
  }),
  [SEED_AUGMENTATION_IDS.LEEK_DIAGONAL]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LEEK_DIAGONAL,
    cropId: 'leek',
    name: 'Diagonal Enrichment',
    cost: 1e68,
    misfortuneCost: 1e69,
  }),
  [SEED_AUGMENTATION_IDS.RICH_SOIL]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.RICH_SOIL,
    cropId: 'leek',
    name: 'Rich Soil',
    temporarilyUnavailable: true,
    cost: 5e71,
    purchaseArea: GAME_AREA_IDS.MISFORTUNE,
    effectArea: GAME_AREA_IDS.MISFORTUNE,
  }),
  [SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED,
    cropId: 'leek',
    name: 'Orthogonal²',
    cost: 1e157,
    enrichmentBonus: 400,
    orthogonalReach: 2,
    requiredMisfortuneUpgradeId: 'finalSupport',
  }),
  [SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL,
    cropId: 'corn',
    name: 'Safe Handling',
    cost: 2.5e72,
    misfortuneCost: 2.5e73,
  }),
  [SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS,
    cropId: 'corn',
    name: 'Brighter Reflection',
    baseCost: 4e73,
    misfortuneCost: 4e74,
    costGrowth: 10,
    maximumLevel: 8,
    }),
  [SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT,
    cropId: 'corn',
    name: 'Heat-Resistant Crops',
    cost: 1e78,
    misfortuneCost: 1e79,
  }),
  [SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT,
    cropId: 'knotweed',
    name: 'Sterile Symbiosis',
    baseCost: 5e184,
    misfortuneCost: 5e183,
    costGrowth: 50,
    maximumLevel: 4,
    monocropLimitBonusPerAdjacentNonHarvestingCropPerLevel: 1,
    requiredDemonstrationId: 'misfortuneTrial',
  }),
  [SEED_AUGMENTATION_IDS.SWEETER_BOND]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.SWEETER_BOND,
    cropId: 'sweetPotato',
    name: 'Sweeter Bond',
    baseCost: 3.5e103,
    costGrowth: 1000,
    maximumLevel: 3,
    growthExponentCapBonusPerLevel: 4,
    requiredMisfortuneUpgradeId: 'adversityGrownTubers',
  }),
  [SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES,
    cropId: 'sweetPotato',
    name: 'Loosened Boundaries',
    baseCost: 5e108,
    costGrowth: 500,
    maximumLevel: 4,
    crowdingBaseBonusPerLevel: 0.05,
    requiredMisfortuneUpgradeId: 'adversityGrownTubers',
  }),
  [SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS,
    cropId: 'sweetPotato',
    name: 'Restored Connections',
    cost: 5e112,
    buffDecayDelay: 3,
    requiredMisfortuneUpgradeId: 'adversityGrownTubers',
  }),
  [SEED_AUGMENTATION_IDS.LEECHING_VINE]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.LEECHING_VINE,
    cropId: 'pumpkin',
    name: 'Leeching Vine',
    cost: 5e144,
    nourishmentExponentPerStrength: 0.1,
    targetsPerNourishmentType: 2,
    baseVineLength: 1,
    maximumVines: 1,
    requiredMisfortuneUpgradeId: 'nourishingMisery',
  }),
  [SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER,
    cropId: 'pumpkin',
    name: 'Branchier Branches',
    cost: 1.5e148,
    targetsPerNourishmentTypeBonus: 1,
    requiredMisfortuneUpgradeIds: ['huntForSomethingGreater', 'nourishingMisery'],
  }),
  [SEED_AUGMENTATION_IDS.GREATER_ABSORPTION]: Object.freeze({
    id: SEED_AUGMENTATION_IDS.GREATER_ABSORPTION,
    cropId: 'pumpkin',
    name: 'Greater Absorption',
    cost: 3e149,
    splitweedNourishmentStrengthBonus: 1,
    requiredMisfortuneUpgradeIds: ['huntForSomethingGreater', 'nourishingMisery'],
  }),
})

export function createInitialSeedAugmentationState() {
  return {
    leekEnrichmentLevel: 0,
    leekDiagonalUnlocked: false,
    leekOrthogonalSquaredUnlocked: false,
    richSoilUnlocked: false,
    mirrorCornDebuffRemovalUnlocked: false,
    mirrorCornDebuffRemovalEnabled: false,
    mirrorCornEffectivenessLevel: 0,
    mirrorCornReflectionLimitUnlocked: false,
    splitweedMonocropLimitLevel: 0,
    sweeterBondLevel: 0,
    loosenedBoundariesLevel: 0,
    restoredConnectionsUnlocked: false,
    leechingVineUnlocked: false,
    sneakyCrawlerUnlocked: false,
    greaterAbsorptionUnlocked: false,
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
    leekOrthogonalSquaredUnlocked: rawState?.leekOrthogonalSquaredUnlocked === true,
    richSoilUnlocked: rawState?.richSoilUnlocked === true,
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
    restoredConnectionsUnlocked:
      rawState?.restoredConnectionsUnlocked === true,
    leechingVineUnlocked: rawState?.leechingVineUnlocked === true,
    sneakyCrawlerUnlocked: rawState?.sneakyCrawlerUnlocked === true,
    greaterAbsorptionUnlocked:
      rawState?.greaterAbsorptionUnlocked === true,
  }
}

export function getLeekEnrichmentLevel(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations).leekEnrichmentLevel
}

export function getLayeredLeekEnrichmentYieldBonus(seedAugmentations) {
  const level = getLeekEnrichmentLevel(seedAugmentations)
  return (5 * level * (level + 1)) / 2
}

export function hasLeekOrthogonalSquaredAugmentation(seedAugmentations) {
  return seedAugmentations?.leekOrthogonalSquaredUnlocked === true
}

export function getLeekAugmentationYieldBonus(seedAugmentations) {
  return getLayeredLeekEnrichmentYieldBonus(seedAugmentations) +
    (hasLeekOrthogonalSquaredAugmentation(seedAugmentations)
      ? SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED].enrichmentBonus
      : 0)
}

export function hasLeekDiagonalAugmentation(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .leekDiagonalUnlocked
}

export function hasRichSoilAugmentation(seedAugmentations) {
  return seedAugmentations?.richSoilUnlocked === true
}

export function getRichSoilYieldMultiplier(
  sourceCropId,
  recipientBaseHarvest,
  seedAugmentations = {},
  activeArea = GAME_AREA_IDS.MAIN,
) {
  if (
    sourceCropId !== 'leek' ||
    !hasRichSoilAugmentation(seedAugmentations) ||
    activeArea !== SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.RICH_SOIL].effectArea
  ) {
    return 1
  }

  const baseHarvest = Number(recipientBaseHarvest)
  return Number.isFinite(baseHarvest) ? Math.max(1, baseHarvest) : 1
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

export function hasRestoredConnectionsAugmentation(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .restoredConnectionsUnlocked
}

export function getSweetPotatoBuffDecayDelay(seedAugmentations) {
  return hasRestoredConnectionsAugmentation(seedAugmentations)
    ? SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS]
      .buffDecayDelay
    : 0
}

export function hasLeechingVineAugmentation(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .leechingVineUnlocked
}

export function hasSneakyCrawlerAugmentation(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .sneakyCrawlerUnlocked
}

export function hasGreaterAbsorptionAugmentation(seedAugmentations) {
  return normalizeSeedAugmentationState(seedAugmentations)
    .greaterAbsorptionUnlocked
}

export function getSplitweedVineNourishmentStrengthBonus(seedAugmentations) {
  return hasGreaterAbsorptionAugmentation(seedAugmentations)
    ? SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.GREATER_ABSORPTION]
      .splitweedNourishmentStrengthBonus
    : 0
}

export function getLeechingVineTargetsPerType(seedAugmentations) {
  const baseTargets = SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEECHING_VINE]
    .targetsPerNourishmentType
  const targetBonus = hasSneakyCrawlerAugmentation(seedAugmentations)
    ? SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER]
      .targetsPerNourishmentTypeBonus
    : 0

  return baseTargets + targetBonus
}

export function getSeedAugmentationCost(game, augmentationId) {
  const augmentation = SEED_AUGMENTATIONS[augmentationId]
  const cost = augmentation?.cost ?? augmentation?.baseCost ?? null
  return getAreaCropValue(game, cost, augmentation?.misfortuneCost ?? cost)
}

export function getNextSeedAugmentationCost(game, augmentationId) {
  const state = normalizeSeedAugmentationState(game.seedAugmentations)

  if (augmentationId === SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.leekEnrichmentLevel >= augmentation.maximumLevel
      ? null
      : getSeedAugmentationCost(game, augmentationId) *
          augmentation.costGrowth ** state.leekEnrichmentLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.LEEK_DIAGONAL) {
    return state.leekDiagonalUnlocked
      ? null
      : getSeedAugmentationCost(game, augmentationId)
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.mirrorCornEffectivenessLevel >= augmentation.maximumLevel
      ? null
      : getSeedAugmentationCost(game, augmentationId) *
          augmentation.costGrowth ** state.mirrorCornEffectivenessLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.splitweedMonocropLimitLevel >= augmentation.maximumLevel
      ? null
      : getSeedAugmentationCost(game, augmentationId) *
          augmentation.costGrowth ** state.splitweedMonocropLimitLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.SWEETER_BOND) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.sweeterBondLevel >= augmentation.maximumLevel
      ? null
      : getSeedAugmentationCost(game, augmentationId) *
          augmentation.costGrowth ** state.sweeterBondLevel
  }

  if (augmentationId === SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES) {
    const augmentation = SEED_AUGMENTATIONS[augmentationId]
    return state.loosenedBoundariesLevel >= augmentation.maximumLevel
      ? null
      : getSeedAugmentationCost(game, augmentationId) *
          augmentation.costGrowth ** state.loosenedBoundariesLevel
  }

  const oneTimeAugmentationStateKeys = {
    [SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED]: 'leekOrthogonalSquaredUnlocked',
    [SEED_AUGMENTATION_IDS.RICH_SOIL]: 'richSoilUnlocked',
    [SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL]:
      'mirrorCornDebuffRemovalUnlocked',

    [SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT]:
      'mirrorCornReflectionLimitUnlocked',
    [SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS]:
      'restoredConnectionsUnlocked',
    [SEED_AUGMENTATION_IDS.LEECHING_VINE]:
      'leechingVineUnlocked',
    [SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER]:
      'sneakyCrawlerUnlocked',
    [SEED_AUGMENTATION_IDS.GREATER_ABSORPTION]:
      'greaterAbsorptionUnlocked',
  }
  const stateKey = oneTimeAugmentationStateKeys[augmentationId]

  return stateKey && !state[stateKey]
    ? getSeedAugmentationCost(game, augmentationId)
    : null
}

export function isSeedAugmentationVisible(game, augmentationId) {
  const augmentation = SEED_AUGMENTATIONS[augmentationId]
  if (!augmentation || augmentation.temporarilyUnavailable) return false

  if (
    augmentation.purchaseArea &&
    game.activeArea !== augmentation.purchaseArea &&
    !(augmentationId === SEED_AUGMENTATION_IDS.RICH_SOIL &&
      hasRichSoilAugmentation(game.seedAugmentations))
  ) {
    return false
  }

  const requiredDemonstrationId = augmentation.requiredDemonstrationId
  const requiredMisfortuneUpgradeIds = augmentation.requiredMisfortuneUpgradeIds ??
    (augmentation.requiredMisfortuneUpgradeId ? [augmentation.requiredMisfortuneUpgradeId] : [])
  return (
    (!requiredDemonstrationId ||
      game.capybara?.completedDemonstrations?.includes(
        requiredDemonstrationId,
      ) === true) &&
    requiredMisfortuneUpgradeIds.every((requiredMisfortuneUpgradeId) =>
      game.completedMisfortuneUpgrades?.includes(
        requiredMisfortuneUpgradeId,
      ) === true)
  )
}

function canPurchaseSeedAugmentation(game, augmentationId) {
  const augmentation = SEED_AUGMENTATIONS[augmentationId]
  if (
    game.capybara?.completedDemonstrations?.includes('introduction') !== true ||
    !isSeedAugmentationVisible(game, augmentationId) ||
    (augmentation?.purchaseArea &&
      game.activeArea !== augmentation.purchaseArea)
  ) {
    return false
  }

  const isLeekAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT ||
    augmentationId === SEED_AUGMENTATION_IDS.LEEK_DIAGONAL ||
    augmentationId === SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED ||
    augmentationId === SEED_AUGMENTATION_IDS.RICH_SOIL
  const isCornAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL ||
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS ||
    augmentationId === SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT
  const isSplitweedAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT
  const isSweetPotatoAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.SWEETER_BOND ||
    augmentationId === SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES ||
    augmentationId === SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS
  const isLeechingGourdAugmentation =
    augmentationId === SEED_AUGMENTATION_IDS.LEECHING_VINE ||
    augmentationId === SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER ||
    augmentationId === SEED_AUGMENTATION_IDS.GREATER_ABSORPTION

  return (
    (isLeekAugmentation &&
      game.completedCropPerfections?.includes('enrichingLeek') === true) ||
    (isCornAugmentation &&
      game.completedCropPerfections?.includes('mirrorCorn') === true) ||
    (isSweetPotatoAugmentation &&
      game.completedCropPerfections?.includes('sweetPotato') === true) ||
    (isLeechingGourdAugmentation &&
      game.completedCropPerfections?.includes('leechingGourd') === true) ||
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
  } else if (augmentationId === SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED) {
    seedAugmentations = { ...state, leekOrthogonalSquaredUnlocked: true }
  } else if (augmentationId === SEED_AUGMENTATION_IDS.RICH_SOIL) {
    seedAugmentations = { ...state, richSoilUnlocked: true }
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
  } else if (
    augmentationId === SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS
  ) {
    seedAugmentations = {
      ...state,
      restoredConnectionsUnlocked: true,
    }
  } else if (augmentationId === SEED_AUGMENTATION_IDS.LEECHING_VINE) {
    seedAugmentations = {
      ...state,
      leechingVineUnlocked: true,
    }
  } else if (augmentationId === SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER) {
    seedAugmentations = {
      ...state,
      sneakyCrawlerUnlocked: true,
    }
  } else if (
    augmentationId === SEED_AUGMENTATION_IDS.GREATER_ABSORPTION
  ) {
    seedAugmentations = {
      ...state,
      greaterAbsorptionUnlocked: true,
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
  if (!completedCropPerfections.includes('enrichingLeek')) return baseConnections

  const hasDiagonalReach = hasLeekDiagonalAugmentation(seedAugmentations)
  const hasSquaredReach = hasLeekOrthogonalSquaredAugmentation(seedAugmentations)
  if (!hasDiagonalReach && !hasSquaredReach) return baseConnections

  const row = Math.floor(targetIndex / blueprint.columns)
  const column = targetIndex % blueprint.columns
  const connections = new Map(
    baseConnections.map(({ index, adjacencyDistance }) => [
      index,
      adjacencyDistance,
    ]),
  )

  const offsets = hasDiagonalReach
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : []
  if (hasSquaredReach) {
    const reach = SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED]
      .orthogonalReach
    offsets.push([-reach, 0], [reach, 0], [0, -reach], [0, reach])
  }

  for (const [rowOffset, columnOffset] of offsets) {
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
      // This is direct enrichment reach, not travel through a Root Tunnel.
      connections.set(sourceIndex, 0)
    }
  }

  return [...connections.entries()]
    .map(([index, adjacencyDistance]) => ({ index, adjacencyDistance }))
    .sort((left, right) => left.index - right.index)
}
