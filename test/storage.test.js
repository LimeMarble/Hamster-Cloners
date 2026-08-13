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

test('current saves retain valid Mirror Corn diagonal tile targets', () => {
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

  const emptyTargetSave = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    blueprint: {
      rows: 2,
      columns: 2,
      cells: ['corn', null, null, null],
      mirrorCornTargets: [3],
    },
  })

  assert.deepEqual(emptyTargetSave.blueprint.mirrorCornTargets, [3, null, null, null])
})

test('current saves retain independent unlocked blueprint slots', () => {
  const migratedGame = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    unionized: true,
    hamsters: 125,
    blueprint: {
      rows: 1,
      columns: 2,
      cells: ['leek', 'corn'],
    },
    blueprintSlots: [
      { rows: 1, columns: 2, cells: ['leek', 'corn'] },
      { rows: 1, columns: 2, cells: ['corn', 'leek'] },
    ],
    activeBlueprintSlot: 1,
  })

  assert.equal(migratedGame.blueprintSlots.length, 2)
  assert.equal(migratedGame.activeBlueprintSlot, 1)
  assert.deepEqual(migratedGame.blueprint.cells, ['corn', 'leek'])
  assert.deepEqual(migratedGame.blueprintSlots[0].cells, ['leek', 'corn'])
})

test('current saves remove temporarily unavailable crops from every blueprint slot', () => {
  const migratedGame = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    hasUnlockedRootTunnel: true,
    hasUnlockedRowDuplicators: true,
    blueprint: {
      rows: 1,
      columns: 3,
      cells: ['leek', 'rootTunnel', 'corn'],
    },
    blueprintSlots: [
      { rows: 1, columns: 3, cells: ['rootTunnel', 'corn', 'leek'] },
      { rows: 1, columns: 3, cells: ['leek', 'rootTunnel', 'corn'] },
      { rows: 1, columns: 3, cells: ['corn', 'leek', 'rootTunnel'] },
    ],
    activeBlueprintSlot: 1,
  })

  assert.equal(migratedGame.blueprintSlots.length, 3)
  assert.deepEqual(
    migratedGame.blueprintSlots.map((blueprint) => blueprint.cells),
    [
      [null, 'corn', 'leek'],
      ['leek', null, 'corn'],
      ['corn', 'leek', null],
    ],
  )
  assert.deepEqual(migratedGame.blueprint.cells, ['leek', null, 'corn'])
})
test('locked migrated blueprint layouts remain stored but cannot stay active', () => {
  const migratedGame = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    blueprint: { rows: 1, columns: 2, cells: ['leek', 'corn'] },
    blueprintSlots: [
      { rows: 1, columns: 2, cells: ['leek', 'corn'] },
      { rows: 1, columns: 2, cells: ['corn', 'leek'] },
      { rows: 1, columns: 2, cells: ['leek', 'leek'] },
    ],
    activeBlueprintSlot: 2,
  })

  assert.equal(migratedGame.blueprintSlots.length, 3)
  assert.equal(migratedGame.activeBlueprintSlot, 0)
  assert.deepEqual(migratedGame.blueprint.cells, ['leek', 'corn'])
})

test('statistics persist and older saves receive safe lifetime defaults', () => {
  const savedStatistics = normalizeGame({
    crops: 50,
    totalCropsMade: 2_500,
    playtimeSeconds: 123,
  })
  const olderSave = normalizeGame({ crops: 50 })

  assert.equal(savedStatistics.totalCropsMade, 2_500)
  assert.equal(savedStatistics.playtimeSeconds, 123)
  assert.equal(olderSave.totalCropsMade, 50)
  assert.equal(olderSave.playtimeSeconds, 0)
})

test('testing panel unlock and toggle states persist safely', () => {
  const testingSave = normalizeGame({
    testingPanelUnlocked: true,
    testingCheats: {
      cropMultiplierEnabled: true,
      hamsterEfficiencyEnabled: true,
    },
  })
  const ordinarySave = normalizeGame({})

  assert.equal(testingSave.testingPanelUnlocked, true)
  assert.deepEqual(testingSave.testingCheats, {
    cropMultiplierEnabled: true,
    hamsterEfficiencyEnabled: true,
  })
  assert.equal(ordinarySave.testingPanelUnlocked, false)
  assert.deepEqual(ordinarySave.testingCheats, {
    cropMultiplierEnabled: false,
    hamsterEfficiencyEnabled: false,
  })
})

test('number notation persists and defaults safely to suffix notation', () => {
  assert.equal(normalizeGame({ numberNotation: 'scientific' }).numberNotation, 'scientific')
  assert.equal(normalizeGame({ numberNotation: 'unknown' }).numberNotation, 'suffix')
  assert.equal(normalizeGame({}).numberNotation, 'suffix')
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
