import assert from 'node:assert/strict'
import test from 'node:test'
import { shareUnchangedStructure } from '../src/game/structuralSharing.js'

test('worker snapshots reuse every unchanged nested branch', () => {
  const previous = {
    crops: 10,
    blueprint: {
      rows: 1,
      columns: 2,
      cells: ['leek', 'corn'],
      mirrorCornTargets: [null, null],
    },
    completedCropPerfections: ['enrichingLeek'],
    farmland: { rows: 2, columns: 3.2 },
  }
  const next = structuredClone(previous)
  const shared = shareUnchangedStructure(previous, next)

  assert.strictEqual(shared, previous)
})

test('worker snapshots rebuild only ancestors of changed live values', () => {
  const previous = {
    crops: 10,
    blueprint: {
      rows: 1,
      columns: 2,
      cells: ['leek', 'corn'],
      mirrorCornTargets: [null, null],
    },
    completedCropPerfections: ['enrichingLeek'],
    farmland: { rows: 2, columns: 3.2 },
  }
  const next = structuredClone(previous)
  next.crops = 12
  next.farmland.columns = 3.4

  const shared = shareUnchangedStructure(previous, next)

  assert.notStrictEqual(shared, previous)
  assert.equal(shared.crops, 12)
  assert.notStrictEqual(shared.farmland, previous.farmland)
  assert.strictEqual(shared.blueprint, previous.blueprint)
  assert.strictEqual(
    shared.completedCropPerfections,
    previous.completedCropPerfections,
  )
})
