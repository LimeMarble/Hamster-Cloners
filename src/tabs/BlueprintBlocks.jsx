import {
  MAX_SAVED_BLUEPRINT_BLOCKS,
  getBlueprintBlockAnchorName,
  getSeedAugmentationName,
} from '../game/gameLogic.js'
import {
  CROP_PERFECTIONS,
  getCropName,
} from '../game/crops.js'

export function BlueprintBlockRequirements({ availability, completedCropPerfections }) {
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

      {editor.status && !editor.isSelecting && !editor.activeBlock ? (
        <p
          className={`blueprint-block-status blueprint-block-status-${editor.status.type}`}
          role="status"
        >
          {editor.status.message}
        </p>
      ) : null}

      <div className="blueprint-block-library" aria-label="Saved blueprint blocks">
        {editor.libraryEntries.length === 0 ? (
          <p className="blueprint-block-empty">No blocks saved yet. Select crops above the grid, then choose Save as block.</p>
        ) : editor.libraryEntries.map(({ block, availability }) => (
          <article className="blueprint-block-library-item" key={block.id}>
            <div>
              <h4>{block.name}</h4>
              <p>
                {block.rows}×{block.columns} · {getBlueprintBlockAnchorName(block)} anchor
              </p>
              <BlueprintBlockRequirements
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
