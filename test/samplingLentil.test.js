import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUnlockCropPerfection,
  createBlueprint,
  createFarmlandMultipliers,
  getBlueprintCropStats,
  getCarrotHighHarvestEffect,
  getCropProductionPerSecond,
  getSamplingLentilPatternEffect,
  unlockCropPerfection,
} from '../src/game/gameLogic.js'
import {
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  getCropName,
  isTradedCrop,
} from '../src/game/crops.js'

test('Sampling Lentil costs 1e123 Crops and uses the normal perfection flow', () => {
  const game = {
    crops: CROP_PERFECTIONS.samplingLentil.cost,
    hasUnlockedCropPerfection: true,
    hasUnlockedRowDuplicators: true,
    completedCropPerfections: [],
  }

  assert.equal(CROP_PERFECTIONS.samplingLentil.cost, 1e123)
  assert.equal(canUnlockCropPerfection(game, 'samplingLentil'), true)
  assert.deepEqual(unlockCropPerfection(game, 'samplingLentil'), {
    ...game,
    crops: 0,
    completedCropPerfections: ['samplingLentil'],
  })
  assert.equal(getCropName('lentil', ['samplingLentil']), 'Sampling Lentil')
})

test('Sampling Lentil multiplies its 80 percent effect from unique surrounding Crop types', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'carrot', 'carrot', 'leek',
      'corn', 'lentil', 'fourLeafClover',
      'rootTunnel', 'corn', null,
    ],
  })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })
  const regularProduction = getCropProductionPerSecond(blueprint, farmland)
  const perfectedProduction = getCropProductionPerSecond(
    blueprint,
    farmland,
    ['samplingLentil'],
  )
  const patternEffect = getSamplingLentilPatternEffect(
    blueprint,
    4,
    ['samplingLentil'],
  )
  const lentilStats = getBlueprintCropStats(
    blueprint,
    4,
    ['samplingLentil'],
  )

  assert.ok(Math.abs(regularProduction - 110 * 1.25 * 1.2) < 1e-12)
  assert.ok(Math.abs(perfectedProduction - 110 * 11.8 * 1.2) < 1e-12)
  assert.deepEqual(patternEffect, {
    uniqueNonTradedCropTypeCount: 3,
    uniqueTradedCropTypeCount: 2,
    multiplier: 13.5,
  })
  assert.deepEqual(
    lentilStats.passiveStats.find(
      (stat) => stat.id === 'sampling-lentil-pattern',
    ),
    {
      id: 'sampling-lentil-pattern',
      label: 'Neighbor pattern (3 non-traded, 2 traded)',
      format: 'multiplier',
      value: 13.5,
    },
  )
  assert.ok(
    Math.abs(
      lentilStats.passiveStats.find(
        (stat) => stat.id === 'global-crop-harvest',
      ).value - 10.8,
    ) < 1e-12,
  )
})

test('Sampling Lentil counts toward Blazing Carrot high-harvest qualification', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['lentil', 'carrot'],
  })
  const completedCropPerfections = ['samplingLentil', 'blazingCarrot']
  const samplingEffect = getSamplingLentilPatternEffect(
    blueprint,
    0,
    completedCropPerfections,
  )
  const contributions = [{ cropId: 'leek', amount: 6e11 }]

  assert.deepEqual(samplingEffect, {
    uniqueNonTradedCropTypeCount: 0,
    uniqueTradedCropTypeCount: 1,
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
      1 + 0.8 * samplingEffect.multiplier,
      completedCropPerfections,
    ).qualifyingCropTypeCount,
    1,
  )
})

test('trade classification is data-driven and Root Tunnel counts as a non-traded type', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['rootTunnel', 'lentil', 'carrot'],
  })

  assert.equal(isTradedCrop('carrot'), true)
  assert.equal(isTradedCrop('fourLeafClover'), true)
  assert.equal(isTradedCrop('rootTunnel'), false)
  assert.deepEqual(
    getSamplingLentilPatternEffect(blueprint, 1, ['samplingLentil']),
    {
      uniqueNonTradedCropTypeCount: 1,
      uniqueTradedCropTypeCount: 1,
      multiplier: 3,
    },
  )
  assert.equal(
    CROP_DEFINITIONS.rootTunnel.unlockDescription,
    'Reward for Capybara Demonstration 2',
  )
})
