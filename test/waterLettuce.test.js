import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBlueprint,
  getBaseFieldIncome,
  getBlazingCarrotSurveyTimeEffect,
  getBlueprintCropStats,
  getCropHamsterEfficiencyMultiplier,
  getGlobalPassiveEffectMultiplier,
  getWaterLettucePassiveEffect,
  isWaterLettuceFieldInfested,
} from '../src/game/gameLogic.js'
import {
  canBeMirrorCornTarget,
  getVisibleCropIds,
} from '../src/game/crops.js'

test('Water Lettuce gives a protected passive boost and a separate insect debuff', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 1,
    cells: ['waterLettuce'],
  })
  const effect = getWaterLettucePassiveEffect(blueprint)

  assert.equal(effect.cropPassiveBonus, 0.2)
  assert.equal(effect.insectPenalty, -0.175)
  assert.ok(Math.abs(effect.multiplier - 1.025) < 1e-12)
  assert.ok(
    Math.abs(getGlobalPassiveEffectMultiplier(blueprint) - 1.025) < 1e-12,
  )
})

test('Water Lettuce passive boost ignores Crop and Fortune boosts', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'corn',
      null,
      null,
      'turnip',
      'waterLettuce',
      null,
      null,
      null,
      null,
    ],
    mirrorCornTargets: [4],
  })
  const effect = getWaterLettucePassiveEffect(
    blueprint,
    ['mirrorCorn'],
    7.77,
  )

  assert.equal(effect.cropPassiveBonus, 0.2)
  assert.ok(effect.insectPenalty < -0.175)
  assert.equal(canBeMirrorCornTarget('waterLettuce'), false)
})

test('the Monocrop penalty still weakens Water Lettuce despite boost immunity', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 11,
    cells: Array(11).fill('waterLettuce'),
  })
  const effect = getWaterLettucePassiveEffect(blueprint)

  assert.equal(effect.infested, false)
  assert.ok(effect.cropPassiveBonus > 0)
  assert.ok(effect.cropPassiveBonus < 11 * 0.2)
  assert.ok(effect.insectPenalty < 11 * -0.175)
})

test('a complete Shoal Grass surround nullifies Water Lettuce insects', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'shoalGrass',
      'shoalGrass',
      'shoalGrass',
      'shoalGrass',
      'waterLettuce',
      'shoalGrass',
      'shoalGrass',
      'shoalGrass',
      'shoalGrass',
    ],
  })
  const effect = getWaterLettucePassiveEffect(blueprint)
  const stats = getBlueprintCropStats(blueprint, 4)

  assert.equal(effect.cropPassiveBonus, 0.2)
  assert.equal(effect.insectPenalty, 0)
  assert.equal(effect.multiplier, 1.2)
  assert.ok(
    stats.receivedEffects.some(
      (receivedEffect) =>
        receivedEffect.type === 'shoal-grass-debuff-nullification',
    ),
  )
})

test('more than eleven Water Lettuces infest and disable the entire field', () => {
  const safeBlueprint = createBlueprint({
    rows: 3,
    columns: 4,
    cells: [...Array(11).fill('waterLettuce'), 'leek'],
  })
  const infestedBlueprint = createBlueprint({
    rows: 3,
    columns: 4,
    cells: Array(12).fill('waterLettuce'),
  })
  const stats = getBlueprintCropStats(infestedBlueprint, 0)

  assert.equal(isWaterLettuceFieldInfested(safeBlueprint), false)
  assert.equal(isWaterLettuceFieldInfested(infestedBlueprint), true)
  assert.equal(getBaseFieldIncome(infestedBlueprint), 0)
  assert.equal(getGlobalPassiveEffectMultiplier(infestedBlueprint), 0)
  assert.equal(getCropHamsterEfficiencyMultiplier(infestedBlueprint), 1)
  assert.equal(stats.harvestYield, 0)
  assert.equal(stats.harvestDestroyedByInfestation, true)
  assert.deepEqual(stats.passiveStats, [])
  assert.deepEqual(stats.receivedEffects, [
    { type: 'water-lettuce-infestation' },
  ])
})

test('Water Lettuce cannot push Blazing Carrot survey reduction past its hard cap', () => {
  const cells = Array(15 * 15).fill(null)
  const spacedIndexes = cells.flatMap((_, index) => {
    const row = Math.floor(index / 15)
    const column = index % 15
    return (row + column) % 2 === 0 ? [index] : []
  })
  spacedIndexes.slice(0, 40).forEach((index) => {
    cells[index] = 'carrot'
  })
  cells.flatMap((crop, index) => (crop === null ? [index] : []))
    .slice(0, 11)
    .forEach((index) => {
      cells[index] = 'waterLettuce'
    })
  const blueprint = createBlueprint({ rows: 15, columns: 15, cells })
  const effect = getBlazingCarrotSurveyTimeEffect(
    blueprint,
    ['blazingCarrot'],
    1e40,
  )

  assert.equal(effect.activeCarrotCount, 40)
  assert.ok(Math.abs(effect.reduction - 0.8) < 1e-12)
  assert.ok(Math.abs(effect.multiplier - 0.2) < 1e-12)
})

test('Water Lettuce only appears in the palette after its garden unlock', () => {
  assert.equal(getVisibleCropIds(['leek']).includes('waterLettuce'), false)
  assert.equal(
    getVisibleCropIds(['leek', 'waterLettuce']).includes('waterLettuce'),
    true,
  )
})
