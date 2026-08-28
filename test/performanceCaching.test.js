import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBlueprint,
  getBaseFieldProductionSnapshot,
  getRabbitRelationsMultiplier,
} from '../src/game/gameLogic.js'
import { createBlueprintCalculationCache } from '../src/game/blueprintCalculationCache.js'

test('blueprint calculation cache reuses values until structure or modifiers change', () => {
  const getCached = createBlueprintCalculationCache()
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'corn'],
  })
  const modifier = {}
  let calculations = 0
  const calculate = () => ({ calculation: ++calculations })

  const first = getCached(blueprint, [modifier, 1], calculate)
  const repeated = getCached(blueprint, [modifier, 1], calculate)
  const changedModifier = getCached(blueprint, [modifier, 2], calculate)
  const changedBlueprint = getCached(
    { ...blueprint, cells: [...blueprint.cells] },
    [modifier, 2],
    calculate,
  )

  assert.strictEqual(repeated, first)
  assert.notStrictEqual(changedModifier, first)
  assert.notStrictEqual(changedBlueprint, changedModifier)
  assert.equal(calculations, 3)
})

test('field snapshots ignore Rabbit completion changes unless Carrots are planted', () => {
  const completedCropPerfections = []
  const seedAugmentations = {}
  const leekBlueprint = createBlueprint({ cells: ['leek'] })
  const first = getBaseFieldProductionSnapshot(
    leekBlueprint,
    completedCropPerfections,
    0,
    1,
    seedAugmentations,
  )
  const unchanged = getBaseFieldProductionSnapshot(
    leekBlueprint,
    completedCropPerfections,
    1000,
    1,
    seedAugmentations,
  )
  const changedPassiveModifier = getBaseFieldProductionSnapshot(
    leekBlueprint,
    completedCropPerfections,
    1000,
    1.1,
    seedAugmentations,
  )
  const carrotBlueprint = createBlueprint({ cells: ['carrot'] })
  const carrotBefore = getBaseFieldProductionSnapshot(
    carrotBlueprint,
    completedCropPerfections,
    0,
    1,
    seedAugmentations,
  )
  const carrotAfter = getBaseFieldProductionSnapshot(
    carrotBlueprint,
    completedCropPerfections,
    1000,
    1,
    seedAugmentations,
  )

  assert.strictEqual(unchanged, first)
  assert.notStrictEqual(changedPassiveModifier, first)
  assert.notStrictEqual(carrotAfter, carrotBefore)
})

test('Rabbit relation multiplier reuses cached blueprint analysis', () => {
  const baseBlueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['carrot', 'leek'],
  })
  const cells = baseBlueprint.cells
  let cellReads = 0
  const blueprint = {
    ...baseBlueprint,
    get cells() {
      cellReads += 1
      return cells
    },
  }
  const completedCropPerfections = []

  assert.equal(
    getRabbitRelationsMultiplier(blueprint, completedCropPerfections),
    1.04,
  )
  const readsAfterFirstCalculation = cellReads
  assert.equal(
    getRabbitRelationsMultiplier(blueprint, completedCropPerfections),
    1.04,
  )

  assert.ok(readsAfterFirstCalculation > 1)
  assert.equal(cellReads - readsAfterFirstCalculation, 1)
})