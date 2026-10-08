import {
  BLUEPRINT_BLOCK_PLACEMENT_MODES,
  BLUEPRINT_SELECTION_ACTIONS,
  getBlueprintBlockAnchorName,
  getBlueprintBlockAvailability,
} from '../game/gameLogic.js'
import { BlueprintBlockRequirements } from './BlueprintBlocks.jsx'
import { FormattedNumber } from './ui.jsx'

export function BlueprintSelectionToolbar({ editor }) {
  return (
    <div className="blueprint-selection-toolbar">
      <button type="button" className="secondary-button" onClick={editor.onStartSelection}>
        Select crops
      </button>
      <p>Select any two opposite corners to move or copy crops. The selection stays temporary until you save it as a block.</p>
    </div>
  )
}

export function BlueprintPlacementControls({ game, editor }) {
  if (!editor.isSelecting && !editor.activeBlock) return null

  const selectionStatus = editor.status ? (
    <p className={`blueprint-block-status blueprint-block-status-${editor.status.type}`} role="status">
      {editor.status.message}
    </p>
  ) : null

  if (editor.isSelecting) {
    return (
      <section className="blueprint-block-placement blueprint-selection-prompt" aria-label="Crop selection controls">
        <h4>Select crops</h4>
        <p>{editor.selectionStartIndex === null
          ? 'Select the corner that should act as the placement anchor.'
          : 'Select the opposite corner to finish your selection.'}</p>
        {selectionStatus}
        <button type="button" className="secondary-button" onClick={editor.onCancelInteraction}>
          Cancel selection
        </button>
      </section>
    )
  }

  const isSelection = editor.isUnsavedSelection
  const kind = isSelection ? 'selection' : 'block'
  const availability = getBlueprintBlockAvailability(editor.activeBlock, {
    unlockedCropIds: editor.unlockedCropIds,
    completedCropPerfections: game.completedCropPerfections,
    seedAugmentations: game.seedAugmentations,
  })

  return (
    <section className="blueprint-block-placement" aria-label={`${isSelection ? 'Crop selection' : 'Block placement'} controls`}>
      <div>
        <p className="eyebrow">{isSelection ? 'Selected crops' : 'Placing block'}</p>
        <h4>{editor.activeBlock.name}</h4>
        <p>
          <FormattedNumber value={editor.activeBlock.rows} maximumFractionDigits={0} />
          ×<FormattedNumber value={editor.activeBlock.columns} maximumFractionDigits={0} />,
          anchored at its {getBlueprintBlockAnchorName(editor.activeBlock)} corner.
          Hover a tile, or tap one to pin the preview.
        </p>
      </div>

      {isSelection && editor.canMoveSelection ? (
        <div className="blueprint-block-mode" role="group" aria-label="Selection action">
          <button type="button"
            className={editor.selectionAction === BLUEPRINT_SELECTION_ACTIONS.MOVE ? 'is-active' : ''}
            aria-pressed={editor.selectionAction === BLUEPRINT_SELECTION_ACTIONS.MOVE}
            onClick={() => editor.onSelectionActionChange(BLUEPRINT_SELECTION_ACTIONS.MOVE)}>
            Move
            <small>Clear the source only when placement is confirmed.</small>
          </button>
          <button type="button"
            className={editor.selectionAction === BLUEPRINT_SELECTION_ACTIONS.COPY ? 'is-active' : ''}
            aria-pressed={editor.selectionAction === BLUEPRINT_SELECTION_ACTIONS.COPY}
            onClick={() => editor.onSelectionActionChange(BLUEPRINT_SELECTION_ACTIONS.COPY)}>
            Copy
            <small>Keep the source. Normal planting limits still apply.</small>
          </button>
        </div>
      ) : null}

      <div className="blueprint-block-mode" role="group" aria-label={`${isSelection ? 'Selection' : 'Block'} placement mode`}>
        <button type="button"
          className={editor.placementMode === BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP ? 'is-active' : ''}
          aria-pressed={editor.placementMode === BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP}
          onClick={() => editor.onPlacementModeChange(BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP)}>
          Stamp
          <small>Keep destination cells where the {kind} is empty.</small>
        </button>
        <button type="button"
          className={editor.placementMode === BLUEPRINT_BLOCK_PLACEMENT_MODES.REPLACE ? 'is-active' : ''}
          aria-pressed={editor.placementMode === BLUEPRINT_BLOCK_PLACEMENT_MODES.REPLACE}
          onClick={() => editor.onPlacementModeChange(BLUEPRINT_BLOCK_PLACEMENT_MODES.REPLACE)}>
          Replace
          <small>Clear destination cells where the {kind} is empty.</small>
        </button>
      </div>

      <div className="blueprint-block-transform-row" role="group" aria-label={`Transform ${kind}`}>
        <button type="button" className="secondary-button" onClick={editor.onRotateCounterclockwise}
          aria-label={`Rotate ${kind} counterclockwise, shortcut Q`}>↺ Rotate (Q)</button>
        <button type="button" className="secondary-button" onClick={editor.onRotateClockwise}
          aria-label={`Rotate ${kind} clockwise, shortcut E`}>↻ Rotate (E)</button>
        <button type="button" className="secondary-button" onClick={editor.onFlipHorizontal}>⇋ Flip (F)</button>
        <button type="button" className="secondary-button" onClick={editor.onFlipVertical}>⇵ Flip (G)</button>
      </div>

      <BlueprintBlockRequirements availability={availability} completedCropPerfections={game.completedCropPerfections} />
      <p className={`blueprint-block-preview-status ${editor.placementPreview
        ? editor.placementPreview.canPlace ? 'blueprint-block-valid' : 'blueprint-block-invalid'
        : 'blueprint-block-instruction'}`}>
        {editor.placementPreview
          ? editor.placementPreview.canPlace ? 'This preview can be placed.' : editor.placementPreview.error
          : 'Choose a position on the grid to preview this layout.'}
      </p>
      {selectionStatus}

      {isSelection ? (
        <div className="blueprint-block-save-row">
          <label htmlFor="blueprint-selection-name">
            Block name
            <input id="blueprint-selection-name" value={editor.selectionName}
              onChange={(event) => editor.onSelectionNameChange(event.target.value)}
              placeholder={`Block ${editor.blocks.length + 1}`} maxLength={50} />
          </label>
          <button type="button" className="secondary-button" onClick={editor.onSaveSelectionAsBlock}
            disabled={!editor.canSaveSelection}>
            {editor.overwriteBlockId ? 'Overwrite block' : 'Save as block'}
          </button>
          {!editor.canSaveSelection ? (
            <p className="blueprint-block-missing">The block library is full. You can still transform and place this selection.</p>
          ) : null}
        </div>
      ) : null}

      <div className="blueprint-block-action-row">
        <button type="button" className="primary-button" onClick={editor.onPlacePreview}
          disabled={!editor.placementPreview?.canPlace}>Confirm placement</button>
        <button type="button" className="secondary-button" onClick={editor.onCancelInteraction}>
          {isSelection ? 'Clear selection' : 'Stop placing'}
        </button>
      </div>
    </section>
  )
}
