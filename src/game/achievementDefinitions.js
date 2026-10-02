const side = (id, name, description, condition, treats = 5) => ({
  id, name, description, condition, tier: 1, treats,
})
const strength = (id, name, metric, target, subject, unit) => ({
  id, name, tier: 1, treats: 5, metric, target, subject, unit,
})
const milestone = (id, name, description, tier, condition) => ({
  id, name, description, tier, treats: tier === 3 ? 50 : 25, condition,
})

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
  side('controlledBurn', 'Controlled Burn',
    'Burn a crop through excess reflections while that blueprint still harvests crops.',
    (_game, metrics) => metrics.controlledBurn),
  side('thisIsFine', 'This Is Fine', 'Infest a blueprint with Water Lettuce.',
    (_game, metrics) => metrics.infested),
  side('absolutelyNothing', 'Absolutely Nothing',
    'Collect a bundle from a loadout with no assigned Fortune effects.', () => false),
  side('youGetNothing', 'You get NOTHING',
    'Have one blueprint with no crop harvest and −100% or worse Hamster efficiency.',
    (_game, metrics) => metrics.nothing),
  strength('potato100', 'Potato Power', 'potato', 1, 'One Potato', 'hamsterBonus'),
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
