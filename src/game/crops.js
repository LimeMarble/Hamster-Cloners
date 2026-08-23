export const SWEET_POTATO_UNLOCK_HAMSTER_COUNT = 125
export const TURNIP_UNLOCK_CROP_COUNT = 1e8
export const CROP_PERFECTION_UNLOCK_CROP_COUNT = 1e9
export const APPLE_TREE_UNLOCK_CROP_COUNT = 1e15
export const LENTIL_UNLOCK_CROP_COUNT = 8e16
export const KNOTWEED_UNLOCK_CROP_COUNT = 2e19
export const WHEAT_UNLOCK_CROP_COUNT = 1.25e32
export const SUNFLOWER_UNLOCK_CROP_COUNT = 1.42e44
export const CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT = 500
export const ROOT_TUNNEL_UNLOCK_CROP_COUNT = Number.POSITIVE_INFINITY
export const CORN_REVEAL_HAMSTER_COUNT = 50
export const PUMPKIN_REVEAL_HAMSTER_COUNT = 500

export const CROP_EFFECT_BYPASS_TIERS = Object.freeze({
  STANDARD: 1,
  MONOCROP: 5,
})

export const CROP_DEFINITIONS = {
  leek: {
    name: 'Leek',
    icon: '🥬',
    image: new URL('../assets/leek.png', import.meta.url).href,
    baseYield: 1,
    hamsterEfficiencyBonus: 0,
    effectDescription: '1 Crop per slot',
    unlockDescription: 'Starting crop',
  },
  corn: {
    name: 'Corn',
    icon: '🌽',
    image: new URL('../assets/corn.png', import.meta.url).href,
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
    passiveProtectionTier: 2,
    modifiesDebuffs: true,
    hasDebuff: true,
    effectDescription: '5 Crops per slot · halves adjacent crop buffs and debuffs',
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
    icon: '🥕',
    image: new URL('../assets/turnip.png', import.meta.url).href,
    baseYield: 0.5,
    hamsterEfficiencyBonus: 0,
    adjacentCropEffectModifier: 2,
    passiveProtectionTier: 2,
    effectDescription: '0.5 Crops per slot · doubles adjacent crop buffs',
    unlockDescription: `Unlocks at ${TURNIP_UNLOCK_CROP_COUNT.toLocaleString()} Crops`,
  },
  appleTree: {
    name: 'Apple Sapling',
    icon: '🍎',
    baseYield: 10,
    hamsterEfficiencyBonus: 0,
    destroysAdjacentHarvests: true,
    hasDebuff: true,
    externalCropBuffMultiplier: 1.8,
    effectDescription:
      '10 Crops per slot · destroys adjacent harvests · receives ×1.8 external Crop buffs',
    unlockDescription: 'Unlocks at 1 Qd Crops',
  },
  lentil: {
    name: 'Lentil',
    icon: '🌱',
    baseYield: 25,
    hamsterEfficiencyBonus: 0,
    globalHarvestMultiplier: 1.25,
    canBeMirrorCornTarget: false,
    effectDescription: '25 Crops per slot · ×1.25 all Crop harvest',
    unlockDescription: 'Unlocks at 80 Qd Crops',
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
    unlockDescription: 'Unlocks at 20 Qn Crops',
  },
  wheat: {
    name: 'Wheat',
    icon: '🌾',
    baseYield: 100,
    hamsterEfficiencyBonus: 0,
    hasUnboostableRowsPerSecondMultiplier: true,
    canBeMirrorCornTarget: false,
    effectDescription:
      '100 Crops per slot · globally multiplies Hamster Efficiency by 1 + Wheat × log10(Rows/sec) · global multiplier cannot be boosted',
    unlockDescription: 'Unlocks at 1.25e32 Crops after Row Duplicators',
  },
  rootTunnel: {
    name: 'Root Tunnel',
    icon: '🕳️',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    doesNotHarvest: true,
    transfersAdjacencies: true,
    canBeMirrorCornTarget: false,
    temporarilyUnavailable: true,
    effectDescription:
      'Transfers crop adjacencies at ×0.8 strength per tunnel tile; carries all effects except Mirror Corn.',
    unlockDescription: 'Unlocks at 1.8e308 Crops',
  },
  sunflower: {
    name: 'Sunflower',
    icon: '🌻',
    baseYield: 1,
    hamsterEfficiencyBonus: 0,
    rowDuplicatorEffectivenessBonus: 0.2,
    effectDescription:
      '1 Crop per slot · +20% Row Duplicator effectiveness',
    unlockDescription: 'Unlocks at 1.42e44 Crops',
  },
  canola: {
    name: 'Canola',
    icon: '🌼',
    baseYield: 1,
    hamsterEfficiencyBonus: 0,
    monocropCountWeight: 5,
    globalRowProductionBonusPerHamster: 0.1,
    hasUnboostableActiveHamsterRowMultiplier: true,
    effectDescription:
      '1 Crop per slot · +10% global Row production per active Hamster · counts as 5 crops toward its Monocrop limit · global Row boost cannot be boosted',
    unlockDescription: `Unlocks at ${CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT.toLocaleString()} Row Duplicators`,
  },
  carrot: {
    name: 'Carrot',
    icon: '🥕',
    baseYield: 40,
    hamsterEfficiencyBonus: 0,
    canBeMirrorCornTarget: false,
    rabbitRelationsBonusAtZero: 0.04,
    globalHarvestBonusAtZero: 0.1,
    globalHarvestBonusPerContract: 0.004,
    highHarvestThreshold: 1e4,
    highHarvestGlobalHarvestBonus: 0.04,
    maximumRabbitContractBonus: 1,
    effectDescription:
      '40 Crops per slot · +4% Rabbit relations · +10% all Crop harvest, plus +0.4% per completed Rabbit contract (caps at +100%) · +4% all Crop harvest per crop type with more than 10,000 total harvest',
    unlockDescription: 'Unlock with 500 Rabbit relations',
  },
  fourLeafClover: {
    name: '4-Leaf Clover',
    icon: '🍀',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    doesNotHarvest: true,
    effectDescription:
      'Destroys its own harvest · +(7 + 0.7 × log10(Fields Planted))% Clover Bundle chance per minute, capped at 77% · only one can be planted per blueprint',
    unlockDescription: 'Unlock with 77,777 Rabbit relations',
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
      'Nullifies adjacent crop debuffs · +5% all Turnip effectiveness per adjacent debuff; harmful crops count twice',
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
  splitweedPart: {
    name: 'Splitweed',
    icon: '',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    adjacentHarvestModifier: -10,
    doesNotHarvest: true,
    hasDebuff: true,
    canBeMirrorCornTarget: false,
    internalOnly: true,
    isSplitweedPart: true,
    effectDescription: 'Part of a Splitweed',
  },
}

const KNOWN_CROP_IDS = Object.keys(CROP_DEFINITIONS)
export const CROP_IDS = KNOWN_CROP_IDS.filter(
  (cropId) =>
    CROP_DEFINITIONS[cropId].internalOnly !== true &&
    !isCropTemporarilyUnavailable(cropId),
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
    cost: 4e12,
    baseYield: 5,
    hamsterEfficiencyBonus: -0.5,
    diagonalTargetEffectMultiplier: 4,
    maximumReflectionsPerTile: 2,
    baseEffectDescription: '5 Crops per slot · −50% Hamster efficiency',
    effectDescription:
      'Multiplies one diagonally adjacent crop effect by ×4 · each tile can receive at most two reflections; harsh sunlight reflected by three or more Mirror Corns would burn any crop to a crisp',
  },
  fourLeafClover: {
    name: '4-Leaf Clover',
    icon: '🍀',
    baseYield: 0,
    hamsterEfficiencyBonus: 0,
    doesNotHarvest: true,
    effectDescription:
      'Destroys its own harvest · +(7 + 0.7 × log10(Fields Planted))% Clover Bundle chance per minute, capped at 77% · Only one can be planted per blueprint (allegedly this would ruin its "luck")',
    unlockDescription: 'Unlock with 77,777 Rabbit relations',
  },
  leechingGourd: {
    id: 'leechingGourd',
    cropId: 'pumpkin',
    name: 'Leeching Gourd',
    cost: 2e19,
    baseEffectDescription: 'Occupies one 2×2 block and produces no Crops',
    effectDescription:
      'Nullifies adjacent crop debuffs · +5% all Turnip effectiveness per adjacent debuff; harmful crops count twice · Too destructive on soil integrity to plant multiple in a single field',
  },
  sweetPotato: {
    id: 'sweetPotato',
    cropId: 'sweetPotato',
    name: 'Sweet Potato',
    cost: 1.25e32,
    hamsterEfficiencyBonus: 1.25,
    hasUnboostableRowsPerSecondMultiplier: true,
    requiresRowDuplicators: true,
    temporarilyUnavailable: true,
    baseEffectDescription: '1 Crop per slot · +125% Hamster Efficiency',
    effectDescription:
      'Globally multiplies Hamster Efficiency by 1 + Sweet Potatoes × log10(Rows/sec) · this multiplier cannot be boosted',
  },
  splitweed: {
    id: 'splitweed',
    cropId: 'knotweed',
    name: 'Splitweed',
    cost: 3e38,
    hasDebuff: true,
    isHarmful: false,
    globalPassiveEffectMultiplier: 0,
    gourdAdjacencyContribution: 8,
    mirrorCornEffectivenessBonus: 0.5,
    requiresRowDuplicators: true,
    monocropThresholdBonusPerCrop: 2,
    baseEffectDescription:
      'Occupies one 2×2 block · 0 Crops · −10 adjacent Crop harvest',
    effectDescription:
      '×0 global Crop passive effects unless nullified by Leeching Gourd · counts as 8 debuff crops for Leeching Gourd adjacency · +2 Monocrop limit and +0.5× Mirror Corn effectiveness per Splitweed · cannot be boosted',
  },
}

export const CROP_PERFECTION_IDS = Object.keys(CROP_PERFECTIONS)

export function isKnownCrop(crop) {
  return KNOWN_CROP_IDS.includes(crop)
}

export function isCropTemporarilyUnavailable(cropId) {
  return CROP_DEFINITIONS[cropId]?.temporarilyUnavailable === true
}

export function isCropPerfectionTemporarilyUnavailable(perfectionId) {
  return CROP_PERFECTIONS[perfectionId]?.temporarilyUnavailable === true
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
      !isCropPerfectionTemporarilyUnavailable(perfection.id) &&
      hasCropPerfection(completedCropPerfections, perfection.id),
  )
}

export function getCropImage(cropId, completedCropPerfections) {
  const perfection = getCropPerfection(cropId, completedCropPerfections)

  return perfection?.image ?? CROP_DEFINITIONS[cropId]?.image ?? null
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
    ? `${perfection.baseEffectDescription ?? cropDefinition.effectDescription} · ${perfection.effectDescription}`
    : cropDefinition.effectDescription
}

export function isCropEffectModifier(cropId) {
  return Boolean(CROP_DEFINITIONS[cropId]?.adjacentCropEffectModifier)
}

export function canCropPassiveBeAffectedBy(cropId, bypassTier) {
  const protectionTier =
    CROP_DEFINITIONS[cropId]?.passiveProtectionTier ?? 0

  return bypassTier >= protectionTier
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
  hasUnlockedSunflower = false,
  rowDuplicators = 0,
  hasUnlockedCarrot = false,
  hasUnlockedFourLeafClover = false,
  hasUnlockedWheat = false,
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
  if (hasUnlockedWheat) {
    unlockedCrops.push('wheat')
  }
  if (hasUnlockedRootTunnel && !isCropTemporarilyUnavailable('rootTunnel')) {
    unlockedCrops.push('rootTunnel')
  }
  if (hasUnlockedSunflower) {
    unlockedCrops.push('sunflower')
  }
  if (rowDuplicators >= CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT) {
    unlockedCrops.push('canola')
  }
  if (hasUnlockedCarrot) {
    unlockedCrops.push('carrot')
  }
  if (hasUnlockedFourLeafClover) {
    unlockedCrops.push('fourLeafClover')
  }

  return unlockedCrops
}

export function getVisibleCropIds(
  unlockedCropIds,
  totalHamstersHired = 0,
  hasUnlockedRowDuplicators = false,
) {
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

    if (cropId === 'wheat' && !hasUnlockedRowDuplicators) {
      break
    }

    visibleCropIds.push(cropId)
  }

  return visibleCropIds
}
