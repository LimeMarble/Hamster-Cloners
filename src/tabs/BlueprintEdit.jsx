import {
  CROP_DEFINITIONS,
  getCropName,
  getCropPlacementEffectDescription,
} from '../game/crops.js'
import {
  CropHoverInspector,
  MirrorCornConnectionLines,
} from './ui.jsx'
import { getCropMark } from './uiHelpers.js'

export function BlueprintEdit({
  game,
  selectedCrop,
  onSelectCrop,
  pendingMirrorCornPlacement,
  hoveredEditorCrop,
  visibleCropIds,
  unlockedCropIds,
  mirrorCornLinks,
  pendingMirrorCornLinks,
  hasMirrorCorn,
  getDisplayedCropName,
  onClose,
  onResume,
  onEditorPlotClick,
  onEditorPlotContextMenu,
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
            tile. The link remains when its crop changes.
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
                      <span aria-hidden="true">{getCropMark(crop)}</span>
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
                      <span className="crop-option-icon" aria-hidden="true">
                        {crop.icon}
                      </span>
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

        {hoveredEditorCrop ? (
          <CropHoverInspector
            blueprint={game.blueprint}
            index={hoveredEditorCrop.index}
            completedCropPerfections={game.completedCropPerfections}
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
