import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUnlockCropPerfection,
  createBlueprint,
  createFarmlandMultipliers,
  createInitialGame,
  getBlueprintCropStats,
  getCarrotHighHarvestEffect,
  getCropProductionPerSecond,
  getCropPerfectionCost,
  getSamplingLentilPatternEffect,
  unlockCropPerfection,
} from '../src/game/gameLogic.js'
import {
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  getCropName,
  isTradedCrop,
} from '../src/game/crops.js'

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12,
    `${actual} should be approximately ${expected}`)
}

test('Sampling Lentil costs 2.5e140 Crops at current progression in both areas', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = {
      ...createInitialGame(),
      crops: 2.5e140,
      activeArea,
      hasUnlockedCropPerfection: true,
      hasUnlockedRowDuplicators: true,
      areaProgress: { main: null, misfortune: {} },
      capybara: { completedDemonstrations: ['introduction', 'demonstrationOne'] },
    }

    assert.equal(getCropPerfectionCost('samplingLentil', game), 2.5e140)
    assert.equal(canUnlockCropPerfection({ ...game, crops: 2.49e140 }, 'samplingLentil'), false)
    assert.equal(unlockCropPerfection({ ...game, crops: 2.49e140 }, 'samplingLentil'), null)
    assert.equal(canUnlockCropPerfection(game, 'samplingLentil'), true)
    assert.deepEqual(unlockCropPerfection(game, 'samplingLentil'), {
      ...game,
      crops: 0,
      completedCropPerfections: ['samplingLentil'],
    })
  }
  assert.equal(getCropName('lentil', ['samplingLentil']), 'Sampling Lentil')
})

test('Sampling Lentil multiplies its harvest bonus from unique surrounding Crop types', () => {
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
  const perfection = CROP_PERFECTIONS.samplingLentil
  const expectedPatternMultiplier =
    perfection.nonTradedNeighborEffectMultiplier ** 3 *
    perfection.tradedNeighborEffectMultiplier ** 2
  const expectedHarvestBonus =
    (perfection.globalHarvestMultiplier - 1) * expectedPatternMultiplier
  const baseHarvestByCropType = blueprint.cells.reduce((totals, cropId) => {
    if (cropId) {
      totals[cropId] = (totals[cropId] ?? 0) + CROP_DEFINITIONS[cropId].baseYield
    }
    return totals
  }, {})
  const baseHarvest = Object.values(baseHarvestByCropType).reduce((total, harvest) => total + harvest, 0)
  const carrotCount = blueprint.cells.filter((cropId) => cropId === 'carrot').length
  const carrotBaseMultiplier = 1 + carrotCount * CROP_DEFINITIONS.carrot.globalHarvestBonusAtZero
  // Sampling can cross Carrot's harvest threshold; exclude that bonus when
  // calculating which types qualify, then apply it to the final harvest.
  const qualificationMultiplier = (1 + expectedHarvestBonus) * carrotBaseMultiplier
  const qualifyingCropTypeCount = Object.values(baseHarvestByCropType).filter(
    (harvest) => harvest * qualificationMultiplier > CROP_DEFINITIONS.carrot.highHarvestThreshold,
  ).length
  const carrotHighHarvestMultiplier =
    1 + carrotCount * qualifyingCropTypeCount * CROP_DEFINITIONS.carrot.highHarvestGlobalHarvestBonus

  near(regularProduction, baseHarvest * CROP_DEFINITIONS.lentil.globalHarvestMultiplier * carrotBaseMultiplier)
  near(perfectedProduction, baseHarvest * qualificationMultiplier * carrotHighHarvestMultiplier)
  assert.deepEqual(patternEffect, {
    uniqueNonTradedCropTypeCount: 3,
    uniqueTradedCropTypeCount: 2,
    multiplier: expectedPatternMultiplier,
  })
  assert.deepEqual(
    lentilStats.passiveStats.find(
      (stat) => stat.id === 'sampling-lentil-pattern',
    ),
    {
      id: 'sampling-lentil-pattern',
      label: 'Neighbor pattern (3 non-traded, 2 traded)',
      format: 'multiplier',
      value: expectedPatternMultiplier,
    },
  )
  near(
    lentilStats.passiveStats.find(
      (stat) => stat.id === 'global-crop-harvest',
    ).value,
    expectedHarvestBonus,
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
    multiplier: CROP_PERFECTIONS.samplingLentil.tradedNeighborEffectMultiplier,
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
      multiplier:
        CROP_PERFECTIONS.samplingLentil.nonTradedNeighborEffectMultiplier *
        CROP_PERFECTIONS.samplingLentil.tradedNeighborEffectMultiplier,
    },
  )
  assert.equal(
    CROP_DEFINITIONS.rootTunnel.unlockDescription,
    'Reward for Capybara Demonstration 2',
  )
})
