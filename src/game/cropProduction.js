import { CROP_DEFINITIONS, getCropPerfection } from './crops.js'
import {
  applyMonocropPenaltyToBonus,
  getMonocropYieldMultiplier,
} from './monocropPenalty.js'
import {
  BASE_CROP_YIELD_PER_PLOT,
  COLUMNS_PER_HAMSTER_PER_SECOND,
  POST_UNION_HAMSTER_EFFICIENCY_GROWTH,
  ROW_DUPLICATOR_COORDINATION_GROWTH,
  ROWS_PER_ROW_DUPLICATOR_PER_SECOND,
  SIMULATION_TICK_INTERVAL_MS,
} from './gameConfig.js'
import { createFarmlandMultipliers } from './blueprintLogic.js'
import { createBlueprintCalculationCache } from './blueprintCalculationCache.js'
import {
  doesNotHarvest,
  getAdjacentCropEffectMultiplier,
  getAdjacentHarvestDestructionMultiplier,
  getAdjacentHarvestModifier,
  getCropBaseYield,
  getCropHamsterEfficiencyBonus,
  getExternalCropBuffMultiplier,
  getGlobalHamsterEfficiencyMultiplier,
  getGlobalRowProductionMultiplier,
  getGlobalHarvestMultiplier,
  getHarvestBonusConnections,
  getGlobalPassiveEffectMultiplier,
  getMirrorCornEffectBlueprint,
  getMirrorCornEffectMultiplier,
  getMonocropCropCount,
  getMonocropThresholdBonus,
  getRootTunnelAdjacencyStrength,
  getSamplingLentilTradedCropEffect,
  isBlazingCarrotBurned,
  isMirrorCornOverloaded,
} from './cropEffects.js'

const getCachedHamsterEfficiency = createBlueprintCalculationCache()
const getCachedRowDuplicatorEffectiveness = createBlueprintCalculationCache()
const getCachedBaseFieldProduction = createBlueprintCalculationCache()
const getCachedCropProductionPerSecond = createBlueprintCalculationCache({
  structuralFallback: false,
})
const getCachedProductionForTick = createBlueprintCalculationCache({
  structuralFallback: false,
})

const EMPTY_COMPLETED_CROP_PERFECTIONS = Object.freeze([])
const EMPTY_SEED_AUGMENTATIONS = Object.freeze({})

export function getCropHamsterEfficiencyMultiplier(
  blueprint,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  rowsProducedPerSecond = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
) {
  return getCachedHamsterEfficiency(
    blueprint,
    [
      completedCropPerfections,
      rowsProducedPerSecond,
      passiveEffectMultiplier,
      seedAugmentations,
    ],
    () => calculateCropHamsterEfficiencyMultiplier(
      blueprint,
      completedCropPerfections,
      rowsProducedPerSecond,
      passiveEffectMultiplier,
      seedAugmentations,
    ),
  )
}

function calculateCropHamsterEfficiencyMultiplier(
  blueprint,
  completedCropPerfections,
  rowsProducedPerSecond,
  passiveEffectMultiplier,
  seedAugmentations,
) {
  const effectBlueprint = getMirrorCornEffectBlueprint(
    blueprint,
    completedCropPerfections,
    seedAugmentations,
  )
  const fieldSize = effectBlueprint.rows * effectBlueprint.columns
  const monocropThresholdBonus = getMonocropThresholdBonus(
    effectBlueprint,
    completedCropPerfections,
  )
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getMonocropCropCount(effectBlueprint, crop),
    ]),
  )
  const additiveCropBonus = effectBlueprint.cells.reduce(
    (totalBonus, crop, index) => {
      const baseHamsterEfficiencyBonus = getCropHamsterEfficiencyBonus(
        crop,
        completedCropPerfections,
        seedAugmentations,
      )

      if (baseHamsterEfficiencyBonus === 0) return totalBonus

      const monocropMultiplier = getMonocropYieldMultiplier(
        cropCounts[crop],
        fieldSize,
        monocropThresholdBonus,
      )
      const adjustForMonocrop = (bonus) =>
        bonus > 0 ? bonus * monocropMultiplier : bonus / monocropMultiplier
      const adjacentCropBonusMultiplier = getAdjacentCropEffectMultiplier(
        effectBlueprint,
        index,
        crop,
        baseHamsterEfficiencyBonus < 0,
        completedCropPerfections,
        passiveEffectMultiplier,
      )
      const mirrorCornEffectMultiplier = getMirrorCornEffectMultiplier(
        effectBlueprint,
        index,
        completedCropPerfections,
        passiveEffectMultiplier,
        seedAugmentations,
      )

      return (
        totalBonus +
        adjustForMonocrop(baseHamsterEfficiencyBonus) *
          passiveEffectMultiplier *
          adjacentCropBonusMultiplier *
          mirrorCornEffectMultiplier
      )
    },
    0,
  )

  const globalHamsterEfficiencyMultiplier =
    getGlobalHamsterEfficiencyMultiplier(
      effectBlueprint,
      completedCropPerfections,
      rowsProducedPerSecond,
      passiveEffectMultiplier,
    )

  return Math.max(
    0,
    (1 + additiveCropBonus) * globalHamsterEfficiencyMultiplier,
  )
}
export function getRowDuplicatorEffectivenessMultiplier(
  blueprint,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  activeHamsters = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
) {
  return getCachedRowDuplicatorEffectiveness(
    blueprint,
    [
      completedCropPerfections,
      activeHamsters,
      passiveEffectMultiplier,
      seedAugmentations,
    ],
    () => calculateRowDuplicatorEffectivenessMultiplier(
      blueprint,
      completedCropPerfections,
      activeHamsters,
      passiveEffectMultiplier,
      seedAugmentations,
    ),
  )
}

function calculateRowDuplicatorEffectivenessMultiplier(
  blueprint,
  completedCropPerfections,
  activeHamsters,
  passiveEffectMultiplier,
  seedAugmentations,
) {
  const effectBlueprint = getMirrorCornEffectBlueprint(
    blueprint,
    completedCropPerfections,
    seedAugmentations,
  )
  const fieldSize = effectBlueprint.rows * effectBlueprint.columns
  const monocropThresholdBonus = getMonocropThresholdBonus(
    effectBlueprint,
    completedCropPerfections,
  )
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getMonocropCropCount(effectBlueprint, crop),
    ]),
  )
  const additiveEffectivenessBonus = effectBlueprint.cells.reduce(
    (totalBonus, crop, index) => {
      const baseEffectivenessBonus =
        CROP_DEFINITIONS[crop]?.rowDuplicatorEffectivenessBonus ?? 0

      if (baseEffectivenessBonus === 0) return totalBonus

      const monocropMultiplier = getMonocropYieldMultiplier(
        cropCounts[crop],
        fieldSize,
        monocropThresholdBonus,
      )
      const adjustedBonus =
        baseEffectivenessBonus > 0
          ? baseEffectivenessBonus * monocropMultiplier
          : baseEffectivenessBonus / monocropMultiplier
      const adjacentCropBonusMultiplier = getAdjacentCropEffectMultiplier(
        effectBlueprint,
        index,
        crop,
        baseEffectivenessBonus < 0,
        completedCropPerfections,
        passiveEffectMultiplier,
      )
      const mirrorCornEffectMultiplier = getMirrorCornEffectMultiplier(
        effectBlueprint,
        index,
        completedCropPerfections,
        passiveEffectMultiplier,
        seedAugmentations,
      )

      return (
        totalBonus +
        adjustedBonus *
          passiveEffectMultiplier *
          adjacentCropBonusMultiplier *
          mirrorCornEffectMultiplier
      )
    },
    0,
  )

  return (
    Math.max(0, 1 + additiveEffectivenessBonus) *
    getGlobalRowProductionMultiplier(
      effectBlueprint,
      activeHamsters,
      completedCropPerfections,
      passiveEffectMultiplier,
    )
  )
}
export function getCarrotHighHarvestEffect(
  blueprint,
  contributions,
  baseGlobalHarvestMultiplier = 1,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  passiveEffectMultiplier = 1,
) {
  const baseDefinition = CROP_DEFINITIONS.carrot
  const perfection = getCropPerfection(
    'carrot',
    completedCropPerfections,
  )
  const effectDefinition = perfection ?? baseDefinition
  const carrotCount = getMonocropCropCount(blueprint, 'carrot')
  const activeCarrotIndexes = blueprint.cells.flatMap((crop, index) =>
    crop === 'carrot' &&
    !isBlazingCarrotBurned(blueprint, index, completedCropPerfections)
      ? [index]
      : [],
  )
  const highHarvestThreshold =
    effectDefinition?.highHarvestThreshold ?? Infinity
  const harvestByCropType = contributions.reduce(
    (totals, contribution) => {
      if (!contribution) {
        return totals
      }

      totals[contribution.cropId] =
        (totals[contribution.cropId] ?? 0) +
        contribution.amount * baseGlobalHarvestMultiplier
      return totals
    },
    {},
  )
  const qualifyingCropTypeCount = Object.values(harvestByCropType).filter(
    (totalHarvest) =>
      perfection?.id === 'blazingCarrot'
        ? totalHarvest >= highHarvestThreshold
        : totalHarvest > highHarvestThreshold,
  ).length

  if (
    !effectDefinition ||
    activeCarrotIndexes.length === 0 ||
    qualifyingCropTypeCount === 0
  ) {
    return {
      activeCarrotCount: activeCarrotIndexes.length,
      qualifyingCropTypeCount,
      multiplier: 1,
    }
  }

  const fieldSize = blueprint.rows * blueprint.columns
  const baseBonus =
    applyMonocropPenaltyToBonus(
      effectDefinition.highHarvestGlobalHarvestBonus ?? 0,
      carrotCount,
      fieldSize,
      getMonocropThresholdBonus(blueprint, completedCropPerfections),
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
    )
  const carrotBonus = activeCarrotIndexes.reduce(
    (totalBonus, index) =>
      totalBonus +
      baseBonus *
        getAdjacentCropEffectMultiplier(
          blueprint,
          index,
          'carrot',
          false,
          completedCropPerfections,
          passiveEffectMultiplier,
        ),
    0,
  )

  return {
    activeCarrotCount: activeCarrotIndexes.length,
    qualifyingCropTypeCount,
    multiplier: 1 + qualifyingCropTypeCount * carrotBonus,
  }
}
export function getBaseFieldProductionSnapshot(
  blueprint,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  rabbitContractsCompleted = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
  totalRabbitRelationsEarned = 0,
) {
  const hasCarrot = blueprint.cells.includes('carrot')
  const rabbitContractDependency = hasCarrot
    ? rabbitContractsCompleted
    : 0
  const rabbitRelationDependency = hasCarrot
    ? totalRabbitRelationsEarned
    : 0

  return getCachedBaseFieldProduction(
    blueprint,
    [
      completedCropPerfections,
      rabbitContractDependency,
      rabbitRelationDependency,
      passiveEffectMultiplier,
      seedAugmentations,
    ],
    () => calculateBaseFieldProductionSnapshot(
      blueprint,
      completedCropPerfections,
      rabbitContractsCompleted,
      passiveEffectMultiplier,
      seedAugmentations,
      totalRabbitRelationsEarned,
    ),
  )
}

function calculateBaseFieldProductionSnapshot(
  blueprint,
  completedCropPerfections,
  rabbitContractsCompleted,
  passiveEffectMultiplier,
  seedAugmentations,
  totalRabbitRelationsEarned,
) {
  const effectBlueprint = getMirrorCornEffectBlueprint(
    blueprint,
    completedCropPerfections,
    seedAugmentations,
  )
  const fieldSize = effectBlueprint.rows * effectBlueprint.columns
  const monocropThresholdBonus = getMonocropThresholdBonus(
    effectBlueprint,
    completedCropPerfections,
  )
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getMonocropCropCount(effectBlueprint, crop),
    ]),
  )

  const contributions = blueprint.cells.map((crop, index) => {
    const definition = CROP_DEFINITIONS[crop]

    if (!definition || doesNotHarvest(crop)) return null

    if (
      isBlazingCarrotBurned(
        blueprint,
        index,
        completedCropPerfections,
      )
    ) {
      return { cropId: crop, amount: 0 }
    }

    if (
      isMirrorCornOverloaded(
        blueprint,
        index,
        completedCropPerfections,
        seedAugmentations,
      )
    ) {
      return { cropId: crop, amount: 0 }
    }

    const adjacentConnections = getHarvestBonusConnections(
      effectBlueprint,
      index,
      completedCropPerfections,
      seedAugmentations,
    )
    const harvestDestructionMultiplier =
      getAdjacentHarvestDestructionMultiplier(
        effectBlueprint,
        index,
        completedCropPerfections,
        passiveEffectMultiplier,
      )
    const adjacentYieldBonus = adjacentConnections.reduce(
      (totalBonus, { index: neighborIndex, adjacencyDistance }) => {
        const neighborCrop = effectBlueprint.cells[neighborIndex]
        const baseCropYieldBonus = getAdjacentHarvestModifier(
          effectBlueprint,
          neighborCrop,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        )
        const adjacencyStrength =
          getRootTunnelAdjacencyStrength(adjacencyDistance)

        return (
          totalBonus +
          baseCropYieldBonus *
            adjacencyStrength *
            getAdjacentCropEffectMultiplier(
              effectBlueprint,
              neighborIndex,
              neighborCrop,
              baseCropYieldBonus < 0,
              completedCropPerfections,
              passiveEffectMultiplier,
            ) *
            getMirrorCornEffectMultiplier(
              effectBlueprint,
              neighborIndex,
              completedCropPerfections,
              passiveEffectMultiplier,
              seedAugmentations,
            )
        )
      },
      0,
    )
    const externalCropBuffMultiplier = getExternalCropBuffMultiplier(
      effectBlueprint,
      index,
      crop,
      completedCropPerfections,
      passiveEffectMultiplier,
      seedAugmentations,
    )
    const monocropMultiplier = getMonocropYieldMultiplier(
      cropCounts[crop],
      fieldSize,
      monocropThresholdBonus,
    )

    return {
      cropId: crop,
      amount:
        (getCropBaseYield(crop, completedCropPerfections) +
          adjacentYieldBonus * externalCropBuffMultiplier) *
        BASE_CROP_YIELD_PER_PLOT *
        monocropMultiplier *
        harvestDestructionMultiplier,
    }
  })
  const baseGlobalHarvestMultiplier = getGlobalHarvestMultiplier(
    effectBlueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
    totalRabbitRelationsEarned,
  )
  const carrotHighHarvestEffect = getCarrotHighHarvestEffect(
    effectBlueprint,
    contributions,
    baseGlobalHarvestMultiplier,
    completedCropPerfections,
    passiveEffectMultiplier,
  )
  const samplingLentilTradedCropEffect =
    getSamplingLentilTradedCropEffect(
      effectBlueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
    )
  const globalHarvestMultiplier =
    baseGlobalHarvestMultiplier *
    carrotHighHarvestEffect.multiplier *
    samplingLentilTradedCropEffect.multiplier
  const byCrop = contributions.reduce((cropTotals, contribution) => {
    if (!contribution) return cropTotals

    cropTotals[contribution.cropId] =
      (cropTotals[contribution.cropId] ?? 0) +
      contribution.amount * globalHarvestMultiplier
    return cropTotals
  }, {})
  const total = contributions.reduce(
    (totalIncome, contribution) =>
      totalIncome + (contribution?.amount ?? 0),
    0,
  )

  return {
    total: total * globalHarvestMultiplier,
    byCrop,
    globalHarvestMultiplier,
    carrotHighHarvestEffect,
    samplingLentilTradedCropEffect,
  }
}
export function getBaseFieldIncome(
  blueprint,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  rabbitContractsCompleted = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
) {
  return getBaseFieldProductionSnapshot(
    blueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
    seedAugmentations,
  ).total
}

export function getBaseFieldIncomeByCrop(
  blueprint,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  rabbitContractsCompleted = 0,
  passiveEffectMultiplier = 1,
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
) {
  return getBaseFieldProductionSnapshot(
    blueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
    seedAugmentations,
  ).byCrop
}
export function getIncomeMultiplier(farmland) {
  const multipliers = getEffectiveFarmlandMultipliers(farmland)

  return (
    getFieldsPlanted(multipliers) * multipliers.otherMultiplier
  )
}

export function getFieldsPlanted(farmland) {
  const multipliers = getEffectiveFarmlandMultipliers(farmland)

  return (
    multipliers.rows *
    multipliers.columns *
    multipliers.floors *
    multipliers.farms
  )
}

export function getEffectiveFarmlandMultipliers(farmland) {
  const multipliers = createFarmlandMultipliers(farmland)

  return {
    ...multipliers,
    rows: Math.floor(multipliers.rows),
    columns: Math.floor(multipliers.columns),
    floors: Math.floor(multipliers.floors),
    farms: Math.floor(multipliers.farms),
  }
}

function normalizeCropProductionModifiers(modifiers = {}) {
  const getMultiplier = (value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1
  }

  return {
    passiveEffectMultiplier: getMultiplier(modifiers.passiveEffectMultiplier),
    cropYieldMultiplier: getMultiplier(modifiers.cropYieldMultiplier),
    harvestMultiplier: getMultiplier(modifiers.harvestMultiplier),
  }
}

export function getCropProductionPerSecond(
  blueprint,
  farmland,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  externalCropMultiplier = 1,
  rabbitContractsCompleted = 0,
  fortuneModifiers = {},
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
  totalRabbitRelationsEarned = 0,
) {
  return getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    completedCropPerfections,
    externalCropMultiplier,
    rabbitContractsCompleted,
    fortuneModifiers,
    seedAugmentations,
    totalRabbitRelationsEarned,
  ).total
}

export function getCropProductionSnapshotPerSecond(
  blueprint,
  farmland,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  externalCropMultiplier = 1,
  rabbitContractsCompleted = 0,
  fortuneModifiers = {},
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
  totalRabbitRelationsEarned = 0,
) {
  const modifiers = normalizeCropProductionModifiers(fortuneModifiers)
  const effectiveFarmland = getEffectiveFarmlandMultipliers(farmland)
  const safeExternalCropMultiplier = Math.max(
    0,
    Number(externalCropMultiplier) || 0,
  )
  const hasCarrot = blueprint.cells.includes('carrot')
  const rabbitContractDependency = hasCarrot
    ? rabbitContractsCompleted
    : 0
  const rabbitRelationDependency = hasCarrot
    ? totalRabbitRelationsEarned
    : 0

  return getCachedCropProductionPerSecond(
    blueprint,
    [
      completedCropPerfections,
      rabbitContractDependency,
      rabbitRelationDependency,
      modifiers.passiveEffectMultiplier,
      modifiers.cropYieldMultiplier,
      modifiers.harvestMultiplier,
      seedAugmentations,
      effectiveFarmland.rows,
      effectiveFarmland.columns,
      effectiveFarmland.floors,
      effectiveFarmland.farms,
      effectiveFarmland.otherMultiplier,
      safeExternalCropMultiplier,
    ],
    () => {
      const fieldSnapshot = getBaseFieldProductionSnapshot(
        blueprint,
        completedCropPerfections,
        rabbitContractsCompleted,
        modifiers.passiveEffectMultiplier,
        seedAugmentations,
        totalRabbitRelationsEarned,
      )
      const multiplier =
        effectiveFarmland.rows *
        effectiveFarmland.columns *
        effectiveFarmland.floors *
        effectiveFarmland.farms *
        effectiveFarmland.otherMultiplier *
        safeExternalCropMultiplier *
        modifiers.cropYieldMultiplier *
        modifiers.harvestMultiplier

      return {
        total: fieldSnapshot.total * multiplier,
        byCrop: Object.fromEntries(
          Object.entries(fieldSnapshot.byCrop).map(([cropId, amount]) => [
            cropId,
            amount * multiplier,
          ]),
        ),
      }
    },
  )
}
export function getColumnsProducedPerSecond(
  hamsters,
  postUnionHamstersHired = 0,
  cropHamsterEfficiencyMultiplier = 1,
  hamsterExternalMultiplier = 1,
  coordinationHamsters = hamsters,
) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))
  const safeCoordinationHamsters = Math.max(
    0,
    Math.floor(Number(coordinationHamsters) || 0),
  )

  return (
    safeHamsters *
    COLUMNS_PER_HAMSTER_PER_SECOND *
    getHamsterCoordinationMultiplier(
      safeCoordinationHamsters,
      postUnionHamstersHired,
    ) *
    getHamsterExternalMultiplier(hamsterExternalMultiplier) *
    Math.max(0, Number(cropHamsterEfficiencyMultiplier) || 0)
  )
}

export function getRowsProducedPerSecond(
  rowDuplicators,
  rowDuplicatorEffectivenessMultiplier = 1,
  rowDuplicatorExternalMultiplier = 1,
) {
  const safeRowDuplicators = Math.max(
    0,
    Math.floor(Number(rowDuplicators) || 0),
  )

  return (
    safeRowDuplicators *
    ROWS_PER_ROW_DUPLICATOR_PER_SECOND *
    getRowDuplicatorCoordinationMultiplier(safeRowDuplicators) *
    Math.max(0, Number(rowDuplicatorEffectivenessMultiplier) || 0) *
    getRowDuplicatorExternalMultiplier(rowDuplicatorExternalMultiplier)
  )
}

export function getRowDuplicatorCoordinationMultiplier(rowDuplicators = 0) {
  const safeRowDuplicators = Math.max(
    0,
    Math.floor(Number(rowDuplicators) || 0),
  )

  return ROW_DUPLICATOR_COORDINATION_GROWTH ** safeRowDuplicators
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
export function getHamsterExternalMultiplier(multiplier = 1) {
  return Math.max(0, Number(multiplier) || 0)
}

// Future inventions and other global Row construction effects belong here.
export function getRowDuplicatorExternalMultiplier(multiplier = 1) {
  return Math.max(0, Number(multiplier) || 0)
}

export function getProductionForTick(
  blueprint,
  farmland,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
  externalCropMultiplier = 1,
  rabbitContractsCompleted = 0,
  fortuneModifiers = {},
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
) {
  return getProductionSnapshotForTick(
    blueprint,
    farmland,
    completedCropPerfections,
    tickIntervalMs,
    externalCropMultiplier,
    rabbitContractsCompleted,
    fortuneModifiers,
    seedAugmentations,
  ).total
}

export function getProductionSnapshotForTick(
  blueprint,
  farmland,
  completedCropPerfections = EMPTY_COMPLETED_CROP_PERFECTIONS,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
  externalCropMultiplier = 1,
  rabbitContractsCompleted = 0,
  fortuneModifiers = {},
  seedAugmentations = EMPTY_SEED_AUGMENTATIONS,
) {
  const productionPerSecond = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    completedCropPerfections,
    externalCropMultiplier,
    rabbitContractsCompleted,
    fortuneModifiers,
    seedAugmentations,
  )
  const tickLengthSeconds = tickIntervalMs / 1000

  return getCachedProductionForTick(
    blueprint,
    [productionPerSecond, tickLengthSeconds],
    () => ({
      total: productionPerSecond.total * tickLengthSeconds,
      byCrop: Object.fromEntries(
        Object.entries(productionPerSecond.byCrop).map(([cropId, amount]) => [
          cropId,
          amount * tickLengthSeconds,
        ]),
      ),
    }),
  )
}
export function getColumnsProducedForTick(
  hamsters,
  postUnionHamstersHired = 0,
  cropHamsterEfficiencyMultiplier = 1,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
  hamsterExternalMultiplier = 1,
  coordinationHamsters = hamsters,
) {
  return (
    getColumnsProducedPerSecond(
      hamsters,
      postUnionHamstersHired,
      cropHamsterEfficiencyMultiplier,
      hamsterExternalMultiplier,
      coordinationHamsters,
    ) *
    (tickIntervalMs / 1000)
  )
}

export function getRowsProducedForTick(
  rowDuplicators,
  rowDuplicatorEffectivenessMultiplier = 1,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
  rowDuplicatorExternalMultiplier = 1,
) {
  return (
    getRowsProducedPerSecond(
      rowDuplicators,
      rowDuplicatorEffectivenessMultiplier,
      rowDuplicatorExternalMultiplier,
    ) *
    (tickIntervalMs / 1000)
  )
}
