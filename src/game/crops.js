export const SWEET_POTATO_UNLOCK_HAMSTER_COUNT = 125
export const TURNIP_UNLOCK_CROP_COUNT = 1e8
export const CROP_PERFECTION_UNLOCK_CROP_COUNT = 1e9
export const APPLE_TREE_UNLOCK_CROP_COUNT = 5e13
export const CORN_REVEAL_HAMSTER_COUNT = 50
export const PUMPKIN_REVEAL_HAMSTER_COUNT = 500

export const CROP_DEFINITIONS = {
  leek: {
    name: 'Leek',
    icon: '🥬',
    baseYield: 1,
    hamsterEfficiencyBonus: 0,
    effectDescription: '1 Crop per slot',
    unlockDescription: 'Starting crop',
  },
  corn: {
    name: 'Corn',
    icon: '🌽',
    baseYield: 2,
    hamsterEfficiencyBonus: -0.1,
    effectDescription: '2 Crops per slot · −10% Hamster efficiency',
    unlockDescription: 'Unlocks after the first blueprint column expansion',
  },
  pumpkin: {
    name: 'Pumpkin',
    icon: '🎃',
    baseYield: 5,
    hamsterEfficiencyBonus: 0,
    adjacentCropEffectModifier: 0.5,
    effectDescription: '5 Crops per slot · halves adjacent crop buffs',
    unlockDescription: 'Unlocks after unionization',
  },
  sweetPotato: {
    name: 'Sweet Potato',
    icon: '🍠',
    baseYield: 1,
    hamsterEfficiencyBonus: 0.25,
    effectDescription: '1 Crop per slot · +25% Hamster efficiency',
    unlockDescription: `Unlocks at ${SWEET_POTATO_UNLOCK_HAMSTER_COUNT.toLocaleString()} Hamsters after Pumpkin`,
  },
  turnip: {
    name: 'Turnip',
    icon: '🫜',
    baseYield: 0.5,
    hamsterEfficiencyBonus: 0,
    adjacentCropEffectModifier: 2,
    effectDescription: '0.5 Crops per slot · doubles adjacent crop buffs',
    unlockDescription: `Unlocks at ${TURNIP_UNLOCK_CROP_COUNT.toLocaleString()} Crops`,
  },
  appleTree: {
    name: 'Apple Tree',
    icon: '🍎',
    baseYield: 10,
    hamsterEfficiencyBonus: 0,
    destroysAdjacentHarvests: true,
    externalCropBuffMultiplier: 2,
    effectDescription:
      '10 Crops per slot · destroys adjacent harvests · receives ×2 external Crop buffs',
    unlockDescription: 'Unlocks at 50T Crops',
  },
}

export const CROP_IDS = Object.keys(CROP_DEFINITIONS)

export const CROP_PERFECTIONS = {
  enrichingLeek: {
    id: 'enrichingLeek',
    cropId: 'leek',
    name: 'Enriching Leek',
    cost: 2e10,
    adjacentCropYieldBonus: 5,
    effectDescription: '+5 Crop yield to adjacent crops',
  },
  mirrorCorn: {
    id: 'mirrorCorn',
    cropId: 'corn',
    name: 'Mirror Corn',
    cost: 2e14,
    baseYield: 5,
    hamsterEfficiencyBonus: -0.5,
    diagonalTargetEffectBonus: 1,
    baseEffectDescription: '5 Crops per slot · −50% Hamster efficiency',
    effectDescription: 'Doubles one diagonally adjacent crop effect',
  },
}

export const CROP_PERFECTION_IDS = Object.keys(CROP_PERFECTIONS)

export function isKnownCrop(crop) {
  return CROP_IDS.includes(crop)
}

export function hasCropPerfection(completedCropPerfections, perfectionId) {
  return (
    Array.isArray(completedCropPerfections) &&
    completedCropPerfections.includes(perfectionId)
  )
}

export function getCropPerfection(cropId, completedCropPerfections) {
  return Object.values(CROP_PERFECTIONS).find(
    (perfection) =>
      perfection.cropId === cropId &&
      hasCropPerfection(completedCropPerfections, perfection.id),
  )
}

export function getCropName(cropId, completedCropPerfections) {
  return (
    getCropPerfection(cropId, completedCropPerfections)?.name ??
    CROP_DEFINITIONS[cropId]?.name ??
    cropId
  )
}

export function getCropEffectDescription(cropId, completedCropPerfections) {
  const cropDefinition = CROP_DEFINITIONS[cropId]
  const perfection = getCropPerfection(cropId, completedCropPerfections)

  if (!cropDefinition) {
    return cropId
  }

  return perfection
    ? `${perfection.baseEffectDescription ?? cropDefinition.effectDescription} · ${perfection.effectDescription}`
    : cropDefinition.effectDescription
}

export function isCropEffectModifier(cropId) {
  return Boolean(CROP_DEFINITIONS[cropId]?.adjacentCropEffectModifier)
}

export function getAdjacentCropYieldBonus(cropId, completedCropPerfections) {
  return (
    getCropPerfection(cropId, completedCropPerfections)
      ?.adjacentCropYieldBonus ?? 0
  )
}

export function getUnlockedCropIds(
  blueprint,
  unionized,
  hamsters = 0,
  hasUnlockedTurnip = false,
  hasUnlockedAppleTree = false,
) {
  const unlockedCrops = ['leek']

  if (blueprint.columns > 1) {
    unlockedCrops.push('corn')
  }
  if (unionized) {
    unlockedCrops.push('pumpkin')
  }
  if (unionized && hamsters >= SWEET_POTATO_UNLOCK_HAMSTER_COUNT) {
    unlockedCrops.push('sweetPotato')
  }
  if (hasUnlockedTurnip) {
    unlockedCrops.push('turnip')
  }
  if (hasUnlockedAppleTree) {
    unlockedCrops.push('appleTree')
  }

  return unlockedCrops
}

export function getVisibleCropIds(unlockedCropIds, totalHamstersHired = 0) {
  const visibleCropIds = ['leek']

  for (let index = 1; index < CROP_IDS.length; index += 1) {
    const cropId = CROP_IDS[index]
    const previousCropId = CROP_IDS[index - 1]

    if (!unlockedCropIds.includes(previousCropId)) {
      break
    }

    if (
      cropId === 'corn' &&
      totalHamstersHired < CORN_REVEAL_HAMSTER_COUNT
    ) {
      break
    }

    if (
      cropId === 'pumpkin' &&
      totalHamstersHired < PUMPKIN_REVEAL_HAMSTER_COUNT
    ) {
      break
    }

    visibleCropIds.push(cropId)
  }

  return visibleCropIds
}
