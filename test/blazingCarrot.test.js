import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUnlockCropPerfection,
  createBlueprint,
  createFarmlandMultipliers,
  createInitialGame,
  getBlazingCarrotSurveyTimeEffect,
  getBlueprintCropStats,
  getCarrotHighHarvestEffect,
  getCropProductionPerSecond,
  getNextMajorProgressionGoal,
  getRabbitRelationsMultiplier,
  unlockCropPerfection,
} from '../src/game/gameLogic.js'
import { CROP_PERFECTIONS } from '../src/game/crops.js'

const BLAZING_CARROT = 'blazingCarrot'

function createSpacedCarrotBlueprint(count) {
  const rows = 20
  const columns = 20
  const cells = Array(rows * columns).fill(null)
  let planted = 0

  for (let row = 0; row < rows && planted < count; row += 1) {
    for (let column = 0; column < columns && planted < count; column += 1) {
      if ((row + column) % 2 === 0) {
        cells[row * columns + column] = 'carrot'
        planted += 1
      }
    }
  }

  return createBlueprint({ rows, columns, cells })
}

test('Blazing Carrot is gated by Demonstration 0 and spends Rabbit relations', () => {
  const initialGame = createInitialGame()
  const eligibleGame = {
    ...initialGame,
    crops: 123,
    hasUnlockedCropPerfection: true,
    capybara: { completedDemonstrations: ['introduction'] },
    trade: {
      ...initialGame.trade,
      rabbitRelations: CROP_PERFECTIONS.blazingCarrot.cost,
      totalRabbitRelationsEarned: CROP_PERFECTIONS.blazingCarrot.cost,
    },
  }

  assert.equal(CROP_PERFECTIONS.blazingCarrot.cost, 5e12)
  assert.equal(
    canUnlockCropPerfection(
      { ...eligibleGame, capybara: { completedDemonstrations: [] } },
      BLAZING_CARROT,
    ),
    false,
  )
  assert.equal(canUnlockCropPerfection(eligibleGame, BLAZING_CARROT), true)

  const perfectedGame = unlockCropPerfection(eligibleGame, BLAZING_CARROT)
  assert.equal(perfectedGame.crops, 123)
  assert.equal(perfectedGame.trade.rabbitRelations, 0)
  assert.equal(
    perfectedGame.trade.totalRabbitRelationsEarned,
    CROP_PERFECTIONS.blazingCarrot.cost,
  )
  assert.ok(perfectedGame.completedCropPerfections.includes(BLAZING_CARROT))
})

test('Blazing Carrot relation-log harvest bonus caps at +1900 percent', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 1,
    cells: ['carrot'],
  })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      farmland,
      [BLAZING_CARROT],
      1,
      0,
      {},
      {},
      1e12,
    ),
    280,
  )
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      farmland,
      [BLAZING_CARROT],
      1,
      0,
      {},
      {},
      1e40,
    ),
    800,
  )

  const stats = getBlueprintCropStats(
    blueprint,
    0,
    [BLAZING_CARROT],
    0,
    0,
    0,
    {},
    {},
    1e12,
  )
  assert.equal(
    stats.passiveStats.find((passive) => passive.id === 'global-crop-harvest')
      ?.value,
    6,
  )
  assert.equal(
    stats.passiveStats.find((passive) => passive.id === 'rabbit-relations')
      ?.value,
    0.1,
  )
})

test('Blazing Carrot grants +25 percent per crop type reaching 1T harvest', () => {
  const blueprint = createSpacedCarrotBlueprint(1)
  const effect = getCarrotHighHarvestEffect(
    blueprint,
    [
      { cropId: 'leek', amount: 1e12 },
      { cropId: 'corn', amount: 1e12 - 1 },
      { cropId: 'leek', amount: 4 },
    ],
    1,
    [BLAZING_CARROT],
  )

  assert.equal(effect.activeCarrotCount, 1)
  assert.equal(effect.qualifyingCropTypeCount, 1)
  assert.equal(effect.multiplier, 1.25)
})

test('orthogonally adjacent Blazing Carrots burn and lose harvest and passives', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['carrot', 'carrot'],
  })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })
  const stats = getBlueprintCropStats(
    blueprint,
    0,
    [BLAZING_CARROT],
    0,
    0,
    0,
    {},
    {},
    1e40,
  )

  assert.equal(
    getRabbitRelationsMultiplier(blueprint, [BLAZING_CARROT]),
    1,
  )
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      farmland,
      [BLAZING_CARROT],
      1,
      0,
      {},
      {},
      1e40,
    ),
    0,
  )
  assert.equal(stats.harvestYield, 0)
  assert.equal(stats.harvestDestroyedByBlazingCarrot, true)
  assert.deepEqual(stats.passiveStats, [])
})

test('Blazing Carrot survey reduction is lifetime-relation-limited and caps at 80 percent', () => {
  const blueprint = createSpacedCarrotBlueprint(40)
  const earlyEffect = getBlazingCarrotSurveyTimeEffect(
    blueprint,
    [BLAZING_CARROT],
    1e4,
  )
  const cappedEffect = getBlazingCarrotSurveyTimeEffect(
    blueprint,
    [BLAZING_CARROT],
    1e40,
  )

  assert.equal(earlyEffect.activeCarrotCount, 40)
  assert.equal(earlyEffect.contributingCarrotCount, 4)
  assert.ok(Math.abs(earlyEffect.multiplier - 0.92) < 1e-12)
  assert.equal(cappedEffect.contributingCarrotCount, 40)
  assert.ok(Math.abs(cappedEffect.reduction - 0.8) < 1e-12)
  assert.ok(Math.abs(cappedEffect.multiplier - 0.2) < 1e-12)
})

test('major progression places Sampling Lentil then Blazing Carrot before Demonstration 1', () => {
  const initialGame = createInitialGame()
  const game = {
    ...initialGame,
    totalHamstersHired: 1000,
    hamsters: 125,
    unionized: true,
    completedBlueprintExpansions: ['firstColumn'],
    completedCropPerfections: [
      'enrichingLeek',
      'mirrorCorn',
      'leechingGourd',
      'splitweed',
    ],
    hasUnlockedTurnip: true,
    hasUnlockedCropPerfection: true,
    hasUnlockedAppleTree: true,
    hasUnlockedLentil: true,
    hasUnlockedKnotweed: true,
    hasUnlockedRowDuplicators: true,
    hasUnlockedWheat: true,
    hasUnlockedSunflower: true,
    rowDuplicators: 500,
    trade: {
      ...initialGame.trade,
      established: true,
      rabbitRelations: 5e12,
      rabbitUnlocks: ['carrot', 'fourLeafClover', 'capybaraContact'],
    },
    capybara: { completedDemonstrations: ['introduction'] },
  }
  assert.equal(
    getNextMajorProgressionGoal(game).id,
    'perfection-samplingLentil',
  )
  const samplingCompleteGame = {
    ...game,
    completedCropPerfections: [...game.completedCropPerfections, 'samplingLentil'],
  }
  const goal = getNextMajorProgressionGoal(samplingCompleteGame)

  assert.equal(goal.id, 'perfection-blazingCarrot')
  assert.equal(goal.unit, 'Rabbit relations')
  assert.equal(goal.isReady, true)
  assert.equal(
    getNextMajorProgressionGoal({
      ...samplingCompleteGame,
      completedCropPerfections: [
        ...samplingCompleteGame.completedCropPerfections,
        BLAZING_CARROT,
      ],
    }).id,
    'capybara-demonstration-one',
  )
})
