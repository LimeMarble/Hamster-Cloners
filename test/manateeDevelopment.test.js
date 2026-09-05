import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  MANATEE_BUILDING_IDS,
  MANATEE_DEVELOPMENT_GOAL_IDS,
  MANATEE_DEVELOPMENT_GOAL_TARGET,
  MANATEE_RESOURCE_IDS,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  advanceManateeSurveyState,
  canCompleteManateeDevelopmentGoal,
  collectManateeFind,
  completeManateeDevelopmentGoal,
  createBlueprint,
  createInitialGame,
  getCapybaraDemonstrationStatus,
  getCompletedManateeDevelopmentGoalCount,
  getManateeDevelopmentGoalProgress,
  getManateeSurveyDurationSeconds,
  getManateeSurveyLength,
  getManateeSurveyLengths,
  hasCompletedManateeDevelopmentGoal,
  isManateeZoneUnlocked,
  MANATEE_ZONE_IDS,
  startManateeSurvey,
} from '../src/game/gameLogic.js'
import {
  getUnlockedCropIds,
  getVisibleCropIds,
} from '../src/game/crops.js'
import { normalizeGame } from '../src/game/storage.js'

function createDivingHubGame() {
  const game = createInitialGame()

  return {
    ...game,
    hamsters: 1875,
    capybara: {
      completedDemonstrations: [
        CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
      ],
      completedSecondaryObjectives: [],
    },
    manatees: {
      ...game.manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
      buildingStages: { [MANATEE_BUILDING_IDS.DIVING_CABIN]: 1 },
    },
  }
}

test('the Estuary unlocks only when the Diving Hub provides flippers', () => {
  const game = createInitialGame()
  const cabinGame = {
    ...game,
    manatees: {
      ...game.manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
      buildingStages: { [MANATEE_BUILDING_IDS.DIVING_CABIN]: 0 },
    },
  }

  assert.equal(isManateeZoneUnlocked(game, MANATEE_ZONE_IDS.ESTUARY), false)
  assert.equal(
    isManateeZoneUnlocked(cabinGame, MANATEE_ZONE_IDS.ESTUARY),
    false,
  )
  assert.equal(
    isManateeZoneUnlocked(createDivingHubGame(), MANATEE_ZONE_IDS.ESTUARY),
    true,
  )
})

test('Restore the Feeding Grounds consumes its configured materials once', () => {
  const game = createDivingHubGame()
  const goalId = MANATEE_DEVELOPMENT_GOAL_IDS.RESTORE_FEEDING_GROUNDS
  const readyGame = {
    ...game,
    manatees: {
      ...game.manatees,
      resources: {
        ...game.manatees.resources,
        [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 1200,
        [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 1000,
        [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 1000,
        [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 200,
        [MANATEE_RESOURCE_IDS.MANGROVE_SEEDS]: 150,
      },
    },
  }

  assert.equal(canCompleteManateeDevelopmentGoal(readyGame, goalId), true)
  const completed = completeManateeDevelopmentGoal(readyGame, goalId)

  assert.equal(hasCompletedManateeDevelopmentGoal(completed, goalId), true)
  assert.equal(getCompletedManateeDevelopmentGoalCount(completed), 1)
  assert.equal(
    completed.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_LEAVES],
    0,
  )
  assert.equal(
    completed.manatees.resources[MANATEE_RESOURCE_IDS.SHOAL_GRASS],
    0,
  )
  assert.equal(completeManateeDevelopmentGoal(completed, goalId), null)
})

test('Clean out Human Waste has Standard and Extended lengths with its configured ranges', () => {
  const game = createDivingHubGame()
  const surveyId = MANATEE_SURVEY_IDS.CLEAN_HUMAN_WASTE

  assert.equal(
    getManateeSurveyDurationSeconds(
      1875,
      1e24,
      surveyId,
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    ),
    10,
  )
  assert.equal(
    getManateeSurveyDurationSeconds(
      1875,
      1e24,
      surveyId,
      MANATEE_SURVEY_LENGTH_IDS.EXTENDED,
    ),
    150,
  )
  assert.deepEqual(
    getManateeSurveyLengths(surveyId).map((length) => length.id),
    [
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
      MANATEE_SURVEY_LENGTH_IDS.EXTENDED,
    ],
  )
  assert.equal(
    getManateeSurveyLength(surveyId, MANATEE_SURVEY_LENGTH_IDS.THOROUGH).id,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  )

  const started = startManateeSurvey(
    game,
    surveyId,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    200,
  )
  const completedState = advanceManateeSurveyState(
    started.manatees,
    125000,
    1e24,
    () => 0,
  )

  assert.equal(completedState.pendingFinds.length, 25)
  assert.ok(
    completedState.pendingFinds.every(
      (find) =>
        find.amount === 15 &&
        find.developmentGoalId ===
          MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE,
    ),
  )
  assert.deepEqual(
    new Set(completedState.pendingFinds.map((find) => find.kind)),
    new Set([
      'discarded-bottle',
      'tangled-plastic',
      'rusted-can',
      'food-wrapper',
    ]),
  )

  const maximumStarted = startManateeSurvey(
    game,
    surveyId,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    200,
  )
  const maximumState = advanceManateeSurveyState(
    maximumStarted.manatees,
    125000,
    1e24,
    () => 1,
  )
  assert.equal(maximumState.pendingFinds.length, 30)
  assert.ok(maximumState.pendingFinds.every((find) => find.amount === 50))

  const extendedStarted = startManateeSurvey(
    game,
    surveyId,
    MANATEE_SURVEY_LENGTH_IDS.EXTENDED,
    200,
  )
  const extendedState = advanceManateeSurveyState(
    extendedStarted.manatees,
    125000,
    1e24,
    () => 0,
  )
  assert.equal(extendedState.pendingFinds.length, 50)
  assert.ok(extendedState.pendingFinds.every((find) => find.amount === 60))
})

test('collecting the final waste object completes the cleanup Development Goal', () => {
  const game = createDivingHubGame()
  const goalId = MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE
  const find = {
    id: 'final-waste',
    kind: 'discarded-bottle',
    developmentGoalId: goalId,
    amount: 1,
    surveyId: MANATEE_SURVEY_IDS.CLEAN_HUMAN_WASTE,
    surveyLengthId: MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    x: 50,
    y: 50,
    rotation: 0,
  }
  const nearlyClean = {
    ...game,
    manatees: {
      ...game.manatees,
      developmentGoalProgress: { [goalId]: 124999 },
      pendingFinds: [find],
    },
  }
  const completed = collectManateeFind(nearlyClean, find.id)

  assert.equal(getManateeDevelopmentGoalProgress(completed, goalId), 125000)
  assert.equal(hasCompletedManateeDevelopmentGoal(completed, goalId), true)
  assert.equal(
    startManateeSurvey(completed, MANATEE_SURVEY_IDS.CLEAN_HUMAN_WASTE),
    null,
  )
})

test('Demonstration 2 reaches its target after all three Development Goals', () => {
  const game = createDivingHubGame()
  const status = getCapybaraDemonstrationStatus(
    {
      ...game,
      manatees: {
        ...game.manatees,
        completedDevelopmentGoals: Object.values(
          MANATEE_DEVELOPMENT_GOAL_IDS,
        ),
      },
    },
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
  )

  assert.equal(MANATEE_DEVELOPMENT_GOAL_TARGET, 3)
  assert.equal(status.current, 3)
  assert.equal(status.target, 3)
  assert.equal(status.hasReachedGoal, true)
})

test('Root Tunnel stays hidden until its Demonstration reward without blocking other Crops', () => {
  const commonArguments = [
    createBlueprint({ rows: 1, columns: 2, cells: ['leek', 'corn'] }),
    true,
    125,
    true,
    true,
    true,
    true,
  ]
  const lockedCrops = getUnlockedCropIds(
    ...commonArguments,
    false,
    true,
    500,
    true,
    true,
    true,
  )
  const unlockedCrops = getUnlockedCropIds(
    ...commonArguments,
    true,
    true,
    500,
    true,
    true,
    true,
  )

  assert.equal(
    getVisibleCropIds(lockedCrops, 1000, true).includes('rootTunnel'),
    false,
  )
  assert.equal(
    getVisibleCropIds(lockedCrops, 1000, true).includes('sunflower'),
    true,
  )
  assert.equal(
    getVisibleCropIds(unlockedCrops, 1000, true).includes('rootTunnel'),
    true,
  )
})

test('Manatee Development Goal progress and waste finds survive save normalization', () => {
  const cleanupGoalId = MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE
  const normalized = normalizeGame({
    ...createDivingHubGame(),
    manatees: {
      ...createDivingHubGame().manatees,
      completedDevelopmentGoals: [
        MANATEE_DEVELOPMENT_GOAL_IDS.RESTORE_FEEDING_GROUNDS,
      ],
      developmentGoalProgress: { [cleanupGoalId]: 4321 },
      pendingFinds: [
        {
          id: 'saved-waste',
          kind: 'rusted-can',
          developmentGoalId: cleanupGoalId,
          amount: 1,
          surveyId: MANATEE_SURVEY_IDS.CLEAN_HUMAN_WASTE,
          surveyLengthId: MANATEE_SURVEY_LENGTH_IDS.STANDARD,
          x: 30,
          y: 40,
          rotation: 5,
        },
      ],
    },
  })

  assert.equal(
    normalized.manatees.developmentGoalProgress[cleanupGoalId],
    4321,
  )
  assert.deepEqual(normalized.manatees.completedDevelopmentGoals, [
    MANATEE_DEVELOPMENT_GOAL_IDS.RESTORE_FEEDING_GROUNDS,
  ])
  assert.equal(
    normalized.manatees.pendingFinds[0].developmentGoalId,
    cleanupGoalId,
  )
})

test('Wetlands obstructions survive save normalization and discard illegal tiles', () => {
  const normalized = normalizeGame({
    ...createDivingHubGame(),
    manatees: {
      ...createDivingHubGame().manatees,
      wetlandsConnection: {
        obstructions: ['C2', 'B5', 'B5', 'D10', 'H1'],
        activeConstructions: [
          { tileId: 'B5', remainingSeconds: 4 },
          { tileId: 'C6', remainingSeconds: 4 },
          { tileId: 'C6', remainingSeconds: 7 },
          { tileId: 'C2', remainingSeconds: 4 },
        ],
      },
    },
  })

  assert.deepEqual(normalized.manatees.wetlandsConnection.obstructions, [
    'B5',
    'D10',
  ])
  assert.deepEqual(
    normalized.manatees.wetlandsConnection.activeConstructions,
    [{ tileId: 'C6', remainingSeconds: 4 }],
  )
})
