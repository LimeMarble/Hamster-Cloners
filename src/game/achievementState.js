import { ACHIEVEMENTS, HAMSTER_TREAT_DIVISOR } from './achievementDefinitions.js'
import { getPeanutTreatEffect } from './cropEffects.js'
import { getFortuneModifiers } from './fortuneLogic.js'

const definitionsById = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]))
const treatCache = new WeakMap()

export function normalizeAchievementIds(ids) {
  return [...new Set(Array.isArray(ids) ? ids : [])].filter((id) => definitionsById.has(id))
}

export function getHamsterTreats(gameOrIds) {
  const ids = Array.isArray(gameOrIds) ? gameOrIds : gameOrIds?.earnedAchievementIds
  if (!Array.isArray(ids)) return 0
  if (treatCache.has(ids)) return treatCache.get(ids)
  const treats = normalizeAchievementIds(ids).reduce(
    (total, id) => total + definitionsById.get(id).treats, 0,
  )
  treatCache.set(ids, treats)
  return treats
}

export function getAchievementTreatExponent(game, passiveEffectMultiplier) {
  if (!game?.blueprint) return 1
  const passive = passiveEffectMultiplier ?? getFortuneModifiers(game).passiveEffectMultiplier
  return 1 + getPeanutTreatEffect(game.blueprint, game.completedCropPerfections,
    passive, game.seedAugmentations).exponentBonus
}

export function getAchievementHamsterMultiplier(gameOrIds, passiveEffectMultiplier) {
  const base = 1 + getHamsterTreats(gameOrIds) / HAMSTER_TREAT_DIVISOR
  return base ** getAchievementTreatExponent(gameOrIds, passiveEffectMultiplier)
}

export function getOilyTreatsFloorMultiplier(game, passiveEffectMultiplier) {
  return game?.completedMisfortuneUpgrades?.includes('oilyTreats')
    ? Math.sqrt(getAchievementHamsterMultiplier(game, passiveEffectMultiplier))
    : 1
}

export function grantAchievement(game, id) {
  if (!definitionsById.has(id) || game.earnedAchievementIds?.includes(id)) return game
  return { ...game, earnedAchievementIds: [...(game.earnedAchievementIds ?? []), id] }
}
