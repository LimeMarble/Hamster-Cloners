import {
  getAdjacentCropEffectMultiplier,
  getGlobalPassiveEffectMultiplier,
  getMirrorCornEffectMultiplier,
  getMonocropCropCount,
  getMonocropThresholdBonus,
} from './cropEffects.js'
import { getMonocropYieldMultiplier } from './monocropPenalty.js'

export const CLOVER_BUNDLE_ROLL_INTERVAL_SECONDS = 60
export const CLOVER_BUNDLE_MAX_CHANCE = 0.77

export const FORTUNE_EFFECT_IDS = Object.freeze({
  DEMONSTRATION: 'opus',
  BOUNTY: 'bounty',
  MIRAGE: 'mirage',
  OPUS: 'fortuneOpus',
})

export const FORTUNE_EFFECTS = Object.freeze([
  {
    id: FORTUNE_EFFECT_IDS.DEMONSTRATION,
    name: "Fortune's Demonstration",
    weight: 0.17,
    durationSeconds: 37,
    description: '+10% Crop passive effects',
    passiveEffectMultiplier: 1.1,
  },
  {
    id: FORTUNE_EFFECT_IDS.BOUNTY,
    name: "Fortune's Bounty",
    weight: 0.52,
    durationSeconds: 117,
    description: 'Crop yields ×17.77',
    cropYieldMultiplier: 17.77,
  },
  {
    id: FORTUNE_EFFECT_IDS.MIRAGE,
    name: "Fortune's Mirage",
    weight: 0.2,
    durationSeconds: 0,
    description: 'Nothing happens',
  },
  {
    id: FORTUNE_EFFECT_IDS.OPUS,
    name: "Fortune's Opus",
    weight: 0.11,
    durationSeconds: 27,
    description: 'Crop yields ×7.77 and +7.77% Crop passive effects',
    cropYieldMultiplier: 7.77,
    passiveEffectMultiplier: 1.0777,
  },
])
const FORTUNE_EFFECT_BY_ID = new Map(
  FORTUNE_EFFECTS.map((effect) => [effect.id, effect]),
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
    bundle: null,
    secondsTowardBundleRoll: 0,
    activeEffects: [],
    notice: null,
  }
}

export function getFortuneEffect(effectId) {
  return FORTUNE_EFFECT_BY_ID.get(effectId) ?? null
}

export function normalizeFortuneState(rawFortune) {
  const initial = createInitialFortuneState()

  if (!rawFortune || typeof rawFortune !== 'object') {
    return initial
  }

  const bundle = rawFortune.bundle && typeof rawFortune.bundle === 'object'
    ? {
        x: Math.min(90, Math.max(10, Number(rawFortune.bundle.x) || 50)),
        y: Math.min(80, Math.max(12, Number(rawFortune.bundle.y) || 45)),
      }
    : null
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
  const noticeEffect = getFortuneEffect(rawFortune.notice?.effectId)
  const noticeSeconds = toNonNegativeNumber(
    rawFortune.notice?.remainingSeconds,
  )

  return {
    bundle,
    secondsTowardBundleRoll: Math.min(
      CLOVER_BUNDLE_ROLL_INTERVAL_SECONDS,
      toNonNegativeNumber(rawFortune.secondsTowardBundleRoll),
    ),
    activeEffects,
    notice: noticeEffect && noticeSeconds > 0
      ? { effectId: noticeEffect.id, remainingSeconds: noticeSeconds }
      : null,
  }
}

export function getFortuneModifiers(gameOrFortune) {
  const fortune = normalizeFortuneState(
    gameOrFortune?.fortune ?? gameOrFortune,
  )

  return fortune.activeEffects.reduce(
    (modifiers, activeEffect) => {
      const effect = getFortuneEffect(activeEffect.id)

      if (!effect) return modifiers

      return {
        passiveEffectMultiplier:
          modifiers.passiveEffectMultiplier *
          (effect.passiveEffectMultiplier ?? 1),
        cropYieldMultiplier:
          modifiers.cropYieldMultiplier * (effect.cropYieldMultiplier ?? 1),
        harvestMultiplier:
          modifiers.harvestMultiplier * (effect.harvestMultiplier ?? 1),
      }
    },
    {
      passiveEffectMultiplier: 1,
      cropYieldMultiplier: 1,
      harvestMultiplier: 1,
    },
  )
}

export function getCloverBundleChancePerMinute(game) {
  const cloverIndex = game.blueprint?.cells?.indexOf('fourLeafClover') ?? -1

  if (cloverIndex < 0) return 0

  const fieldsPlanted = Math.max(1, getFortuneFieldsPlanted(game.farmland))
  const baseChance = (7 + 0.7 * Math.log10(fieldsPlanted)) / 100
  const completedCropPerfections = game.completedCropPerfections ?? []
  const fieldSize = game.blueprint.rows * game.blueprint.columns
  const monocropMultiplier = getMonocropYieldMultiplier(
    getMonocropCropCount(game.blueprint, 'fourLeafClover'),
    fieldSize,
    getMonocropThresholdBonus(game.blueprint, completedCropPerfections),
  )
  const passiveEffectMultiplier =
    getFortuneModifiers(game).passiveEffectMultiplier
  const globalPassiveEffectMultiplier = getGlobalPassiveEffectMultiplier(
    game.blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
  )
  const adjacentEffectMultiplier = getAdjacentCropEffectMultiplier(
    game.blueprint,
    cloverIndex,
    'fourLeafClover',
    false,
    completedCropPerfections,
    passiveEffectMultiplier,
  )
  const mirrorCornEffectMultiplier = getMirrorCornEffectMultiplier(
    game.blueprint,
    cloverIndex,
    completedCropPerfections,
    passiveEffectMultiplier,
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

function chooseFortuneEffect(randomValue) {
  const roll = clampRandomValue(randomValue)
  let cumulativeWeight = 0

  return FORTUNE_EFFECTS.find((effect) => {
    cumulativeWeight += effect.weight
    return roll < cumulativeWeight
  }) ?? FORTUNE_EFFECTS.at(-1)
}

export function advanceFortuneState(
  game,
  elapsedSeconds,
  random = Math.random,
) {
  const fortune = normalizeFortuneState(game.fortune)
  const safeElapsedSeconds = toNonNegativeNumber(elapsedSeconds)
  const activeEffects = fortune.activeEffects.flatMap((activeEffect) => {
    const remainingSeconds = activeEffect.remainingSeconds - safeElapsedSeconds
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
  let bundle = fortune.bundle
  let secondsTowardBundleRoll = hasClover
    ? fortune.secondsTowardBundleRoll
    : 0

  if (hasClover && !bundle) {
    secondsTowardBundleRoll += safeElapsedSeconds

    while (
      !bundle &&
      secondsTowardBundleRoll >= CLOVER_BUNDLE_ROLL_INTERVAL_SECONDS
    ) {
      secondsTowardBundleRoll -= CLOVER_BUNDLE_ROLL_INTERVAL_SECONDS

      if (clampRandomValue(random()) < getCloverBundleChancePerMinute(game)) {
        bundle = {
          x: 10 + clampRandomValue(random()) * 80,
          y: 12 + clampRandomValue(random()) * 68,
        }
      }
    }
  }

  return {
    ...game,
    fortune: {
      bundle,
      secondsTowardBundleRoll,
      activeEffects,
      notice,
    },
  }
}

export function collectCloverBundle(game, random = Math.random) {
  const fortune = normalizeFortuneState(game.fortune)

  if (!fortune.bundle) return game

  const effect = chooseFortuneEffect(random())
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

  return {
    ...game,
    fortune: {
      ...fortune,
      bundle: null,
      activeEffects,
      notice: { effectId: effect.id, remainingSeconds: 6 },
    },
  }
}
export function spawnCloverBundle(game, random = Math.random) {
  const fortune = normalizeFortuneState(game.fortune)

  return {
    ...game,
    fortune: {
      ...fortune,
      bundle: {
        x: 10 + clampRandomValue(random()) * 80,
        y: 12 + clampRandomValue(random()) * 68,
      },
    },
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
