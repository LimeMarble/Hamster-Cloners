import {
  CROP_DEFINITIONS,
  getCropName,
  getCropPlacementEffectDescription,
} from '../game/crops.js'
import {
  CropHoverInspector,
  MirrorCornConnectionLines,
  MonocropStatus,
} from './ui.jsx'
import { CropVisual } from './CropVisual.jsx'

export function BlueprintEdit({
  game,
  selectedCrop,
  onSelectCrop,
  pendingMirrorCornPlacement,
  hoveredEditorCrop,
  visibleCropIds,
  unlockedCropIds,
  rowsBuiltPerSecond,
  showMonocropLimit,
  monocropLimit,
  monocropPenaltyMultiplier,
  mirrorCornLinks,
  pendingMirrorCornLinks,
  hasMirrorCorn,
  getDisplayedCropName,
  onClose,
  onResume,
  onEditorPlotClick,
  onEditorPlotContextMenu,
  blueprintTransfer,
  onUpdateHoveredEditorCrop,
  onClearHoveredEditorCrop,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="blueprint-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Blueprint editor</p>
            <h2 id="editor-title">Place your Crops</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close blueprint editor"
          >
            ×
          </button>
        </div>

        {showMonocropLimit ? (
          <MonocropStatus
            limit={monocropLimit}
            multiplier={monocropPenaltyMultiplier}
          />
        ) : null}

        <p className="editing-notice">
          Harvesting is paused while you modify this blueprint. Right-click a
          planted crop to remove it.
        </p>

        {pendingMirrorCornPlacement ? (
          <p className="mirror-corn-notice">
            Choose one yellow-lined diagonal tile to target. Click the pending
            Mirror Corn tile again to cancel.
          </p>
        ) : hasMirrorCorn && selectedCrop === 'corn' ? (
          <p className="mirror-corn-notice">
            Place Mirror Corn where it has a diagonal tile, then choose that
            tile. The link remains when its crop changes, but each tile can
            receive at most two reflections.
          </p>
        ) : null}

        <div className="blueprint-editor-layout">
          <div className="editor-grid-wrapper">
            <MirrorCornConnectionLines
              blueprint={game.blueprint}
              links={mirrorCornLinks}
            />
            <MirrorCornConnectionLines
              blueprint={game.blueprint}
              links={pendingMirrorCornLinks}
              pending
            />
            <div
              className="editor-grid"
              style={{
                gridTemplateColumns: `repeat(${game.blueprint.columns}, minmax(64px, 1fr))`,
              }}
            >
              {game.blueprint.cells.map((crop, index) => {
                const isPendingMirrorCornSource =
                  pendingMirrorCornPlacement?.sourceIndex === index
                const isPendingMirrorCornTarget =
                  pendingMirrorCornPlacement?.targetIndexes.includes(index)

                return (
                  <button
                    type="button"
                    className={`editor-plot ${crop ? `editor-plot-${crop}` : ''} ${isPendingMirrorCornSource ? 'editor-plot-mirror-source' : ''} ${isPendingMirrorCornTarget ? 'editor-plot-mirror-target' : ''}`}
                    key={index}
                    onClick={() => onEditorPlotClick(index, crop)}
                    onContextMenu={(event) =>
                      onEditorPlotContextMenu(index, crop, event)
                    }
                    onPointerEnter={(event) => onUpdateHoveredEditorCrop(index, event)}
                    onPointerMove={(event) => onUpdateHoveredEditorCrop(index, event)}
                    onPointerLeave={onClearHoveredEditorCrop}
                    onFocus={(event) => {
                      if (!crop) {
                        return
                      }

                      const bounds = event.currentTarget.getBoundingClientRect()
                      onUpdateHoveredEditorCrop(index, {
                        clientX: bounds.right,
                        clientY: bounds.top,
                      })
                    }}
                    onBlur={onClearHoveredEditorCrop}
                    aria-label={
                      isPendingMirrorCornTarget
                        ? 'Assign this tile as the Mirror Corn target'
                        : crop === 'leechingGourd' || crop === 'leechingGourdPart'
                          ? 'Remove Leeching Gourd from blueprint'
                          : crop === selectedCrop
                            ? `Remove ${getCropName(crop, game.completedCropPerfections)} from plot`
                            : `Plant ${getDisplayedCropName(selectedCrop)} in plot`
                    }
                  >
                    {crop ? (
                      <CropVisual
                        cropId={crop}
                        completedCropPerfections={
                          game.completedCropPerfections
                        }
                        className="editor-crop-visual"
                      />
                    ) : (
                      <span>Plant</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="crop-palette" aria-label="Crop selection">
            <p className="eyebrow">Selected crop</p>
            <div className="crop-options">
              {visibleCropIds.map((cropId) => {
                const crop = CROP_DEFINITIONS[cropId]
                const unlocked = unlockedCropIds.includes(cropId)

                return (
                  <button
                    type="button"
                    className={`crop-option ${selectedCrop === cropId ? 'crop-option-selected' : ''}`}
                    key={cropId}
                    onClick={() => onSelectCrop(cropId)}
                    disabled={!unlocked}
                  >
                    <span className="crop-option-name">
                      <CropVisual
                        cropId={cropId}
                        completedCropPerfections={
                          game.completedCropPerfections
                        }
                        className="crop-option-icon"
                      />
                      {getDisplayedCropName(cropId)}
                    </span>
                    <small>
                      {unlocked
                        ? getCropPlacementEffectDescription(
                            cropId,
                            game.completedCropPerfections,
                          )
                        : crop.unlockDescription}
                    </small>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <section
          className="blueprint-transfer-card"
          aria-labelledby="blueprint-transfer-title"
        >
          <div>
            <p className="eyebrow">Blueprint transfer</p>
            <h3 id="blueprint-transfer-title">
              Blueprint {game.activeBlueprintSlot + 1}
            </h3>
            <p>
              Export or replace only this slot. Imports must match the current{' '}
              {game.blueprint.rows}×{game.blueprint.columns} grid and your crop
              unlocks.
            </p>
          </div>
          <div className="blueprint-transfer-actions">
            <button
              type="button"
              className="primary-button"
              onClick={blueprintTransfer.onExportBlueprint}
            >
              Export blueprint
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={blueprintTransfer.onImportBlueprint}
              disabled={!blueprintTransfer.blueprintCode.trim()}
            >
              Import blueprint
            </button>
          </div>
          <label className="blueprint-code-label" htmlFor="blueprint-code">
            Blueprint code
            <textarea
              id="blueprint-code"
              className="blueprint-code-input"
              value={blueprintTransfer.blueprintCode}
              onChange={(event) =>
                blueprintTransfer.onBlueprintCodeChange(event.target.value)
              }
              placeholder="Export this slot or paste a blueprint code here"
              spellCheck="false"
            />
          </label>
          {blueprintTransfer.blueprintTransferStatus ? (
            <p
              className={`blueprint-transfer-status blueprint-transfer-status-${blueprintTransfer.blueprintTransferStatus.type}`}
              role="status"
            >
              {blueprintTransfer.blueprintTransferStatus.message}
            </p>
          ) : null}
        </section>

        {hoveredEditorCrop ? (
          <CropHoverInspector
            blueprint={game.blueprint}
            index={hoveredEditorCrop.index}
            completedCropPerfections={game.completedCropPerfections}
            rowsProducedPerSecond={rowsBuiltPerSecond}
            activeHamsters={game.hamsters}
            cursor={hoveredEditorCrop}
          />
        ) : null}

        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={onResume}>
            Resume harvest
          </button>
        </div>
      </section>
    </div>
  )
}
