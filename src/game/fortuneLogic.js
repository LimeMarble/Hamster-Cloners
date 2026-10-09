import {
  getAdjacentCropEffectMultiplier,
  getGlobalPassiveEffectMultiplier,
  getMirrorCornEffectBlueprint,
  getMirrorCornEffectMultiplier,
  getMonocropCropCount,
  getMonocropThresholdBonus,
} from './cropEffects.js'
import { getMonocropYieldMultiplier } from './monocropPenalty.js'
import { grantAchievement } from './achievementState.js'
import {
  FORTUNES_WRATH_CROP_DIVISOR,
  FORTUNES_WRATH_CROP_EXPONENT,
  FORTUNES_WRATH_PASSIVE_MULTIPLIER,
  GAME_AREA_IDS,
} from './gameConfig.js'
import {
  getFloorReplicatorSupportPassiveEffectBonus,
  getMisfortuneUpgradeCropProductionMultiplier,
} from './misfortuneUpgrades.js'
import {
  chooseFiveLeafEffect,
  createInitialFiveLeafState,
  DEFAULT_CLOVER_FORTUNE_PERCENTAGES,
  FIVE_LEAF_MAX_BATCH_SIZE,
  getFiveLeafBatchEffectCount,
  getFiveLeafPointBudget,
  getFiveLeafSchedule,
  normalizeFiveLeafState,
} from './fiveLeafCloverLogic.js'

export const CLOVER_BUNDLE_ROLL_INTERVAL_SECONDS = 60
export const CLOVER_BUNDLE_MAX_CHANCE = 0.77
export const FORTUNE_OVERCHARGE_DURATION_SECONDS = 600
export const FORTUNE_OVERCHARGE_STRENGTH_STEP = 0.1
const OVERCHARGE_BAND_SECONDS =
  FORTUNE_OVERCHARGE_DURATION_SECONDS * FORTUNE_OVERCHARGE_STRENGTH_STEP
const OVERCHARGE_SPEED_RATIO = 2 ** FORTUNE_OVERCHARGE_STRENGTH_STEP

export const FORTUNE_EFFECT_IDS = Object.freeze({
  DEMONSTRATION: 'opus',
  BOUNTY: 'bounty',
  SPLIT: 'mirage',
  MIRAGE: 'fortuneMirage',
  OPUS: 'fortuneOpus',
  LEEK_COOKIE: 'leekFortuneCookie',
})

export const FORTUNE_EFFECTS = Object.freeze([
  {
    id: FORTUNE_EFFECT_IDS.DEMONSTRATION,
    name: "Fortune's Demonstration",
    icon: '✦',
    weight: DEFAULT_CLOVER_FORTUNE_PERCENTAGES.opus / 100,
    durationSeconds: 37,
    description: '+10% Crop passive effects',
    passiveEffectMultiplier: 1.1,
  },
  {
    id: FORTUNE_EFFECT_IDS.BOUNTY,
    name: "Fortune's Bounty",
    icon: '×',
    weight: DEFAULT_CLOVER_FORTUNE_PERCENTAGES.bounty / 100,
    durationSeconds: 77,
    description: 'Crop yields ×17.77',
    cropYieldMultiplier: 17.77,
  },
  {
    id: FORTUNE_EFFECT_IDS.SPLIT,
    name: "Fortune's Split",
    icon: '◇',
    weight: DEFAULT_CLOVER_FORTUNE_PERCENTAGES.mirage / 100,
    durationSeconds: 0,
    description: 'Spawns 2 Clover Bundles',
    bundleSpawnCount: 2,
  },
  {
    id: FORTUNE_EFFECT_IDS.OPUS,
    name: "Fortune's Opus",
    icon: '★',
    weight: DEFAULT_CLOVER_FORTUNE_PERCENTAGES.fortuneOpus / 100,
    durationSeconds: 27,
    description: 'Crop yields ×7.77 and +7.77% Crop passive effects',
    cropYieldMultiplier: 7.77,
    passiveEffectMultiplier: 1.0777,
  },
  {
    id: FORTUNE_EFFECT_IDS.LEEK_COOKIE,
    name: 'Leek Fortune Cookie',
    icon: '♧',
    weight: 0,
    durationSeconds: 55,
    description: 'Leek Enrichment ^1.2',
    leekEnrichmentExponent: 1.2,
  },
])
const FORTUNE_EFFECT_BY_ID = new Map(
  [
    ...FORTUNE_EFFECTS.map((effect) => [effect.id, effect]),
    [
      FORTUNE_EFFECT_IDS.MIRAGE,
      {
        id: FORTUNE_EFFECT_IDS.MIRAGE,
        name: "Fortune's Mirage",
        icon: '…',
        weight: 0,
        durationSeconds: 0,
        description: 'Nothing happens',
      },
    ],
  ],
)

function clampRandomValue(value) {
  return Math.min(0.9999999999999999, Math.max(0, Number(value) || 0))
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function getFortuneFieldsPlanted(farmland) {
  return ['rows', 'columns', 'floors', 'farms'].reduce(
    (fields, key) =>
      fields * Math.floor(toNonNegativeNumber(farmland?.[key], 1)),
    1,
  )
}

export function createInitialFortuneState() {
  return {
    bundles: [],
    secondsTowardBundleRoll: 0,
    nextRollSeconds: 0,
    activeEffects: [],
    discoveredEffects: [],
    fiveLeaf: createInitialFiveLeafState(),
    notice: null,
  }
}

export function getFortuneEffect(effectId) {
  return FORTUNE_EFFECT_BY_ID.get(effectId) ?? null
}

function getOverchargeLevel(remainingSeconds) {
  return Math.max(0, Math.floor(
    (remainingSeconds - FORTUNE_OVERCHARGE_DURATION_SECONDS) / OVERCHARGE_BAND_SECONDS,
  ))
}

export function getFortuneOvercharge(remainingSeconds) {
  const level = getOverchargeLevel(toNonNegativeNumber(remainingSeconds))
  return {
    strengthExponent: 1 + level * FORTUNE_OVERCHARGE_STRENGTH_STEP,
    timerSpeed: 2 ** (level * FORTUNE_OVERCHARGE_STRENGTH_STEP),
  }
}

export function getActiveFortuneEffectModifiers(activeEffect) {
  const effect = getFortuneEffect(activeEffect?.id)
  const strength = effect?.durationSeconds > 0
    ? getFortuneOvercharge(activeEffect.remainingSeconds).strengthExponent
    : 1
  return {
    passiveEffectMultiplier: (effect?.passiveEffectMultiplier ?? 1) ** strength,
    cropYieldMultiplier: (effect?.cropYieldMultiplier ?? 1) ** strength,
    harvestMultiplier: (effect?.harvestMultiplier ?? 1) ** strength,
    // The Cookie already changes an exponent. Scale only its bonus above one.
    leekEnrichmentExponent: 1 + ((effect?.leekEnrichmentExponent ?? 1) - 1) * strength,
  }
}

export function advanceFortuneEffectTimer(remainingSeconds, elapsedSeconds) {
  const remaining = toNonNegativeNumber(remainingSeconds)
  let elapsed = toNonNegativeNumber(elapsedSeconds)
  if (elapsed === 0) return remaining
  const level = getOverchargeLevel(remaining)
  if (level === 0) return Math.max(0, remaining - elapsed)

  // Consume the partial starting band, then sum complete bands geometrically.
  // This also handles compressed catch-up ticks and enormous saved timers in
  // constant time, without using the starting speed for the entire interval.
  const lowerBoundary = FORTUNE_OVERCHARGE_DURATION_SECONDS + level * OVERCHARGE_BAND_SECONDS
  const partialSeconds = Math.max(0, remaining - lowerBoundary) /
    (2 ** (level * FORTUNE_OVERCHARGE_STRENGTH_STEP))
  if (partialSeconds > 0 && elapsed <= partialSeconds) {
    return remaining - elapsed * (2 ** (level * FORTUNE_OVERCHARGE_STRENGTH_STEP))
  }
  elapsed -= partialSeconds

  const initialInverseSpeed = 2 ** (-(level - 1) * FORTUNE_OVERCHARGE_STRENGTH_STEP)
  const bandTimeScale = OVERCHARGE_BAND_SECONDS / (OVERCHARGE_SPEED_RATIO - 1)
  const timeToNormal = bandTimeScale * (1 - initialInverseSpeed)
  const normalBoundary = FORTUNE_OVERCHARGE_DURATION_SECONDS + OVERCHARGE_BAND_SECONDS
  if (elapsed >= timeToNormal) {
    return Math.max(0, normalBoundary - (elapsed - timeToNormal))
  }

  const inverseSpeed = initialInverseSpeed + elapsed / bandTimeScale
  const nextLevel = Math.min(level - 1, Math.max(1, Math.ceil(
    -Math.log2(inverseSpeed) / FORTUNE_OVERCHARGE_STRENGTH_STEP,
  )))
  const timeToBand = bandTimeScale * (
    2 ** (-nextLevel * FORTUNE_OVERCHARGE_STRENGTH_STEP) - initialInverseSpeed
  )
  return FORTUNE_OVERCHARGE_DURATION_SECONDS + (nextLevel + 1) * OVERCHARGE_BAND_SECONDS -
    Math.max(0, elapsed - timeToBand) * (2 ** (nextLevel * FORTUNE_OVERCHARGE_STRENGTH_STEP))
}

function getActiveBreezeModifiers(activeEffects) {
  const modifiers = {
    passiveEffectMultiplier: 1,
    cropYieldMultiplier: 1,
    harvestMultiplier: 1,
    leekEnrichmentExponent: 1,
  }
  for (const active of activeEffects) {
    const effect = getActiveFortuneEffectModifiers(active)
    modifiers.passiveEffectMultiplier *= effect.passiveEffectMultiplier
    modifiers.cropYieldMultiplier *= effect.cropYieldMultiplier
    modifiers.harvestMultiplier *= effect.harvestMultiplier
    modifiers.leekEnrichmentExponent = Math.max(modifiers.leekEnrichmentExponent,
      effect.leekEnrichmentExponent)
  }
  return modifiers
}

export function getCloverBundleEffectCount(bundle) {
  if (bundle?.splitBlocked === true) return 1
  return Math.min(
    getFiveLeafBatchEffectCount({ batchSize: FIVE_LEAF_MAX_BATCH_SIZE }),
    Math.max(1, Math.floor(toNonNegativeNumber(bundle?.effectCount, 1))),
  )
}

export function normalizeFortuneState(rawFortune) {
  const initial = createInitialFortuneState()

  if (!rawFortune || typeof rawFortune !== 'object') {
    return initial
  }

  const rawBundles = Array.isArray(rawFortune.bundles)
    ? rawFortune.bundles
    : rawFortune.bundle && typeof rawFortune.bundle === 'object'
      ? [rawFortune.bundle]
      : []
  const bundles = rawBundles.flatMap((bundle) =>
    bundle && typeof bundle === 'object'
      ? [{
          x: Math.min(90, Math.max(10, Number(bundle.x) || 50)),
          y: Math.min(80, Math.max(12, Number(bundle.y) || 45)),
          ...(bundle.splitBlocked === true ? { splitBlocked: true } : {}),
          ...(getCloverBundleEffectCount(bundle) > 1
            ? { effectCount: getCloverBundleEffectCount(bundle) } : {}),
        }]
      : [],
  )
  const activeEffects = Array.isArray(rawFortune.activeEffects)
    ? rawFortune.activeEffects.flatMap((activeEffect) => {
        const effect = getFortuneEffect(activeEffect?.id)
        const remainingSeconds = toNonNegativeNumber(
          activeEffect?.remainingSeconds,
        )

        return effect && effect.durationSeconds > 0 && remainingSeconds > 0
          ? [{ id: effect.id, remainingSeconds }]
          : []
      })
    : []
  const noticeEffectIds = Array.isArray(rawFortune.notice?.effectIds)
    ? rawFortune.notice.effectIds.filter((id) => getFortuneEffect(id))
      .slice(0, getFiveLeafBatchEffectCount({ batchSize: FIVE_LEAF_MAX_BATCH_SIZE }))
    : []
  const noticeEffect = getFortuneEffect(rawFortune.notice?.effectId) ??
    getFortuneEffect(noticeEffectIds.at(-1))
  const noticeSeconds = toNonNegativeNumber(
    rawFortune.notice?.remainingSeconds,
  )
  const savedFirstRollSeconds = toNonNegativeNumber(
    rawFortune.rollSchedule?.firstSeconds,
  )
  const savedRollIntervalSeconds = toNonNegativeNumber(
    rawFortune.rollSchedule?.intervalSeconds,
  )
  const rollSchedule = savedFirstRollSeconds > 0 &&
    savedRollIntervalSeconds > 0
    ? {
        firstSeconds: savedFirstRollSeconds,
        intervalSeconds: savedRollIntervalSeconds,
      }
    : null

  return {
    bundles,
    secondsTowardBundleRoll: toNonNegativeNumber(rawFortune.secondsTowardBundleRoll),
    nextRollSeconds: toNonNegativeNumber(rawFortune.nextRollSeconds),
    ...(rollSchedule ? { rollSchedule } : {}),
    activeEffects,
    discoveredEffects: [...new Set(
      Array.isArray(rawFortune.discoveredEffects)
        ? rawFortune.discoveredEffects.filter((id) =>
            FORTUNE_EFFECTS.some((effect) => effect.id === id))
        : [],
    )],
    fiveLeaf: normalizeFiveLeafState(rawFortune.fiveLeaf),
    notice: noticeEffect && noticeSeconds > 0
      ? {
          effectId: noticeEffect.id,
          ...(noticeEffectIds.length > 1 ? { effectIds: noticeEffectIds } : {}),
          remainingSeconds: noticeSeconds,
        }
      : null,
  }
}

export function getFortuneModifiers(gameOrFortune) {
  if (gameOrFortune?.activeArea === GAME_AREA_IDS.MISFORTUNE) {
    const fortune = normalizeFortuneState(gameOrFortune.fortune)
    const activeEffects = gameOrFortune.cloverAssembly?.assembled === true
      ? fortune.activeEffects
      : []
    const breezes = getActiveBreezeModifiers(activeEffects)
    return {
      passiveEffectMultiplier:
        (FORTUNES_WRATH_PASSIVE_MULTIPLIER +
          getFloorReplicatorSupportPassiveEffectBonus(gameOrFortune)) *
        breezes.passiveEffectMultiplier,
      cropYieldMultiplier: breezes.cropYieldMultiplier / FORTUNES_WRATH_CROP_DIVISOR,
      cropProductionExponent: FORTUNES_WRATH_CROP_EXPONENT,
      cropProductionMultiplier:
        getMisfortuneUpgradeCropProductionMultiplier(gameOrFortune),
      harvestMultiplier: 1,
      leekEnrichmentExponent: breezes.leekEnrichmentExponent,
      source: 'fortunesWrath',
      activeArea: GAME_AREA_IDS.MISFORTUNE,
    }
  }

  const fortune = normalizeFortuneState(
    gameOrFortune?.fortune ?? gameOrFortune,
  )

  const modifiers = getActiveBreezeModifiers(fortune.activeEffects)

  return {
    ...modifiers,
    cropProductionExponent: 1,
    cropProductionMultiplier: getMisfortuneUpgradeCropProductionMultiplier(gameOrFortune),
    activeArea: GAME_AREA_IDS.MAIN,
    passiveEffectMultiplier:
      modifiers.passiveEffectMultiplier +
      getFloorReplicatorSupportPassiveEffectBonus(gameOrFortune),
  }
}

export function getCloverBundleChancePerMinute(game) {
  if (game.cloverAssembly?.assembled === true) {
    if (!game.blueprint?.cells?.includes('fourLeafClover')) return 0
    const state = normalizeFiveLeafState(game.fortune?.fiveLeaf, game)
    return state.loadouts[state.activeLoadoutIndex].chancePercent / 100
  }
  if (game.activeArea === GAME_AREA_IDS.MISFORTUNE &&
      game.cloverAssembly?.assembled !== true) return 0

  const completedCropPerfections = game.completedCropPerfections ?? []
  const blueprint = getMirrorCornEffectBlueprint(
    game.blueprint,
    completedCropPerfections,
    game.seedAugmentations,
  )
  const cloverIndex = blueprint?.cells?.indexOf('fourLeafClover') ?? -1

  if (cloverIndex < 0) return 0

  const fieldsPlanted = Math.max(1, getFortuneFieldsPlanted(game.farmland))
  const baseChance = (7 + 0.7 * Math.log10(fieldsPlanted)) / 100
  const fieldSize = blueprint.rows * blueprint.columns
  const monocropMultiplier = getMonocropYieldMultiplier(
    getMonocropCropCount(blueprint, 'fourLeafClover'),
    fieldSize,
    getMonocropThresholdBonus(
      blueprint,
      completedCropPerfections,
      game.seedAugmentations,
    ),
  )
  const passiveEffectMultiplier =
    getFortuneModifiers(game).passiveEffectMultiplier
  const globalPassiveEffectMultiplier = getGlobalPassiveEffectMultiplier(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
    game.seedAugmentations,
  )
  const adjacentEffectMultiplier = getAdjacentCropEffectMultiplier(
    blueprint,
    cloverIndex,
    'fourLeafClover',
    false,
    completedCropPerfections,
    passiveEffectMultiplier,
    game.seedAugmentations,
  )
  const mirrorCornEffectMultiplier = getMirrorCornEffectMultiplier(
    blueprint,
    cloverIndex,
    completedCropPerfections,
    passiveEffectMultiplier,
    game.seedAugmentations,
  )

  return Math.min(
    CLOVER_BUNDLE_MAX_CHANCE,
    baseChance *
      monocropMultiplier *
      globalPassiveEffectMultiplier *
      adjacentEffectMultiplier *
      mirrorCornEffectMultiplier,
  )
}

function chooseFortuneEffect(randomValue, allowSplit = true) {
  const defaultEffects = FORTUNE_EFFECTS.filter((effect) => effect.weight > 0)
  const totalWeight = defaultEffects.reduce(
    (total, effect) => total + effect.weight,
    0,
  )
  const roll = clampRandomValue(randomValue) * totalWeight
  let cumulativeWeight = 0

  const rolledEffect = defaultEffects.find((effect) => {
    cumulativeWeight += effect.weight
    return roll < cumulativeWeight
  }) ?? defaultEffects.at(-1)

  return !allowSplit && rolledEffect.id === FORTUNE_EFFECT_IDS.SPLIT
    ? getFortuneEffect(FORTUNE_EFFECT_IDS.MIRAGE)
    : rolledEffect
}

function createCloverBundle(random, splitBlocked = false, effectCount = 1) {
  return {
    x: 10 + clampRandomValue(random()) * 80,
    y: 12 + clampRandomValue(random()) * 68,
    ...(splitBlocked ? { splitBlocked: true } : {}),
    ...(!splitBlocked && effectCount > 1 ? { effectCount } : {}),
  }
}

export function advanceFortuneState(
  game,
  elapsedSeconds,
  random = Math.random,
) {
  if (game.activeArea === GAME_AREA_IDS.MISFORTUNE &&
      game.cloverAssembly?.assembled !== true) return game

  const fortune = normalizeFortuneState(game.fortune)
  const safeElapsedSeconds = toNonNegativeNumber(elapsedSeconds)
  const activeEffects = fortune.activeEffects.flatMap((activeEffect) => {
    const remainingSeconds = advanceFortuneEffectTimer(activeEffect.remainingSeconds, safeElapsedSeconds)
    return remainingSeconds > 0
      ? [{ ...activeEffect, remainingSeconds }]
      : []
  })
  const noticeRemainingSeconds =
    (fortune.notice?.remainingSeconds ?? 0) - safeElapsedSeconds
  const notice = noticeRemainingSeconds > 0
    ? { ...fortune.notice, remainingSeconds: noticeRemainingSeconds }
    : null
  const hasClover = game.blueprint?.cells?.includes('fourLeafClover') === true
  const isFiveLeaf = game.cloverAssembly?.assembled === true
  let bundles = fortune.bundles
  let secondsTowardBundleRoll = hasClover
    ? fortune.secondsTowardBundleRoll
    : 0
  let nextRollSeconds = hasClover ? fortune.nextRollSeconds : 0
  let rollSchedule = fortune.rollSchedule

  if (hasClover && bundles.length === 0) {
    secondsTowardBundleRoll += safeElapsedSeconds
    if (isFiveLeaf) {
      const state = normalizeFiveLeafState(fortune.fiveLeaf, game)
      const loadout = state.loadouts[state.activeLoadoutIndex]
      const schedule = getFiveLeafSchedule(loadout, getFiveLeafPointBudget(game))
      if (nextRollSeconds > 0 && rollSchedule &&
          (rollSchedule.firstSeconds !== schedule.firstRollSeconds ||
            rollSchedule.intervalSeconds !== schedule.rollIntervalSeconds)) {
        const failedAttempts = Math.max(0, Math.round(
          (nextRollSeconds - rollSchedule.firstSeconds) /
            rollSchedule.intervalSeconds,
        ))
        nextRollSeconds = schedule.firstRollSeconds +
          failedAttempts * schedule.rollIntervalSeconds
      }
      nextRollSeconds = nextRollSeconds === 0
        ? schedule.firstRollSeconds
        : Math.max(nextRollSeconds, schedule.minimumSeconds)
      rollSchedule = {
        firstSeconds: schedule.firstRollSeconds,
        intervalSeconds: schedule.rollIntervalSeconds,
      }

      while (bundles.length === 0 &&
          secondsTowardBundleRoll >= nextRollSeconds) {
        if (nextRollSeconds >= schedule.maximumSeconds ||
            clampRandomValue(random()) < loadout.chancePercent / 100) {
          bundles = [createCloverBundle(random, false, getFiveLeafBatchEffectCount(loadout))]
          secondsTowardBundleRoll = 0
          nextRollSeconds = schedule.firstRollSeconds
        } else {
          nextRollSeconds += schedule.rollIntervalSeconds
        }
      }
      if (bundles.length === 0 &&
          secondsTowardBundleRoll >= schedule.maximumSeconds) {
        bundles = [createCloverBundle(random, false, getFiveLeafBatchEffectCount(loadout))]
        secondsTowardBundleRoll = 0
        nextRollSeconds = schedule.firstRollSeconds
      }
    } else {
      while (
        bundles.length === 0 &&
        secondsTowardBundleRoll >= CLOVER_BUNDLE_ROLL_INTERVAL_SECONDS
      ) {
        secondsTowardBundleRoll -= CLOVER_BUNDLE_ROLL_INTERVAL_SECONDS

        if (clampRandomValue(random()) < getCloverBundleChancePerMinute(game)) {
          bundles = [createCloverBundle(random)]
        }
      }
    }
  }

  return {
    ...game,
    fortune: {
      ...fortune,
      bundles,
      secondsTowardBundleRoll,
      nextRollSeconds,
      ...(rollSchedule ? { rollSchedule } : {}),
      activeEffects,
      notice,
    },
  }
}

export function addRandomFortuneEffect(
  game,
  random = Math.random,
  { allowSplit = true } = {},
) {
  if (game.activeArea === GAME_AREA_IDS.MISFORTUNE &&
      game.cloverAssembly?.assembled !== true) return game

  const fortune = normalizeFortuneState(game.fortune)
  const isFiveLeaf = game.cloverAssembly?.assembled === true
  const fiveLeaf = normalizeFiveLeafState(fortune.fiveLeaf, game)
  const loadout = fiveLeaf.loadouts[
    fiveLeaf.activeLoadoutIndex
  ]
  const selectedFiveLeafEffectId = isFiveLeaf
    ? chooseFiveLeafEffect(loadout, random(), game)
    : null
  const effect = isFiveLeaf
    ? getFortuneEffect(
        !allowSplit && selectedFiveLeafEffectId === FORTUNE_EFFECT_IDS.SPLIT
          ? FORTUNE_EFFECT_IDS.MIRAGE
          : selectedFiveLeafEffectId,
      )
    : chooseFortuneEffect(random(), allowSplit)
  const matchingEffect = fortune.activeEffects.some(
    (activeEffect) => activeEffect.id === effect.id,
  )
  const activeEffects = effect.durationSeconds <= 0
    ? fortune.activeEffects
    : matchingEffect
      ? fortune.activeEffects.map((activeEffect) =>
          activeEffect.id === effect.id
            ? {
                ...activeEffect,
                remainingSeconds:
                  activeEffect.remainingSeconds + effect.durationSeconds,
              }
            : activeEffect,
        )
      : [
          ...fortune.activeEffects,
          { id: effect.id, remainingSeconds: effect.durationSeconds },
        ]
  const spawnedBundles = Array.from(
    { length: effect.bundleSpawnCount ?? 0 },
    () => createCloverBundle(random, true),
  )

  return {
    ...game,
    fortune: {
      ...fortune,
      bundles: [...fortune.bundles, ...spawnedBundles],
      activeEffects,
      discoveredEffects: effect.id === FORTUNE_EFFECT_IDS.MIRAGE ||
        fortune.discoveredEffects.includes(effect.id)
        ? fortune.discoveredEffects
        : [...fortune.discoveredEffects, effect.id],
      notice: { effectId: effect.id, remainingSeconds: 6 },
    },
  }
}

export function collectCloverBundle(
  game,
  bundleIndexOrRandom = 0,
  suppliedRandom = Math.random,
) {
  if (game.activeArea === GAME_AREA_IDS.MISFORTUNE &&
      game.cloverAssembly?.assembled !== true) return game

  const fortune = normalizeFortuneState(game.fortune)
  const bundleIndex = typeof bundleIndexOrRandom === 'function'
    ? 0
    : Number(bundleIndexOrRandom)
  const random = typeof bundleIndexOrRandom === 'function'
    ? bundleIndexOrRandom
    : suppliedRandom

  if (!Number.isInteger(bundleIndex) || !fortune.bundles[bundleIndex]) {
    return game
  }

  const collectedBundle = fortune.bundles[bundleIndex]
  let gameAfterCollection = {
    ...game,
    fortune: {
      ...fortune,
      bundles: fortune.bundles.filter((_, index) => index !== bundleIndex),
    },
  }

  if (game.cloverAssembly?.assembled === true) {
    const state = normalizeFiveLeafState(game.fortune?.fiveLeaf, game)
    const loadout = state.loadouts[state.activeLoadoutIndex]
    if (Object.values(loadout.allocations).every((percentage) => percentage === 0)) {
      gameAfterCollection = grantAchievement(gameAfterCollection, 'absolutelyNothing')
    }
  }

  const rolledEffectIds = []
  for (let roll = 0; roll < getCloverBundleEffectCount(collectedBundle); roll++) {
    gameAfterCollection = addRandomFortuneEffect(gameAfterCollection, random, {
      allowSplit: collectedBundle.splitBlocked !== true,
    })
    rolledEffectIds.push(gameAfterCollection.fortune.notice.effectId)
  }

  return rolledEffectIds.length === 1 ? gameAfterCollection : {
    ...gameAfterCollection,
    fortune: {
      ...gameAfterCollection.fortune,
      notice: { ...gameAfterCollection.fortune.notice, effectIds: rolledEffectIds },
    },
  }
}
export function spawnCloverBundle(game, random = Math.random) {
  if (game.activeArea === GAME_AREA_IDS.MISFORTUNE &&
      game.cloverAssembly?.assembled !== true) return game

  const fortune = normalizeFortuneState(game.fortune)
  const state = normalizeFiveLeafState(fortune.fiveLeaf, game)
  const effectCount = game.cloverAssembly?.assembled === true
    ? getFiveLeafBatchEffectCount(state.loadouts[state.activeLoadoutIndex])
    : 1

  return {
    ...game,
    fortune: {
      ...fortune,
      bundles: [...fortune.bundles, createCloverBundle(random, false, effectCount)],
    },
  }
}

export function removeActiveFortuneEffect(game, effectId) {
  const fortune = normalizeFortuneState(game.fortune)
  const activeEffects = fortune.activeEffects.filter((effect) => effect.id !== effectId)
  if (activeEffects.length === fortune.activeEffects.length) return game

  return {
    ...game,
    fortune: { ...fortune, activeEffects },
  }
}

export function wipeActiveFortuneEffects(game) {
  return {
    ...game,
    fortune: {
      ...normalizeFortuneState(game.fortune),
      activeEffects: [],
    },
  }
}
