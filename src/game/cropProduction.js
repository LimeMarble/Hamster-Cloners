import { getMonocropYieldMultiplier } from './monocropPenalty.js'
import { CROP_DEFINITIONS } from './crops.js'
import {
  BASE_CROP_YIELD_PER_PLOT,
  COLUMNS_PER_HAMSTER_PER_SECOND,
  POST_UNION_HAMSTER_EFFICIENCY_GROWTH,
  ROWS_PER_ROW_DUPLICATOR_PER_SECOND,
  ROW_DUPLICATOR_INCOME_GROWTH,
  SIMULATION_TICK_INTERVAL_MS,
} from './gameConfig.js'
import { createFarmlandMultipliers } from './blueprintLogic.js'
import {
  destroysAdjacentHarvests,
  doesNotHarvest,
  getAdjacentCropEffectMultiplier,
  getAdjacentCropIndexes,
  getAdjacentHarvestModifier,
  getCropBaseYield,
  getCropHamsterEfficiencyBonus,
  getExternalCropBuffMultiplier,
  getGlobalHarvestMultiplier,
  getMirrorCornEffectMultiplier,
  getPlantedCropCount,
} from './cropEffects.js'

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

export function getRowsProducedPerSecond(
  rowDuplicators,
  rowDuplicatorEffectivenessMultiplier = 1,
) {
  const safeRowDuplicators = Math.max(
    0,
    Math.floor(Number(rowDuplicators) || 0),
  )

  return (
    safeRowDuplicators *
    ROWS_PER_ROW_DUPLICATOR_PER_SECOND *
    Math.max(0, Number(rowDuplicatorEffectivenessMultiplier) || 0)
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

export function getRowsProducedForTick(
  rowDuplicators,
  rowDuplicatorEffectivenessMultiplier = 1,
  tickIntervalMs = SIMULATION_TICK_INTERVAL_MS,
) {
  return (
    getRowsProducedPerSecond(
      rowDuplicators,
      rowDuplicatorEffectivenessMultiplier,
    ) *
    (tickIntervalMs / 1000)
  )
}
