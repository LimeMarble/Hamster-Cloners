import assert from 'node:assert/strict'
import test from 'node:test'
import {
  exportGame,
  importGame,
  importGameSnapshot,
  normalizeGame,
  SAVE_FORMAT_VERSION,
} from '../src/game/storage.js'
import { SUNFLOWER_UNLOCK_CROP_COUNT } from '../src/game/crops.js'

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

test('current saves retain valid Splitweed footprints and clear legacy single tiles', () => {
  const validSave = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    completedCropPerfections: ['splitweed'],
    blueprint: {
      rows: 2,
      columns: 2,
      cells: [
        'knotweed',
        'splitweedPart',
        'splitweedPart',
        'splitweedPart',
      ],
    },
  })
  const legacySave = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    completedCropPerfections: ['splitweed'],
    blueprint: {
      rows: 2,
      columns: 2,
      cells: ['knotweed', 'leek', null, null],
    },
  })

  assert.deepEqual(validSave.blueprint.cells, [
    'knotweed',
    'splitweedPart',
    'splitweedPart',
    'splitweedPart',
  ])
  assert.deepEqual(legacySave.blueprint.cells, [null, 'leek', null, null])
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
    hasUnlockedSunflower: true,
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

test('Sunflower unlock migration ignores Row Duplicators and uses its Crop milestone', () => {
  const rowDuplicatorSave = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    crops: 1e30,
    hasUnlockedKnotweed: true,
    hasUnlockedRowDuplicators: true,
    blueprint: {
      rows: 1,
      columns: 2,
      cells: ['sunflower', 'leek'],
    },
    blueprintSlots: [
      { rows: 1, columns: 2, cells: ['sunflower', 'leek'] },
      { rows: 1, columns: 2, cells: ['leek', 'sunflower'] },
      { rows: 1, columns: 2, cells: ['sunflower', 'sunflower'] },
    ],
    activeBlueprintSlot: 2,
  })
  const milestoneSave = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    crops: SUNFLOWER_UNLOCK_CROP_COUNT,
    blueprint: {
      rows: 1,
      columns: 2,
      cells: ['sunflower', 'leek'],
    },
  })

  assert.equal(rowDuplicatorSave.hasUnlockedSunflower, false)
  assert.equal(rowDuplicatorSave.activeBlueprintSlot, 0)
  assert.equal(rowDuplicatorSave.blueprintSlots.length, 3)
  assert.ok(
    rowDuplicatorSave.blueprintSlots.every((blueprint) =>
      blueprint.cells.every((cropId) => cropId !== 'sunflower'),
    ),
  )
  assert.equal(milestoneSave.hasUnlockedSunflower, true)
  assert.deepEqual(milestoneSave.blueprint.cells, ['sunflower', 'leek'])
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
    testingPanelVisible: false,
    testingCheats: {
      cropMultiplierEnabled: true,
      hamsterEfficiencyEnabled: true,
    },
  })
  const legacyUnlockedSave = normalizeGame({ testingPanelUnlocked: true })
  const ordinarySave = normalizeGame({})

  assert.equal(testingSave.testingPanelUnlocked, true)
  assert.equal(testingSave.testingPanelVisible, false)
  assert.equal(legacyUnlockedSave.testingPanelVisible, true)
  assert.deepEqual(testingSave.testingCheats, {
    cropMultiplierEnabled: true,
    hamsterEfficiencyEnabled: true,
  })
  assert.equal(ordinarySave.testingPanelUnlocked, false)
  assert.equal(ordinarySave.testingPanelVisible, false)
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

test('Trade state persists with safe migration defaults', () => {
  const tradeSave = normalizeGame({
    trade: {
      established: true,
      rabbitRelations: 4321,
      rabbitUnlocks: ['hamsterEfficiency', 'hamsterEfficiency', 'invalid'],
      rabbitContract: {
        cropId: 'leek',
        factor: 3e7,
        fieldsPlanted: 1e40,
        requiredAmount: 3e47,
        progress: 2e47,
        relationsReward: 120,
      },
    },
  })
  const olderSave = normalizeGame({})

  assert.equal(tradeSave.trade.established, true)
  assert.equal(tradeSave.trade.rabbitRelations, 4321)
  assert.deepEqual(tradeSave.trade.rabbitUnlocks, ['hamsterEfficiency'])
  assert.equal(tradeSave.trade.rabbitContracts.length, 3)
  assert.equal(tradeSave.trade.rabbitContracts[0].cropId, 'leek')
  assert.equal(tradeSave.trade.rabbitContracts[0].progress, 2e47)
  assert.equal(tradeSave.trade.rabbitContractsCompleted, 0)
  assert.deepEqual(olderSave.trade, {
    established: false,
    rabbitRelations: 0,
    rabbitContractsCompleted: 0,
    rabbitContracts: [],
    rabbitUnlocks: [],
  })
})
test('legacy Rabbit blueprint expansions migrate to free blueprint space', () => {
  const migratedGame = normalizeGame({
    blueprintExpansionAxesSwapped: true,
    blueprint: {
      rows: 2,
      columns: 2,
      cells: ['leek', null, null, null],
    },
    completedBlueprintExpansions: ['firstRow', 'firstColumn'],
    trade: {
      established: true,
      rabbitUnlocks: ['rowExpansion', 'columnExpansion'],
    },
  })

  assert.equal(migratedGame.blueprint.rows, 2)
  assert.equal(migratedGame.blueprint.columns, 2)
  assert.deepEqual(migratedGame.completedBlueprintExpansions, [])
  assert.deepEqual(migratedGame.rabbitBlueprintExpansions, {
    row: 1,
    column: 1,
  })
})

test('Clover bundles and active Breezes of Fortune persist with safe defaults', () => {
  const cloverSave = normalizeGame({
    fortune: {
      bundle: { x: 25, y: 75 },
      secondsTowardBundleRoll: 42,
      activeEffects: [
        { id: 'bounty', remainingSeconds: 31 },
      ],
      notice: { effectId: 'bounty', remainingSeconds: 4 },
    },
  })
  const olderSave = normalizeGame({})

  assert.deepEqual(cloverSave.fortune, {
    bundle: { x: 25, y: 75 },
    secondsTowardBundleRoll: 42,
    activeEffects: [
      { id: 'bounty', remainingSeconds: 31 },
    ],
    notice: { effectId: 'bounty', remainingSeconds: 4 },
  })
  assert.deepEqual(olderSave.fortune, {
    bundle: null,
    secondsTowardBundleRoll: 0,
    activeEffects: [],
    notice: null,
  })
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

test('save snapshots preserve their simulation timestamp', () => {
  const saveCode = exportGame(
    {
      crops: 12_345,
      hamsters: 10,
      blueprintExpansionAxesSwapped: true,
      blueprint: { cells: ['leek'] },
    },
    1_000,
  )
  const snapshot = importGameSnapshot(saveCode, 2_000)

  assert.equal(snapshot.savedAt, 1_000)
  assert.equal(snapshot.game.crops, 12_345)
})

test('save snapshots clamp future timestamps to the current time', () => {
  const saveCode = exportGame(
    {
      crops: 10,
      blueprintExpansionAxesSwapped: true,
      blueprint: { cells: ['leek'] },
    },
    5_000,
  )

  assert.equal(importGameSnapshot(saveCode, 2_000).savedAt, 2_000)
})
