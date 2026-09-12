import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BLUEPRINT_BLOCK_PLACEMENT_MODES,
  BLUEPRINT_BLOCK_TRANSFORMS,
  createBlueprint,
  createBlueprintBlockFromSelection,
  createInitialGame,
  exportBlueprintBlock,
  exportBlueprintBlockLibrary,
  getBlueprintBlockAvailability,
  getBlueprintBlockHotkeyTransform,
  getBlueprintBlockPlacementPreview,
  importBlueprintBlock,
  importBlueprintBlockLibrary,
  transformBlueprintBlock,
} from '../src/game/gameLogic.js'
import { exportGame, importGame } from '../src/game/storage.js'

function createLinkedBlueprint() {
  const cells = Array(16).fill(null)
  cells[5] = 'turnip'
  cells[6] = 'corn'
  cells[9] = 'leek'
  cells[10] = 'rootTunnel'

  return createBlueprint({
    rows: 4,
    columns: 4,
    cells,
    mirrorCornTargets: cells.map((_, index) => index === 6 ? 9 : null),
    rootTunnelConnections: [
      { tunnelIndex: 10, senderIndex: 5, recipientIndex: 9 },
    ],
  })
}

test('a saved rectangle uses the first of either opposite corners as its anchor', () => {
  const block = createBlueprintBlockFromSelection(
    createLinkedBlueprint(),
    10,
    5,
    { id: 'linked', name: 'Linked setup' },
  )

  assert.equal(block.rows, 2)
  assert.equal(block.columns, 2)
  assert.equal(block.anchorIndex, 3)
  assert.deepEqual(block.cells, ['turnip', 'corn', 'leek', 'rootTunnel'])
  assert.deepEqual(block.mirrorCornTargets, [null, 2, null, null])
  assert.deepEqual(block.rootTunnelConnections, [
    { tunnelIndex: 3, senderIndex: 0, recipientIndex: 2 },
  ])
})

test('saving rejects a rectangle that cuts through a 2 by 2 Crop', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'leechingGourd', 'leechingGourdPart', null,
      'leechingGourdPart', 'leechingGourdPart', null,
      null, null, null,
    ],
  })

  assert.throws(
    () => createBlueprintBlockFromSelection(blueprint, 0, 1),
    /cuts through a 2×2 Crop/,
  )
})

test('a saved vine is kept only when its whole gourd, path, and targets are selected', () => {
  const cells = Array(16).fill(null)
  cells[0] = 'leechingGourd'
  cells[1] = 'leechingGourdPart'
  cells[4] = 'leechingGourdPart'
  cells[5] = 'leechingGourdPart'
  cells[11] = 'turnip'
  const blueprint = createBlueprint({
    rows: 4,
    columns: 4,
    cells,
    leechingVines: [{ path: [6, 10], targetIndexes: [11] }],
  })
  const complete = createBlueprintBlockFromSelection(blueprint, 0, 11)
  const cutTarget = createBlueprintBlockFromSelection(blueprint, 0, 10)

  assert.deepEqual(complete.leechingVines, [
    { path: [6, 10], targetIndexes: [11] },
  ])
  assert.equal(cutTarget.leechingVines, undefined)
})

test('rotation transforms the anchor, Crops, Mirror target, and Root Tunnel connection', () => {
  const block = createBlueprintBlockFromSelection(
    createLinkedBlueprint(),
    10,
    5,
    { id: 'linked', name: 'Linked setup' },
  )
  const rotated = transformBlueprintBlock(
    block,
    BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_CLOCKWISE,
  )

  assert.equal(rotated.anchorIndex, 2)
  assert.deepEqual(rotated.cells, ['leek', 'turnip', 'rootTunnel', 'corn'])
  assert.deepEqual(rotated.mirrorCornTargets, [null, null, null, 0])
  assert.deepEqual(rotated.rootTunnelConnections, [
    { tunnelIndex: 2, senderIndex: 1, recipientIndex: 0 },
  ])
})

test('horizontal and vertical flips preserve internal block metadata', () => {
  const block = createBlueprintBlockFromSelection(
    createLinkedBlueprint(),
    10,
    5,
    { id: 'linked', name: 'Linked setup' },
  )
  const horizontal = transformBlueprintBlock(
    block,
    BLUEPRINT_BLOCK_TRANSFORMS.FLIP_HORIZONTAL,
  )
  const vertical = transformBlueprintBlock(
    block,
    BLUEPRINT_BLOCK_TRANSFORMS.FLIP_VERTICAL,
  )

  assert.equal(horizontal.anchorIndex, 2)
  assert.deepEqual(horizontal.cells, ['corn', 'turnip', 'rootTunnel', 'leek'])
  assert.deepEqual(horizontal.mirrorCornTargets, [3, null, null, null])
  assert.deepEqual(horizontal.rootTunnelConnections, [
    { tunnelIndex: 2, senderIndex: 1, recipientIndex: 3 },
  ])

  assert.equal(vertical.anchorIndex, 1)
  assert.deepEqual(vertical.cells, ['leek', 'rootTunnel', 'turnip', 'corn'])
  assert.deepEqual(vertical.mirrorCornTargets, [null, null, null, 0])
  assert.deepEqual(vertical.rootTunnelConnections, [
    { tunnelIndex: 1, senderIndex: 2, recipientIndex: 0 },
  ])
})

test('block transform hotkeys map case-insensitively to every transform', () => {
  assert.equal(
    getBlueprintBlockHotkeyTransform('e'),
    BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_CLOCKWISE,
  )
  assert.equal(
    getBlueprintBlockHotkeyTransform('Q'),
    BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_COUNTERCLOCKWISE,
  )
  assert.equal(
    getBlueprintBlockHotkeyTransform('f'),
    BLUEPRINT_BLOCK_TRANSFORMS.FLIP_HORIZONTAL,
  )
  assert.equal(
    getBlueprintBlockHotkeyTransform('G'),
    BLUEPRINT_BLOCK_TRANSFORMS.FLIP_VERTICAL,
  )
  assert.equal(getBlueprintBlockHotkeyTransform('x'), null)
})

test('missing Crops are omitted by Stamp and cleared by Replace without disabling placement', () => {
  const source = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'appleTree'],
  })
  const block = createBlueprintBlockFromSelection(source, 0, 1)
  const destination = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['corn', 'corn'],
  })
  const options = { unlockedCropIds: ['leek'] }
  const availability = getBlueprintBlockAvailability(block, options)
  const stamped = getBlueprintBlockPlacementPreview(
    destination,
    block,
    0,
    {
      ...options,
      placementMode: BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP,
    },
  )
  const replaced = getBlueprintBlockPlacementPreview(
    destination,
    block,
    0,
    {
      ...options,
      placementMode: BLUEPRINT_BLOCK_PLACEMENT_MODES.REPLACE,
    },
  )

  assert.deepEqual(availability.missingCropIds, ['appleTree'])
  assert.equal(stamped.canPlace, true)
  assert.deepEqual(stamped.blueprint.cells, ['leek', 'corn'])
  assert.equal(replaced.canPlace, true)
  assert.deepEqual(replaced.blueprint.cells, ['leek', null])
})

test('a block placement is atomic when its complete rectangle is out of bounds', () => {
  const source = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['leek', 'corn', 'turnip', 'appleTree'],
  })
  const block = createBlueprintBlockFromSelection(source, 0, 3)
  const destination = createBlueprint({ rows: 3, columns: 3 })
  const preview = getBlueprintBlockPlacementPreview(
    destination,
    block,
    8,
    { unlockedCropIds: ['leek', 'corn', 'turnip', 'appleTree'] },
  )

  assert.equal(preview.canPlace, false)
  assert.match(preview.error, /complete block must fit/i)
  assert.equal(preview.blueprint, null)
  assert.deepEqual(destination.cells, Array(9).fill(null))
})

test('individual blocks and complete libraries round-trip through Base64', () => {
  const block = createBlueprintBlockFromSelection(
    createLinkedBlueprint(),
    10,
    5,
    { id: 'linked', name: 'Linked setup' },
  )
  const importedBlock = importBlueprintBlock(exportBlueprintBlock(block))
  const importedLibrary = importBlueprintBlockLibrary(
    exportBlueprintBlockLibrary([block]),
  )

  assert.deepEqual(importedBlock, block)
  assert.deepEqual(importedLibrary, [block])
})

test('the normal game save preserves the shared block library', () => {
  const block = createBlueprintBlockFromSelection(
    createLinkedBlueprint(),
    10,
    5,
    { id: 'linked', name: 'Linked setup' },
  )
  const restored = importGame(exportGame({
    ...createInitialGame(),
    blueprintBlocks: [block],
  }, 1234))

  assert.deepEqual(restored.blueprintBlocks, [block])
})
