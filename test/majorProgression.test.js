import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInitialGame,
  getNextMajorProgressionGoal,
  MAJOR_PROGRESSION_GOALS,
} from '../src/game/gameLogic.js'
import { CROP_PERFECTION_IDS } from '../src/game/crops.js'

test('major progression goals contain crop unlocks, milestones, and perfections in order', () => {
  assert.deepEqual(
    MAJOR_PROGRESSION_GOALS.map((goal) => goal.id),
    [
      'inventions',
      'crop-corn',
      'crop-pumpkin',
      'crop-potato',
      'crop-turnip',
      'crop-perfection',
      'perfection-enrichingLeek',
      'perfection-mirrorCorn',
      'crop-apple-tree',
      'crop-lentil',
      'crop-knotweed',
      'perfection-leechingGourd',
      'row-duplicators',
      'crop-wheat',
      'perfection-splitweed',
      'crop-sunflower',
      'crop-canola',
      'trade-relations',
      'crop-carrot',
      'crop-four-leaf-clover',
      'capybara-contact',
      'capybara-demonstration-introduction',
      'perfection-blazingCarrot',
      'capybara-demonstration-one',
    'perfection-samplingLentil',
    ],
  )
})

test('major progression advances to the earliest unfinished goal', () => {
  let game = createInitialGame()

  assert.equal(getNextMajorProgressionGoal(game).id, 'inventions')

  game = {
    ...game,
    totalHamstersHired: 50,
  }
  assert.equal(getNextMajorProgressionGoal(game).id, 'crop-corn')

  game = {
    ...game,
    completedBlueprintExpansions: ['firstColumn'],
    blueprint: {
      ...game.blueprint,
      columns: 2,
      cells: ['leek', null],
      mirrorCornTargets: [null, null],
    },
  }
  assert.equal(getNextMajorProgressionGoal(game).id, 'crop-pumpkin')

  game = {
    ...game,
    unionized: true,
    totalHamstersHired: 1000,
    hamsters: 100,
  }
  const potatoGoal = getNextMajorProgressionGoal(game)
  assert.equal(potatoGoal.id, 'crop-potato')
  assert.equal(potatoGoal.unit, 'Hamsters')
  assert.equal(potatoGoal.progress, 0.8)

  game = {
    ...game,
    hamsters: 125,
    hasUnlockedTurnip: true,
    hasUnlockedCropPerfection: true,
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn'],
    hasUnlockedAppleTree: true,
    hasUnlockedLentil: true,
    hasUnlockedKnotweed: true,
    crops: 2e19,
  }
  const gourdGoal = getNextMajorProgressionGoal(game)
  assert.equal(gourdGoal.id, 'perfection-leechingGourd')
  assert.equal(gourdGoal.isReady, true)

  game = {
    ...game,
    completedCropPerfections: [
      'enrichingLeek',
      'mirrorCorn',
      'leechingGourd',
    ],
    hasUnlockedRowDuplicators: true,
    crops: 1.25e32,
  }
  const wheatGoal = getNextMajorProgressionGoal(game)
  assert.equal(wheatGoal.id, 'crop-wheat')
  assert.equal(wheatGoal.isReady, false)
  assert.equal(wheatGoal.progress, 1)

  game = {
    ...game,
    hasUnlockedWheat: true,
    crops: 6e38,
  }
  const splitweedGoal = getNextMajorProgressionGoal(game)
  assert.equal(splitweedGoal.id, 'perfection-splitweed')
  assert.equal(splitweedGoal.isReady, true)

  game = {
    ...game,
    completedCropPerfections: CROP_PERFECTION_IDS,
    hasUnlockedSunflower: true,
    rowDuplicators: 499,
  }
  const canolaGoal = getNextMajorProgressionGoal(game)
  assert.equal(canolaGoal.id, 'crop-canola')
  assert.equal(canolaGoal.current, 499)
  assert.equal(canolaGoal.target, 500)
  assert.equal(canolaGoal.unit, 'Row Duplicators')

  game = {
    ...game,
    rowDuplicators: 500,
  }
  const tradeGoal = getNextMajorProgressionGoal(game)
  assert.equal(tradeGoal.id, 'trade-relations')
  assert.equal(tradeGoal.target, 1e57)
  assert.equal(tradeGoal.isReady, false)

  game = {
    ...game,
    crops: 1e57,
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: { ...game.trade, established: true },
  }
  const carrotGoal = getNextMajorProgressionGoal(game)
  assert.equal(carrotGoal.id, 'crop-carrot')
  assert.equal(carrotGoal.isReady, false)

  game = {
    ...game,
    trade: { ...game.trade, rabbitRelations: 500 },
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: { ...game.trade, rabbitUnlocks: ['carrot'] },
  }
  const cloverGoal = getNextMajorProgressionGoal(game)
  assert.equal(cloverGoal.id, 'crop-four-leaf-clover')

  game = {
    ...game,
    trade: { ...game.trade, rabbitRelations: 77777 },
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: {
      ...game.trade,
      rabbitUnlocks: ['carrot', 'fourLeafClover'],
    },
  }
  const capybaraGoal = getNextMajorProgressionGoal(game)
  assert.equal(capybaraGoal.id, 'capybara-contact')

  game = {
    ...game,
    trade: { ...game.trade, rabbitRelations: 125000 },
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: {
      ...game.trade,
      rabbitUnlocks: ['carrot', 'fourLeafClover', 'capybaraContact'],
    },
  }
  const demonstrationGoal = getNextMajorProgressionGoal(game)
  assert.equal(
    demonstrationGoal.id,
    'capybara-demonstration-introduction',
  )
  assert.equal(demonstrationGoal.target, 2e13)

  game = {
    ...game,
    capybara: { completedDemonstrations: ['introduction'] },
  }
  const secondDemonstrationGoal = getNextMajorProgressionGoal(game)
  assert.equal(secondDemonstrationGoal.id, 'capybara-demonstration-one')
  assert.equal(secondDemonstrationGoal.target, 1e24)
  assert.equal(secondDemonstrationGoal.displayProgressAsDash, false)

  const cloverRestrictedGoal = getNextMajorProgressionGoal({
    ...game,
    blueprint: {
      ...game.blueprint,
      cells: game.blueprint.cells.map((crop, index) =>
        index === 0 ? 'fourLeafClover' : crop,
      ),
    },
  })
  assert.equal(cloverRestrictedGoal.id, 'capybara-demonstration-one')
  assert.equal(cloverRestrictedGoal.current, 0)
  assert.equal(cloverRestrictedGoal.progress, 0)
  assert.equal(cloverRestrictedGoal.displayProgressAsDash, true)

  game = {
    ...game,
    capybara: {
      completedDemonstrations: ['introduction', 'demonstrationOne'],
    },
  }
  const completedGoal = getNextMajorProgressionGoal(game)
  assert.equal(completedGoal.id, 'all-current-goals-complete')
  assert.equal(completedGoal.progress, 1)
  assert.equal(completedGoal.isComplete, true)
})

test('action goals show ready only after their cost is affordable', () => {
  const cornGame = {
    ...createInitialGame(),
    totalHamstersHired: 50,
    crops: 1e4,
  }
  const baseGame = {
    ...createInitialGame(),
    totalHamstersHired: 1000,
    unionized: true,
    hamsters: 125,
    completedBlueprintExpansions: ['firstColumn'],
    hasUnlockedTurnip: true,
    hasUnlockedCropPerfection: true,
  }
  assert.equal(getNextMajorProgressionGoal(cornGame).isReady, true)

  const waitingGoal = getNextMajorProgressionGoal({
    ...baseGame,
    crops: 2e10 - 1,
  })
  const readyGoal = getNextMajorProgressionGoal({
    ...baseGame,
    crops: 2e10,
  })

  assert.equal(waitingGoal.id, 'perfection-enrichingLeek')
  assert.equal(waitingGoal.isReady, false)
  assert.equal(readyGoal.id, 'perfection-enrichingLeek')
  assert.equal(readyGoal.isReady, true)
})