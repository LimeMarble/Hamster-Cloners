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
  getLeechingGourdFootprint,
  isLeechingGourdAnchor,
  isLeechingGourdCell,
} from './blueprintLogic.js'

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

export function getOrthogonalIndexes(blueprint, index) {
  const { rows, columns } = blueprint
  const row = Math.floor(index / columns)
  const column = index % columns
  const neighboringIndexes = []

  if (row > 0) {
    neighboringIndexes.push(index - columns)
  }
  if (row < rows - 1) {
    neighboringIndexes.push(index + columns)
  }
  if (column > 0) {
    neighboringIndexes.push(index - 1)
  }
  if (column < columns - 1) {
    neighboringIndexes.push(index + 1)
  }

  return neighboringIndexes
}

export function isRootTunnel(crop) {
  return CROP_DEFINITIONS[crop]?.transfersAdjacencies === true
}

export function getLeechingGourdAdjacentCropIndexes(blueprint) {
  const anchorIndex = blueprint.cells.findIndex(isLeechingGourdAnchor)

  if (anchorIndex === -1) {
    return []
  }

  const footprint = getLeechingGourdFootprint(blueprint, anchorIndex)

  if (footprint.length !== 4) {
    return []
  }

  return [
    ...new Set(
      footprint.flatMap((footprintIndex) =>
        getOrthogonalIndexes(blueprint, footprintIndex),
      ),
    ),
  ].filter((index) => {
    const crop = blueprint.cells[index]

    return crop && !isLeechingGourdCell(crop)
  })
}

export function getLeechingGourdTurnipEffect(blueprint) {
  const debuffContribution = getLeechingGourdAdjacentCropIndexes(
    blueprint,
  ).reduce((total, index) => {
    const definition = CROP_DEFINITIONS[blueprint.cells[index]]

    if (!definition?.hasDebuff) {
      return total
    }

    return total + (definition.isHarmful ? 2 : 1)
  }, 0)

  return {
    debuffContribution,
    multiplier: 1 + debuffContribution * 0.05,
  }
}

export function getConnectedRootTunnelIndexes(blueprint, startingIndexes) {
  const { cells } = blueprint
  const visitedIndexes = new Set()
  const pendingIndexes = [...startingIndexes]

  while (pendingIndexes.length > 0) {
    const tunnelIndex = pendingIndexes.pop()

    if (visitedIndexes.has(tunnelIndex) || !isRootTunnel(cells[tunnelIndex])) {
      continue
    }

    visitedIndexes.add(tunnelIndex)
    getOrthogonalIndexes(blueprint, tunnelIndex).forEach((neighborIndex) => {
      if (isRootTunnel(cells[neighborIndex])) {
        pendingIndexes.push(neighborIndex)
      }
    })
  }

  return [...visitedIndexes]
}

export function getAdjacentCropIndexes(blueprint, index) {
  const { cells } = blueprint
  const crop = cells[index]
  const orthogonalIndexes = getOrthogonalIndexes(blueprint, index)
  const directCropIndexes = orthogonalIndexes.filter(
    (neighborIndex) =>
      cells[neighborIndex] &&
      !isRootTunnel(cells[neighborIndex]) &&
      !isLeechingGourdCell(cells[neighborIndex]),
  )

  if (!crop || isCropEffectModifier(crop)) {
    return directCropIndexes
  }

  const connectedRootTunnelIndexes = getConnectedRootTunnelIndexes(
    blueprint,
    orthogonalIndexes.filter((neighborIndex) => isRootTunnel(cells[neighborIndex])),
  )
  const transferredCropIndexes = connectedRootTunnelIndexes.flatMap(
    (tunnelIndex) =>
      getOrthogonalIndexes(blueprint, tunnelIndex).filter(
      (tunnelNeighborIndex) => {
        const tunnelNeighborCrop = cells[tunnelNeighborIndex]

        return (
          tunnelNeighborIndex !== index &&
          tunnelNeighborCrop &&
          !isRootTunnel(tunnelNeighborCrop) &&
          !isLeechingGourdCell(tunnelNeighborCrop) &&
          !isCropEffectModifier(tunnelNeighborCrop)
        )
      },
      ),
  )

  return [...new Set([...directCropIndexes, ...transferredCropIndexes])]
}

export function getDiagonalCropIndexes(blueprint, index) {
  const { rows, columns, cells } = blueprint
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
        const targetIndex = targetRow * columns + targetColumn
        if (cells[targetIndex] && canBeMirrorCornTarget(cells[targetIndex])) {
          diagonalIndexes.push(targetIndex)
        }
      }
    }
  }

  return diagonalIndexes
}

export function getAdjacentCropEffectMultiplier(blueprint, index, crop) {
  if (isCropEffectModifier(crop)) {
    return 1
  }

  return getAdjacentCropIndexes(blueprint, index).reduce(
    (multiplier, neighborIndex) =>
      multiplier *
      getAdjacentCropEffectModifier(
        blueprint,
        blueprint.cells[neighborIndex],
        crop,
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

export function getMirrorCornTargetCount(
  blueprint,
  targetIndex,
  completedCropPerfections,
) {
  const mirrorCorn = getCropPerfection('corn', completedCropPerfections)

  if (!mirrorCorn?.diagonalTargetEffectBonus) {
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
    1 + (mirrorCorn?.diagonalTargetEffectBonus ?? 0)
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

export function getAdjacentCropEffectModifier(blueprint, crop, targetCrop) {
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

  if (crop === 'turnip') {
    return (
      adjacentCropEffectModifier *
      getLeechingGourdTurnipEffect(blueprint).multiplier
    )
  }

  return adjacentCropEffectModifier
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

  const adjacentEffectSourceMultipliers = getAdjacentCropIndexes(
    blueprint,
    index,
  ).flatMap((neighborIndex) => {
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
    (1 + (mirrorCorn?.diagonalTargetEffectBonus ?? 0))
  const externalEffectSourceMultipliers = [
    ...adjacentEffectSourceMultipliers,
    ...Array(mirrorCornTargetCount).fill(mirrorCornSourceMultiplier),
  ]

  // Apple Tree's receiver bonus applies to every external passive separately.
  // A Turnip therefore supplies ×4 (its ×2 effect received at ×2), while a
  // current Mirror Corn supplies ×4 after its percentage passive is received
  // by the tree.
  return externalEffectSourceMultipliers.length > 0
    ? externalEffectSourceMultipliers.reduce(
        (multiplier, sourceMultiplier) => multiplier * sourceMultiplier,
        1,
      )
    : baseExternalCropBuffMultiplier
}
