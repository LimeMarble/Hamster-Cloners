import assert from 'node:assert/strict'
import test from 'node:test'
import {
  exportGame,
  importGame,
  normalizeGame,
  SAVE_FORMAT_VERSION,
} from '../src/game/storage.js'

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

test('exports and imports a versioned Base64 save code', () => {
  const saveCode = exportGame({
    crops: 12_345,
    hamsters: 10,
    blueprintExpansionAxesSwapped: true,
    blueprint: { cells: ['leek'] },
  })

  assert.match(saveCode, /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)

  const importedGame = importGame(saveCode)
  assert.equal(importedGame.crops, 12_345)
  assert.equal(importedGame.hamsters, 10)
  assert.equal(SAVE_FORMAT_VERSION, 1)
})

test('rejects invalid and unsupported save codes', () => {
  assert.throws(() => importGame('not a save code'), /Base64/)
  assert.throws(
    () => importGame(btoa(JSON.stringify({ version: 99, game: {} }))),
    /unsupported version/,
  )
})
