import {
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT,
  CROP_PERFECTION_UNLOCK_CROP_COUNT,
  CROP_PERFECTIONS,
  KNOTWEED_UNLOCK_CROP_COUNT,
  LENTIL_UNLOCK_CROP_COUNT,
  SUNFLOWER_UNLOCK_CROP_COUNT,
  SWEET_POTATO_UNLOCK_HAMSTER_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
} from './crops.js'
import {
  BLUEPRINT_EXPANSIONS,
  INVENTIONS_HAMSTER_UNLOCK_COUNT,
  ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  UNIONIZATION_HAMSTER_COUNT,
} from './gameConfig.js'
import {
  RABBIT_UNLOCK_IDS,
  TRADE_ESTABLISHMENT_COST,
  hasRabbitUnlock,
} from './tradeLogic.js'

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
}) {
  return {
    id,
    category: 'Crop unlock',
    title,
    target,
    unit,
    description,
    isComplete,
    getCurrent,
    requiresAction,
  }
}

function createPerfectionGoal(perfectionId) {
  const perfection = CROP_PERFECTIONS[perfectionId]

  return {
    id: 'perfection-' + perfectionId,
    category: 'Crop perfection',
    title: 'Unlock ' + perfection.name,
    target: perfection.cost,
    unit: 'Crops',
    description:
      'Purchase ' + perfection.name + ' in Inventions → Crop Perfection.',
    isComplete: (game) => hasCropPerfection(game, perfectionId),
    getCurrent: (game) => game.crops,
    requiresAction: true,
  }
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
  createCropGoal({
    id: 'crop-corn',
    title: 'Unlock Corn',
    target: FIRST_COLUMN_EXPANSION_COST,
    description:
      'Reach the cost, then complete the first Blueprint Column Expansion in Inventions.',
    requiresAction: true,
    isComplete: (game) =>
      hasCompletedExpansion(game, 'firstColumn') ||
      getSafeProgressValue(game.blueprint?.columns) > 1,
  }),
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
    description: 'Reach the Crop threshold to permanently unlock Turnip.',
    isComplete: (game) => game.hasUnlockedTurnip === true,
  }),
  {
    id: 'crop-perfection',
    category: 'Milestone',
    title: 'Unlock Crop Perfection',
    target: CROP_PERFECTION_UNLOCK_CROP_COUNT,
    unit: 'Crops',
    description:
      'Reach the Crop threshold to reveal permanent Crop Perfections.',
    isComplete: (game) => game.hasUnlockedCropPerfection === true,
    getCurrent: (game) => game.crops,
    requiresAction: false,
  },
  createPerfectionGoal('enrichingLeek'),
  createPerfectionGoal('mirrorCorn'),
  createCropGoal({
    id: 'crop-apple-tree',
    title: 'Unlock Apple Sapling',
    target: APPLE_TREE_UNLOCK_CROP_COUNT,
    description: 'Reach the Crop threshold to permanently unlock Apple Sapling.',
    isComplete: (game) => game.hasUnlockedAppleTree === true,
  }),
  createCropGoal({
    id: 'crop-lentil',
    title: 'Unlock Lentil',
    target: LENTIL_UNLOCK_CROP_COUNT,
    description: 'Reach the Crop threshold to permanently unlock Lentil.',
    isComplete: (game) => game.hasUnlockedLentil === true,
  }),
  createCropGoal({
    id: 'crop-knotweed',
    title: 'Unlock Knotweed',
    target: KNOTWEED_UNLOCK_CROP_COUNT,
    description: 'Reach the Crop threshold to permanently unlock Knotweed.',
    isComplete: (game) => game.hasUnlockedKnotweed === true,
  }),
  createPerfectionGoal('leechingGourd'),
  {
    id: 'row-duplicators',
    category: 'Milestone',
    title: 'Unlock Row Duplicators',
    target: ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
    unit: 'Crops',
    description:
      'Reach the cost, then perform the Row Duplicator reset in Inventions.',
    isComplete: (game) => game.hasUnlockedRowDuplicators === true,
    getCurrent: (game) => game.crops,
    requiresAction: true,
  },
  createPerfectionGoal('sweetPotato'),
  createPerfectionGoal('splitweed'),
  createCropGoal({
    id: 'crop-sunflower',
    title: 'Unlock Sunflower',
    target: SUNFLOWER_UNLOCK_CROP_COUNT,
    description: 'Reach the Crop threshold to permanently unlock Sunflower.',
    isComplete: (game) => game.hasUnlockedSunflower === true,
  }),
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
    id: 'capybara-contact',
    category: 'Milestone',
    title: 'Establish contact with Capybaras',
    target: 25000,
    unit: 'Rabbit relations',
    description:
      'Spend Rabbit relations in Trade to establish contact with Capybaras.',
    isComplete: (game) =>
      hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT),
    getCurrent: (game) => game.trade?.rabbitRelations,
    requiresAction: true,
  },
]

export function getNextMajorProgressionGoal(game) {
  const goal = MAJOR_PROGRESSION_GOALS.find(
    (candidateGoal) => !candidateGoal.isComplete(game),
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
      isReady: false,
      isComplete: true,
    }
  }

  const current = getSafeProgressValue(goal.getCurrent(game))
  const target = getSafeProgressValue(goal.target)
  const progress = target > 0 ? Math.min(1, current / target) : 0

  return {
    id: goal.id,
    category: goal.category,
    title: goal.title,
    description: goal.description,
    current,
    target,
    unit: goal.unit,
    progress,
    isReady: goal.requiresAction === true && current >= target,
    isComplete: false,
  }
}