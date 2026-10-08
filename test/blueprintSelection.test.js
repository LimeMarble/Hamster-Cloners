import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  BLUEPRINT_BLOCK_PLACEMENT_MODES,
  MAX_SAVED_BLUEPRINT_BLOCKS,
  createBlueprint,
  createBlueprintBlockFromSelection,
  createInitialGame,
} from '../src/game/gameLogic.js'

let server, BlueprintSelectionToolbar, BlueprintPlacementControls, BlueprintBlocks, BlueprintEdit
before(async () => {
  server = await createServer({ logLevel: 'silent',
    // Avoid Windows native realpath failures in the local test sandbox.
    resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ BlueprintSelectionToolbar, BlueprintPlacementControls } =
    await server.ssrLoadModule('/src/tabs/BlueprintPlacementControls.jsx'))
  ;({ BlueprintBlocks } = await server.ssrLoadModule('/src/tabs/BlueprintBlocks.jsx'))
  ;({ BlueprintEdit } = await server.ssrLoadModule('/src/tabs/BlueprintEdit.jsx'))
})
after(async () => { await server?.close() })

function editor(extra = {}) {
  const blueprint = createBlueprint({ rows: 1, columns: 2, cells: ['leek', null] })
  return {
    blocks: [], libraryEntries: [], unlockedCropIds: ['leek'],
    isSelecting: false, isUnsavedSelection: true, canSaveSelection: true,
    activeBlockSourceId: null, overwriteBlockId: null, selectionName: '',
    activeBlock: createBlueprintBlockFromSelection(blueprint, 1, 0, {
      id: 'temporary-selection', name: 'Selected crops',
    }),
    placementMode: BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP,
    placementPreview: null, status: null, blockCode: '', ...extra,
  }
}

const render = (Component, state) => renderToStaticMarkup(createElement(Component, {
  game: createInitialGame(), editor: state,
}))

test('the independent selection toolbar works even when the saved-block library is full', () => {
  const full = editor({ blocks: Array(MAX_SAVED_BLUEPRINT_BLOCKS).fill({}) })
  const markup = render(BlueprintSelectionToolbar, full)
  assert.match(markup, />Select crops<\/button>/)
  assert.doesNotMatch(markup, /disabled/)
  assert.match(markup, /selection stays temporary/)
})

test('corner selection has pinned guidance and cancellation without an automatic save', () => {
  for (const selectionStartIndex of [null, 1]) {
    const markup = render(BlueprintPlacementControls, editor({
      isSelecting: true, activeBlock: null, selectionStartIndex,
    }))
    assert.match(markup, /blueprint-block-placement blueprint-selection-prompt/)
    assert.match(markup, /Cancel selection/)
    assert.match(markup, selectionStartIndex === null
      ? /corner that should act as the placement anchor/
      : /opposite corner to finish your selection/)
    assert.doesNotMatch(markup, /will be saved|Save as block|Confirm placement/)
  }
})

test('temporary selections inherit every block placement control and add inline block saving', () => {
  const selection = render(BlueprintPlacementControls, editor())
  const block = render(BlueprintPlacementControls, editor({
    isUnsavedSelection: false, activeBlockSourceId: 'saved-block',
  }))
  for (const markup of [selection, block]) {
    for (const control of ['Stamp', 'Replace', 'Rotate (Q)', 'Rotate (E)',
      'Flip (F)', 'Flip (G)', 'Confirm placement']) {
      assert.ok(markup.includes(control), control)
    }
    assert.match(markup, /blueprint-block-placement/)
    assert.match(markup, /top-right corner/)
  }
  assert.match(selection, /Crop selection controls/)
  assert.match(selection, /Save as block/)
  assert.match(selection, /blueprint-selection-name/)
  assert.doesNotMatch(block, /Save as block|blueprint-selection-name/)
})

test('a full library disables saving but does not disable selection transforms or placement', () => {
  const markup = render(BlueprintPlacementControls, editor({
    blocks: Array(MAX_SAVED_BLUEPRINT_BLOCKS).fill({}), canSaveSelection: false,
    placementPreview: { canPlace: true },
  }))
  assert.match(markup, /disabled="">Save as block<\/button>/)
  assert.doesNotMatch(markup, /disabled="">Confirm placement<\/button>/)
  assert.match(markup, /can still transform and place this selection/)
  assert.match(markup, /This preview can be placed/)
})

test('overwriting a saved block is an explicit action in the selection panel', () => {
  const markup = render(BlueprintPlacementControls, editor({ overwriteBlockId: 'saved-block' }))
  assert.match(markup, /Overwrite block/)
  assert.doesNotMatch(markup, /Save as block/)
})

test('the bottom library no longer owns selection, placement, or naming controls', () => {
  const markup = render(BlueprintBlocks, editor())
  assert.match(markup, /Saved blueprint blocks/)
  assert.match(markup, /Select crops above the grid/)
  assert.doesNotMatch(markup, /Select rectangle|blueprint-block-placement|blueprint-selection-name/)
})

test('the multi-crop selection trigger is above the blueprint grid, not inside the bottom library', () => {
  const markup = renderToStaticMarkup(createElement(BlueprintEdit, {
    game: createInitialGame(), fieldIncomePerSecond: 1,
    hamsterEfficiencyMultiplier: 1, duplicatorEfficiencyMultiplier: 1,
    replicatorEfficiencyMultiplier: 1, selectedCrop: null,
    hoveredEditorCrop: null, visibleCropIds: ['leek'], unlockedCropIds: ['leek'],
    mirrorCornLinks: [], pendingMirrorCornLinks: [], hasMirrorCorn: false,
    rootTunnelEditor: { selectedTunnelIndex: null, connectionState: null,
      validSenderIndexes: [], validRecipientIndexes: [] },
    leechingVineEditor: { selectedGourdIndex: null, validPathIndexes: [],
      status: { unlocked: false, activePath: [], inactivePath: [],
        eligibleTargetIndexes: [], activeTargetIndexes: [] } },
    blueprintBlockEditor: editor({ activeBlock: null, isUnsavedSelection: false,
      selectionStartIndex: null, selectionIndexSet: new Set(), previewTileMap: new Map() }),
    blueprintTransfer: { blueprintCode: '' }, getDisplayedCropName: () => 'Leek',
  }))
  const triggerIndex = markup.indexOf('>Select crops</button>')
  const gridIndex = markup.indexOf('class="editor-plot ')
  const libraryIndex = markup.indexOf('id="blueprint-block-title"')
  assert.ok(triggerIndex >= 0 && triggerIndex < gridIndex)
  assert.ok(gridIndex < libraryIndex)
  assert.equal(markup.split('>Select crops</button>').length - 1, 1)
})
