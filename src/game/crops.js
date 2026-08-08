export const SWEET_POTATO_UNLOCK_HAMSTER_COUNT = 125
export const TURNIP_UNLOCK_CROP_COUNT = 1e8
export const CROP_PERFECTION_UNLOCK_CROP_COUNT = 1e9
export const APPLE_TREE_UNLOCK_CROP_COUNT = 5e13
export const LENTIL_UNLOCK_CROP_COUNT = 8e15
export const KNOTWEED_UNLOCK_CROP_COUNT = 2e18
export const ROOT_TUNNEL_UNLOCK_CROP_COUNT = 216e18
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
    hasDebuff: true,
    effectDescription: '2 Crops per slot · −10% Hamster efficiency',
    unlockDescription: 'Unlocks after the first blueprint column expansion',
  },
  pumpkin: {
    name: 'Pumpkin',
    icon: '🎃',
    baseYield: 5,
    hamsterEfficiencyBonus: 0,
    adjacentCropEffectModifier: 0.5,
    hasDebuff: true,
    effectDescription: '5 Crops per slot · halves adjacent crop buffs',
    unlockDescription: 'Unlocks after unionization',
  },
  sweetPotato: {
    name: 'Potato',
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
    hasDebuff: true,
    externalCropBuffMultiplier: 2,
    effectDescription:
      '10 Crops per slot · destroys adjacent harvests · receives ×2 external Crop buffs',
    unlockDescription: 'Unlocks at 50T Crops',
  },
  lentil: {
    name: 'Lentil',
    icon: '🫘',
    baseYield: 25,
    hamsterEfficiencyBonus: 0,
    globalHarvestMultiplier: 1.25,
    canBeMirrorCornTarget: false,
    effectDescription: '25 Crops per slot · ×1.25 all Crop harvest',
    unlockDescription: 'Unlocks at 8 Qd Crops',
  },
  knotweed: {
    name: 'Knotweed',
    icon: '🌿',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    adjacentHarvestModifier: -10,
    doesNotHarvest: true,
    hasDebuff: true,
    isHarmful: true,
    effectDescription: '0 Crops per slot · −10 adjacent Crop harvest',
    unlockDescription: 'Unlocks at 2 Qn Crops',
  },
  rootTunnel: {
    name: 'Root Tunnel',
    icon: '🕳️',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    doesNotHarvest: true,
    transfersAdjacencies: true,
    canBeMirrorCornTarget: false,
    effectDescription:
      'Transfers non-modifier crop adjacencies through this plot',
    unlockDescription: 'Unlocks at 216 Qn Crops',
  },
  sunflower: {
    name: 'Sunflower',
    icon: '🌻',
    baseYield: 1,
    hamsterEfficiencyBonus: 0,
    rowDuplicatorEffectivenessBonus: 0.2,
    effectDescription:
      '1 Crop per slot · +20% Row Duplicator effectiveness',
    unlockDescription: 'Unlocks with Row Duplicators',
  },
  leechingGourd: {
    name: 'Leeching Gourd',
    icon: '🎃',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    doesNotHarvest: true,
    isLeechingGourdAnchor: true,
    canBeMirrorCornTarget: false,
    internalOnly: true,
    effectDescription:
      '+5% all Turnip effectiveness per adjacent debuff; harmful crops count twice',
  },
  leechingGourdPart: {
    name: 'Leeching Gourd',
    icon: '',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    doesNotHarvest: true,
    isLeechingGourdPart: true,
    canBeMirrorCornTarget: false,
    internalOnly: true,
    effectDescription: 'Part of a Leeching Gourd',
  },
}

const KNOWN_CROP_IDS = Object.keys(CROP_DEFINITIONS)
export const CROP_IDS = KNOWN_CROP_IDS.filter(
  (cropId) => CROP_DEFINITIONS[cropId].internalOnly !== true,
)

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
  leechingGourd: {
    id: 'leechingGourd',
    cropId: 'pumpkin',
    name: 'Leeching Gourd',
    cost: 2e18,
    baseEffectDescription: 'Occupies one 2×2 block and produces no Crops',
    effectDescription:
      '+5% all Turnip effectiveness per adjacent debuff; harmful crops count twice',
  },
}

export const CROP_PERFECTION_IDS = Object.keys(CROP_PERFECTIONS)

export function isKnownCrop(crop) {
  return KNOWN_CROP_IDS.includes(crop)
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
  const perfection = getCropPerfection(cropId, completedCropPerfections)

  // Leeching Gourd is a special 2x2 placement that replaces the Pumpkin
  // palette option. Existing Pumpkins retain their identity after the
  // perfection is unlocked, so saves never silently rewrite planted crops.
  if (cropId === 'pumpkin' && perfection?.id === 'leechingGourd') {
    return CROP_DEFINITIONS.pumpkin.name
  }

  return (
    perfection?.name ??
    CROP_DEFINITIONS[cropId]?.name ??
    cropId
  )
}

export function getCropPlacementName(cropId, completedCropPerfections) {
  const perfection = getCropPerfection(cropId, completedCropPerfections)

  return cropId === 'pumpkin' && perfection?.id === 'leechingGourd'
    ? perfection.name
    : getCropName(cropId, completedCropPerfections)
}

export function getCropEffectDescription(cropId, completedCropPerfections) {
  const cropDefinition = CROP_DEFINITIONS[cropId]
  const perfection = getCropPerfection(cropId, completedCropPerfections)

  if (!cropDefinition) {
    return cropId
  }

  if (cropId === 'pumpkin' && perfection?.id === 'leechingGourd') {
    return cropDefinition.effectDescription
  }

  return perfection
    ? `${perfection.baseEffectDescription ?? cropDefinition.effectDescription} · ${perfection.effectDescription}`
    : cropDefinition.effectDescription
}

export function getCropPlacementEffectDescription(
  cropId,
  completedCropPerfections,
) {
  const cropDefinition = CROP_DEFINITIONS[cropId]
  const perfection = getCropPerfection(cropId, completedCropPerfections)

  if (!cropDefinition) {
    return cropId
  }

  return perfection
    ? `${perfection.baseEffectDescription ?? cropDefinition.effectDescription} Â· ${perfection.effectDescription}`
    : cropDefinition.effectDescription
}

export function isCropEffectModifier(cropId) {
  return Boolean(CROP_DEFINITIONS[cropId]?.adjacentCropEffectModifier)
}

export function canBeMirrorCornTarget(cropId) {
  return CROP_DEFINITIONS[cropId]?.canBeMirrorCornTarget !== false
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
  hasUnlockedLentil = false,
  hasUnlockedKnotweed = false,
  hasUnlockedRootTunnel = false,
  hasUnlockedRowDuplicators = false,
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
  if (hasUnlockedLentil) {
    unlockedCrops.push('lentil')
  }
  if (hasUnlockedKnotweed) {
    unlockedCrops.push('knotweed')
  }
  if (hasUnlockedRootTunnel) {
    unlockedCrops.push('rootTunnel')
  }
  if (hasUnlockedRowDuplicators) {
    unlockedCrops.push('sunflower')
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
