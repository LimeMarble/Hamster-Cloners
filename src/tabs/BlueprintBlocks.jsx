import {
  BLUEPRINT_BLOCK_PLACEMENT_MODES,
  MAX_SAVED_BLUEPRINT_BLOCKS,
  getBlueprintBlockAnchorName,
  getSeedAugmentationName,
} from '../game/gameLogic.js'
import {
  CROP_PERFECTIONS,
  getCropName,
} from '../game/crops.js'

function RequirementList({ availability, completedCropPerfections }) {
  if (!availability?.hasMissingRequirements) return null

  const missing = [
    ...availability.missingCropIds.map((cropId) =>
      getCropName(cropId, completedCropPerfections),
    ),
    ...availability.missingCropPerfectionIds.map(
      (perfectionId) => CROP_PERFECTIONS[perfectionId]?.name ?? perfectionId,
    ),
    ...availability.missingSeedAugmentations.map(({ id, level }) => {
      const name = getSeedAugmentationName(id)
      return level > 1 ? `${name} level ${level}` : name
    }),
  ]

  return (
    <p className="blueprint-block-missing">
      Missing: {missing.join(', ')}. Locked Crop and structural-perfection
      tiles are omitted; in Replace mode their cells become empty. Other
      missing effects simply do not apply.
    </p>
  )
}

export function BlueprintBlocks({ game, editor }) {
  const activeAvailability = editor.activeBlock
    ? editor.libraryEntries.find(
        ({ block }) => block.id === editor.activeBlockSourceId,
      )?.availability ?? editor.placementPreview?.availability
    : null

  return (
    <section className="blueprint-block-card" aria-labelledby="blueprint-block-title">
      <div className="blueprint-block-heading">
        <div>
          <p className="eyebrow">Reusable layouts</p>
          <h3 id="blueprint-block-title">Blueprint blocks</h3>
          <p>
            Save any rectangular part of this blueprint, then stamp, replace,
            rotate, or flip it in any blueprint and either game area.
          </p>
        </div>
        <span className="blueprint-block-count">
          {editor.blocks.length}/{MAX_SAVED_BLUEPRINT_BLOCKS}
        </span>
      </div>

      <div className="blueprint-block-save-row">
        <label htmlFor="blueprint-block-name">
          Block name
          <input
            id="blueprint-block-name"
            value={editor.selectionName}
            onChange={(event) => editor.onSelectionNameChange(event.target.value)}
            placeholder={`Block ${editor.blocks.length + 1}`}
            maxLength={50}
          />
        </label>
        {editor.isSelecting ? (
          <button
            type="button"
            className="secondary-button"
            onClick={editor.onCancelInteraction}
          >
            Cancel selection
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={editor.onStartSelection}
            disabled={editor.blocks.length >= MAX_SAVED_BLUEPRINT_BLOCKS}
          >
            Select rectangle
          </button>
        )}
      </div>

      {editor.isSelecting ? (
        <p className="blueprint-block-instruction">
          {editor.selectionStartIndex === null
            ? 'Select the corner that should act as the placement anchor.'
            : 'Select the opposite corner. The highlighted rectangle will be saved.'}
        </p>
      ) : null}

      {editor.status ? (
        <p
          className={`blueprint-block-status blueprint-block-status-${editor.status.type}`}
          role="status"
        >
          {editor.status.message}
        </p>
      ) : null}

      {editor.activeBlock ? (
        <div className="blueprint-block-placement">
          <div>
            <p className="eyebrow">Placing</p>
            <h4>{editor.activeBlock.name}</h4>
            <p>
              {editor.activeBlock.rows}×{editor.activeBlock.columns}, anchored
              at its {getBlueprintBlockAnchorName(editor.activeBlock)} corner.
              Hover a tile, or tap one to pin the preview.
            </p>
          </div>

          <div className="blueprint-block-mode" role="group" aria-label="Block placement mode">
            <button
              type="button"
              className={editor.placementMode === BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP ? 'is-active' : ''}
              onClick={() => editor.onPlacementModeChange(BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP)}
            >
              Stamp
              <small>Keep destination cells where the block is empty.</small>
            </button>
            <button
              type="button"
              className={editor.placementMode === BLUEPRINT_BLOCK_PLACEMENT_MODES.REPLACE ? 'is-active' : ''}
              onClick={() => editor.onPlacementModeChange(BLUEPRINT_BLOCK_PLACEMENT_MODES.REPLACE)}
            >
              Replace
              <small>Clear destination cells where the block is empty.</small>
            </button>
          </div>

          <div className="blueprint-block-transform-row" role="group" aria-label="Transform block">
            <button type="button" className="secondary-button" onClick={editor.onRotateCounterclockwise} aria-label="Rotate block counterclockwise">↺ Rotate</button>
            <button type="button" className="secondary-button" onClick={editor.onRotateClockwise} aria-label="Rotate block clockwise">↻ Rotate</button>
            <button type="button" className="secondary-button" onClick={editor.onFlipHorizontal}>⇋ Flip</button>
            <button type="button" className="secondary-button" onClick={editor.onFlipVertical}>⇵ Flip</button>
          </div>

          <RequirementList
            availability={activeAvailability}
            completedCropPerfections={game.completedCropPerfections}
          />

          {editor.placementPreview ? (
            <p className={editor.placementPreview.canPlace ? 'blueprint-block-valid' : 'blueprint-block-invalid'}>
              {editor.placementPreview.canPlace
                ? 'This preview can be placed.'
                : editor.placementPreview.error}
            </p>
          ) : null}

          <div className="blueprint-block-action-row">
            <button
              type="button"
              className="primary-button"
              onClick={editor.onPlacePreview}
              disabled={!editor.placementPreview?.canPlace}
            >
              Confirm placement
            </button>
            <button type="button" className="secondary-button" onClick={editor.onCancelInteraction}>
              Stop placing
            </button>
          </div>
        </div>
      ) : null}

      <div className="blueprint-block-library" aria-label="Saved blueprint blocks">
        {editor.libraryEntries.length === 0 ? (
          <p className="blueprint-block-empty">No blocks saved yet.</p>
        ) : editor.libraryEntries.map(({ block, availability }) => (
          <article className="blueprint-block-library-item" key={block.id}>
            <div>
              <h4>{block.name}</h4>
              <p>
                {block.rows}×{block.columns} · {getBlueprintBlockAnchorName(block)} anchor
              </p>
              <RequirementList
                availability={availability}
                completedCropPerfections={game.completedCropPerfections}
              />
            </div>
            <div className="blueprint-block-library-actions">
              <button type="button" className="primary-button" onClick={() => editor.onUseBlock(block.id)}>Use</button>
              <button type="button" className="secondary-button" onClick={() => editor.onOverwriteBlock(block.id)}>Overwrite</button>
              <button type="button" className="secondary-button" onClick={() => editor.onRenameBlock(block.id)}>Rename</button>
              <button type="button" className="secondary-button" onClick={() => editor.onExportBlock(block.id)}>Export</button>
              <button type="button" className="secondary-button blueprint-block-delete" onClick={() => editor.onDeleteBlock(block.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>

      <div className="blueprint-block-transfer">
        <label htmlFor="blueprint-block-code">
          Block or library code
          <textarea
            id="blueprint-block-code"
            className="blueprint-code-input"
            value={editor.blockCode}
            onChange={(event) => editor.onBlockCodeChange(event.target.value)}
            placeholder="Export a block or paste a block/library code here"
            spellCheck="false"
          />
        </label>
        <div className="blueprint-block-transfer-actions">
          <button type="button" className="secondary-button" onClick={editor.onImportBlock} disabled={!editor.blockCode.trim()}>Import block</button>
          <button type="button" className="secondary-button" onClick={editor.onImportLibrary} disabled={!editor.blockCode.trim()}>Import library</button>
          <button type="button" className="secondary-button" onClick={editor.onExportLibrary} disabled={editor.blocks.length === 0}>Export library</button>
        </div>
      </div>

    </section>
  )
}
