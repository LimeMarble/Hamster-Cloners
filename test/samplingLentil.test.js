import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUnlockCropPerfection,
  createBlueprint,
  createFarmlandMultipliers,
  getBlueprintCropStats,
  getCarrotHighHarvestEffect,
  getCropProductionPerSecond,
  getSamplingLentilTradedCropEffect,
  unlockCropPerfection,
} from '../src/game/gameLogic.js'
import {
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  getCropName,
  isTradedCrop,
} from '../src/game/crops.js'

test('Sampling Lentil costs 1e87 Crops and uses the normal perfection flow', () => {
  const game = {
    crops: CROP_PERFECTIONS.samplingLentil.cost,
    hasUnlockedCropPerfection: true,
    hasUnlockedRowDuplicators: true,
    completedCropPerfections: [],
  }

  assert.equal(CROP_PERFECTIONS.samplingLentil.cost, 1e87)
  assert.equal(canUnlockCropPerfection(game, 'samplingLentil'), true)
  assert.deepEqual(unlockCropPerfection(game, 'samplingLentil'), {
    ...game,
    crops: 0,
    completedCropPerfections: ['samplingLentil'],
  })
  assert.equal(getCropName('lentil', ['samplingLentil']), 'Sampling Lentil')
})

test('Sampling Lentil has an 80 percent harvest boost and a separate traded-adjacency multiplier', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['carrot', 'lentil', 'fourLeafClover'],
  })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })
  const regularProduction = getCropProductionPerSecond(blueprint, farmland)
  const perfectedProduction = getCropProductionPerSecond(
    blueprint,
    farmland,
    ['samplingLentil'],
  )
  const adjacencyEffect = getSamplingLentilTradedCropEffect(
    blueprint,
    ['samplingLentil'],
  )
  const carrotStats = getBlueprintCropStats(
    blueprint,
    0,
    ['samplingLentil'],
  )

  assert.ok(Math.abs(regularProduction - 65 * 1.25 * 1.1) < 1e-12)
  assert.ok(Math.abs(perfectedProduction - 65 * 1.8 * 1.1 * 3) < 1e-12)
  assert.deepEqual(adjacencyEffect, {
    adjacentTradedCropCount: 2,
    multiplier: 3,
  })
  assert.deepEqual(
    carrotStats.receivedEffects.find(
      (effect) => effect.type === 'sampling-lentil-trade',
    ),
    {
      type: 'sampling-lentil-trade',
      adjacentTradedCropCount: 2,
      multiplier: 3,
    },
  )
})

test('Sampling Lentil counts toward Blazing Carrot high-harvest qualification', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['lentil', 'carrot'],
  })
  const completedCropPerfections = ['samplingLentil', 'blazingCarrot']
  const samplingEffect = getSamplingLentilTradedCropEffect(
    blueprint,
    completedCropPerfections,
  )
  const contributions = [{ cropId: 'leek', amount: 6e11 }]

  assert.deepEqual(samplingEffect, {
    adjacentTradedCropCount: 1,
    multiplier: 2,
  })
  assert.equal(
    getCarrotHighHarvestEffect(
      blueprint,
      contributions,
      1,
      completedCropPerfections,
    ).qualifyingCropTypeCount,
    0,
  )
  assert.equal(
    getCarrotHighHarvestEffect(
      blueprint,
      contributions,
      samplingEffect.multiplier,
      completedCropPerfections,
    ).qualifyingCropTypeCount,
    1,
  )
})

test('traded Crop adjacency is data-driven and explicitly excludes Root Tunnel', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['lentil', 'rootTunnel'],
  })

  assert.equal(isTradedCrop('carrot'), true)
  assert.equal(isTradedCrop('fourLeafClover'), true)
  assert.equal(isTradedCrop('rootTunnel'), false)
  assert.deepEqual(
    getSamplingLentilTradedCropEffect(blueprint, ['samplingLentil']),
    { adjacentTradedCropCount: 0, multiplier: 1 },
  )
  assert.equal(
    CROP_DEFINITIONS.rootTunnel.unlockDescription,
    'Reward for Capybara Demonstration 2',
  )
})
