import {
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT,
  CROP_PERFECTION_UNLOCK_CROP_COUNT,
  CROP_PERFECTIONS,
  KNOTWEED_UNLOCK_CROP_COUNT,
  LENTIL_UNLOCK_CROP_COUNT,
  SOYBEAN_UNLOCK_FLOOR_REPLICATOR_COUNT,
  hasUnlockedSoybean,
  hasUnlockedCorn,
  getCropUnlockRequirement,
  MISFORTUNE_CORN_UNLOCK_CROP_COUNT,
  hasVisitedMisfortune,
  SUNFLOWER_UNLOCK_CROP_COUNT,
  SWEET_POTATO_UNLOCK_HAMSTER_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
  WHEAT_UNLOCK_CROP_COUNT,
} from './crops.js'
import {
  BLUEPRINT_EXPANSIONS,
  GAME_AREA_IDS,
  INVENTIONS_HAMSTER_UNLOCK_COUNT,
  ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  UNIONIZATION_HAMSTER_COUNT,
} from './gameConfig.js'
import {
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  hasMisfortuneUpgrade,
  isMisfortuneUpgradeVisible,
} from './misfortuneUpgrades.js'
import {
  RABBIT_UNLOCK_IDS,
  TRADE_ESTABLISHMENT_COST,
  getTradeEstablishmentCost,
  hasRabbitUnlock,
} from './tradeLogic.js'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  CAPYBARA_DEMONSTRATIONS,
  getCapybaraBlueprintCropYield,
  getCapybaraDemonstrationStatus,
  isCapybaraDemonstrationVisible,
  hasCompletedCapybaraDemonstration,
} from './capybaraLogic.js'
import { getCompletedManateeDevelopmentGoalCount } from './manateeState.js'
import { getMisfortuneAreaCrops } from './areaLogic.js'
import { getCropPerfectionCost, getRowDuplicatorsUnlockCropCount, isCropPerfectionVisible } from './blueprintLogic.js'
import {
  hasLeekOrthogonalSquaredAugmentation,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from './augmentationLogic.js'
import {
  CLOVER_ASSEMBLY_PART_REQUIREMENT,
  CLOVER_ASSEMBLY_RABBIT_UNLOCK_ID,
  normalizeCloverAssemblyState,
} from './cloverAssemblyLogic.js'

const FIRST_COLUMN_EXPANSION_COST =
  BLUEPRINT_EXPANSIONS.find((expansion) => expansion.id === 'firstColumn')
    ?.cost ?? 1e4

function getSafeProgressValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function hasCropPerfection(game, perfectionId) {
  return Array.isArray(game.completedCropPerfections) &&
    game.completedCropPerfections.includes(perfectionId)
}

function hasCompletedExpansion(game, expansionId) {
  return Array.isArray(game.completedBlueprintExpansions) &&
    game.completedBlueprintExpansions.includes(expansionId)
}

function createCropGoal({
  id,
  title,
  target,
  unit = 'Crops',
  description,
  isComplete,
  getCurrent = (game) => game.crops,
  requiresAction = false,
  getTarget = () => target,
}) {
  return {
    id,
    category: 'Crop unlock',
    title,
    target,
    getTarget,
    unit,
    description,
    isComplete,
    getCurrent,
    requiresAction,
  }
}

function createPerfectionGoal(perfectionId) {
  const perfection = CROP_PERFECTIONS[perfectionId]
  const usesRabbitRelations =
    perfection.costCurrency === 'rabbitRelations'

  return {
    id: 'perfection-' + perfectionId,
    category: 'Crop perfection',
    title: 'Unlock ' + perfection.name,
    target: perfection.cost,
    getTarget: (game) => getCropPerfectionCost(perfectionId, game),
    unit: usesRabbitRelations ? 'Rabbit relations' : 'Crops',
    description: usesRabbitRelations
      ? 'Purchase ' + perfection.name + ' in Trade → Rabbit unlocks.'
      : 'Purchase ' + perfection.name + ' in Inventions → Crop Perfection.',
    isApplicable: (game) => isCropPerfectionVisible(game, perfectionId),
    isComplete: (game) => hasCropPerfection(game, perfectionId),
    getCurrent: (game) =>
      usesRabbitRelations ? game.trade?.rabbitRelations : game.crops,
    requiresAction: true,
  }
}

function createMisfortuneUpgradeGoal(upgradeId, description) {
  const upgrade = MISFORTUNE_UPGRADES[upgradeId]

  return {
    id: 'misfortune-upgrade-' + upgradeId,
    category: 'Misfortune upgrade',
    title: 'Unlock ' + upgrade.name,
    target: upgrade.cost,
    unit: 'Misfortune Crops',
    description,
    isApplicable: (game) =>
      game.activeArea === GAME_AREA_IDS.MISFORTUNE &&
      isMisfortuneUpgradeVisible(game, upgradeId),
    isComplete: (game) => hasMisfortuneUpgrade(game, upgradeId),
    getCurrent: (game) => game.crops,
    requiresAction: true,
  }
}

const SWEET_POTATO_PERFECTION_GOAL = {
  ...createPerfectionGoal('sweetPotato'),
  isApplicable: (game) =>
    hasVisitedMisfortune(game) ||
    hasCropPerfection(game, 'sweetPotato') ||
    hasCompletedCapybaraDemonstration(
      game,
      CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
    ),
  isLocked: (game) => !isCropPerfectionVisible(game, 'sweetPotato'),
  getDescription: (game) => isCropPerfectionVisible(game, 'sweetPotato')
    ? 'Purchase Sweet Potato in Inventions → Crop Perfection.'
    : 'Continue progressing in Misfortune to discover how to perfect Potato.',
}

const CLOVER_PERFECTION_GOAL = {
  id: 'perfection-five-leaf-clover',
  category: 'Crop perfection',
  title: 'Assemble 5-Leaf Clover',
  isApplicable: hasVisitedMisfortune,
  target: CLOVER_ASSEMBLY_PART_REQUIREMENT,
  unit: 'of each required Crop',
  description:
    'Fabricate its four parts together from Apple Sapling, Canola, Soybean, and Carrot production in Misfortune.',
  isComplete: (game) => game.cloverAssembly?.assembled === true,
  getCurrent: (game) =>
    normalizeCloverAssemblyState(game.cloverAssembly).progress,
  getProgressPerSecond: (_game, context) =>
    getSafeProgressValue(context.cloverAssemblyProductionPerSecond),
  getProgressLabel: (game) =>
    game.hasUnlockedGreaterBlueprinting === true &&
    game.trade?.rabbitUnlocks?.includes(
      CLOVER_ASSEMBLY_RABBIT_UNLOCK_ID,
    ) === true
      ? null
      : 'Unlock prerequisites to reveal...',
  requiresAction: true,
}

export const MAJOR_PROGRESSION_GOALS = [
  {
    id: 'inventions',
    category: 'Milestone',
    title: 'Unlock Inventions',
    target: INVENTIONS_HAMSTER_UNLOCK_COUNT,
    unit: 'Hamsters hired',
    description: 'Hire 50 Hamsters to reveal the Inventions tab.',
    isComplete: (game) =>
      getSafeProgressValue(game.totalHamstersHired) >=
      INVENTIONS_HAMSTER_UNLOCK_COUNT,
    getCurrent: (game) => game.totalHamstersHired,
    requiresAction: false,
  },
  {
    id: 'crop-corn',
    category: 'Crop unlock',
    title: 'Unlock Corn',
    target: FIRST_COLUMN_EXPANSION_COST,
    unit: 'Crops',
    description:
      'Reach the cost, then complete the first Blueprint Column Expansion in Inventions.',
    requiresAction: true,
    isComplete: (game) => hasUnlockedCorn(game) ||
      (game.activeArea !== GAME_AREA_IDS.MISFORTUNE && hasCompletedExpansion(game, 'firstColumn')),
    getCurrent: (game) => game.crops,
    getTarget: (game) => game.activeArea === GAME_AREA_IDS.MISFORTUNE
      ? MISFORTUNE_CORN_UNLOCK_CROP_COUNT
      : FIRST_COLUMN_EXPANSION_COST,
    getDescription: (game) => game.activeArea === GAME_AREA_IDS.MISFORTUNE
      ? 'Reach the Crop requirement to unlock Corn in Misfortune.'
      : 'Reach the cost, then complete the first Blueprint Column Expansion in Inventions.',
  },
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    'Purchase Unfortunate Row from the Misfortune tab.',
  ),
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.RUSHED_START,
    'Purchase Rushed Start from the Misfortune tab.',
  ),
  createCropGoal({
    id: 'crop-pumpkin',
    title: 'Unionize and unlock Pumpkin',
    target: UNIONIZATION_HAMSTER_COUNT,
    unit: 'Hamsters hired',
    description:
      'Hire the 1,000th Hamster and accept unionization to unlock Pumpkin.',
    isComplete: (game) => game.unionized === true,
    getCurrent: (game) => game.totalHamstersHired,
  }),
  createCropGoal({
    id: 'crop-potato',
    title: 'Unlock Potato',
    target: SWEET_POTATO_UNLOCK_HAMSTER_COUNT,
    unit: 'Hamsters',
    description:
      'After unionization, rebuild to 125 active Hamsters to unlock Potato.',
    isComplete: (game) =>
      game.unionized === true &&
      getSafeProgressValue(game.hamsters) >=
        SWEET_POTATO_UNLOCK_HAMSTER_COUNT,
    getCurrent: (game) => game.hamsters,
  }),
  createCropGoal({
    id: 'crop-turnip',
    title: 'Unlock Turnip',
    target: TURNIP_UNLOCK_CROP_COUNT,
    getTarget: (game) => getCropUnlockRequirement('turnip', game.activeArea),
    description: 'Reach the Crop threshold to permanently unlock Turnip.',
    isComplete: (game) => game.hasUnlockedTurnip === true,
  }),
  {
    id: 'crop-perfection',
    category: 'Milestone',
    title: 'Unlock Crop Perfection',
    target: CROP_PERFECTION_UNLOCK_CROP_COUNT,
    getTarget: (game) => getCropUnlockRequirement('cropPerfection', game.activeArea),
    unit: 'Crops',
    description:
      'Reach the Crop threshold to reveal permanent Crop Perfections.',
    isComplete: (game) => game.hasUnlockedCropPerfection === true,
    getCurrent: (game) => game.crops,
    requiresAction: false,
  },
  {
    id: 'crop-peanuts',
    category: 'Crop unlock',
    title: 'Making Peanuts',
    target: 5,
    unit: 'blueprint Crops/sec',
    description: 'Make 5 Crops/sec from one field blueprint under Misfortune’s penalties to unlock Peanuts.',
    isApplicable: (game) => game.activeArea === GAME_AREA_IDS.MISFORTUNE,
    isComplete: (game) => game.earnedAchievementIds?.includes('makingPeanuts') === true,
    getCurrent: (game) => Math.max(...[game.blueprint, ...(game.blueprintSlots ?? [])]
      .filter(Boolean).map((blueprint) => getCapybaraBlueprintCropYield({ ...game, blueprint }))),
    requiresAction: false,
  },
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.OILY_TREATS,
    'Purchase Oily Treats, then revisit main for Sweet Potato. Its effects work in Misfortune too.',
  ),
  createPerfectionGoal('enrichingLeek'),
  createPerfectionGoal('mirrorCorn'),
  createCropGoal({
    id: 'crop-apple-tree',
    title: 'Unlock Apple Sapling',
    target: APPLE_TREE_UNLOCK_CROP_COUNT,
    getTarget: (game) => getCropUnlockRequirement('appleTree', game.activeArea),
    description: 'Reach the Crop threshold to permanently unlock Apple Sapling.',
    isComplete: (game) => game.hasUnlockedAppleTree === true,
  }),
  createCropGoal({
    id: 'crop-lentil',
    title: 'Unlock Lentil',
    target: LENTIL_UNLOCK_CROP_COUNT,
    getTarget: (game) => getCropUnlockRequirement('lentil', game.activeArea),
    description: 'Reach the Crop threshold to permanently unlock Lentil.',
    isComplete: (game) => game.hasUnlockedLentil === true,
  }),
  createCropGoal({
    id: 'crop-knotweed',
    title: 'Unlock Knotweed',
    target: KNOTWEED_UNLOCK_CROP_COUNT,
    getTarget: (game) => getCropUnlockRequirement('knotweed', game.activeArea),
    description: 'Reach the Crop threshold to permanently unlock Knotweed.',
    isComplete: (game) => game.hasUnlockedKnotweed === true,
  }),
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
    'Purchase Adversity-Grown Tubers from the Misfortune tab.',
  ),
  createPerfectionGoal('leechingGourd'),
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    'Purchase Burdened Foundations from the Misfortune tab.',
  ),
  {
    id: 'row-duplicators',
    category: 'Milestone',
    title: 'Unlock Row Duplicators',
    target: ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
    getTarget: getRowDuplicatorsUnlockCropCount,
    unit: 'Crops',
    description:
      'Reach the cost, then perform the Row Duplicator reset in Inventions.',
    isComplete: (game) => game.hasUnlockedRowDuplicators === true,
    getCurrent: (game) => game.crops,
    requiresAction: true,
  },
  createCropGoal({
    id: 'crop-wheat',
    title: 'Unlock Wheat',
    target: WHEAT_UNLOCK_CROP_COUNT,
    getTarget: (game) => getCropUnlockRequirement('wheat', game.activeArea),
    description:
      'After unlocking Row Duplicators, reach the Crop threshold to permanently unlock Wheat.',
    isComplete: (game) => game.hasUnlockedWheat === true,
  }),
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    'Purchase Hunt for Something Greater from the Misfortune tab.',
  ),
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
    'Purchase Nourishing Misery from the Misfortune tab.',
  ),
  createPerfectionGoal('splitweed'),
  createCropGoal({
    id: 'crop-sunflower',
    title: 'Unlock Sunflower',
    target: SUNFLOWER_UNLOCK_CROP_COUNT,
    getTarget: (game) => getCropUnlockRequirement('sunflower', game.activeArea),
    description: 'Reach the Crop threshold to permanently unlock Sunflower.',
    isComplete: (game) => game.hasUnlockedSunflower === true,
  }),
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
    'Purchase Fortunate Column from the Misfortune tab.',
  ),
  createCropGoal({
    id: 'crop-canola',
    title: 'Unlock Canola',
    target: CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT,
    unit: 'Row Duplicators',
    description: 'Own 500 Row Duplicators to unlock Canola.',
    isComplete: (game) =>
      getSafeProgressValue(game.rowDuplicators) >=
      CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT,
    getCurrent: (game) => game.rowDuplicators,
  }),
  {
    id: 'trade-relations',
    category: 'Milestone',
    title: 'Establish Trade Relations',
    target: TRADE_ESTABLISHMENT_COST,
    getTarget: getTradeEstablishmentCost,
    unit: 'Crops',
    description:
      'Spend the cost in the Trade tab to establish relations without resetting.',
    isComplete: (game) => game.trade?.established === true,
    getCurrent: (game) => game.crops,
    requiresAction: true,
  },
  {
    id: 'crop-carrot',
    category: 'Crop unlock',
    title: 'Unlock Carrot',
    target: 500,
    unit: 'Rabbit relations',
    description:
      'Spend 500 Rabbit relations in Trade to unlock Carrot and its contract-scaling passives.',
    isComplete: (game) => hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.CARROT),
    getCurrent: (game) => game.trade?.rabbitRelations,
    requiresAction: true,
  },
  {
    id: 'crop-four-leaf-clover',
    category: 'Crop unlock',
    title: 'Unlock 4-Leaf Clover',
    target: 27777,
    unit: 'Rabbit relations',
    description:
      'Spend Rabbit relations in Trade to unlock 4-Leaf Clover.',
    isComplete: (game) =>
      hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.FOUR_LEAF_CLOVER),
    getCurrent: (game) => game.trade?.rabbitRelations,
    requiresAction: true,
  },
  {
    id: 'capybara-contact',
    category: 'Milestone',
    title: 'Establish contact with Capybaras',
    target: 40000,
    unit: 'Rabbit relations',
    description:
      'Spend Rabbit relations in Trade to establish contact with Capybaras.',
    isComplete: (game) =>
      hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT),
    getCurrent: (game) => game.trade?.rabbitRelations,
    requiresAction: true,
  },
  {
    id: 'capybara-demonstration-introduction',
    category: 'Demonstration',
    title: 'Capybara Demonstration 0: Introduction',
    demonstrationId: CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    target: CAPYBARA_DEMONSTRATIONS[0].target,
    unit: 'blueprint Crop yield',
    description:
      'Reach the required intrinsic blueprint Crop yield and complete the demonstration in Trade. Luck may need to be on your side...',
    isComplete: (game) =>
      hasCompletedCapybaraDemonstration(
        game,
        CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
      ),
    getCurrent: getCapybaraBlueprintCropYield,
    requiresAction: true,
  },
  {
    id: 'capybara-demonstration-one',
    category: 'Demonstration',
    title: 'Capybara Demonstration 1: Beyond Fortune',
    demonstrationId: CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
    target: CAPYBARA_DEMONSTRATIONS[1].target,
    unit: 'blueprint Crop yield',
    description:
      'Reach the required intrinsic blueprint Crop yield. ' +
      CAPYBARA_DEMONSTRATIONS[1].restrictions.join('. ') + '. ' +
      CAPYBARA_DEMONSTRATIONS[1].hint,
    isComplete: (game) =>
      hasCompletedCapybaraDemonstration(
        game,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
      ),
    getCurrent: getCapybaraBlueprintCropYield,
    requiresAction: true,
  },
  SWEET_POTATO_PERFECTION_GOAL,
  {
    id: 'crop-soybean',
    category: 'Crop unlock',
    title: 'Unlock Soybean',
    target: SOYBEAN_UNLOCK_FLOOR_REPLICATOR_COUNT,
    unit: 'Floor Replicators',
    description:
      'After unlocking Canola in Misfortune, own 555 Floor Replicators to unlock Soybean.',
    isApplicable: hasVisitedMisfortune,
    isComplete: hasUnlockedSoybean,
    getCurrent: (game) => game.floorReplicators,
  },
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    'Purchase Final Support from the Misfortune tab.',
  ),
  {
    id: 'augmentation-leek-orthogonal-squared',
    category: 'Seed augmentation',
    title: 'Unlock Orthogonal²',
    target: SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED].cost,
    unit: 'Main Crops',
    description: 'Purchase Orthogonal² for Enriching Leek in Main → Inventions → Augmentation.',
    isApplicable: (game) => hasMisfortuneUpgrade(game, MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT),
    isComplete: (game) => hasLeekOrthogonalSquaredAugmentation(game.seedAugmentations),
    getCurrent: (game) => game.activeArea === GAME_AREA_IDS.MISFORTUNE
      ? game.areaProgress?.main?.crops
      : game.crops,
    requiresAction: true,
  },
  CLOVER_PERFECTION_GOAL,
  createMisfortuneUpgradeGoal(
    MISFORTUNE_UPGRADE_IDS.PARTING_GIFT,
    'Purchase Parting Gift from the Misfortune tab to build Floor Replicators in the main field. Main Support remains +0.2% Crop passives per tier.',
  ),
  createPerfectionGoal('samplingLentil'),
  createPerfectionGoal('blazingCarrot'),
  {
    id: 'capybara-demonstration-two',
    category: 'Demonstration',
    title: "Capybara Demonstration 2: Fortune's Wrath",
    demonstrationId: CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
    target: CAPYBARA_DEMONSTRATIONS[2].target,
    unit: 'Misfortune Crops',
    description:
      'Enter Misfortune from Trade and reach the Crop requirement under Fortune’s Wrath.',
    isComplete: (game) =>
      hasCompletedCapybaraDemonstration(
        game,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
      ),
    getCurrent: getMisfortuneAreaCrops,
    requiresAction: true,
  },
  {
    id: 'capybara-demonstration-three',
    category: 'Demonstration',
    title: 'Capybara Demonstration 3: Estuary Development',
    demonstrationId: CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_THREE,
    target: CAPYBARA_DEMONSTRATIONS[3].target,
    unit: 'Manatee Development Goals',
    description:
      'Complete three Manatee Development Goals, then report back to the Capybaras.',
    isComplete: (game) =>
      hasCompletedCapybaraDemonstration(
        game,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_THREE,
      ),
    getCurrent: getCompletedManateeDevelopmentGoalCount,
    requiresAction: true,
  },
]

export function getNextMajorProgressionGoal(game, context = {}) {
  const goal = MAJOR_PROGRESSION_GOALS.find(
    (candidateGoal) =>
      candidateGoal.isApplicable?.(game) !== false &&
      (!candidateGoal.demonstrationId ||
        isCapybaraDemonstrationVisible(game, candidateGoal.demonstrationId)) &&
      !candidateGoal.isComplete(game),
  )

  if (!goal) {
    return {
      id: 'all-current-goals-complete',
      category: 'Major progression',
      title: 'All current major goals complete',
      description: 'You have completed every major goal in this version.',
      current: 1,
      target: 1,
      unit: 'Goals',
      progress: 1,
      displayProgressAsDash: false,
      isReady: false,
      isComplete: true,
    }
  }

  const demonstrationStatus = goal.demonstrationId
    ? getCapybaraDemonstrationStatus(game, goal.demonstrationId)
    : null
  const progressLabel = goal.getProgressLabel?.(game) ?? null
  const isLocked = goal.isLocked?.(game) === true
  const displayProgressAsDash =
    isLocked || (demonstrationStatus?.number >= 1 &&
    demonstrationStatus.requiresNoActiveBreezeEffects === true &&
    demonstrationStatus.restrictionsMet === false)
  const current = displayProgressAsDash || progressLabel
    ? 0
    : getSafeProgressValue(goal.getCurrent(game))
  const target = isLocked ? 0 : getSafeProgressValue(goal.getTarget?.(game) ?? goal.target)
  const progress = target > 0 ? Math.min(1, current / target) : 0
  const progressPerSecond = isLocked || progressLabel
    ? null
    : goal.getProgressPerSecond?.(game, context) ?? null

  return {
    id: goal.id,
    category: goal.category,
    title: goal.title,
    description: goal.getDescription?.(game) ?? goal.description,
    current,
    target,
    unit: goal.unit,
    progress,
    progressPerSecond,
    progressLabel,
    displayProgressAsDash,
    isReady:
      goal.requiresAction === true &&
      !isLocked &&
      !progressLabel &&
      (demonstrationStatus
        ? demonstrationStatus.canComplete
        : current >= target),
    isComplete: false,
  }
}
