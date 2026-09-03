import { getBaseFieldProductionSnapshot } from './cropProduction.js'
import { getFortuneModifiers } from './fortuneLogic.js'
import { RABBIT_UNLOCK_IDS, hasRabbitUnlock } from './tradeLogic.js'
import { getCompletedManateeDevelopmentGoalCount } from './manateeState.js'

export const CAPYBARA_DEMONSTRATION_IDS = Object.freeze({
  INTRODUCTION: 'introduction',
  DEMONSTRATION_ONE: 'demonstrationOne',
  DEMONSTRATION_TWO: 'demonstrationTwo',
})

export const CAPYBARA_SECONDARY_OBJECTIVE_IDS = Object.freeze({
  INTRODUCTION_NO_CLOVER: 'introductionNoClover',
})

export const CAPYBARA_DEMONSTRATIONS = Object.freeze([
  {
    id: CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    number: 0,
    name: 'Introduction',
    goal: 'Reach the listed field-blueprint Crop-yield requirement.',
    target: 2e13,
    unit: 'blueprint Crop yield',
    restrictions: [],
    rewardName: 'Seed Augmentation',
    rewardDescription:
      'Allows further modifications of perfected Crops at a steep Crop price.',
    hint: 'Luck may need to be on your side...',
    secondaryObjective: Object.freeze({
      id: CAPYBARA_SECONDARY_OBJECTIVE_IDS.INTRODUCTION_NO_CLOVER,
      condition:
        'Have no 4-Leaf Clover planted and no active Breeze of Fortune effects.',
      rewardName: 'Independent Engineering',
      rewardDescription:
        'Hamster Efficiency ×2 for every Capybara demonstration completed.',
    }),
  },
  {
    id: CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
    number: 1,
    name: 'Beyond Fortune',
    goal: 'Reach the listed field-blueprint Crop-yield requirement.',
    target: 1e24,
    unit: 'blueprint Crop yield',
    restrictions: [
      'No 4-Leaf Clover may be planted',
      'No Breeze of Fortune effects may be active',
    ],
    rewardName: 'Establish contact with Manatees',
    rewardDescription:
      "a species that didn't exactly get the best hand dealt to them by Fortune itself.",
    rewardJoiner: ', ',
    hint: 'Augmentations are your best friend here.',
    prerequisiteDemonstrationId: CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    requiresNoClover: true,
  },
  {
    id: CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
    number: 2,
    name: 'Estuary Development',
    goal: 'Complete 3 Manatee Development Goals.',
    target: 3,
    unit: 'Manatee Development Goals',
    metric: 'manateeDevelopmentGoals',
    restrictions: [],
    rewardName: 'Root Tunnel',
    rewardDescription:
      'Unlocks Root Tunnel as a plantable Crop for transferring adjacency effects.',
    hint: 'The Diving Hub and its flippers open the way to the Estuary.',
    prerequisiteDemonstrationId:
      CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
  },
])

const CAPYBARA_DEMONSTRATION_ID_SET = new Set(
  CAPYBARA_DEMONSTRATIONS.map(({ id }) => id),
)
const CAPYBARA_SECONDARY_OBJECTIVE_ID_SET = new Set(
  CAPYBARA_DEMONSTRATIONS.flatMap(({ secondaryObjective }) =>
    secondaryObjective ? [secondaryObjective.id] : [],
  ),
)

function toNonNegativeNumber(value) {
  const parsed = Number(value)
  if (parsed === Infinity) return Number.MAX_VALUE
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function createInitialCapybaraState() {
  return {
    completedDemonstrations: [],
    completedSecondaryObjectives: [],
  }
}

export function normalizeCapybaraState(rawCapybara) {
  if (!rawCapybara || typeof rawCapybara !== 'object') {
    return createInitialCapybaraState()
  }

  return {
    completedDemonstrations: Array.isArray(
      rawCapybara.completedDemonstrations,
    )
      ? [
          ...new Set(
            rawCapybara.completedDemonstrations.filter((id) =>
              CAPYBARA_DEMONSTRATION_ID_SET.has(id),
            ),
          ),
        ]
      : [],
    completedSecondaryObjectives: Array.isArray(
      rawCapybara.completedSecondaryObjectives,
    )
      ? [
          ...new Set(
            rawCapybara.completedSecondaryObjectives.filter((id) =>
              CAPYBARA_SECONDARY_OBJECTIVE_ID_SET.has(id),
            ),
          ),
        ]
      : [],
  }
}

export function hasCompletedCapybaraDemonstration(game, demonstrationId) {
  return game.capybara?.completedDemonstrations?.includes(demonstrationId) === true
}

export function hasCompletedCapybaraSecondaryObjective(game, objectiveId) {
  return game.capybara?.completedSecondaryObjectives?.includes(objectiveId) === true
}

export function hasSeedAugmentation(game) {
  return hasCompletedCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
  )
}

export function getCapybaraHamsterEfficiencyMultiplier(game) {
  if (
    !hasCompletedCapybaraSecondaryObjective(
      game,
      CAPYBARA_SECONDARY_OBJECTIVE_IDS.INTRODUCTION_NO_CLOVER,
    )
  ) {
    return 1
  }

  return 2 ** normalizeCapybaraState(game.capybara).completedDemonstrations.length
}

export function getCapybaraBlueprintCropYield(game) {
  const fortuneModifiers = getFortuneModifiers(game.fortune)
  const snapshot = getBaseFieldProductionSnapshot(
    game.blueprint,
    game.completedCropPerfections,
    game.trade?.rabbitContractsCompleted ?? 0,
    fortuneModifiers.passiveEffectMultiplier,
    game.seedAugmentations,
    game.trade?.totalRabbitRelationsEarned ?? 0,
  )

  return Math.max(
    0,
    snapshot.total *
      fortuneModifiers.cropYieldMultiplier *
      fortuneModifiers.harvestMultiplier,
  )
}

function isNoCloverConditionMet(game) {
  const hasPlantedClover = game.blueprint?.cells?.includes('fourLeafClover') === true
  const hasActiveCloverEffect =
    Array.isArray(game.fortune?.activeEffects) &&
    game.fortune.activeEffects.some(
      (effect) => Number(effect?.remainingSeconds) > 0,
    )

  return !hasPlantedClover && !hasActiveCloverEffect
}

export function getCapybaraDemonstrationStatus(
  game,
  demonstrationId,
  metrics = {},
) {
  const demonstration = CAPYBARA_DEMONSTRATIONS.find(
    ({ id }) => id === demonstrationId,
  )

  if (!demonstration) return null

  const current = toNonNegativeNumber(
    demonstration.metric === 'manateeDevelopmentGoals'
      ? metrics.manateeDevelopmentGoalsCompleted ??
          getCompletedManateeDevelopmentGoalCount(game)
      : metrics.blueprintCropYield ?? getCapybaraBlueprintCropYield(game),
  )
  const completed = hasCompletedCapybaraDemonstration(game, demonstrationId)
  const secondaryObjective = demonstration.secondaryObjective
  const secondaryCompleted = secondaryObjective
    ? hasCompletedCapybaraSecondaryObjective(game, secondaryObjective.id)
    : false
  const secondaryConditionMet = secondaryObjective
    ? isNoCloverConditionMet(game)
    : false
  const hasContact = hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT)
  const hasReachedGoal = current >= demonstration.target
  const hasPrerequisite = demonstration.prerequisiteDemonstrationId
    ? hasCompletedCapybaraDemonstration(
        game,
        demonstration.prerequisiteDemonstrationId,
      )
    : true
  const restrictionsMet = demonstration.requiresNoClover
    ? isNoCloverConditionMet(game)
    : true

  return {
    ...demonstration,
    current,
    progress:
      demonstration.target > 0
        ? Math.min(1, current / demonstration.target)
        : 0,
    completed,
    hasReachedGoal,
    hasPrerequisite,
    restrictionsMet,
    secondaryVisible: completed && Boolean(secondaryObjective),
    secondaryCompleted,
    secondaryConditionMet,
    canComplete:
      hasContact &&
      hasPrerequisite &&
      hasReachedGoal &&
      restrictionsMet &&
      (!completed ||
        (Boolean(secondaryObjective) &&
          !secondaryCompleted &&
          secondaryConditionMet)),
  }
}

export function completeCapybaraDemonstration(
  game,
  demonstrationId,
  metrics,
) {
  const status = getCapybaraDemonstrationStatus(game, demonstrationId, metrics)
  if (!status?.canComplete) return null

  const capybara = normalizeCapybaraState(game.capybara)
  const isFirstCompletion = !status.completed
  const completesSecondary =
    Boolean(status.secondaryObjective) &&
    !status.secondaryCompleted &&
    status.secondaryConditionMet

  return {
    ...game,
    ...(demonstrationId === CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO
      ? { hasUnlockedRootTunnel: true }
      : {}),
    capybara: {
      ...capybara,
      completedDemonstrations: isFirstCompletion
        ? [...capybara.completedDemonstrations, demonstrationId]
        : capybara.completedDemonstrations,
      completedSecondaryObjectives: completesSecondary
        ? [
            ...capybara.completedSecondaryObjectives,
            status.secondaryObjective.id,
          ]
        : capybara.completedSecondaryObjectives,
    },
  }
}
