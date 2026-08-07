import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeGame } from '../src/game/storage.js'

test('legacy saves reset blueprint progress after the expansion axes swap', () => {
  const migratedGame = normalizeGame({
    crops: 123456,
    hamsters: 42,
    completedBlueprintExpansions: ['firstRow', 'firstColumn'],
    blueprint: {
      rows: 2,
      columns: 3,
      cells: ['leek', 'corn', 'sweetPotato', 'turnip', 'pumpkin', 'leek'],
    },
    farmland: { rows: 25, columns: 1 },
  })

  assert.equal(migratedGame.crops, 123456)
  assert.equal(migratedGame.hamsters, 42)
  assert.equal(migratedGame.blueprintExpansionAxesSwapped, true)
  assert.deepEqual(migratedGame.completedBlueprintExpansions, [])
  assert.deepEqual(migratedGame.blueprint, {
    rows: 1,
    columns: 1,
    cells: ['leek'],
    mirrorCornTargets: [null],
  })
})

test('current saves retain only valid Mirror Corn diagonal targets', () => {
  const migratedGame = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    blueprint: {
      rows: 2,
      columns: 2,
      cells: ['corn', 'leek', null, 'appleTree'],
      mirrorCornTargets: [3, 0, null, null],
    },
  })

  assert.deepEqual(migratedGame.blueprint.mirrorCornTargets, [3, null, null, null])
})
