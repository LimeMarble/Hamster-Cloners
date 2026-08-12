import { getMonocropYieldMultiplier } from './monocropPenalty.js'
import { CROP_DEFINITIONS, isCropEffectModifier } from './crops.js'
import {
  destroysAdjacentHarvests,
  doesNotHarvest,
  getAdjacentCropEffectModifier,
  getAdjacentCropEffectMultiplier,
  getAdjacentCropIndexes,
  getAdjacentHarvestModifier,
  getCropBaseYield,
  getCropHamsterEfficiencyBonus,
  getExternalCropBuffMultiplier,
  getGlobalHarvestMultiplier,
  getGroupedGlobalHarvestEffects,
  getLeechingGourdTurnipEffect,
  getMirrorCornEffectMultiplier,
  getMirrorCornTargetCount,
  getPlantedCropCount,
} from './cropEffects.js'

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
