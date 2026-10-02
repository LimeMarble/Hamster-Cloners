import { hasVisitedMisfortune } from './crops.js'

const side = (id, name, description, condition, treats = 5) => ({
  id, name, description, condition, tier: 1, treats,
})
const strength = (id, name, metric, target, subject, unit) => ({
  id, name, tier: 1, treats: 5, metric, target, subject, unit,
})
const milestone = (id, name, description, tier, condition) => ({
  id, name, description, tier, treats: tier === 3 ? 50 : 25, condition,
})
const PALM_OIL_MONOCROP_FACTOR = 500
export const FALSE_START_DURATION_SECONDS = 60

// Tiers measure importance, not progression era. No achievements are hidden.
export const ACHIEVEMENTS = Object.freeze([
  side('cropRotation', 'Crop Rotation', 'Replace a planted Leek with another crop.',
    (_game, metrics) => metrics.cropRotation),
  side('backUnderControl', 'Back Under Control',
    'Remove a monocrop penalty through blueprint editing.',
    (_game, metrics) => metrics.backUnderControl),
  side('agriculturalDiversity', 'Agricultural Diversity',
    'Plant six distinct crop types in one blueprint without a monocrop penalty.',
    (_game, metrics) => metrics.diverseUnpenalized, 10),
  side('controlledBurn', 'This is Fine',
    'Burn a crop through excess Mirror Corn reflections.',
    (_game, metrics) => metrics.controlledBurn),
  side('thisIsFine', 'This is NOT Fine', 'Infest a blueprint with Water Lettuce.',
    (_game, metrics) => metrics.infested),
  side('absolutelyNothing', 'Absolutely Nothing',
    'Collect a bundle from a loadout with no assigned Fortune effects.', () => false),
  side('youGetNothing', 'You get NOTHING',
    'Have one blueprint with no crop harvest and −100% or worse Hamster efficiency.',
    (_game, metrics) => metrics.nothing),
  side('makingPeanuts', 'Making Peanuts',
    'Make at least 5 Crops/sec from one field blueprint in Misfortune. Unlocks Peanuts.',
    (game, metrics) => game.activeArea === 'misfortune' && metrics.misfortuneFieldYield >= 5),
  side('falseStart', 'False Start',
    'Build no Columns during the first 60 seconds after a blueprint reset or Restart Fields, with Rushed Start purchased.',
    (game) => game.falseStartEligible === true &&
      game.secondsSinceAreaReset >= FALSE_START_DURATION_SECONDS &&
      game.completedMisfortuneUpgrades?.includes('rushedStart')),
  {
    ...side('palmOilPlantation', 'Palm Oil Plantation',
      `Have one crop type count at least ${PALM_OIL_MONOCROP_FACTOR} times the Monocrop limit in one field blueprint.`,
      (_game, metrics) => metrics.monocropOverload >= PALM_OIL_MONOCROP_FACTOR),
    monocropFactor: PALM_OIL_MONOCROP_FACTOR,
  },
  side('challengeContest', 'I Thought This Was Going to be a Challenge Contest',
    'Perfect Sweet Potato after entering Misfortune.',
    (game) => hasVisitedMisfortune(game) &&
      game.completedCropPerfections?.includes('sweetPotato')),
  side('sweetDreams', 'Sweet Dreams',
    'Form a bed of at least 12 orthogonally connected Sweet Potatoes in one blueprint.',
    (game, metrics) => game.completedCropPerfections?.includes('sweetPotato') &&
      metrics.sweetPotatoBedSize >= 12),
  side('cmonDoSomething', "C'mon do Something...",
    'Neutralize Mirror Corn’s Hamster efficiency debuff with Leeching Gourd in Misfortune, while its debuff-removal augmentation is disabled.',
    (game, metrics) => game.activeArea === 'misfortune' && metrics.neutralizedMirrorCorn),
  // Keep historical IDs so revised names/thresholds preserve earned saves.
  strength('potato100', 'Potato Power', 'potato', 25, 'One Potato', 'hamsterBonus'),
  strength('leek1000', 'Enrichment Programme', 'leek', 1000,
    'One Enriching Leek', 'harvestBonus'),
  strength('turnip3', 'A Turnip for the Better', 'turnip', 3,
    'One Turnip', 'effectMultiplier'),
  strength('apple10B', 'A Fruitful Arrangement', 'apple', 1e10,
    'One Apple Sapling', 'harvest'),
  strength('sunflower400K', 'Sunny Side Up', 'sunflower', 4000,
    'One Sunflower', 'duplicatorBonus'),
  strength('canola800', 'Oil the Machinery', 'canola', 800,
    'Canola in one blueprint', 'rowMultiplier'),
  milestone('inventions', 'A Bright Idea', 'Unlock Inventions by hiring 50 Hamsters.', 2,
    (game) => game.totalHamstersHired >= 50),
  milestone('firstExpansion', 'Room to Grow', 'Complete your first blueprint expansion.', 2,
    (game) => game.completedBlueprintExpansions?.length > 0),
  milestone('unionized', 'Collective Bargaining', 'Accept hamster unionization.', 2,
    (game) => game.unionized || game.areaProgress?.main?.unionized ||
      game.areaProgress?.misfortune?.unionized),
  milestone('firstPerfection', 'Practice Makes Perfect', 'Perfect your first crop.', 2,
    (game) => game.completedCropPerfections?.length > 0),
  milestone('rowDuplicators', 'Another Dimension', 'Unlock Row Duplicators.', 2,
    (game) => game.hasUnlockedRowDuplicators),
  milestone('seedAugmentation', 'Seeds of Potential', 'Unlock Seed Augmentation.', 2,
    (game) => game.capybara?.completedDemonstrations?.includes('introduction')),
  milestone('supportingCast', 'The Supporting Cast',
    'Purchase Burdened Foundations to unlock Floor Replicator support mode.', 2,
    (game) => game.completedMisfortuneUpgrades?.includes('burdenedFoundations')),
  milestone('trade', 'Open for Business', 'Establish Trade Relations.', 3,
    (game) => game.trade?.established),
  milestone('misfortune', 'Against the Odds', 'Enter Misfortune.', 3,
    (game) => game.activeArea === 'misfortune' || Boolean(game.areaProgress?.misfortune) ||
      game.completedMisfortuneUpgrades?.length > 0 ||
      game.capybara?.completedDemonstrations?.includes('misfortuneTrial')),
  milestone('manatees', 'New Horizons', 'Establish contact with Manatees.', 3,
    (game) => game.capybara?.completedDemonstrations?.includes('misfortuneTrial')),
])

export const HAMSTER_TREAT_DIVISOR = 100

// Display order is independent of awarding/save order. Crop thresholds follow
// crop order, not assumed difficulty: optimization can earn them earlier.
export const ACHIEVEMENT_DISPLAY_ORDER = Object.freeze([
  'cropRotation', 'backUnderControl',
  'leek1000', 'potato100', 'turnip3', 'apple10B',
  'agriculturalDiversity', 'youGetNothing',
  'sunflower400K', 'canola800', 'controlledBurn', 'absolutelyNothing', 'thisIsFine',
  'makingPeanuts', 'palmOilPlantation', 'falseStart',
  'challengeContest', 'sweetDreams', 'cmonDoSomething',
  'inventions', 'firstExpansion', 'unionized', 'firstPerfection', 'rowDuplicators', 'seedAugmentation',
  'supportingCast',
  'trade', 'misfortune', 'manatees',
])

export function getAchievementsForTier(tier) {
  const order = new Map(ACHIEVEMENT_DISPLAY_ORDER.map((id, index) => [id, index]))
  return ACHIEVEMENTS.filter((achievement) => achievement.tier === tier)
    .sort((left, right) => (order.get(left.id) ?? Infinity) - (order.get(right.id) ?? Infinity))
}
