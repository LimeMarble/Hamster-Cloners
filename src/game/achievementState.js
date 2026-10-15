import { HAMSTER_TREAT_DIVISOR } from './achievementDefinitions.js'
import { getHamsterTreats } from './achievementAwards.js'
import { getPeanutTreatEffect } from './cropEffects.js'
import { getFortuneModifiers } from './fortuneLogic.js'

export { getHamsterTreats, grantAchievement, normalizeAchievementIds } from './achievementAwards.js'

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
