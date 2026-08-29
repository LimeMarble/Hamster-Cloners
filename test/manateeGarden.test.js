import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_GARDEN_TENDING_DURATION_SECONDS,
  MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
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
    [MANATEE_RESOURCE_IDS.MUSK_GRASS]: 15,
  })
  assert.deepEqual(garden.stages[0].cost, {
    [MANATEE_RESOURCE_IDS.PETE]: 550,
    [MANATEE_RESOURCE_IDS.MUSK_GRASS]: 50,
  })

  const game = {
    ...createInitialGame(),
    hamsters: 100,
    manatees: {
      ...createInitialGame().manatees,
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
      resources: {
        [MANATEE_RESOURCE_IDS.LIMESTONE]: 200,
        [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 40,
        [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 50,
        [MANATEE_RESOURCE_IDS.PETE]: 850,
        [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 20,
        [MANATEE_RESOURCE_IDS.MUSK_GRASS]: 65,
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
      MANATEE_SURVEY_IDS.TEND_MUSK_GRASS,
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
  assert.deepEqual(getUnlockedManateeCropIds(stageOneGame), ['muskGrass'])
  assert.equal(
    stageOneGame.manatees.resources[MANATEE_RESOURCE_IDS.PETE],
    0,
  )
  assert.equal(
    stageOneGame.manatees.resources[MANATEE_RESOURCE_IDS.MUSK_GRASS],
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
  assert.equal(garden.stages[1].implemented, false)
})

test('Musk Grass tending always uses 10 hamsters for 600 seconds', () => {
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
      MANATEE_SURVEY_IDS.TEND_MUSK_GRASS,
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
      0.1,
    ),
    MANATEE_GARDEN_TENDING_DURATION_SECONDS,
  )
  assert.equal(
    startManateeSurvey(
      { ...initialGame, hamsters: 9 },
      MANATEE_SURVEY_IDS.TEND_MUSK_GRASS,
    ),
    null,
  )

  const startedGame = startManateeSurvey(
    initialGame,
    MANATEE_SURVEY_IDS.TEND_MUSK_GRASS,
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
  const muskGrassFinds = completed.pendingFinds.filter(
    (find) => find.surveyId === MANATEE_SURVEY_IDS.TEND_MUSK_GRASS,
  )

  assert.equal(completed.activeSurveys.length, 0)
  assert.equal(muskGrassFinds.length, 25)
  assert.ok(muskGrassFinds.every((find) => find.amount === 5))
})
