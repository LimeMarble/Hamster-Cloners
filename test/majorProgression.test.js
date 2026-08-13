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
      'perfection-sweetPotato',
      'crop-sunflower',
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
    crops: 1.25e33,
  }
  const sweetPotatoGoal = getNextMajorProgressionGoal(game)
  assert.equal(sweetPotatoGoal.id, 'perfection-sweetPotato')
  assert.equal(sweetPotatoGoal.isReady, true)

  game = {
    ...game,
    completedCropPerfections: CROP_PERFECTION_IDS,
    hasUnlockedSunflower: true,
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