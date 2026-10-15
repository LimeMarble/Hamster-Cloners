import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBlueprint,
  getBlueprintCropStats,
  getCropHamsterEfficiencyMultiplier,
  getSweetPotatoBedBaseBonus,
  getSweetPotatoBedCrowdingMultiplier,
  getSweetPotatoBedEffects,
} from '../src/game/gameLogic.js'
import { CROP_PERFECTIONS } from '../src/game/crops.js'

const SWEET_POTATO_PERFECTIONS = ['sweetPotato', 'mirrorCorn']

test('Sweet Potato beds combine orthogonally connected Potatoes', () => {
  const blueprint = createBlueprint({
    rows: 5,
    columns: 5,
    cells: [
      'sweetPotato', 'sweetPotato', null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, 'sweetPotato',
    ],
  })
  const effects = getSweetPotatoBedEffects(blueprint, ['sweetPotato'])

  assert.deepEqual(
    effects.map(({ connectedCropCount }) => connectedCropCount),
    [2, 1],
  )
  assert.deepEqual(effects.map(({ bonus }) => bonus), [6, 2])
  assert.equal(
    getCropHamsterEfficiencyMultiplier(blueprint, ['sweetPotato']),
    9,
  )
})

test('each connected Turnip and Mirror Corn buffs a bed once before crowding', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'turnip', 'sweetPotato', null,
      'sweetPotato', 'sweetPotato', null,
      null, null, 'corn',
    ],
    mirrorCornTargets: [null, null, null, null, null, null, null, null, 4],
  })
  const [effect] = getSweetPotatoBedEffects(
    blueprint,
    SWEET_POTATO_PERFECTIONS,
  )

  assert.equal(effect.connectedCropCount, 3)
  assert.equal(effect.turnipCount, 1)
  assert.equal(effect.mirrorCornCount, 1)
  assert.equal(effect.adjacentBuffCount, 2)
  assert.equal(effect.baseBonus, 13.5)
  assert.equal(effect.turnipEffectMultiplier, 2)
  assert.equal(effect.mirrorCornEffectMultiplier, 4)
  assert.equal(effect.buffMultiplier, 8)
  assert.equal(effect.crowdingMultiplier, 0.5)
  assert.equal(effect.bonus, 54)

  const firstStats = getBlueprintCropStats(
    blueprint,
    1,
    SWEET_POTATO_PERFECTIONS,
  )
  const secondStats = getBlueprintCropStats(
    blueprint,
    4,
    SWEET_POTATO_PERFECTIONS,
  )

  assert.equal(firstStats.hamsterEfficiencyBonus, 54)
  assert.equal(secondStats.hamsterEfficiencyBonus, 54)
  assert.equal(
    firstStats.receivedEffects.filter(
      ({ type }) => type === 'sweet-potato-bed',
    ).length,
    1,
  )
  assert.equal(
    firstStats.receivedEffects.some(
      ({ type }) =>
        type === 'crop-effect-modifier' || type === 'mirror-corn',
    ),
    false,
  )
})

test('Sweet Potato bed growth exponent caps at eleven', () => {
  const perfection = CROP_PERFECTIONS.sweetPotato
  const cappedGrowth = 1.5 ** 11

  assert.equal(
    getSweetPotatoBedBaseBonus(perfection, 12),
    2 * 12 * cappedGrowth,
  )
  assert.equal(
    getSweetPotatoBedBaseBonus(perfection, 13),
    2 * 13 * cappedGrowth,
  )
  assert.equal(
    getSweetPotatoBedCrowdingMultiplier(perfection, 4),
    0.5 ** 6,
  )
})
