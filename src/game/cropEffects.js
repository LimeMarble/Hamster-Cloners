import {
  applyMonocropPenaltyToBonus,
  applyMonocropPenaltyToEffectMultiplier,
  getMonocropThreshold,
  getMonocropYieldMultiplier,
} from './monocropPenalty.js'
import {
  CROP_DEFINITIONS,
  CROP_EFFECT_BYPASS_TIERS,
  canBeMirrorCornTarget,
  canCropPassiveBeAffectedBy,
  getAdjacentCropYieldBonus,
  getCropPerfection,
} from './crops.js'
import {
  getAdjacentCropConnections,
  getLeechingGourdAdjacentCropConnections,
  getRootTunnelAdjacencyStrength,
} from './adjacencyLogic.js'
import {
  getSplitweedAnchorIndex,
  getSplitweedFootprint,
} from './cropFootprintLogic.js'

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

export function getMonocropCropCount(blueprint, crop) {
  return (
    getPlantedCropCount(blueprint, crop) *
    (CROP_DEFINITIONS[crop]?.monocropCountWeight ?? 1)
  )
}

export function getMonocropThresholdBonus(
  blueprint,
  completedCropPerfections = [],
) {
  const splitweed = getCropPerfection(
    'knotweed',
    completedCropPerfections,
  )

  return (
    getPlantedCropCount(blueprint, 'knotweed') *
    (splitweed?.monocropThresholdBonusPerCrop ?? 0)
  )
}

function getMonocropAdjustedCropBonus(
  blueprint,
  crop,
  bonus,
  completedCropPerfections = [],
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
    getMonocropThresholdBonus(blueprint, completedCropPerfections),
  )
}

function getMonocropAdjustedCropEffectMultiplier(
  blueprint,
  crop,
  effectMultiplier,
  completedCropPerfections = [],
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
    getMonocropThresholdBonus(blueprint, completedCropPerfections),
  )
}

export function getBlueprintMonocropMultiplier(
  blueprint,
  completedCropPerfections = [],
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const thresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
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
) {
  const fieldSize = blueprint.rows * blueprint.columns
  const thresholdBonus = getMonocropThresholdBonus(
    blueprint,
    completedCropPerfections,
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
) {
  const nearestConnections = new Map()

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

  return {
    adjacencyEffects,
    debuffContribution,
    multiplier: 1 + debuffContribution * 0.05 * passiveEffectMultiplier,
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

export function getAdjacentCropEffectMultiplier(
  blueprint,
  index,
  crop,
  isDebuff = false,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
) {
  const gourdDebuffMultiplier = isDebuff
    ? getLeechingGourdDebuffMultiplier(blueprint, index)
    : 1

  if (
    !canCropPassiveBeAffectedBy(
      crop,
      CROP_EFFECT_BYPASS_TIERS.STANDARD,
    )
  ) {
    return gourdDebuffMultiplier
  }

  return (
    gourdDebuffMultiplier *
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
) {
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
        )
      const strength =
        (1 - baseDestructionMultiplier) *
        passiveEffectMultiplier *
        getAdjacentCropEffectMultiplier(
          blueprint,
          sourceIndex,
          sourceCrop,
          true,
          completedCropPerfections,
          passiveEffectMultiplier,
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
) {
  return getAdjacentHarvestDestructionEffects(
    blueprint,
    index,
    completedCropPerfections,
    passiveEffectMultiplier,
  ).reduce(
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

  const targetCount = (blueprint.mirrorCornTargets ?? []).reduce(
    (targetCount, linkedTargetIndex, sourceIndex) =>
      linkedTargetIndex === targetIndex && blueprint.cells[sourceIndex] === 'corn'
        ? targetCount + 1
        : targetCount,
    0,
  )

  return Math.min(targetCount, mirrorCorn.maximumReflectionsPerTile)
}

export function getSplitweedMirrorCornEffectivenessBonus(
  blueprint,
  completedCropPerfections = [],
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
  )
}

export function getMirrorCornEffectMultiplier(
  blueprint,
  targetIndex,
  completedCropPerfections,
  passiveEffectMultiplier = 1,
) {
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)
  const mirrorCornTargetCount = getMirrorCornTargetCount(
    blueprint,
    targetIndex,
    completedCropPerfections,
  )

  const mirrorCornEffectiveness =
    (mirrorCorn?.diagonalTargetEffectMultiplier ?? 1) +
    getSplitweedMirrorCornEffectivenessBonus(
      blueprint,
      completedCropPerfections,
    )

  return (
    getMonocropAdjustedCropEffectMultiplier(
      blueprint,
      'corn',
      mirrorCornEffectiveness,
      completedCropPerfections,
    ) * passiveEffectMultiplier
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

export function getGlobalPassiveEffectMultiplier(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
) {
  const splitweed = getCropPerfection(
    'knotweed',
    completedCropPerfections,
  )

  if (splitweed?.globalPassiveEffectMultiplier === undefined) {
    return passiveEffectMultiplier
  }

  return blueprint.cells.reduce((multiplier, crop, index) => {
    if (crop !== 'knotweed') {
      return multiplier
    }

    return (
      multiplier *
      (1 -
        (1 - splitweed.globalPassiveEffectMultiplier) *
          getLeechingGourdDebuffMultiplier(blueprint, index))
    )
  }, passiveEffectMultiplier)
}

export function getGlobalHamsterEfficiencyEffects(
  blueprint,
  completedCropPerfections = [],
  rowsProducedPerSecond = 0,
  passiveEffectMultiplier = 1,
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
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
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
) {
  return (
    1 +
    getGlobalHamsterEfficiencyEffects(
      blueprint,
      completedCropPerfections,
      rowsProducedPerSecond,
      passiveEffectMultiplier,
    ).reduce((totalBonus, effect) => totalBonus + effect.bonus, 0)
  )
}

export function getGlobalRowProductionEffects(
  blueprint,
  activeHamsters = 0,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
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
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
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
) {
  return getGlobalRowProductionEffects(
    blueprint,
    activeHamsters,
    completedCropPerfections,
    passiveEffectMultiplier,
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
        ).multiplier
      : adjacentCropEffectModifier
  const monocropAdjustedBaseMultiplier =
    getMonocropAdjustedCropEffectMultiplier(
      blueprint,
      crop,
      baseMultiplier,
      completedCropPerfections,
    )
  const fortuneAdjustedBaseMultiplier =
    monocropAdjustedBaseMultiplier >= 1
      ? monocropAdjustedBaseMultiplier * passiveEffectMultiplier
      : monocropAdjustedBaseMultiplier / passiveEffectMultiplier
  const strength = getRootTunnelAdjacencyStrength(adjacencyDistance)

  // Turnip's entire ×2-style modifier travels through the tunnel, rather
  // than only its +1 above baseline. At ×0.8 per tile it remains a small buff
  // at distance 3, then becomes a debuff from distance 4 onward.
  return crop === 'turnip'
    ? fortuneAdjustedBaseMultiplier * strength
    : 1 + (fortuneAdjustedBaseMultiplier - 1) * strength
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

export function getGlobalHarvestEffects(
  blueprint,
  completedCropPerfections = [],
  rabbitContractsCompleted = 0,
  passiveEffectMultiplier = 1,
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
    )

  return blueprint.cells.flatMap((crop, index) => {
    const definition = CROP_DEFINITIONS[crop]
    const globalHarvestMultiplier =
      crop === 'carrot'
        ? 1 +
          getCarrotContractBonus(
            definition,
            'globalHarvestBonusAtZero',
            'globalHarvestBonusPerContract',
            rabbitContractsCompleted,
          )
        : definition?.globalHarvestMultiplier

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
      )

    return [
      {
        sourceCropId: crop,
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
) {
  const bonusesByCrop = new Map()

  getGlobalHarvestEffects(
    blueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
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
) {
  const effectsByCrop = new Map()

  getGlobalHarvestEffects(
    blueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
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

export function getRabbitRelationsEffects(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
) {

  const sourceCropId = 'carrot'
  const definition = CROP_DEFINITIONS[sourceCropId]
  const count = getPlantedCropCount(blueprint, sourceCropId)

  if (!definition || count === 0) {
    return []
  }

  const fieldSize = blueprint.rows * blueprint.columns
  const cropCount = getMonocropCropCount(blueprint, sourceCropId)
  const bonusPerCarrot = definition.rabbitRelationsBonusAtZero ?? 0
  const baseBonus =
    applyMonocropPenaltyToBonus(
      bonusPerCarrot,
      cropCount,
      fieldSize,
      getMonocropThresholdBonus(blueprint, completedCropPerfections),
    ) *
    getGlobalPassiveEffectMultiplier(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
    )
  const bonus = blueprint.cells.reduce((totalBonus, crop, index) => {
    if (crop !== sourceCropId) {
      return totalBonus
    }

    return (
      totalBonus +
      baseBonus *
        getAdjacentCropEffectMultiplier(
          blueprint,
          index,
          sourceCropId,
          false,
          completedCropPerfections,
          passiveEffectMultiplier,
        )
    )
  }, 0)

  return [{ sourceCropId, count, bonus, multiplier: 1 + bonus }]
}

export function getRabbitRelationsMultiplier(
  blueprint,
  completedCropPerfections = [],
  passiveEffectMultiplier = 1,
) {
  return getRabbitRelationsEffects(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
  ).reduce((multiplier, effect) => multiplier * effect.multiplier, 1)
}
export function getAdjacentHarvestModifier(
  blueprint,
  crop,
  completedCropPerfections,
  passiveEffectMultiplier = 1,
) {
  const effectCrop = crop === 'splitweedPart' ? 'knotweed' : crop

  return getMonocropAdjustedCropBonus(
    blueprint,
    effectCrop,
    getAdjacentCropYieldBonus(effectCrop, completedCropPerfections) +
      (CROP_DEFINITIONS[effectCrop]?.adjacentHarvestModifier ?? 0),
    completedCropPerfections,
  ) * passiveEffectMultiplier
}

export function getExternalCropBuffMultiplier(
  blueprint,
  index,
  crop,
  completedCropPerfections,
  passiveEffectMultiplier = 1,
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
    ) * passiveEffectMultiplier

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
    adjustedExternalCropBuffMultiplier *
    getMonocropAdjustedCropEffectMultiplier(
      blueprint,
      'corn',
      mirrorCorn?.diagonalTargetEffectMultiplier ?? 1,
      completedCropPerfections,
    ) *
    passiveEffectMultiplier
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
