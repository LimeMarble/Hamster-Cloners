import {
  getMonocropThreshold,
  getMonocropYieldMultiplier,
} from './monocropPenalty.js'
import {
  CROP_DEFINITIONS,
  canBeMirrorCornTarget,
  getAdjacentCropYieldBonus,
  getCropPerfection,
  isCropEffectModifier,
} from './crops.js'
import {
  getAdjacentCropConnections,
  getLeechingGourdAdjacentCropConnections,
  getRootTunnelAdjacencyStrength,
} from './adjacencyLogic.js'

export {
  getAdjacentCropConnections,
  getAdjacentCropIndexes,
  getConnectedRootTunnelIndexes,
  getLeechingGourdAdjacentCropIndexes,
  getOrthogonalIndexes,
  getRootTunnelAdjacencyStrength,
  isRootTunnel,
} from './adjacencyLogic.js'

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

export function getLeechingGourdTurnipEffect(blueprint) {
  const adjacencyEffects = getLeechingGourdAdjacentCropConnections(
    blueprint,
  ).flatMap(({ index, adjacencyDistance }) => {
    const crop = blueprint.cells[index]
    const definition = CROP_DEFINITIONS[crop]

    if (!definition?.hasDebuff) {
      return []
    }

    const strength = getRootTunnelAdjacencyStrength(adjacencyDistance)
    return [
      {
        index,
        crop,
        adjacencyDistance,
        strength,
        contribution: (definition.isHarmful ? 2 : 1) * strength,
      },
    ]
  })
  const debuffContribution = adjacencyEffects.reduce(
    (total, effect) => total + effect.contribution,
    0,
  )

  return {
    adjacencyEffects,
    debuffContribution,
    multiplier: 1 + debuffContribution * 0.05,
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

export function getAdjacentCropEffectMultiplier(blueprint, index, crop) {
  if (isCropEffectModifier(crop)) {
    return 1
  }

  return getAdjacentCropConnections(blueprint, index).reduce(
    (multiplier, { index: neighborIndex, adjacencyDistance }) =>
      multiplier *
      getAdjacentCropEffectModifier(
        blueprint,
        blueprint.cells[neighborIndex],
        crop,
        adjacencyDistance,
      ),
    1,
  )
}

export function destroysAdjacentHarvests(crop) {
  return CROP_DEFINITIONS[crop]?.destroysAdjacentHarvests === true
}

export function doesNotHarvest(crop) {
  return CROP_DEFINITIONS[crop]?.doesNotHarvest === true
}

export function getAdjacentHarvestDestructionEffects(blueprint, index) {
  return getAdjacentCropConnections(blueprint, index).flatMap(
    ({ index: sourceIndex, adjacencyDistance }) => {
      if (!destroysAdjacentHarvests(blueprint.cells[sourceIndex])) {
        return []
      }

      const strength = getRootTunnelAdjacencyStrength(adjacencyDistance)
      return [
        {
          sourceIndex,
          adjacencyDistance,
          strength,
          multiplier: 1 - strength,
        },
      ]
    },
  )
}

export function getAdjacentHarvestDestructionMultiplier(blueprint, index) {
  return getAdjacentHarvestDestructionEffects(blueprint, index).reduce(
    (multiplier, effect) => multiplier * effect.multiplier,
    1,
  )
}

export function getMirrorCornTargetCount(
  blueprint,
  targetIndex,
  completedCropPerfections,
) {
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)

  if (!mirrorCorn?.diagonalTargetEffectMultiplier) {
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

export function getMirrorCornEffectMultiplier(
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
    mirrorCorn?.diagonalTargetEffectMultiplier ?? 1
  ) ** mirrorCornTargetCount
}

export function getCropBaseYield(crop, completedCropPerfections) {
  return (
    getCropPerfection(crop, completedCropPerfections)?.baseYield ??
    CROP_DEFINITIONS[crop]?.baseYield ??
    0
  )
}

export function getCropHamsterEfficiencyBonus(crop, completedCropPerfections) {
  return (
    getCropPerfection(crop, completedCropPerfections)?.hamsterEfficiencyBonus ??
    CROP_DEFINITIONS[crop]?.hamsterEfficiencyBonus ??
    0
  )
}

export function getAdjacentCropEffectModifier(
  blueprint,
  crop,
  targetCrop,
  adjacencyDistance = 0,
) {
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

  const baseMultiplier =
    crop === 'turnip'
      ? adjacentCropEffectModifier *
        getLeechingGourdTurnipEffect(blueprint).multiplier
      : adjacentCropEffectModifier
  const strength = getRootTunnelAdjacencyStrength(adjacencyDistance)

  // Turnip's entire ×2-style modifier travels through the tunnel, rather
  // than only its +1 above baseline. At ×0.8 per tile it remains a small buff
  // at distance 3, then becomes a debuff from distance 4 onward.
  return crop === 'turnip'
    ? baseMultiplier * strength
    : 1 + (baseMultiplier - 1) * strength
}

export function getGlobalHarvestEffects(blueprint) {
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

export function getGlobalHarvestMultiplier(blueprint) {
  return 1 + getGlobalHarvestEffects(blueprint).reduce(
    (totalBonus, effect) => totalBonus + effect.bonus,
    0,
  )
}

export function getGroupedGlobalHarvestEffects(blueprint) {
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

export function getAdjacentHarvestModifier(crop, completedCropPerfections) {
  return (
    getAdjacentCropYieldBonus(crop, completedCropPerfections) +
    (CROP_DEFINITIONS[crop]?.adjacentHarvestModifier ?? 0)
  )
}

export function getExternalCropBuffMultiplier(
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
          baseExternalCropBuffMultiplier *
            getAdjacentCropEffectModifier(
              blueprint,
              blueprint.cells[neighborIndex],
              crop,
              adjacencyDistance,
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
    (mirrorCorn?.diagonalTargetEffectMultiplier ?? 1)
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
    : baseExternalCropBuffMultiplier
}
