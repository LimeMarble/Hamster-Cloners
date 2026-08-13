import { getMonocropYieldMultiplier } from './monocropPenalty.js'
import { CROP_DEFINITIONS, isCropEffectModifier } from './crops.js'
import {
  doesNotHarvest,
  getAdjacentCropConnections,
  getAdjacentCropEffectModifier,
  getAdjacentCropEffectMultiplier,
  getAdjacentHarvestDestructionEffects,
  getAdjacentHarvestDestructionMultiplier,
  getAdjacentHarvestModifier,
  getCropBaseYield,
  getCropHamsterEfficiencyBonus,
  getExternalCropBuffMultiplier,
  getGlobalHamsterEfficiencyEffects,
  getGlobalHarvestMultiplier,
  getGroupedGlobalHarvestEffects,
  getLeechingGourdTurnipEffect,
  getMirrorCornEffectMultiplier,
  getMirrorCornTargetCount,
  getPlantedCropCount,
  getRootTunnelAdjacencyStrength,
} from './cropEffects.js'

export function getBlueprintCropStats(
  blueprint,
  index,
  completedCropPerfections = [],
  rowsProducedPerSecond = 0,
) {
  const crop = blueprint.cells[index]
  const definition = CROP_DEFINITIONS[crop]

  if (!definition) {
    return null
  }

  const neighboringConnections = getAdjacentCropConnections(blueprint, index)
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

    neighboringConnections.forEach(
      ({ index: neighborIndex, adjacencyDistance }) => {
        const sourceCropId = blueprint.cells[neighborIndex]
        const baseMultiplier =
          CROP_DEFINITIONS[sourceCropId]?.adjacentCropEffectModifier

        if (baseMultiplier !== undefined) {
          const multiplier = getAdjacentCropEffectModifier(
            blueprint,
            sourceCropId,
            crop,
            adjacencyDistance,
          )

          if (multiplier === 1) {
            return
          }

          const currentStack = modifierStacksByCrop.get(sourceCropId) ?? {
            count: 0,
            multiplier: 1,
            adjacencyDistances: [],
          }

          modifierStacksByCrop.set(sourceCropId, {
            count: currentStack.count + 1,
            multiplier: currentStack.multiplier * multiplier,
            adjacencyDistances: [
              ...currentStack.adjacencyDistances,
              adjacencyDistance,
            ],
          })
        }
      },
    )

    modifierStacksByCrop.forEach(
      ({ count, multiplier, adjacencyDistances }, sourceCropId) => {
        const tunneledDistances = adjacencyDistances.filter(
          (adjacencyDistance) => adjacencyDistance > 0,
        )

        receivedEffects.push({
          type: 'crop-effect-modifier',
          sourceCropId,
          count,
          multiplier,
          ...(tunneledDistances.length > 0
            ? { adjacencyDistances: tunneledDistances }
            : {}),
        })
      },
    )
  }

  if (crop === 'turnip') {
    const leechingGourdEffect = getLeechingGourdTurnipEffect(blueprint)

    if (leechingGourdEffect.debuffContribution > 0) {
      const tunneledDistances = leechingGourdEffect.adjacencyEffects
        .map((effect) => effect.adjacencyDistance)
        .filter((adjacencyDistance) => adjacencyDistance > 0)

      receivedEffects.push({
        type: 'leeching-gourd',
        count: leechingGourdEffect.debuffContribution,
        multiplier: leechingGourdEffect.multiplier,
        ...(tunneledDistances.length > 0
          ? { adjacencyDistances: tunneledDistances }
          : {}),
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

  neighboringConnections.forEach(
    ({ index: neighborIndex, adjacencyDistance }) => {
      const sourceCropId = blueprint.cells[neighborIndex]
      const baseCropYieldBonus = getAdjacentHarvestModifier(
        blueprint,
        sourceCropId,
        completedCropPerfections,
      )
      const adjacencyStrength = getRootTunnelAdjacencyStrength(adjacencyDistance)
      const cropYieldBonus =
        baseCropYieldBonus *
        adjacencyStrength *
        getAdjacentCropEffectMultiplier(
          blueprint,
          neighborIndex,
          sourceCropId,
          baseCropYieldBonus < 0,
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
          adjacencyDistances: [],
        }

        cropYieldBonusesByCrop.set(sourceCropId, {
          count: currentBonus.count + 1,
          bonus: currentBonus.bonus + cropYieldBonus,
          adjacencyDistances: [
            ...currentBonus.adjacencyDistances,
            adjacencyDistance,
          ],
        })
      }
    },
  )

  cropYieldBonusesByCrop.forEach(
    ({ count, bonus, adjacencyDistances }, sourceCropId) => {
      const tunneledDistances = adjacencyDistances.filter(
        (adjacencyDistance) => adjacencyDistance > 0,
      )

      receivedEffects.push({
        type: 'crop-yield',
        sourceCropId,
        count,
        bonus,
        ...(tunneledDistances.length > 0
          ? { adjacencyDistances: tunneledDistances }
          : {}),
      })
    },
  )

  const harvestDestructionEffects =
    getAdjacentHarvestDestructionEffects(blueprint, index)
  const harvestDestructionMultiplier =
    getAdjacentHarvestDestructionMultiplier(blueprint, index)
  const harvestDestroyedByAppleTree = harvestDestructionMultiplier === 0
  const adjacentYieldBonus = neighboringConnections.reduce(
    (totalBonus, { index: neighborIndex, adjacencyDistance }) => {
      const sourceCropId = blueprint.cells[neighborIndex]
      const baseCropYieldBonus = getAdjacentHarvestModifier(
        blueprint,
        sourceCropId,
        completedCropPerfections,
      )
      const adjacencyStrength = getRootTunnelAdjacencyStrength(adjacencyDistance)

      return (
        totalBonus +
        baseCropYieldBonus *
          adjacencyStrength *
          getAdjacentCropEffectMultiplier(
            blueprint,
            neighborIndex,
            sourceCropId,
            baseCropYieldBonus < 0,
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
    baseHamsterEfficiencyBonus !== 0
      ? getAdjacentCropEffectMultiplier(
          blueprint,
          index,
          crop,
          baseHamsterEfficiencyBonus < 0,
        )
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
  const globalHamsterEfficiencyEffects =
    getGlobalHamsterEfficiencyEffects(
      blueprint,
      completedCropPerfections,
      rowsProducedPerSecond,
    )
  const globalHarvestMultiplier = getGlobalHarvestMultiplier(blueprint)
  const harvestYield = doesNotHarvest(crop) || harvestDestroyedByAppleTree
    ? 0
    : (getCropBaseYield(crop, completedCropPerfections) +
        adjacentYieldBonus * (externalCropBuffMultiplier ?? 1)) *
      monocropMultiplier *
      globalHarvestMultiplier *
      harvestDestructionMultiplier

  globalHarvestEffects.forEach((effect) => {
    receivedEffects.push({ type: 'global-harvest', ...effect })
  })
  globalHamsterEfficiencyEffects.forEach((effect) => {
    receivedEffects.push({ type: 'global-hamster-efficiency', ...effect })
  })

  if (harvestDestructionEffects.length > 0) {
    const tunneledDistances = harvestDestructionEffects
      .map((effect) => effect.adjacencyDistance)
      .filter((adjacencyDistance) => adjacencyDistance > 0)

    receivedEffects.push({
      type: 'harvest-destruction',
      ...(harvestDestructionMultiplier > 0
        ? { multiplier: harvestDestructionMultiplier }
        : {}),
      ...(tunneledDistances.length > 0
        ? { adjacencyDistances: tunneledDistances }
        : {}),
    })
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
