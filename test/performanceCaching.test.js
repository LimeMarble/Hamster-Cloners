import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBlueprint,
  getBaseFieldProductionSnapshot,
  getCropProductionSnapshotPerSecond,
  getProductionSnapshotForTick,
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
  const structurallyEquivalentBlueprint = getCached(
    { ...blueprint, cells: [...blueprint.cells] },
    [{}, 2],
    calculate,
  )
  const changedBlueprint = getCached(
    { ...blueprint, cells: ['leek', 'leek'] },
    [{}, 2],
    calculate,
  )

  assert.strictEqual(repeated, first)
  assert.notStrictEqual(changedModifier, first)
  assert.strictEqual(structurallyEquivalentBlueprint, changedModifier)
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

test('production snapshots reuse results until a floored field multiplier changes', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'corn'],
  })
  const farmland = {
    rows: 4.2,
    columns: 7.1,
    floors: 1,
    farms: 1,
    otherMultiplier: 1,
  }
  const firstPerSecond = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
  )
  const sameFlooredSize = getCropProductionSnapshotPerSecond(
    blueprint,
    { ...farmland, rows: 4.9, columns: 7.8 },
  )
  const expandedField = getCropProductionSnapshotPerSecond(
    blueprint,
    { ...farmland, rows: 5 },
  )
  const firstTick = getProductionSnapshotForTick(
    blueprint,
    farmland,
  )
  const repeatedTick = getProductionSnapshotForTick(
    blueprint,
    { ...farmland, rows: 4.7 },
  )

  assert.strictEqual(sameFlooredSize, firstPerSecond)
  assert.notStrictEqual(expandedField, firstPerSecond)
  assert.strictEqual(repeatedTick, firstTick)
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