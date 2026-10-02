import { GAME_AREA_IDS } from './gameConfig.js'

// Progression requirements only: never apply these to machinery, paid
// blueprint expansions, contracts, relations, or Manatee materials.
export const MISFORTUNE_CROP_REQUIREMENT_MULTIPLIER = 10
export const MAIN_POST_DEMO_ONE_CROP_REQUIREMENT_MULTIPLIER = 10
export const MAIN_POST_MISFORTUNE_CROP_REQUIREMENT_MULTIPLIER = 10
export const MAIN_SWEET_POTATO_ONWARD_REQUIREMENT_MULTIPLIER = 500
export const MAIN_SWEET_POTATO_ONWARD_BASE_REQUIREMENT = 4e95

export function getCropRequirementMultiplier(
  game,
  areaId = game?.activeArea ?? GAME_AREA_IDS.MAIN,
) {
  if (areaId === GAME_AREA_IDS.MISFORTUNE) {
    return MISFORTUNE_CROP_REQUIREMENT_MULTIPLIER
  }

  const completed = game?.capybara?.completedDemonstrations ?? []
  // Keep this low-level module independent of challenge/production logic.
  if (completed.includes('misfortuneTrial')) {
    return MAIN_POST_DEMO_ONE_CROP_REQUIREMENT_MULTIPLIER *
      MAIN_POST_MISFORTUNE_CROP_REQUIREMENT_MULTIPLIER
  }
  return completed.includes('demonstrationOne')
    ? MAIN_POST_DEMO_ONE_CROP_REQUIREMENT_MULTIPLIER
    : 1
}

function getLateProgressionMultiplier(baseRequirement) {
  return baseRequirement >= MAIN_SWEET_POTATO_ONWARD_BASE_REQUIREMENT
    ? MAIN_SWEET_POTATO_ONWARD_REQUIREMENT_MULTIPLIER
    : 1
}

export function scaleCropRequirement(baseRequirement, multiplier) {
  if (baseRequirement == null) return null
  const exponentShift = Math.log10(multiplier)
  if (!Number.isFinite(baseRequirement) || !Number.isInteger(exponentShift)) {
    return baseRequirement * multiplier
  }
  // Shift decimal exponents directly so an exact unlock boundary such as
  // 1.25e35 × 10 does not round slightly above its displayed 1.25e36 target.
  const [significand, exponent] = baseRequirement.toExponential().split('e')
  return Number(`${significand}e${Number(exponent) + exponentShift}`)
}

export function getCropRequirement(game, baseRequirement, areaId) {
  const area = areaId ?? game?.activeArea ?? GAME_AREA_IDS.MAIN
  const lateMainMultiplier = area === GAME_AREA_IDS.MAIN
    ? getLateProgressionMultiplier(baseRequirement)
    : 1
  return baseRequirement == null
    ? null
    : baseRequirement * getCropRequirementMultiplier(game, area) * lateMainMultiplier
}

// Shared perfections and augmentations keep their late-game balancing in
// either area. Misfortune-only upgrades, goals and augments use the ordinary
// area requirement function instead, so the challenge is not inflated by 500×.
export function getSharedCropProgressionCost(game, baseCost) {
  return baseCost == null
    ? null
    : baseCost * getCropRequirementMultiplier(game) * getLateProgressionMultiplier(baseCost)
}
