import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_GARDEN_TENDING_DURATION_SECONDS,
  MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
  MANATEE_MANGROVE_TENDING_HAMSTER_COUNT,
  MANATEE_RESOURCE_IDS,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  advanceManateeSurveyState,
  canConstructManateeBuilding,
  canUpgradeManateeBuilding,
  constructManateeBuilding,
  createInitialGame,
  getManateeBuildingStage,
  getManateeSurveyDurationSeconds,
  getUnlockedBlueprintSlotCount,
  getUnlockedManateeCropIds,
  startManateeSurvey,
  upgradeManateeBuilding,
} from '../src/game/gameLogic.js'

test('the Submerged Garden is built empty before its first growing stage', () => {
  const garden = MANATEE_BUILDINGS[MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]
  assert.deepEqual(garden.cost, {
    [MANATEE_RESOURCE_IDS.LIMESTONE]: 200,
    [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 40,
    [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 50,
    [MANATEE_RESOURCE_IDS.PETE]: 300,
    [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 20,
    [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 15,
  })
  assert.deepEqual(garden.stages[0].cost, {
    [MANATEE_RESOURCE_IDS.PETE]: 550,
    [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 50,
  })
  assert.deepEqual(garden.stages[1].cost, {
    [MANATEE_RESOURCE_IDS.PETE]: 1250,
    [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 100,
  })
  assert.deepEqual(garden.stages[2].cost, {
    [MANATEE_RESOURCE_IDS.PETE]: 2000,
    [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 175,
    [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 250,
    [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 500,
    [MANATEE_RESOURCE_IDS.MANGROVE_SEEDS]: 25,
  })
  assert.equal(garden.stages[1].cropId, 'waterLettuce')
  assert.equal(garden.stages[2].cropId, 'mangroveSapling')
  assert.equal(
    garden.stages[2].surveyId,
    MANATEE_SURVEY_IDS.TEND_MANGROVE_SAPLING,
  )
  assert.equal(garden.stages[1].implemented, true)
  assert.equal(garden.stages[2].implemented, true)

  const game = {
    ...createInitialGame(),
    hamsters: 100,
    hasUnlockedSunflower: true,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
      resources: {
        [MANATEE_RESOURCE_IDS.LIMESTONE]: 200,
        [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 40,
        [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 50,
        [MANATEE_RESOURCE_IDS.PETE]: 850,
        [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 20,
        [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 65,
      },
    },
  }

  assert.equal(
    canConstructManateeBuilding(
      game,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    true,
  )

  const builtGame = constructManateeBuilding(
    game,
    MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
  )

  assert.equal(
    getManateeBuildingStage(
      builtGame,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    0,
  )
  assert.deepEqual(getUnlockedManateeCropIds(builtGame), [])
  assert.equal(
    startManateeSurvey(
      builtGame,
      MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
    ),
    null,
  )
  assert.equal(
    canUpgradeManateeBuilding(
      builtGame,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    true,
  )

  const stageOneGame = upgradeManateeBuilding(
    builtGame,
    MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
  )

  assert.equal(
    getManateeBuildingStage(
      stageOneGame,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    1,
  )
  assert.deepEqual(getUnlockedManateeCropIds(stageOneGame), ['shoalGrass'])
  assert.equal(
    stageOneGame.manatees.resources[MANATEE_RESOURCE_IDS.PETE],
    0,
  )
  assert.equal(
    stageOneGame.manatees.resources[MANATEE_RESOURCE_IDS.SHOAL_GRASS],
    0,
  )
  assert.equal(
    canUpgradeManateeBuilding(
      stageOneGame,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    false,
  )
  assert.equal(garden.stages[1].name, 'Water Lettuce Bed')
  const stageTwoReadyGame = {
    ...stageOneGame,
    manatees: {
      ...stageOneGame.manatees,
      resources: {
        ...stageOneGame.manatees.resources,
        [MANATEE_RESOURCE_IDS.PETE]: 1250,
        [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 100,
      },
    },
  }
  assert.equal(
    canUpgradeManateeBuilding(
      stageTwoReadyGame,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    true,
  )
  const stageTwoGame = upgradeManateeBuilding(
    stageTwoReadyGame,
    MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
  )
  assert.equal(
    getManateeBuildingStage(
      stageTwoGame,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    2,
  )
  assert.deepEqual(
    getUnlockedManateeCropIds(stageTwoGame),
    ['shoalGrass', 'waterLettuce'],
  )
  assert.equal(
    canUpgradeManateeBuilding(
      stageTwoGame,
      MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    ),
    false,
  )
  assert.deepEqual(
    getUnlockedManateeCropIds({
      ...stageOneGame,
      manatees: {
        ...stageOneGame.manatees,
        buildingStages: {
          ...stageOneGame.manatees.buildingStages,
          [MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]: 3,
        },
      },
    }),
    ['shoalGrass', 'waterLettuce', 'mangroveSapling'],
  )

  const stageThreeReadyGame = {
    ...stageTwoGame,
    manatees: {
      ...stageTwoGame.manatees,
      resources: {
        ...stageTwoGame.manatees.resources,
        [MANATEE_RESOURCE_IDS.PETE]: 2000,
        [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 175,
        [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 250,
        [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 500,
        [MANATEE_RESOURCE_IDS.MANGROVE_SEEDS]: 25,
      },
    },
  }
  const stageThreeGame = upgradeManateeBuilding(
    stageThreeReadyGame,
    MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
  )
  assert.deepEqual(
    getUnlockedManateeCropIds(stageThreeGame),
    ['shoalGrass', 'waterLettuce', 'mangroveSapling'],
  )
  assert.equal(getUnlockedBlueprintSlotCount(stageTwoGame), 3)
  assert.equal(getUnlockedBlueprintSlotCount(stageThreeGame), 4)
})

test('Shoal Grass tending always uses 10 hamsters for 600 seconds', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 100,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [
        MANATEE_BUILDING_IDS.DIVING_CABIN,
        MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
      ],
      buildingStages: {
        [MANATEE_BUILDING_IDS.DIVING_CABIN]: 0,
        [MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]: 1,
      },
    },
  }

  assert.equal(
    getManateeSurveyDurationSeconds(
      MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
      1e300,
      MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
      0.1,
    ),
    MANATEE_GARDEN_TENDING_DURATION_SECONDS,
  )
  assert.equal(
    startManateeSurvey(
      { ...initialGame, hamsters: 9 },
      MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
    ),
    null,
  )

  const startedGame = startManateeSurvey(
    initialGame,
    MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
    MANATEE_SURVEY_LENGTH_IDS.THOROUGH,
    999,
  )

  assert.equal(
    startedGame.manatees.activeSurveys[0].allocatedHamsters,
    MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
  )
  assert.equal(
    startedGame.manatees.activeSurveys[0].lengthId,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  )

  const almostFinished = advanceManateeSurveyState(
    startedGame.manatees,
    MANATEE_GARDEN_TENDING_DURATION_SECONDS - 1,
    1e300,
    () => 0,
    0.1,
  )
  assert.equal(almostFinished.activeSurveys[0].workCompleted, 599)

  const completed = advanceManateeSurveyState(
    almostFinished,
    1,
    2,
    () => 0,
    100,
  )
  const shoalGrassFinds = completed.pendingFinds.filter(
    (find) => find.surveyId === MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
  )

  assert.equal(completed.activeSurveys.length, 0)
  assert.equal(shoalGrassFinds.length, 25)
  assert.ok(shoalGrassFinds.every((find) => find.amount === 5))
})

test('Water Lettuce tending unlocks at garden stage two with the fixed garden team', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 100,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [
        MANATEE_BUILDING_IDS.DIVING_CABIN,
        MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
      ],
      buildingStages: {
        [MANATEE_BUILDING_IDS.DIVING_CABIN]: 0,
        [MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]: 2,
      },
    },
  }
  const startedGame = startManateeSurvey(
    initialGame,
    MANATEE_SURVEY_IDS.TEND_WATER_LETTUCE,
    MANATEE_SURVEY_LENGTH_IDS.THOROUGH,
    999,
  )

  assert.equal(
    startedGame.manatees.activeSurveys[0].allocatedHamsters,
    MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
  )
  assert.equal(
    startedGame.manatees.activeSurveys[0].lengthId,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  )

  const completed = advanceManateeSurveyState(
    startedGame.manatees,
    MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    1e300,
    () => 0,
  )
  const waterLettuceFinds = completed.pendingFinds.filter(
    (find) => find.surveyId === MANATEE_SURVEY_IDS.TEND_WATER_LETTUCE,
  )

  assert.equal(waterLettuceFinds.length, 25)
  assert.ok(waterLettuceFinds.every((find) => find.amount === 5))
})

test('Manatee nursery value multiplies survey and garden find amounts', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 100,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [
        MANATEE_BUILDING_IDS.DIVING_CABIN,
        MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
      ],
      buildingStages: {
        [MANATEE_BUILDING_IDS.DIVING_CABIN]: 0,
        [MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]: 1,
      },
    },
  }
  const startedGame = startManateeSurvey(
    initialGame,
    MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
  )
  const completed = advanceManateeSurveyState(
    startedGame.manatees,
    MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    1,
    () => 0,
    1,
    2.12,
  )

  assert.equal(completed.pendingFinds.length, 25)
  assert.ok(completed.pendingFinds.every((find) => find.amount === 10))
})

test('Mangrove Sapling tending uses 30 hamsters for 600 seconds and yields four resources', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: MANATEE_MANGROVE_TENDING_HAMSTER_COUNT,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [
        MANATEE_BUILDING_IDS.DIVING_CABIN,
        MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
      ],
      buildingStages: {
        [MANATEE_BUILDING_IDS.DIVING_CABIN]: 0,
        [MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]: 3,
      },
    },
  }

  assert.equal(
    startManateeSurvey(
      { ...initialGame, hamsters: MANATEE_MANGROVE_TENDING_HAMSTER_COUNT - 1 },
      MANATEE_SURVEY_IDS.TEND_MANGROVE_SAPLING,
    ),
    null,
  )

  const startedGame = startManateeSurvey(
    initialGame,
    MANATEE_SURVEY_IDS.TEND_MANGROVE_SAPLING,
  )
  assert.equal(
    startedGame.manatees.activeSurveys[0].allocatedHamsters,
    MANATEE_MANGROVE_TENDING_HAMSTER_COUNT,
  )

  const completed = advanceManateeSurveyState(
    startedGame.manatees,
    MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    1e300,
    () => 0,
  )
  const findsByResource = Object.groupBy(
    completed.pendingFinds,
    (find) => find.resourceId,
  )

  assert.equal(completed.pendingFinds.length, 41)
  assert.equal(findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_LEAVES].length, 15)
  assert.ok(
    findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_LEAVES].every(
      (find) => find.amount === 10,
    ),
  )
  assert.equal(findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_WOOD].length, 8)
  assert.ok(
    findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_WOOD].every(
      (find) => find.amount === 8,
    ),
  )
  assert.equal(findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_ROOTS].length, 10)
  assert.ok(
    findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_ROOTS].every(
      (find) => find.amount === 2,
    ),
  )
  assert.equal(findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_SEEDS].length, 8)
  assert.ok(
    findsByResource[MANATEE_RESOURCE_IDS.MANGROVE_SEEDS].every(
      (find) => find.amount === 3,
    ),
  )
})
