import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canPlaceMuskGrass,
  createBlueprint,
  getBaseFieldIncome,
  getBlueprintCropStats,
  getCropHamsterEfficiencyMultiplier,
  getGlobalPassiveEffectMultiplier,
  getLeechingGourdTurnipEffect,
  getMonocropCropCount,
  getMuskGrassNetworkSize,
  getMuskGrassPlacementLimit,
  isCropDebuffIsolatedByMuskGrass,
  isCropFullySurroundedByMuskGrass,
} from '../src/game/gameLogic.js'
import { exportBlueprint, importBlueprint } from '../src/game/blueprintTransfer.js'
import {
  CROP_DEFINITIONS,
  getUnlockedCropIds,
  getVisibleCropIds,
} from '../src/game/crops.js'

function createFilledBlueprint(rows, columns, entries) {
  const cells = Array(rows * columns).fill(null)
  Object.entries(entries).forEach(([index, crop]) => {
    cells[Number(index)] = crop
  })

  return createBlueprint({ rows, columns, cells })
}

test('Musk Grass unlocks from the Submerged Garden entitlement and is then visible', () => {
  const unlockedCropIds = getUnlockedCropIds(
    createBlueprint(),
    false,
    0,
    false,
    false,
    false,
    false,
    false,
    false,
    0,
    false,
    false,
    false,
    ['muskGrass'],
  )

  assert.ok(unlockedCropIds.includes('muskGrass'))
  assert.ok(getVisibleCropIds(unlockedCropIds).includes('muskGrass'))
  assert.equal(CROP_DEFINITIONS.muskGrass.doesNotHarvest, true)
})

test('Musk Grass has zero harvest and ordinary monocrop weight', () => {
  const blueprint = createFilledBlueprint(4, 4, {
    0: 'muskGrass',
    1: 'muskGrass',
    2: 'leek',
  })

  assert.equal(getBaseFieldIncome(blueprint), 1)
  assert.equal(getMonocropCropCount(blueprint, 'muskGrass'), 2)
  assert.equal(getBlueprintCropStats(blueprint, 0).harvestYield, 0)
})

test('Musk Grass placement is capped at one third of the monocrop limit', () => {
  const blueprint = createBlueprint({ rows: 10, columns: 10 })
  const placementLimit = getMuskGrassPlacementLimit(blueprint)
  const cells = blueprint.cells.map((crop, index) =>
    index < placementLimit ? 'muskGrass' : crop,
  )
  const cappedBlueprint = createBlueprint({ rows: 10, columns: 10, cells })

  assert.equal(placementLimit, 10)
  assert.equal(canPlaceMuskGrass(cappedBlueprint, placementLimit), false)
  assert.equal(canPlaceMuskGrass(cappedBlueprint, 0), true)
})

test('blueprint imports cannot bypass the Musk Grass placement cap', () => {
  const cells = Array(100).fill(null)
  cells.fill('muskGrass', 0, 11)
  const blueprintCode = exportBlueprint(
    createBlueprint({ rows: 10, columns: 10, cells }),
  )

  assert.throws(
    () =>
      importBlueprint(blueprintCode, {
        rows: 10,
        columns: 10,
        unlockedCropIds: ['leek', 'muskGrass'],
      }),
    /more Musk Grass than its placement limit/,
  )
})

test('blueprint imports apply Splitweed augmentation bonuses before checking Musk Grass', () => {
  const cells = Array(100).fill(null)
  ;[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 34].forEach((index) => {
    cells[index] = 'muskGrass'
  })
  cells[44] = 'knotweed'
  cells[45] = 'splitweedPart'
  cells[54] = 'splitweedPart'
  cells[55] = 'splitweedPart'
  const blueprintCode = exportBlueprint(
    createBlueprint({
      rows: 10,
      columns: 10,
      cells,
      requireSplitweedFootprints: true,
    }),
  )
  const importOptions = {
    rows: 10,
    columns: 10,
    unlockedCropIds: ['knotweed', 'muskGrass'],
    hasSplitweed: true,
    completedCropPerfections: ['splitweed'],
  }

  assert.throws(
    () => importBlueprint(blueprintCode, importOptions),
    /more Musk Grass than its placement limit/,
  )

  const imported = importBlueprint(blueprintCode, {
    ...importOptions,
    seedAugmentations: { splitweedMonocropLimitLevel: 2 },
  })
  assert.equal(
    imported.cells.filter((crop) => crop === 'muskGrass').length,
    12,
  )
})

test('each Gourd-adjacent Musk Grass uses its full connected network size', () => {
  const entries = {
    27: 'leechingGourd',
    28: 'leechingGourdPart',
    35: 'leechingGourdPart',
    36: 'leechingGourdPart',
  }
  ;[9, 10, 11, 18, 19, 20, 21, 26, 29, 34, 37, 42, 43, 44, 45].forEach(
    (index) => {
      entries[index] = 'muskGrass'
    },
  )
  const blueprint = createFilledBlueprint(8, 8, entries)
  const gourdEffect = getLeechingGourdTurnipEffect(blueprint)

  assert.equal(getMuskGrassNetworkSize(blueprint, 19), 15)
  assert.equal(gourdEffect.adjacencyEffects.length, 8)
  assert.ok(
    gourdEffect.adjacencyEffects.every(
      (effect) =>
        effect.crop === 'muskGrass' &&
        effect.networkSize === 15 &&
        effect.contribution === 15,
    ),
  )
  assert.equal(gourdEffect.debuffContribution, 120)
  assert.equal(gourdEffect.multiplier, 7)
})

test('a complete eight-tile surround nullifies a Crop debuff', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'corn',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
    ],
  })
  const stats = getBlueprintCropStats(blueprint, 4)

  assert.equal(isCropFullySurroundedByMuskGrass(blueprint, 4), true)
  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 1)
  assert.ok(
    stats.receivedEffects.some(
      (effect) => effect.type === 'musk-grass-debuff-nullification',
    ),
  )
})

test('one Musk Grass cluster isolates at most one Crop of each type', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 7,
    cells: [
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'corn',
      'muskGrass',
      'corn',
      'muskGrass',
      'pumpkin',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
    ],
  })

  assert.equal(isCropFullySurroundedByMuskGrass(blueprint, 8), true)
  assert.equal(isCropFullySurroundedByMuskGrass(blueprint, 10), true)
  assert.equal(isCropDebuffIsolatedByMuskGrass(blueprint, 8), true)
  assert.equal(isCropDebuffIsolatedByMuskGrass(blueprint, 10), false)
  assert.equal(isCropDebuffIsolatedByMuskGrass(blueprint, 12), true)
  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 0.9)
})

test('separate Musk Grass clusters can isolate the same Crop type', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 7,
    cells: [
      'muskGrass',
      'muskGrass',
      'muskGrass',
      null,
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'corn',
      'muskGrass',
      null,
      'muskGrass',
      'corn',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      null,
      'muskGrass',
      'muskGrass',
      'muskGrass',
    ],
  })

  assert.equal(isCropDebuffIsolatedByMuskGrass(blueprint, 8), true)
  assert.equal(isCropDebuffIsolatedByMuskGrass(blueprint, 12), true)
  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 1)
})

test('field edges never count as a complete Musk Grass surround', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'corn',
      'muskGrass',
      null,
      'muskGrass',
      'muskGrass',
      null,
      null,
      null,
      null,
    ],
  })

  assert.equal(isCropFullySurroundedByMuskGrass(blueprint, 0), false)
  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 0.9)
})

test('a complete surround covers every external tile of a 2x2 Splitweed', () => {
  const blueprint = createBlueprint({
    rows: 4,
    columns: 4,
    cells: [
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'knotweed',
      'splitweedPart',
      'muskGrass',
      'muskGrass',
      'splitweedPart',
      'splitweedPart',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
      'muskGrass',
    ],
    requireSplitweedFootprints: true,
  })

  assert.equal(isCropFullySurroundedByMuskGrass(blueprint, 5), true)
  assert.equal(getGlobalPassiveEffectMultiplier(blueprint, ['splitweed']), 1)
})
