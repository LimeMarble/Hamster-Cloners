import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canPlaceMangroveSapling,
  createBlueprint,
  getBlueprintCropStats,
  getMangroveNurseryEffect,
} from '../src/game/gameLogic.js'
import { exportBlueprint, importBlueprint } from '../src/game/blueprintTransfer.js'
import { CROP_DEFINITIONS } from '../src/game/crops.js'
import {
  MANGROVE_SAPLING_PLACEMENT_LIMIT,
  getMangroveNurseryBaseEffect,
} from '../src/game/mangroveSaplingLogic.js'

function createIntendedNurseryBlueprint() {
  const rows = 8
  const columns = 8
  const cells = Array(rows * columns).fill(null)
  const mangroveIndexes = [9, 13, 41, 45]
  const nurseryCrops = [
    'leek',
    'corn',
    'sweetPotato',
    'turnip',
    'appleTree',
    'lentil',
    'knotweed',
    'wheat',
    'sunflower',
    'canola',
    'carrot',
    'fourLeafClover',
    'shoalGrass',
    'waterLettuce',
    'leechingGourd',
  ]

  mangroveIndexes.forEach((index) => {
    cells[index] = 'mangroveSapling'
  })

  const nurseryIndexes = mangroveIndexes.flatMap((index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const indexes = []

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (rowOffset !== 0 || columnOffset !== 0) {
          indexes.push((row + rowOffset) * columns + column + columnOffset)
        }
      }
    }

    return indexes
  })
  nurseryCrops.forEach((crop, index) => {
    cells[nurseryIndexes[index]] = crop
  })
  cells[nurseryIndexes[15]] = 'leechingGourdPart'
  cells[nurseryIndexes[16]] = 'splitweedPart'
  cells[nurseryIndexes[17]] = 'rootTunnel'
  cells[nurseryIndexes[18]] = 'leek'

  return { rows, columns, cells, mirrorCornTargets: cells.map(() => null) }
}

test('Mangrove nurseries count each crop type once with perfection and Manatee weights', () => {
  const completedCropPerfections = [
    'enrichingLeek',
    'mirrorCorn',
    'leechingGourd',
    'samplingLentil',
    'splitweed',
    'blazingCarrot',
  ]
  const effect = getMangroveNurseryBaseEffect(
    createIntendedNurseryBlueprint(),
    completedCropPerfections,
  )

  assert.equal(effect.saplingCount, 4)
  assert.equal(effect.cropTypes.length, 16)
  assert.ok(!effect.cropTypes.some(({ cropId }) => cropId === 'rootTunnel'))
  assert.equal(effect.cropTypes.find(({ cropId }) => cropId === 'leek').weight, 2)
  assert.equal(effect.cropTypes.find(({ cropId }) => cropId === 'shoalGrass').weight, 3)
  assert.equal(effect.cropTypes.find(({ cropId }) => cropId === 'mangroveSapling').weight, 3)
  assert.ok(Math.abs(effect.baseBonus - 1.12) < 1e-12)
})

test('Mangrove nursery bonuses use passive modifiers and cap at +300%', () => {
  const blueprint = {
    rows: 3,
    columns: 3,
    cells: [
      'leek', 'corn', 'turnip',
      'appleTree', 'mangroveSapling', 'lentil',
      'wheat', 'sunflower', 'canola',
    ],
    mirrorCornTargets: Array(9).fill(null),
  }
  const effect = getMangroveNurseryEffect(
    blueprint,
    [],
    100,
  )

  assert.equal(effect.bonus, CROP_DEFINITIONS.mangroveSapling.nurseryBonusCap)
  assert.equal(effect.multiplier, 4)
})

test('Mangrove nursery value is protected from tile-effect modifiers', () => {
  const blueprint = {
    rows: 3,
    columns: 3,
    cells: [
      null, null, null,
      null, 'mangroveSapling', 'turnip',
      null, null, null,
    ],
    mirrorCornTargets: Array(9).fill(null),
  }
  const effect = getMangroveNurseryEffect(blueprint)

  assert.ok(Math.abs(effect.baseBonus - 0.16) < 1e-12)
  assert.ok(Math.abs(effect.bonus - 0.16) < 1e-12)
})

test('Mangrove Sapling placement and blueprint imports enforce a four-sapling cap', () => {
  const cells = Array(6).fill('mangroveSapling')
  const blueprint = createBlueprint({ rows: 2, columns: 3, cells })
  const cappedBlueprint = createBlueprint({
    rows: 2,
    columns: 3,
    cells: [...Array(4).fill('mangroveSapling'), null, 'leek'],
  })

  assert.equal(MANGROVE_SAPLING_PLACEMENT_LIMIT, 4)
  assert.equal(canPlaceMangroveSapling(cappedBlueprint, 5), false)
  assert.throws(
    () => importBlueprint(exportBlueprint(blueprint), {
      rows: 2,
      columns: 3,
      unlockedCropIds: ['mangroveSapling'],
    }),
    /more than 4 Mangrove Saplings/,
  )

  const croppedImport = importBlueprint(exportBlueprint(blueprint), {
    rows: 1,
    columns: 1,
    unlockedCropIds: ['mangroveSapling'],
  })
  assert.deepEqual(croppedImport.cells, ['mangroveSapling'])
})

test('Mangrove Sapling hover stats expose nursery crop types, bonus, and cap', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['mangroveSapling', 'leek', 'shoalGrass', null],
  })
  const stats = getBlueprintCropStats(blueprint, 0)
  const nurseryEffect = stats.receivedEffects.find(
    ({ type }) => type === 'mangrove-nursery',
  )

  assert.equal(stats.harvestYield, 0)
  assert.equal(
    stats.passiveStats.find(({ id }) => id === 'mangrove-nursery-value').value,
    nurseryEffect.bonus,
  )
  assert.deepEqual(
    nurseryEffect.cropTypes.map(({ cropId }) => cropId),
    ['mangroveSapling', 'leek', 'shoalGrass'],
  )
  assert.equal(nurseryEffect.cap, 3)
})
