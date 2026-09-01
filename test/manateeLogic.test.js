import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACTIVE_SIMULATION_STEP_SECONDS,
  MANATEE_BUILDING_IDS,
  MANATEE_RESOURCE_IDS,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEYS,
  advanceGameSimulationStep,
  advanceManateeSurveyState,
  canUpgradeManateeBuilding,
  collectManateeFind,
  constructManateeBuilding,
  createInitialGame,
  getColumnsProducedPerSecond,
  getManateeDivingHamsterCapacity,
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  getManateeSurveyDurationMultiplier,
  getManateeSurveyDurationSeconds,
  getManateeSurveyRewardMultipliers,
  getManateeSurveyingHamsterCount,
  getMarshSurveyDurationSeconds,
  startManateeSurvey,
  upgradeManateeBuilding,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

test('legacy Musk Grass Manatee progress migrates to Shoal Grass', () => {
  const migratedGame = normalizeGame({
    manatees: {
      resources: { muskGrass: 73 },
      activeSurveys: [
        {
          id: 'tendMuskGrass',
          lengthId: 'standard',
          allocatedHamsters: 10,
          workCompleted: 120,
        },
      ],
      pendingFinds: [
        {
          id: 'legacy-grass',
          kind: 'musk-grass',
          resourceId: 'muskGrass',
          amount: 6,
          surveyId: 'tendMuskGrass',
        },
      ],
    },
  })

  assert.equal(migratedGame.manatees.resources.shoalGrass, 73)
  assert.equal(
    migratedGame.manatees.activeSurveys[0].id,
    MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
  )
  assert.deepEqual(
    migratedGame.manatees.pendingFinds.map((find) => ({
      kind: find.kind,
      resourceId: find.resourceId,
      surveyId: find.surveyId,
    })),
    [
      {
        kind: 'shoal-grass',
        resourceId: MANATEE_RESOURCE_IDS.SHOAL_GRASS,
        surveyId: MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
      },
    ],
  )
})

test('Search the Marsh matches the requested Hamster Coordination calibration', () => {
  const baselineDuration = getMarshSurveyDurationSeconds(1875, 1e24)
  const threeOctillionDuration = getMarshSurveyDurationSeconds(1875, 3e27)

  assert.ok(Math.abs(baselineDuration - 60) < 1e-10)
  assert.ok(threeOctillionDuration > 15)
  assert.ok(threeOctillionDuration < 16)
  assert.ok(baselineDuration / threeOctillionDuration > 3.8)
})

test('underwater expeditions have three reward tiers and configurable default time scaling', () => {
  const mangroveSurveyId = MANATEE_SURVEY_IDS.MANGROVE_ROOTS
  const sedimentSurveyId = MANATEE_SURVEY_IDS.SEDIMENT

  assert.equal(
    getManateeSurveyDurationSeconds(
      1875,
      1e24,
      mangroveSurveyId,
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    ),
    1,
  )
  assert.equal(
    getManateeSurveyDurationSeconds(
      1875,
      1e24,
      sedimentSurveyId,
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    ),
    2,
  )
  assert.equal(
    getManateeSurveyDurationMultiplier(
      mangroveSurveyId,
      MANATEE_SURVEY_LENGTH_IDS.EXTENDED,
    ),
    15,
  )
  assert.equal(
    getManateeSurveyDurationMultiplier(
      mangroveSurveyId,
      MANATEE_SURVEY_LENGTH_IDS.THOROUGH,
    ),
    225,
  )
  assert.deepEqual(
    getManateeSurveyRewardMultipliers(
      mangroveSurveyId,
      MANATEE_SURVEY_LENGTH_IDS.EXTENDED,
    ),
    { objectCount: 2, objectValue: 4 },
  )
  assert.deepEqual(
    getManateeSurveyRewardMultipliers(
      mangroveSurveyId,
      MANATEE_SURVEY_LENGTH_IDS.THOROUGH,
    ),
    { objectCount: 4, objectValue: 16 },
  )
})

test('the initial marsh survey silently allocates every owned hamster', () => {
  const game = {
    ...createInitialGame(),
    hamsters: 1875,
    postUnionHamstersHired: 1,
  }
  const startedGame = startManateeSurvey(game)

  assert.equal(
    startedGame.manatees.activeSurveys[0].id,
    MANATEE_SURVEY_IDS.SEARCH_MARSH,
  )
  assert.equal(startedGame.manatees.activeSurveys[0].allocatedHamsters, 1875)
  assert.equal(getManateeSurveyingHamsterCount(startedGame), 1875)
  assert.equal(startManateeSurvey(startedGame), null)
})

test('the Diving Cabin unlocks explicit underwater hamster allocation', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 1875,
  }

  assert.equal(
    startManateeSurvey(
      initialGame,
      MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    ),
    null,
  )

  const divingGame = {
    ...initialGame,
    manatees: {
      ...initialGame.manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
    },
  }
  const allocatedGame = startManateeSurvey(
    divingGame,
    MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    17,
  )
  const cappedGame = startManateeSurvey(
    divingGame,
    MANATEE_SURVEY_IDS.SEDIMENT,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    999,
  )

  assert.equal(allocatedGame.manatees.activeSurveys[0].allocatedHamsters, 17)
  assert.equal(cappedGame.manatees.activeSurveys[0].allocatedHamsters, 50)
})

test('different surveys run together without exceeding shared hamster or diving capacity', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 100,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
    },
  }
  const mangroveGame = startManateeSurvey(
    initialGame,
    MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    30,
  )
  const sedimentGame = startManateeSurvey(
    mangroveGame,
    MANATEE_SURVEY_IDS.SEDIMENT,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    40,
  )
  const marshGame = startManateeSurvey(
    sedimentGame,
    MANATEE_SURVEY_IDS.SEARCH_MARSH,
  )

  assert.deepEqual(
    marshGame.manatees.activeSurveys.map((survey) => [
      survey.id,
      survey.allocatedHamsters,
    ]),
    [
      [MANATEE_SURVEY_IDS.MANGROVE_ROOTS, 30],
      [MANATEE_SURVEY_IDS.SEDIMENT, 20],
      [MANATEE_SURVEY_IDS.SEARCH_MARSH, 50],
    ],
  )
  assert.equal(getManateeSurveyingHamsterCount(marshGame), 100)
  assert.equal(getManateeRemainingHamsterCount(marshGame), 0)
  assert.equal(getManateeRemainingDivingHamsterCapacity(marshGame), 0)
  assert.equal(
    startManateeSurvey(
      marshGame,
      MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    ),
    null,
  )
})

test('concurrent survey completions keep each expedition results separate', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 50,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
    },
  }
  const mangroveGame = startManateeSurvey(
    initialGame,
    MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    25,
  )
  const concurrentGame = startManateeSurvey(
    mangroveGame,
    MANATEE_SURVEY_IDS.SEDIMENT,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    25,
  )
  const completedState = advanceManateeSurveyState(
    concurrentGame.manatees,
    1e6,
    1e24,
    () => 0,
  )

  assert.equal(completedState.activeSurveys.length, 0)
  assert.ok(
    completedState.pendingFinds.some(
      (find) => find.surveyId === MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    ),
  )
  assert.ok(
    completedState.pendingFinds.some(
      (find) => find.surveyId === MANATEE_SURVEY_IDS.SEDIMENT,
    ),
  )
})

test('underwater expeditions produce their configured finds and tier scaling', () => {
  const marshSeedReward = MANATEE_SURVEYS[
    MANATEE_SURVEY_IDS.SEARCH_MARSH
  ].rewards.find((reward) => reward.kind === 'mangrove-seed')
  const mangroveSeedReward = MANATEE_SURVEYS[
    MANATEE_SURVEY_IDS.MANGROVE_ROOTS
  ].rewards.find((reward) => reward.kind === 'mangrove-seed')

  assert.deepEqual(marshSeedReward, {
    kind: 'mangrove-seed',
    resourceId: MANATEE_RESOURCE_IDS.MANGROVE_SEEDS,
    minimumCount: 0,
    maximumCount: 1,
    minimumAmount: 1,
    maximumAmount: 1,
  })
  assert.deepEqual(mangroveSeedReward, {
    kind: 'mangrove-seed',
    resourceId: MANATEE_RESOURCE_IDS.MANGROVE_SEEDS,
    minimumCount: 2,
    maximumCount: 3,
    minimumAmount: 1,
    maximumAmount: 1,
  })

  const baseGame = {
    ...createInitialGame(),
    hamsters: 1875,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
    },
  }
  const completeSurvey = (surveyId, lengthId) => {
    const startedGame = startManateeSurvey(
      baseGame,
      surveyId,
      lengthId,
      50,
    )
    const duration = getManateeSurveyDurationSeconds(
      50,
      1e24,
      surveyId,
      lengthId,
    )

    return advanceManateeSurveyState(
      startedGame.manatees,
      duration * 1.000001,
      1e24,
      () => 0,
    )
  }

  const mangrove = completeSurvey(
    MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  )
  assert.equal(
    mangrove.pendingFinds.filter((find) => find.kind === 'mangrove-root').length,
    4,
  )
  assert.equal(
    mangrove.pendingFinds.filter((find) => find.kind === 'mangrove-leaf').length,
    8,
  )
  assert.equal(
    mangrove.pendingFinds.filter((find) => find.kind === 'mangrove-seed').length,
    2,
  )
  assert.ok(
    mangrove.pendingFinds
      .filter((find) => find.kind === 'mangrove-seed')
      .every((find) => find.amount === 1),
  )
  assert.equal(
    mangrove.pendingFinds.filter((find) => find.kind === 'pete').length,
    0,
  )

  const sediment = completeSurvey(
    MANATEE_SURVEY_IDS.SEDIMENT,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  )
  assert.equal(sediment.pendingFinds.filter((find) => find.kind === 'pete').length, 10)
  assert.equal(
    sediment.pendingFinds.filter((find) => find.kind === 'water-lettuce').length,
    1,
  )
  assert.equal(
    sediment.pendingFinds.filter((find) => find.kind === 'shoal-grass').length,
    1,
  )
  assert.equal(
    sediment.pendingFinds.filter((find) => find.kind === 'limestone').length,
    5,
  )

  const extendedMangrove = completeSurvey(
    MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    MANATEE_SURVEY_LENGTH_IDS.EXTENDED,
  )
  const extendedRoots = extendedMangrove.pendingFinds.filter(
    (find) => find.kind === 'mangrove-root',
  )
  assert.equal(extendedRoots.length, 8)
  assert.ok(extendedRoots.every((find) => find.amount === 4))
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
  const mangroveSeeds = completedState.pendingFinds.filter(
    (find) => find.kind === 'mangrove-seed',
  )

  assert.equal(completedState.activeSurveys.length, 0)
  assert.equal(branches.length, 5)
  assert.equal(pebbles.length, 3)
  assert.equal(mangroveSeeds.length, 0)
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

  assert.equal(
    firstCollected.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_TWIG],
    20,
  )
  assert.equal(
    firstCollected.manatees.pendingFinds.length,
    completedState.pendingFinds.length - 1,
  )

  const fullyCollected = completedState.pendingFinds.reduce(
    (currentGame, find) => collectManateeFind(currentGame, find.id),
    gameWithFinds,
  )

  assert.equal(
    fullyCollected.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_TWIG],
    100,
  )
  assert.equal(
    fullyCollected.manatees.resources[MANATEE_RESOURCE_IDS.LIMESTONE],
    30,
  )
  assert.equal(fullyCollected.manatees.pendingFinds.length, 0)
})

test('the Diving Cabin upgrades into a 200-capacity Diving Hub', () => {
  const game = {
    ...createInitialGame(),
    manatees: {
      ...createInitialGame().manatees,
      resources: {
        [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 100,
        [MANATEE_RESOURCE_IDS.LIMESTONE]: 25,
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
  assert.equal(
    builtGame.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_TWIG],
    0,
  )
  assert.equal(
    builtGame.manatees.resources[MANATEE_RESOURCE_IDS.LIMESTONE],
    0,
  )
  assert.equal(getManateeDivingHamsterCapacity(builtGame), 50)
  assert.equal(
    constructManateeBuilding(
      builtGame,
      MANATEE_BUILDING_IDS.DIVING_CABIN,
    ),
    null,
  )

  const hubReadyGame = {
    ...builtGame,
    manatees: {
      ...builtGame.manatees,
      resources: {
        ...builtGame.manatees.resources,
        [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 500,
        [MANATEE_RESOURCE_IDS.LIMESTONE]: 1000,
        [MANATEE_RESOURCE_IDS.MANGROVE_WOOD]: 200,
      },
    },
  }
  assert.equal(
    canUpgradeManateeBuilding(
      hubReadyGame,
      MANATEE_BUILDING_IDS.DIVING_CABIN,
    ),
    true,
  )
  const upgradedGame = upgradeManateeBuilding(
    hubReadyGame,
    MANATEE_BUILDING_IDS.DIVING_CABIN,
  )

  assert.equal(getManateeDivingHamsterCapacity(upgradedGame), 200)
  assert.equal(
    upgradedGame.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_TWIG],
    0,
  )
  assert.equal(
    upgradedGame.manatees.resources[MANATEE_RESOURCE_IDS.LIMESTONE],
    0,
  )
  assert.equal(
    upgradedGame.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_WOOD],
    0,
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
    advancedGame.manatees.activeSurveys[0].workCompleted >
      game.manatees.activeSurveys[0].workCompleted,
  )
})

test('Manatee resources, survey progress, finds, and buildings survive save normalization', () => {
  const survey = MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH]
  const normalized = normalizeGame({
    ...createInitialGame(),
    manatees: {
      resources: { twig: 123, stone: 45, mangroveWood: 67 },
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

  assert.equal(
    normalized.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_TWIG],
    123,
  )
  assert.equal(
    normalized.manatees.resources[MANATEE_RESOURCE_IDS.LIMESTONE],
    45,
  )
  assert.equal(
    normalized.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_WOOD],
    67,
  )
  assert.equal(
    normalized.manatees.activeSurveys[0].workCompleted,
    survey.requiredWork / 2,
  )
  assert.equal(normalized.manatees.pendingFinds[0].id, 'saved-branch')
  assert.equal(
    normalized.manatees.pendingFinds[0].surveyId,
    MANATEE_SURVEY_IDS.SEARCH_MARSH,
  )
  assert.deepEqual(normalized.manatees.completedBuildings, [
    MANATEE_BUILDING_IDS.DIVING_CABIN,
  ])
})
