import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACTIVE_SIMULATION_STEP_SECONDS,
  MANATEE_BUILDING_IDS,
  MANATEE_RESOURCE_IDS,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEYS,
  advanceGameSimulationStep,
  advanceManateeSurveyState,
  collectManateeFind,
  constructManateeBuilding,
  createInitialGame,
  getColumnsProducedPerSecond,
  getManateeDivingHamsterCapacity,
  getManateeSurveyingHamsterCount,
  getMarshSurveyDurationSeconds,
  startManateeSurvey,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

test('Search the Marsh matches the requested Hamster Coordination calibration', () => {
  const baselineDuration = getMarshSurveyDurationSeconds(1875, 1e24)
  const threeOctillionDuration = getMarshSurveyDurationSeconds(1875, 3e27)

  assert.ok(Math.abs(baselineDuration - 60) < 1e-10)
  assert.ok(threeOctillionDuration > 30)
  assert.ok(threeOctillionDuration < 31)
  assert.ok(baselineDuration / threeOctillionDuration > 1.95)
})

test('the initial marsh survey silently allocates every owned hamster', () => {
  const game = {
    ...createInitialGame(),
    hamsters: 1875,
    postUnionHamstersHired: 1,
  }
  const startedGame = startManateeSurvey(game)

  assert.equal(
    startedGame.manatees.activeSurvey.id,
    MANATEE_SURVEY_IDS.SEARCH_MARSH,
  )
  assert.equal(startedGame.manatees.activeSurvey.allocatedHamsters, 1875)
  assert.equal(getManateeSurveyingHamsterCount(startedGame), 1875)
  assert.equal(startManateeSurvey(startedGame), null)
})

test('a completed marsh survey creates individually collectible branches and pebbles', () => {
  const game = startManateeSurvey({
    ...createInitialGame(),
    hamsters: 1875,
  })
  const completedState = advanceManateeSurveyState(
    game.manatees,
    60,
    1e24,
    () => 0,
  )
  const branches = completedState.pendingFinds.filter(
    (find) => find.kind === 'branch',
  )
  const pebbles = completedState.pendingFinds.filter(
    (find) => find.kind === 'pebble',
  )

  assert.equal(completedState.activeSurvey, null)
  assert.equal(branches.length, 5)
  assert.equal(pebbles.length, 3)
  assert.ok(branches.every((find) => find.amount === 20))
  assert.ok(pebbles.every((find) => find.amount === 10))

  const gameWithFinds = {
    ...game,
    manatees: completedState,
  }
  const firstCollected = collectManateeFind(
    gameWithFinds,
    completedState.pendingFinds[0].id,
  )

  assert.equal(firstCollected.manatees.resources.wood, 20)
  assert.equal(
    firstCollected.manatees.pendingFinds.length,
    completedState.pendingFinds.length - 1,
  )

  const fullyCollected = completedState.pendingFinds.reduce(
    (currentGame, find) => collectManateeFind(currentGame, find.id),
    gameWithFinds,
  )

  assert.equal(fullyCollected.manatees.resources.wood, 100)
  assert.equal(fullyCollected.manatees.resources.stone, 30)
  assert.equal(fullyCollected.manatees.pendingFinds.length, 0)
})

test('the Diving Cabin is one-and-done and grants an extensible 50-hamster capacity', () => {
  const game = {
    ...createInitialGame(),
    manatees: {
      ...createInitialGame().manatees,
      resources: {
        [MANATEE_RESOURCE_IDS.WOOD]: 100,
        [MANATEE_RESOURCE_IDS.STONE]: 25,
      },
    },
  }
  const builtGame = constructManateeBuilding(
    game,
    MANATEE_BUILDING_IDS.DIVING_CABIN,
  )

  assert.ok(
    builtGame.manatees.completedBuildings.includes(
      MANATEE_BUILDING_IDS.DIVING_CABIN,
    ),
  )
  assert.equal(builtGame.manatees.resources.wood, 0)
  assert.equal(builtGame.manatees.resources.stone, 0)
  assert.equal(getManateeDivingHamsterCapacity(builtGame), 50)
  assert.equal(
    constructManateeBuilding(
      builtGame,
      MANATEE_BUILDING_IDS.DIVING_CABIN,
    ),
    null,
  )
})

test('surveying removes hamsters from Columns per second without reducing Coordination', () => {
  const coordinationHamsters = 1875
  const productiveHamsters = 1775
  const expectedRate =
    productiveHamsters * 0.1 * 1.03 ** coordinationHamsters

  assert.ok(
    Math.abs(
      getColumnsProducedPerSecond(
        productiveHamsters,
        1,
        1,
        1,
        coordinationHamsters,
      ) - expectedRate,
    ) / expectedRate < 1e-12,
  )

  const game = startManateeSurvey({
    ...createInitialGame(),
    hamsters: coordinationHamsters,
    postUnionHamstersHired: 1,
  })
  const advancedGame = advanceGameSimulationStep(
    game,
    ACTIVE_SIMULATION_STEP_SECONDS,
  )

  assert.equal(advancedGame.farmland.columns, game.farmland.columns)
  assert.ok(
    advancedGame.manatees.activeSurvey.workCompleted >
      game.manatees.activeSurvey.workCompleted,
  )
})

test('Manatee resources, survey progress, finds, and buildings survive save normalization', () => {
  const survey = MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH]
  const normalized = normalizeGame({
    ...createInitialGame(),
    manatees: {
      resources: { wood: 123, stone: 45 },
      activeSurvey: {
        id: MANATEE_SURVEY_IDS.SEARCH_MARSH,
        allocatedHamsters: 1875,
        workCompleted: survey.requiredWork / 2,
      },
      pendingFinds: [
        {
          id: 'saved-branch',
          kind: 'branch',
          amount: 24,
          x: 30,
          y: 40,
          rotation: 5,
        },
      ],
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
      nextFindId: 8,
    },
  })

  assert.deepEqual(normalized.manatees.resources, { wood: 123, stone: 45 })
  assert.equal(
    normalized.manatees.activeSurvey.workCompleted,
    survey.requiredWork / 2,
  )
  assert.equal(normalized.manatees.pendingFinds[0].id, 'saved-branch')
  assert.deepEqual(normalized.manatees.completedBuildings, [
    MANATEE_BUILDING_IDS.DIVING_CABIN,
  ])
})
