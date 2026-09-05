import {
  applyMonocropPenaltyToBonus,
  applyMonocropPenaltyToEffectMultiplier,
  getMonocropThreshold,
  getMonocropYieldMultiplier,
} from './monocropPenalty.js'
import {
  CROP_DEFINITIONS,
  CROP_EFFECT_BYPASS_TIERS,
  CROP_PERFECTIONS,
  canBeMirrorCornTarget,
  canCropPassiveBeAffectedBy,
  getAdjacentCropYieldBonus,
  getCropPerfection,
  isTradedCrop,
} from './crops.js'
import {
  getAdjacentCropConnections,
  getLeechingGourdAdjacentCropConnections,
  getOrthogonalIndexes,
  getRootTunnelAdjacencyStrength,
} from './adjacencyLogic.js'
import {
  getLeechingGourdFootprint,
  getSplitweedAnchorIndex,
  getSplitweedFootprint,
  isLeechingGourdCell,
} from './cropFootprintLogic.js'
import {
  getAugmentedHarvestConnections,
  getMirrorCornEffectivenessBonus,
  getMirrorCornReflectionLimitBonus,
  getSplitweedMonocropLimitLevel,
  isMirrorCornDebuffRemovalEnabled,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from './augmentationLogic.js'
import { createBlueprintCalculationCache } from './blueprintCalculationCache.js'
import {
  getShoalGrassNetworkSize,
  getShoalGrassNetworkSizeByIndex,
  isCropDebuffIsolatedByShoalGrass,
  isCropFullySurroundedByShoalGrass,
} from './shoalGrassLogic.js'
import {
  canPlaceMangroveSapling,
  getMangroveNurseryBaseEffect,
} from './mangroveSaplingLogic.js'

const getCachedRabbitRelationsMultiplier = createBlueprintCalculationCache()
const getCachedBlazingCarrotSurveyTimeEffect =
  createBlueprintCalculationCache()
const getCachedGlobalPassiveEffectMultiplier =
  createBlueprintCalculationCache()
const getCachedMangroveNurseryEffect = createBlueprintCalculationCache()

export {
  getAdjacentCropConnections,
  getAdjacentCropIndexes,
  getConnectedRootTunnelIndexes,
  getLeechingGourdAdjacentCropIndexes,
  getOrthogonalIndexes,
  getRootTunnelAdjacencyStrength,
  isRootTunnel,
} from './adjacencyLogic.js'

export {
  getShoalGrassNetworkSize,
  getShoalGrassNetworkSizeByIndex,
  isCropDebuffIsolatedByShoalGrass,
  isCropFullySurroundedByShoalGrass,
}

export { canPlaceMangroveSapling }

export function getPlantedCropCount(blueprint, crop = 'leek') {
  return blueprint.cells.filter((cell) => cell === crop).length
}

export function isBlazingCarrotBurned(
  blueprint,
  index,
  completedCropPerfections = [],
) {
  const perfection = getCropPerfection(
    'carrot',
    completedCropPerfections,
  )

  return Boolean(
    perfection?.id === 'blazingCarrot' &&
      blueprint.cells[index] === 'carrot' &&
      getOrthogonalIndexes(blueprint, index).some(
        (neighborIndex) => blueprint.cells[neighborIndex] === 'carrot',
      ),
  )
}

export function isWaterLettuceFieldInfested(blueprint) {
  const infestationThreshold =
    CROP_DEFINITIONS.waterLettuce?.infestationThreshold ?? Infinity

  return getPlantedCropCount(blueprint, 'waterLettuce') > infestationThreshold
}

function getActiveBlazingCarrotIndexes(
  blueprint,
  completedCropPerfections = [],
) {
  return blueprint.cells.flatMap((crop, index) =>
    crop === 'carrot' &&
    !isBlazingCarrotBurned(blueprint, index, completedCropPerfections)
      ? [index]
      : [],
  )
}

export function getHarvestBonusConnections(
  blueprint,
  index,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  return getAugmentedHarvestConnections(
    blueprint,
    index,
    getAdjacentCropConnections(blueprint, index),
    completedCropPerfections,
    seedAugmentations,
  )
}

export function getMonocropCropCount(blueprint, crop) {
  return (
    getPlantedCropCount(blueprint, crop) *
    (CROP_DEFINITIONS[crop]?.monocropCountWeight ?? 1)
  )
}

function getAdjacentCropIdentity(blueprint, index) {
  const splitweedAnchorIndex = getSplitweedAnchorIndex(blueprint, index)
  if (splitweedAnchorIndex !== null) {
    return `splitweed-${splitweedAnchorIndex}`
  }

  if (isLeechingGourdCell(blueprint.cells[index])) {
    const gourdAnchorIndex = blueprint.cells.indexOf('leechingGourd')
    if (
      gourdAnchorIndex !== -1 &&
      getLeechingGourdFootprint(blueprint, gourdAnchorIndex).includes(index)
    ) {
      return `leeching-gourd-${gourdAnchorIndex}`
    }
  }

  return `crop-${index}`
}

export function getSplitweedMonocropLimitAugmentationEffect(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  const augmentation =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT]
  const augmentationLevel = getSplitweedMonocropLimitLevel(
    seedAugmentations,
  )

  if (
    !completedCropPerfections.includes('splitweed') ||
    augmentationLevel === 0
  ) {
    return {
      adjacentNonHarvestingCropCount: 0,
      bonus: 0,
    }
  }

  const adjacentNonHarvestingCropCount = blueprint.cells.reduce(
    (total, crop, anchorIndex) => {
      if (crop !== 'knotweed') return total

      const footprint = getSplitweedFootprint(blueprint, anchorIndex)
      const footprintIndexes = new Set(footprint)
      const adjacentCrops = new Set()

      footprint.forEach((footprintIndex) => {
        getOrthogonalIndexes(blueprint, footprintIndex).forEach(
          (neighborIndex) => {
            const neighborCrop = blueprint.cells[neighborIndex]
            if (
              !footprintIndexes.has(neighborIndex) &&
              neighborCrop &&
              doesNotHarvest(neighborCrop)
            ) {
              adjacentCrops.add(
                getAdjacentCropIdentity(blueprint, neighborIndex),
              )
            }
          },
        )
      })

      return total + adjacentCrops.size
    },
    0,
  )

  return {
    adjacentNonHarvestingCropCount,
    bonus:
      adjacentNonHarvestingCropCount *
      augmentation.monocropLimitBonusPerAdjacentNonHarvestingCropPerLevel *
      augmentationLevel,
  }
}

export function getShoalGrassPlacementLimit(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const monocropLimit = getMonocropThreshold(
    fieldSize,
    getMonocropThresholdBonus(
      blueprint,
      completedCropPerfections,
      seedAugmentations,
    ),
  )

  return Math.max(0, Math.floor(monocropLimit / 3))
}

export function canPlaceShoalGrass(
  blueprint,
  index,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  if (blueprint.cells[index] === 'shoalGrass') return true

  return (
    getPlantedCropCount(blueprint, 'shoalGrass') <
    getShoalGrassPlacementLimit(
      blueprint,
      completedCropPerfections,
      seedAugmentations,
    )
  )
}

export function getMonocropThresholdBonus(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  const splitweed = getCropPerfection(
    'knotweed',
    completedCropPerfections,
  )

  const baseBonus =
    getPlantedCropCount(blueprint, 'knotweed') *
    (splitweed?.monocropThresholdBonusPerCrop ?? 0)

  return (
    baseBonus +
    getSplitweedMonocropLimitAugmentationEffect(
      blueprint,
      completedCropPerfections,
      seedAugmentations,
    ).bonus
  )
}

function getMonocropAdjustedCropBonus(
  blueprint,
  crop,
  bonus,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  if (
    !canCropPassiveBeAffectedBy(
      crop,
      CROP_EFFECT_BYPASS_TIERS.MONOCROP,
    )
  ) {
    return bonus
  }

  return applyMonocropPenaltyToBonus(
    bonus,
    getMonocropCropCount(blueprint, crop),
    blueprint.rows * blueprint.columns,
    getMonocropThresholdBonus(
      blueprint,
      completedCropPerfections,
      seedAugmentations,
    ),
  )
}

function getMonocropAdjustedCropEffectMultiplier(
  blueprint,
  crop,
  effectMultiplier,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  if (
    !canCropPassiveBeAffectedBy(
      crop,
      CROP_EFFECT_BYPASS_TIERS.MONOCROP,
    )
  ) {
    return effectMultiplier
  }

  return applyMonocropPenaltyToEffectMultiplier(
    effectMultiplier,
    getMonocropCropCount(blueprint, crop),
    blueprint.rows * blueprint.columns,
    getMonocropThresholdBonus(
      blueprint,
      completedCropPerfections,
      seedAugmentations,
    ),
  )
}

export function getBlueprintMonocropMultiplier(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const thresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
    seedAugmentations,
  )

  return Object.keys(CROP_DEFINITIONS)
    .filter((crop) => CROP_DEFINITIONS[crop].internalOnly !== true)
    .reduce(
      (lowestMultiplier, crop) =>
        Math.min(
          lowestMultiplier,
          getMonocropYieldMultiplier(
            getMonocropCropCount(blueprint, crop),
            fieldSize,
            thresholdBonus,
          ),
        ),
      1,
    )
}

export function hasReachedMonocropLimit(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const thresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
    seedAugmentations,
  )

  return Object.keys(CROP_DEFINITIONS)
    .filter((crop) => CROP_DEFINITIONS[crop].internalOnly !== true)
    .some(
    (crop) =>
      getMonocropCropCount(blueprint, crop) >=
      getMonocropThreshold(fieldSize, thresholdBonus),
    )
}

export function getLeechingGourdTurnipEffect(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const nearestConnections = new Map()
  const shoalGrassNetworkSizes = getShoalGrassNetworkSizeByIndex(blueprint)

  getLeechingGourdAdjacentCropConnections(blueprint).forEach((connection) => {
    const splitweedAnchorIndex = getSplitweedAnchorIndex(
      blueprint,
      connection.index,
    )
    const normalizedIndex = splitweedAnchorIndex ?? connection.index
    const existingConnection = nearestConnections.get(normalizedIndex)

    if (
      !existingConnection ||
      connection.adjacencyDistance < existingConnection.adjacencyDistance
    ) {
      nearestConnections.set(normalizedIndex, {
        ...connection,
        index: normalizedIndex,
      })
    }
  })

  const adjacencyEffects = [...nearestConnections.values()].flatMap(
    ({ index, adjacencyDistance }) => {
      const crop = blueprint.cells[index]
      const definition = CROP_DEFINITIONS[crop]
      const perfection = getCropPerfection(crop, completedCropPerfections)
      const effectDefinition = perfection ?? definition

      if (crop === 'shoalGrass' && adjacencyDistance === 0) {
        const networkSize = shoalGrassNetworkSizes.get(index) ?? 1
        return [
          {
            index,
            crop,
            adjacencyDistance,
            strength: 1,
            networkSize,
            contribution: networkSize,
          },
        ]
      }

      if (!effectDefinition?.hasDebuff) {
        return []
      }

      const strength = getRootTunnelAdjacencyStrength(adjacencyDistance)
      return [
        {
          index,
          crop,
          adjacencyDistance,
          strength,
          contribution:
            (effectDefinition.gourdAdjacencyContribution ??
              (effectDefinition.isHarmful ? 2 : 1)) *
            strength,
        },
      ]
    },
  )
  const debuffContribution = adjacencyEffects.reduce(
    (total, effect) => total + effect.contribution,
    0,
  )
  const allPassiveEffectMultiplier = getGlobalPassiveEffectMultiplier(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  )

  return {
    adjacencyEffects,
    debuffContribution,
    multiplier: 1 + debuffContribution * 0.05 * allPassiveEffectMultiplier,
  }
}

export function getDiagonalTileIndexes(blueprint, index) {
  const { rows, columns } = blueprint
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
        diagonalIndexes.push(targetRow * columns + targetColumn)
      }
    }
  }

  return diagonalIndexes
}

export function getLeechingGourdDebuffMultiplier(blueprint, index) {
  const splitweedAnchorIndex = getSplitweedAnchorIndex(blueprint, index)
  const affectedIndexes = new Set(
    splitweedAnchorIndex === null
      ? [index]
      : getSplitweedFootprint(blueprint, splitweedAnchorIndex),
  )
  const connection = getLeechingGourdAdjacentCropConnections(blueprint)
    .filter(({ index: cropIndex }) => affectedIndexes.has(cropIndex))
    .sort(
      (left, right) => left.adjacencyDistance - right.adjacencyDistance,
    )[0]

  return connection
    ? 1 - getRootTunnelAdjacencyStrength(connection.adjacencyDistance)
    : 1
}

export function getCropDebuffMultiplier(blueprint, index) {
  return isCropDebuffIsolatedByShoalGrass(blueprint, index)
    ? 0
    : getLeechingGourdDebuffMultiplier(blueprint, index)
}

export function getAdjacentCropEffectMultiplier(
  blueprint,
  index,
  crop,
  isDebuff = false,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const debuffMultiplier = isDebuff
    ? getCropDebuffMultiplier(blueprint, index)
    : 1

  if (
    !canCropPassiveBeAffectedBy(
      crop,
      CROP_EFFECT_BYPASS_TIERS.STANDARD,
    )
  ) {
    return debuffMultiplier
  }

  return (
    debuffMultiplier *
    getAdjacentCropConnections(blueprint, index).reduce(
      (multiplier, { index: neighborIndex, adjacencyDistance }) =>
        multiplier *
        getAdjacentCropEffectModifier(
          blueprint,
          blueprint.cells[neighborIndex],
          crop,
          adjacencyDistance,
          isDebuff,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        ),
      1,
    )
  )
}

export function destroysAdjacentHarvests(crop) {
  return CROP_DEFINITIONS[crop]?.destroysAdjacentHarvests === true
}

export function doesNotHarvest(crop) {
  return CROP_DEFINITIONS[crop]?.doesNotHarvest === true
}

export function getAdjacentHarvestDestructionEffects(
  blueprint,
  index,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const allPassiveEffectMultiplier = getGlobalPassiveEffectMultiplier(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  )

  return getAdjacentCropConnections(blueprint, index).flatMap(
    ({ index: sourceIndex, adjacencyDistance }) => {
      if (!destroysAdjacentHarvests(blueprint.cells[sourceIndex])) {
        return []
      }

      const sourceCrop = blueprint.cells[sourceIndex]
      const baseDestructionMultiplier =
        getMonocropAdjustedCropEffectMultiplier(
          blueprint,
          sourceCrop,
          1 - getRootTunnelAdjacencyStrength(adjacencyDistance),
          completedCropPerfections,
          seedAugmentations,
        )
      const strength =
        (1 - baseDestructionMultiplier) *
        allPassiveEffectMultiplier *
        getAdjacentCropEffectMultiplier(
          blueprint,
          sourceIndex,
          sourceCrop,
          true,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        )
      return [
        {
          sourceIndex,
          adjacencyDistance,
          strength,
          multiplier: Math.max(0, 1 - strength),
        },
      ]
    },
  )
}

export function getAdjacentHarvestDestructionMultiplier(
  blueprint,
  index,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return getAdjacentHarvestDestructionEffects(
    blueprint,
    index,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  ).reduce(
    (multiplier, effect) => multiplier * effect.multiplier,
    1,
  )
}

export function getMirrorCornMaximumReflections(seedAugmentations = {}) {
  return (
    CROP_PERFECTIONS.mirrorCorn.maximumReflectionsPerTile +
    getMirrorCornReflectionLimitBonus(seedAugmentations)
  )
}

export function getRawMirrorCornTargetCount(blueprint, targetIndex) {
  return (blueprint.mirrorCornTargets ?? []).reduce(
    (targetCount, linkedTargetIndex, sourceIndex) =>
      linkedTargetIndex === targetIndex && blueprint.cells[sourceIndex] === 'corn'
        ? targetCount + 1
        : targetCount,
    0,
  )
}

export function isMirrorCornOverloaded(
  blueprint,
  targetIndex,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  return (
    completedCropPerfections.includes('mirrorCorn') &&
    getRawMirrorCornTargetCount(blueprint, targetIndex) >
      getMirrorCornMaximumReflections(seedAugmentations)
  )
}

export function getMirrorCornEffectBlueprint(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  if (isWaterLettuceFieldInfested(blueprint)) {
    return {
      ...blueprint,
      cells: blueprint.cells.map(() => null),
    }
  }

  if (!completedCropPerfections.includes('mirrorCorn')) return blueprint

  const overloadedIndexes = new Set(
    blueprint.cells.flatMap((_, index) =>
      isMirrorCornOverloaded(
        blueprint,
        index,
        completedCropPerfections,
        seedAugmentations,
      )
        ? [index]
        : [],
    ),
  )

  return overloadedIndexes.size === 0
    ? blueprint
    : {
        ...blueprint,
        cells: blueprint.cells.map((crop, index) =>
          overloadedIndexes.has(index) ? null : crop,
        ),
      }
}

export function getMirrorCornTargetCount(
  blueprint,
  targetIndex,
  completedCropPerfections,
  seedAugmentations = {},
) {
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)

  if (
    !mirrorCorn?.diagonalTargetEffectMultiplier ||
    isMirrorCornOverloaded(
      blueprint,
      targetIndex,
      completedCropPerfections,
      seedAugmentations,
    )
  ) {
    return 0
  }

  // Percentage passives which modify other crop effects (such as Turnip and
  // Pumpkin) are protected from other crop buffs, including Mirror Corn.
  if (
    !canCropPassiveBeAffectedBy(
      blueprint.cells[targetIndex],
      CROP_EFFECT_BYPASS_TIERS.STANDARD,
    )
  ) {
    return 0
  }

  if (!canBeMirrorCornTarget(blueprint.cells[targetIndex])) {
    return 0
  }

  return (blueprint.mirrorCornTargets ?? []).reduce(
    (targetCount, linkedTargetIndex, sourceIndex) =>
      linkedTargetIndex === targetIndex &&
      blueprint.cells[sourceIndex] === 'corn' &&
      !isMirrorCornOverloaded(
        blueprint,
        sourceIndex,
        completedCropPerfections,
        seedAugmentations,
      )
        ? targetCount + 1
        : targetCount,
    0,
  )
}

export function getSplitweedMirrorCornEffectivenessBonus(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  const splitweed = getCropPerfection('knotweed', completedCropPerfections)
  const baseBonus =
    getPlantedCropCount(blueprint, 'knotweed') *
    (splitweed?.mirrorCornEffectivenessBonus ?? 0)

  return getMonocropAdjustedCropBonus(
    blueprint,
    'knotweed',
    baseBonus,
    completedCropPerfections,
    seedAugmentations,
  )
}

export function getMirrorCornEffectMultiplier(
  blueprint,
  targetIndex,
  completedCropPerfections,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  if (
    isMirrorCornOverloaded(
      blueprint,
      targetIndex,
      completedCropPerfections,
      seedAugmentations,
    )
  ) {
    return 0
  }

  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)
  const mirrorCornTargetCount = getMirrorCornTargetCount(
    blueprint,
    targetIndex,
    completedCropPerfections,
    seedAugmentations,
  )

  if (mirrorCornTargetCount === 0) return 1

  const mirrorCornEffectiveness =
    (mirrorCorn?.diagonalTargetEffectMultiplier ?? 1) +
    getMirrorCornEffectivenessBonus(seedAugmentations) +
    getSplitweedMirrorCornEffectivenessBonus(
      blueprint,
      completedCropPerfections,
      seedAugmentations,
    )
  const allPassiveEffectMultiplier = getGlobalPassiveEffectMultiplier(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  )

  return (
    getMonocropAdjustedCropEffectMultiplier(
      blueprint,
      'corn',
      mirrorCornEffectiveness,
      completedCropPerfections,
      seedAugmentations,
    ) * allPassiveEffectMultiplier
  ) ** mirrorCornTargetCount
}

export function getCropBaseYield(crop, completedCropPerfections) {
  return (
    getCropPerfection(crop, completedCropPerfections)?.baseYield ??
    CROP_DEFINITIONS[crop]?.baseYield ??
    0
  )
}

export function getCropHamsterEfficiencyBonus(
  crop,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  if (
    crop === 'corn' &&
    completedCropPerfections.includes('mirrorCorn') &&
    isMirrorCornDebuffRemovalEnabled(seedAugmentations)
  ) {
    return 0
  }

  return (
    getCropPerfection(crop, completedCropPerfections)?.hamsterEfficiencyBonus ??
    CROP_DEFINITIONS[crop]?.hamsterEfficiencyBonus ??
    0
  )
}

export function getWaterLettucePassiveEffect(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const definition = CROP_DEFINITIONS.waterLettuce
  const plantedIndexes = blueprint.cells.flatMap((crop, index) =>
    crop === 'waterLettuce' ? [index] : [],
  )

  if (!definition || plantedIndexes.length === 0) {
    return {
      count: 0,
      activeCount: 0,
      cropPassiveBonus: 0,
      insectPenalty: 0,
      multiplier: 1,
      effects: [],
      infested: false,
    }
  }

  if (isWaterLettuceFieldInfested(blueprint)) {
    return {
      count: plantedIndexes.length,
      activeCount: 0,
      cropPassiveBonus: 0,
      insectPenalty: 0,
      multiplier: 0,
      effects: [],
      infested: true,
    }
  }

  const fieldSize = blueprint.rows * blueprint.columns
  const cropCount = getMonocropCropCount(blueprint, 'waterLettuce')
  const monocropThresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
    seedAugmentations,
  )
  const baseCropPassiveBonus = applyMonocropPenaltyToBonus(
    definition.globalPassiveEffectBonus,
    cropCount,
    fieldSize,
    monocropThresholdBonus,
  )
  const baseInsectPenalty = applyMonocropPenaltyToBonus(
    definition.globalPassiveEffectDebuff,
    cropCount,
    fieldSize,
    monocropThresholdBonus,
  ) * passiveEffectMultiplier
  const effects = plantedIndexes.flatMap((index) => {
    if (
      isMirrorCornOverloaded(
        blueprint,
        index,
        completedCropPerfections,
        seedAugmentations,
      )
    ) {
      return []
    }

    const mirrorCornEffectMultiplier = getMirrorCornEffectMultiplier(
      blueprint,
      index,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )
    const cropPassiveBonus = baseCropPassiveBonus
    const insectPenalty =
      baseInsectPenalty *
      getAdjacentCropEffectMultiplier(
        blueprint,
        index,
        'waterLettuce',
        true,
        completedCropPerfections,
        passiveEffectMultiplier,
        seedAugmentations,
      ) *
      mirrorCornEffectMultiplier

    return [{ index, cropPassiveBonus, insectPenalty }]
  })
  const cropPassiveBonus = effects.reduce(
    (total, effect) => total + effect.cropPassiveBonus,
    0,
  )
  const insectPenalty = effects.reduce(
    (total, effect) => total + effect.insectPenalty,
    0,
  )

  return {
    count: plantedIndexes.length,
    activeCount: effects.length,
    cropPassiveBonus,
    insectPenalty,
    multiplier: Math.max(0, 1 + cropPassiveBonus + insectPenalty),
    effects,
    infested: false,
  }
}

export function getGlobalPassiveEffectMultiplier(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return getCachedGlobalPassiveEffectMultiplier(
    blueprint,
    [completedCropPerfections, passiveEffectMultiplier, seedAugmentations],
    () => calculateGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    ),
  )
}

export function getMangroveNurseryEffect(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return getCachedMangroveNurseryEffect(
    blueprint,
    [completedCropPerfections, passiveEffectMultiplier, seedAugmentations],
    () => {
      const baseEffect = getMangroveNurseryBaseEffect(
        blueprint,
        completedCropPerfections,
      )
      const cap = CROP_DEFINITIONS.mangroveSapling.nurseryBonusCap

      if (baseEffect.saplingCount === 0) {
        return {
          ...baseEffect,
          monocropAdjustedBonus: 0,
          passiveEffectMultiplier: 1,
          bonus: 0,
          multiplier: 1,
          cap,
        }
      }

      const monocropAdjustedBonus = applyMonocropPenaltyToBonus(
        baseEffect.baseBonus,
        getMonocropCropCount(blueprint, 'mangroveSapling'),
        blueprint.rows * blueprint.columns,
        getMonocropThresholdBonus(
          blueprint,
          completedCropPerfections,
          seedAugmentations,
        ),
      )
      const allPassiveEffectMultiplier = getGlobalPassiveEffectMultiplier(
        blueprint,
        completedCropPerfections,
        passiveEffectMultiplier,
        seedAugmentations,
      )
      const bonus = Math.min(
        cap,
        Math.max(0, monocropAdjustedBonus * allPassiveEffectMultiplier),
      )

      return {
        ...baseEffect,
        monocropAdjustedBonus,
        passiveEffectMultiplier: allPassiveEffectMultiplier,
        bonus,
        multiplier: 1 + bonus,
        cap,
      }
    },
  )
}

function calculateGlobalPassiveEffectMultiplier(
  blueprint,
  completedCropPerfections,
  passiveEffectMultiplier,
  seedAugmentations,
) {
  if (isWaterLettuceFieldInfested(blueprint)) return 0

  const splitweed = getCropPerfection(
    'knotweed',
    completedCropPerfections,
  )
  const splitweedAdjustedMultiplier =
    splitweed?.globalPassiveEffectMultiplier === undefined
      ? passiveEffectMultiplier
      : blueprint.cells.reduce((multiplier, crop, index) => {
          if (crop !== 'knotweed') {
            return multiplier
          }

          return (
            multiplier *
            (1 -
              (1 - splitweed.globalPassiveEffectMultiplier) *
                getCropDebuffMultiplier(blueprint, index))
          )
        }, passiveEffectMultiplier)
  const waterLettuceEffect = getWaterLettucePassiveEffect(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  )

  return splitweedAdjustedMultiplier * waterLettuceEffect.multiplier
}

export function getGlobalHamsterEfficiencyEffects(
  blueprint,
  completedCropPerfections = [],
  rowsProducedPerSecond = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const sourceCropId = 'wheat'
  const definition = CROP_DEFINITIONS[sourceCropId]
  const count = getPlantedCropCount(blueprint, sourceCropId)
  const safeRowsProducedPerSecond = Math.max(
    0,
    Number(rowsProducedPerSecond) || 0,
  )

  if (
    definition?.hasUnboostableRowsPerSecondMultiplier !== true ||
    count === 0 ||
    safeRowsProducedPerSecond <= 1
  ) {
    return []
  }

  const bonus =
    getMonocropAdjustedCropBonus(
      blueprint,
      sourceCropId,
      count * Math.log10(safeRowsProducedPerSecond),
      completedCropPerfections,
      seedAugmentations,
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )

  return [
    {
      sourceCropId,
      count,
      bonus,
      multiplier: 1 + bonus,
    },
  ]
}

export function getGlobalHamsterEfficiencyMultiplier(
  blueprint,
  completedCropPerfections = [],
  rowsProducedPerSecond = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return (
    1 +
    getGlobalHamsterEfficiencyEffects(
      blueprint,
      completedCropPerfections,
      rowsProducedPerSecond,
      passiveEffectMultiplier,
      seedAugmentations,
    ).reduce((totalBonus, effect) => totalBonus + effect.bonus, 0)
  )
}

export function getGlobalRowProductionEffects(
  blueprint,
  activeHamsters = 0,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const sourceCropId = 'canola'
  const definition = CROP_DEFINITIONS[sourceCropId]
  const count = getPlantedCropCount(blueprint, sourceCropId)
  const safeActiveHamsters = Math.max(
    0,
    Math.floor(Number(activeHamsters) || 0),
  )

  if (
    definition?.hasUnboostableActiveHamsterRowMultiplier !== true ||
    count === 0 ||
    safeActiveHamsters === 0
  ) {
    return []
  }

  const bonus =
    getMonocropAdjustedCropBonus(
      blueprint,
      sourceCropId,
      count *
        safeActiveHamsters *
        definition.globalRowProductionBonusPerHamster,
      completedCropPerfections,
      seedAugmentations,
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )

  return [
    {
      sourceCropId,
      count,
      bonus,
      multiplier: 1 + bonus,
    },
  ]
}

export function getGlobalRowProductionMultiplier(
  blueprint,
  activeHamsters = 0,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return getGlobalRowProductionEffects(
    blueprint,
    activeHamsters,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  ).reduce(
    (multiplier, effect) => multiplier * effect.multiplier,
    1,
  )
}

export function getAdjacentCropEffectModifier(
  blueprint,
  crop,
  targetCrop,
  adjacencyDistance = 0,
  isDebuff = false,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const cropDefinition = CROP_DEFINITIONS[crop]
  const adjacentCropEffectModifier = cropDefinition?.adjacentCropEffectModifier

  // These effect modifiers are protected passive effects, so they never
  // receive a Mirror Corn boost. Only explicit debuff modifiers affect
  // negative effects; Turnip remains a bonus-only effect enhancer.
  if (
    adjacentCropEffectModifier === undefined ||
    !canCropPassiveBeAffectedBy(
      targetCrop,
      CROP_EFFECT_BYPASS_TIERS.STANDARD,
    ) ||
    (isDebuff && cropDefinition.modifiesDebuffs !== true)
  ) {
    return 1
  }

  if (crop === 'turnip' && (targetCrop === 'lentil' || targetCrop === 'carrot')) {
    return 1
  }

  const baseMultiplier =
    crop === 'turnip'
      ? adjacentCropEffectModifier *
        getLeechingGourdTurnipEffect(
          blueprint,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        ).multiplier
      : adjacentCropEffectModifier
  const monocropAdjustedBaseMultiplier =
    getMonocropAdjustedCropEffectMultiplier(
      blueprint,
      crop,
      baseMultiplier,
      completedCropPerfections,
      seedAugmentations,
    )
  const allPassiveEffectMultiplier = getGlobalPassiveEffectMultiplier(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  )
  const passiveAdjustedBaseMultiplier =
    monocropAdjustedBaseMultiplier >= 1
      ? monocropAdjustedBaseMultiplier * allPassiveEffectMultiplier
      : monocropAdjustedBaseMultiplier / allPassiveEffectMultiplier
  const strength = getRootTunnelAdjacencyStrength(adjacencyDistance)

  // Turnip's multiplicative effect is exponentiated for longer routes. The
  // initial one-tile Root Tunnel connection remains at full strength.
  return crop === 'turnip'
    ? passiveAdjustedBaseMultiplier ** strength
    : 1 + (passiveAdjustedBaseMultiplier - 1) * strength
}

function getCarrotContractBonus(
  definition,
  startingBonusKey,
  contractBonusKey,
  rabbitContractsCompleted,
) {
  const completedContracts = Math.max(
    0,
    Math.floor(Number(rabbitContractsCompleted) || 0),
  )

  return Math.min(
    definition?.maximumRabbitContractBonus ?? 0,
    (definition?.[startingBonusKey] ?? 0) +
      completedContracts * (definition?.[contractBonusKey] ?? 0),
  )
}

export function getSamplingLentilTradedCropEffect(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const samplingLentil = getCropPerfection(
    'lentil',
    completedCropPerfections,
  )
  const bonusPerAdjacency =
    samplingLentil?.tradedCropGlobalHarvestBonus

  if (bonusPerAdjacency === undefined) {
    return { adjacentTradedCropCount: 0, multiplier: 1 }
  }

  const lentilCount = getMonocropCropCount(blueprint, 'lentil')
  const fieldSize = blueprint.rows * blueprint.columns
  const adjustedBonusPerAdjacency =
    applyMonocropPenaltyToBonus(
      bonusPerAdjacency,
      lentilCount,
      fieldSize,
      getMonocropThresholdBonus(
        blueprint,
        completedCropPerfections,
        seedAugmentations,
      ),
    ) * getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )
  const adjacentTradedCropCount = blueprint.cells.reduce(
    (total, crop, index) => {
      if (crop !== 'lentil') return total

      return total + getAdjacentCropConnections(blueprint, index).reduce(
        (adjacentTotal, connection) =>
          isTradedCrop(blueprint.cells[connection.index])
            ? adjacentTotal +
              getRootTunnelAdjacencyStrength(connection.adjacencyDistance)
            : adjacentTotal,
        0,
      )
    },
    0,
  )

  return {
    adjacentTradedCropCount,
    multiplier:
      1 + adjacentTradedCropCount * adjustedBonusPerAdjacency,
  }
}

export function getGlobalHarvestEffects(
  blueprint,
  completedCropPerfections = [],
  rabbitContractsCompleted = 0,
  passiveEffectMultiplier = 1,
  totalRabbitRelationsEarned = 0,
  seedAugmentations = {},
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getMonocropCropCount(blueprint, crop),
    ]),
  )
  const globalPassiveEffectMultiplier =
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )

  return blueprint.cells.flatMap((crop, index) => {
    const definition = CROP_DEFINITIONS[crop]
    const effectDefinition =
      getCropPerfection(crop, completedCropPerfections) ?? definition
    const isBlazingCarrot =
      crop === 'carrot' && effectDefinition?.id === 'blazingCarrot'
    const relationLog = Math.log10(
      Math.max(1, Number(totalRabbitRelationsEarned) || 0),
    )
    const globalHarvestMultiplier =
      crop === 'carrot'
        ? 1 +
          (isBlazingCarrot
            ? Math.min(
                effectDefinition.maximumRelationHarvestBonus,
                relationLog *
                  effectDefinition.globalHarvestBonusPerRelationLog,
              )
            : getCarrotContractBonus(
                definition,
                'globalHarvestBonusAtZero',
                'globalHarvestBonusPerContract',
                rabbitContractsCompleted,
              ))
        : effectDefinition?.globalHarvestMultiplier

    if (
      isBlazingCarrot &&
      isBlazingCarrotBurned(blueprint, index, completedCropPerfections)
    ) {
      return []
    }

    if (globalHarvestMultiplier === undefined) {
      return []
    }

    const adjustedBonus =
      applyMonocropPenaltyToBonus(
        globalHarvestMultiplier - 1,
        cropCounts[crop],
        fieldSize,
        getMonocropThresholdBonus(
          blueprint,
          completedCropPerfections,
          seedAugmentations,
        ),
      ) *
      globalPassiveEffectMultiplier *
      getAdjacentCropEffectMultiplier(
        blueprint,
        index,
        crop,
        globalHarvestMultiplier < 1,
        completedCropPerfections,
        passiveEffectMultiplier,
        seedAugmentations,
      )

    return [
      {
        sourceCropId: crop,
        sourceIndex: index,
        bonus: adjustedBonus,
      },
    ]
  })
}

export function getGlobalHarvestMultiplier(
  blueprint,
  completedCropPerfections = [],
  rabbitContractsCompleted = 0,
  passiveEffectMultiplier = 1,
  totalRabbitRelationsEarned = 0,
  seedAugmentations = {},
) {
  const bonusesByCrop = new Map()

  getGlobalHarvestEffects(
    blueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
    totalRabbitRelationsEarned,
    seedAugmentations,
  ).forEach(({ sourceCropId, bonus }) => {
    bonusesByCrop.set(
      sourceCropId,
      (bonusesByCrop.get(sourceCropId) ?? 0) + bonus,
    )
  })

  return Array.from(bonusesByCrop.values()).reduce(
    (multiplier, bonus) => multiplier * (1 + bonus),
    1,
  )
}

export function getGroupedGlobalHarvestEffects(
  blueprint,
  completedCropPerfections = [],
  rabbitContractsCompleted = 0,
  passiveEffectMultiplier = 1,
  totalRabbitRelationsEarned = 0,
  seedAugmentations = {},
) {
  const effectsByCrop = new Map()

  getGlobalHarvestEffects(
    blueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
    totalRabbitRelationsEarned,
    seedAugmentations,
  ).forEach(({ sourceCropId, bonus }) => {
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

function calculateBlazingCarrotSurveyTimeEffect(
  blueprint,
  completedCropPerfections = [],
  totalRabbitRelationsEarned = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const perfection = getCropPerfection(
    'carrot',
    completedCropPerfections,
  )

  if (perfection?.id !== 'blazingCarrot') {
    return {
      activeCarrotCount: 0,
      contributingCarrotCount: 0,
      relationLog: 0,
      reduction: 0,
      multiplier: 1,
    }
  }

  const activeIndexes = getActiveBlazingCarrotIndexes(
    blueprint,
    completedCropPerfections,
  )
  const relationLog = Math.min(
    perfection.maximumSurveyRelationLog,
    Math.log10(Math.max(1, Number(totalRabbitRelationsEarned) || 0)),
  )
  const contributingCarrotCount = Math.min(
    activeIndexes.length,
    relationLog,
  )

  if (activeIndexes.length === 0 || contributingCarrotCount === 0) {
    return {
      activeCarrotCount: activeIndexes.length,
      contributingCarrotCount,
      relationLog,
      reduction: 0,
      multiplier: 1,
    }
  }

  const baseReduction =
    applyMonocropPenaltyToBonus(
      perfection.surveyTimeReductionPerCrop,
      getMonocropCropCount(blueprint, 'carrot'),
      blueprint.rows * blueprint.columns,
      getMonocropThresholdBonus(
        blueprint,
        completedCropPerfections,
        seedAugmentations,
      ),
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )
  const uncappedReduction = activeIndexes.reduce(
    (totalReduction, index) =>
      totalReduction +
      baseReduction *
        getAdjacentCropEffectMultiplier(
          blueprint,
          index,
          'carrot',
          false,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        ),
    0,
  )
  const reduction = Math.min(
    perfection.maximumSurveyTimeReduction,
    uncappedReduction *
      (contributingCarrotCount / activeIndexes.length),
  )

  return {
    activeCarrotCount: activeIndexes.length,
    contributingCarrotCount,
    relationLog,
    reduction,
    multiplier: 1 - reduction,
  }
}

export function getBlazingCarrotSurveyTimeEffect(
  blueprint,
  completedCropPerfections = [],
  totalRabbitRelationsEarned = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return getCachedBlazingCarrotSurveyTimeEffect(
    blueprint,
    [
      completedCropPerfections,
      totalRabbitRelationsEarned,
      passiveEffectMultiplier,
      seedAugmentations,
    ],
    () =>
      calculateBlazingCarrotSurveyTimeEffect(
        blueprint,
        completedCropPerfections,
        totalRabbitRelationsEarned,
        passiveEffectMultiplier,
        seedAugmentations,
      ),
  )
}
export function getBlazingCarrotSurveyDurationMultiplier(
  blueprint,
  completedCropPerfections = [],
  totalRabbitRelationsEarned = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return getBlazingCarrotSurveyTimeEffect(
    blueprint,
    completedCropPerfections,
    totalRabbitRelationsEarned,
    passiveEffectMultiplier,
    seedAugmentations,
  ).multiplier
}

export function getRabbitRelationsEffects(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const sourceCropId = 'carrot'
  const definition = CROP_DEFINITIONS[sourceCropId]
  const perfection = getCropPerfection(
    sourceCropId,
    completedCropPerfections,
  )
  const effectDefinition = perfection ?? definition
  const activeIndexes =
    perfection?.id === 'blazingCarrot'
      ? getActiveBlazingCarrotIndexes(
          blueprint,
          completedCropPerfections,
        )
      : blueprint.cells.flatMap((crop, index) =>
          crop === sourceCropId ? [index] : [],
        )

  if (!definition || activeIndexes.length === 0) {
    return []
  }

  const fieldSize = blueprint.rows * blueprint.columns
  const cropCount = getMonocropCropCount(blueprint, sourceCropId)
  const bonusPerCarrot =
    effectDefinition.rabbitRelationsBonusAtZero ?? 0
  const baseBonus =
    applyMonocropPenaltyToBonus(
      bonusPerCarrot,
      cropCount,
      fieldSize,
      getMonocropThresholdBonus(
        blueprint,
        completedCropPerfections,
        seedAugmentations,
      ),
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )
  const bonus = activeIndexes.reduce(
    (totalBonus, index) =>
      totalBonus +
      baseBonus *
        getAdjacentCropEffectMultiplier(
          blueprint,
          index,
          sourceCropId,
          false,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        ),
    0,
  )

  return [
    {
      sourceCropId,
      count: activeIndexes.length,
      bonus,
      multiplier: 1 + bonus,
    },
  ]
}

export function getRabbitRelationsMultiplier(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  return getCachedRabbitRelationsMultiplier(
    blueprint,
    [completedCropPerfections, passiveEffectMultiplier, seedAugmentations],
    () => getRabbitRelationsEffects(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    ).reduce((multiplier, effect) => multiplier * effect.multiplier, 1),
  )
}
export function getAdjacentHarvestModifier(
  blueprint,
  crop,
  completedCropPerfections,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const effectCrop = crop === 'splitweedPart' ? 'knotweed' : crop

  return getMonocropAdjustedCropBonus(
    blueprint,
    effectCrop,
    getAdjacentCropYieldBonus(
      effectCrop,
      completedCropPerfections,
      seedAugmentations,
    ) +
      (CROP_DEFINITIONS[effectCrop]?.adjacentHarvestModifier ?? 0),
    completedCropPerfections,
    seedAugmentations,
  ) * getGlobalPassiveEffectMultiplier(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  )
}

export function getExternalCropBuffMultiplier(
  blueprint,
  index,
  crop,
  completedCropPerfections,
  passiveEffectMultiplier = 1,
  seedAugmentations = {},
) {
  const baseExternalCropBuffMultiplier =
    CROP_DEFINITIONS[crop]?.externalCropBuffMultiplier

  if (baseExternalCropBuffMultiplier === undefined) {
    return 1
  }

  const adjustedExternalCropBuffMultiplier =
    getMonocropAdjustedCropEffectMultiplier(
      blueprint,
      crop,
      baseExternalCropBuffMultiplier,
      completedCropPerfections,
      seedAugmentations,
    ) * getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )

  const adjacentEffectSourceMultipliers = getAdjacentCropConnections(
    blueprint,
    index,
  ).flatMap(({ index: neighborIndex, adjacencyDistance }) => {
    const baseAdjacentCropEffectModifier =
      CROP_DEFINITIONS[blueprint.cells[neighborIndex]]
        ?.adjacentCropEffectModifier

    return baseAdjacentCropEffectModifier === undefined
      ? []
      : [
          adjustedExternalCropBuffMultiplier *
            getAdjacentCropEffectModifier(
              blueprint,
              blueprint.cells[neighborIndex],
              crop,
              adjacencyDistance,
              false,
              completedCropPerfections,
              passiveEffectMultiplier,
              seedAugmentations,
            ),
        ]
  })
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)
  const mirrorCornTargetCount = getMirrorCornTargetCount(
    blueprint,
    index,
    completedCropPerfections,
    seedAugmentations,
  )
  const mirrorCornSourceMultiplier =
    adjustedExternalCropBuffMultiplier *
    getMonocropAdjustedCropEffectMultiplier(
      blueprint,
      'corn',
      (mirrorCorn?.diagonalTargetEffectMultiplier ?? 1) +
        getMirrorCornEffectivenessBonus(seedAugmentations),
      completedCropPerfections,
      seedAugmentations,
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )
  const externalEffectSourceMultipliers = [
    ...adjacentEffectSourceMultipliers,
    ...Array(mirrorCornTargetCount).fill(mirrorCornSourceMultiplier),
  ]

  // Apple Tree's receiver bonus applies to every external passive separately.
  // A Turnip therefore supplies ×3.6 (its ×2 effect received at ×1.8), while a
  // current Mirror Corn supplies ×7.2 after its ×4 passive is received
  // by the tree.
  return externalEffectSourceMultipliers.length > 0
    ? externalEffectSourceMultipliers.reduce(
        (multiplier, sourceMultiplier) => multiplier * sourceMultiplier,
        1,
      )
    : adjustedExternalCropBuffMultiplier
}
