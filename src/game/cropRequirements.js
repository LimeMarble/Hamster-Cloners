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

export function getCropRequirement(game, baseRequirement, areaId) {
  const area = areaId ?? game?.activeArea ?? GAME_AREA_IDS.MAIN
  const lateMainMultiplier = area === GAME_AREA_IDS.MAIN &&
    baseRequirement >= MAIN_SWEET_POTATO_ONWARD_BASE_REQUIREMENT
    ? MAIN_SWEET_POTATO_ONWARD_REQUIREMENT_MULTIPLIER
    : 1
  return baseRequirement == null
    ? null
    : baseRequirement * getCropRequirementMultiplier(game, area) * lateMainMultiplier
}
