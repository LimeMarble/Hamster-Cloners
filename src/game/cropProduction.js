import { getMonocropYieldMultiplier } from './monocropPenalty.js'
import { CROP_DEFINITIONS } from './crops.js'
import {
  BASE_CROP_YIELD_PER_PLOT,
  COLUMNS_PER_HAMSTER_PER_SECOND,
  POST_UNION_HAMSTER_EFFICIENCY_GROWTH,
  ROW_DUPLICATOR_COORDINATION_GROWTH,
  ROWS_PER_ROW_DUPLICATOR_PER_SECOND,
  SIMULATION_TICK_INTERVAL_MS,
} from './gameConfig.js'
import { createFarmlandMultipliers } from './blueprintLogic.js'
import {
  doesNotHarvest,
  getAdjacentCropConnections,
  getAdjacentCropEffectMultiplier,
  getAdjacentHarvestDestructionMultiplier,
  getAdjacentHarvestModifier,
  getCropBaseYield,
  getCropHamsterEfficiencyBonus,
  getExternalCropBuffMultiplier,
  getGlobalHamsterEfficiencyMultiplier,
  getGlobalRowProductionMultiplier,
  getGlobalHarvestMultiplier,
  getMirrorCornEffectMultiplier,
  getMonocropCropCount,
  getMonocropThresholdBonus,
  getRootTunnelAdjacencyStrength,
} from './cropEffects.js'

export function getCropHamsterEfficiencyMultiplier(
  blueprint,
  completedCropPerfections = [],
  rowsProducedPerSecond = 0,
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const monocropThresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
  )
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getMonocropCropCount(blueprint, crop),
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
      monocropThresholdBonus,
    )
    const adjustForMonocrop = (bonus) =>
      bonus > 0 ? bonus * monocropMultiplier : bonus / monocropMultiplier
    const adjacentCropBonusMultiplier = getAdjacentCropEffectMultiplier(
      blueprint,
      index,
      crop,
      baseHamsterEfficiencyBonus < 0,
      completedCropPerfections,
    )
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

  const globalHamsterEfficiencyMultiplier =
    getGlobalHamsterEfficiencyMultiplier(
      blueprint,
      completedCropPerfections,
      rowsProducedPerSecond,
    )

  return Math.max(
    0,
    (1 + additiveCropBonus) * globalHamsterEfficiencyMultiplier,
  )
}

export function getRowDuplicatorEffectivenessMultiplier(
  blueprint,
  completedCropPerfections = [],
  activeHamsters = 0,
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const monocropThresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
  )
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getMonocropCropCount(blueprint, crop),
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
        monocropThresholdBonus,
      )
      const adjustedBonus =
        baseEffectivenessBonus > 0
          ? baseEffectivenessBonus * monocropMultiplier
          : baseEffectivenessBonus / monocropMultiplier
      const adjacentCropBonusMultiplier = getAdjacentCropEffectMultiplier(
        blueprint,
        index,
        crop,
        baseEffectivenessBonus < 0,
        completedCropPerfections,
      )
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

  return (
    Math.max(0, 1 + additiveEffectivenessBonus) *
    getGlobalRowProductionMultiplier(
      blueprint,
      activeHamsters,
      completedCropPerfections,
    )
  )
}

export function getBaseFieldIncome(blueprint, completedCropPerfections = []) {
  const fieldSize = blueprint.rows * blueprint.columns
  const monocropThresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
  )
  const cropCounts = Object.fromEntries(
    Object.keys(CROP_DEFINITIONS).map((crop) => [
      crop,
      getMonocropCropCount(blueprint, crop),
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

    const adjacentConnections = getAdjacentCropConnections(blueprint, index)
    const harvestDestructionMultiplier =
      getAdjacentHarvestDestructionMultiplier(
        blueprint,
        index,
        completedCropPerfections,
      )
    const adjacentYieldBonus = adjacentConnections.reduce(
      (totalBonus, { index: neighborIndex, adjacencyDistance }) => {
        const neighborCrop = blueprint.cells[neighborIndex]
        const baseCropYieldBonus = getAdjacentHarvestModifier(
          blueprint,
          neighborCrop,
          completedCropPerfections,
        )
        const adjacencyStrength =
          getRootTunnelAdjacencyStrength(adjacencyDistance)

        return (
          totalBonus +
          baseCropYieldBonus *
            adjacencyStrength *
            getAdjacentCropEffectMultiplier(
              blueprint,
              neighborIndex,
              neighborCrop,
              baseCropYieldBonus < 0,
              completedCropPerfections,
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
    const externalCropBuffMultiplier = getExternalCropBuffMultiplier(
      blueprint,
      index,
      crop,
      completedCropPerfections,
    )
    const monocropMultiplier = getMonocropYieldMultiplier(
      cropCounts[crop],
      fieldSize,
      monocropThresholdBonus,
    )

    return (
      totalIncome +
      (getCropBaseYield(crop, completedCropPerfections) +
        adjacentYieldBonus * externalCropBuffMultiplier) *
        BASE_CROP_YIELD_PER_PLOT *
        monocropMultiplier *
        harvestDestructionMultiplier
    )
  }, 0)

  return (
    baseIncome *
    getGlobalHarvestMultiplier(
      blueprint,
      completedCropPerfections,
    )
  )
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

export function getCropProductionPerSecond(
  blueprint,
  farmland,
  completedCropPerfections = [],
  externalCropMultiplier = 1,
) {
  return (
    getBaseFieldIncome(blueprint, completedCropPerfections) *
    getIncomeMultiplier(farmland) *
    Math.max(0, Number(externalCropMultiplier) || 0)
  )
}

export function getColumnsProducedPerSecond(
  hamsters,
  postUnionHamstersHired = 0,
  cropHamsterEfficiencyMultiplier = 1,
  hamsterExternalMultiplier = 1,
) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))

  return (
    safeHamsters *
    COLUMNS_PER_HAMSTER_PER_SECOND *
    getHamsterCoordinationMultiplier(safeHamsters, postUnionHamstersHired) *
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
  completedCropPerfections = [],
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
  externalCropMultiplier = 1,
) {
  return (
    getCropProductionPerSecond(
      blueprint,
      farmland,
      completedCropPerfections,
      externalCropMultiplier,
    ) *
    (tickIntervalMs / 1000)
  )
}

export function getColumnsProducedForTick(
  hamsters,
  postUnionHamstersHired = 0,
  cropHamsterEfficiencyMultiplier = 1,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
  hamsterExternalMultiplier = 1,
) {
  return (
    getColumnsProducedPerSecond(
      hamsters,
      postUnionHamstersHired,
      cropHamsterEfficiencyMultiplier,
      hamsterExternalMultiplier,
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
