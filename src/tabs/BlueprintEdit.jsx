import { memo } from 'react'
import {
  getCropName,
  getCropPlacementEffectDescription,
  getCropUnlockDescription,
} from '../game/crops.js'
import {
  getMirrorCornMaximumReflections,
  isBlazingCarrotBurned,
  isWaterLettuceFieldInfested,
} from '../game/gameLogic.js'
import {
  CropHoverInspector,
  FormattedNumber,
  MirrorCornConnectionLines,
  MonocropStatus,
} from './ui.jsx'
import { CropVisual } from './CropVisual.jsx'
import {
  RootTunnelConnectionLines,
  RootTunnelEditorPanel,
} from './RootTunnelEditor.jsx'

function BlueprintEditContent({
  game,
  fieldIncomePerSecond,
  hamsterEfficiencyMultiplier,
  duplicatorEfficiencyMultiplier,
  selectedCrop,
  onSelectCrop,
  pendingMirrorCornPlacement,
  hoveredEditorCrop,
  visibleCropIds,
  unlockedCropIds,
  rowsBuiltPerSecond,
  rabbitContractsCompleted,
  showMonocropLimit,
  monocropLimit,
  monocropPenaltyMultiplier,
  mirrorCornLinks,
  pendingMirrorCornLinks,
  hasMirrorCorn,
  rootTunnelEditor,
  getDisplayedCropName,
  onClose,
  onResume,
  onClearBlueprint,
  onEditorPlotClick,
  onEditorPlotContextMenu,
  blueprintTransfer,
  onUpdateHoveredEditorCrop,
  onClearHoveredEditorCrop,
}) {
  const safeMirrorCornReflectionLimit = getMirrorCornMaximumReflections(
    game.seedAugmentations,
  )
  const revealManateeEffects =
    game.capybara?.completedDemonstrations?.includes(
      'demonstrationOne',
    ) === true
  const fieldInfested = isWaterLettuceFieldInfested(game.blueprint)

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

        <dl className="field-stats blueprint-editor-income">
          <div>
            <dt>Field income / sec</dt>
            <dd>
              <FormattedNumber value={fieldIncomePerSecond} /> Crops
            </dd>
          </div>
          <div>
            <dt>Hamster efficiency</dt>
            <dd>
              ×<FormattedNumber value={hamsterEfficiencyMultiplier} maximumFractionDigits={2} />
            </dd>
          </div>
          {game.hasUnlockedSunflower ? (
            <div>
              <dt>Duplicator efficiency</dt>
              <dd>
                ×<FormattedNumber value={duplicatorEfficiencyMultiplier} maximumFractionDigits={2} />
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="editing-notice">
          Harvesting is paused while you modify this blueprint. Right-click a
          planted crop to remove it. Select a Root Tunnel to configure it;
          tunnels can only be removed from their configuration panel.
        </p>

        {pendingMirrorCornPlacement ? (
          <p className="mirror-corn-notice">
            Choose one yellow-lined diagonal tile to target. Click the pending
            Mirror Corn tile again to cancel.
          </p>
        ) : hasMirrorCorn && selectedCrop === 'corn' ? (
          <p className="mirror-corn-notice">
            Place Mirror Corn where it has a diagonal tile, then choose that
            tile. The link remains when its crop changes. A tile safely takes
            up to {safeMirrorCornReflectionLimit} reflections; exceeding that
            destroys its harvest and every passive effect.
          </p>
        ) : null}

        <RootTunnelEditorPanel
          blueprint={game.blueprint}
          completedCropPerfections={game.completedCropPerfections}
          editor={rootTunnelEditor}
        />

        <div className="blueprint-editor-layout">
          <div className="editor-grid-scroll">
            <div
              className="editor-grid-wrapper"
              style={{ minWidth: `${game.blueprint.columns * 64}px` }}
            >
            <MirrorCornConnectionLines
              blueprint={game.blueprint}
              links={mirrorCornLinks}
            />
            <MirrorCornConnectionLines
              blueprint={game.blueprint}
              links={pendingMirrorCornLinks}
              pending
            />
            <RootTunnelConnectionLines blueprint={game.blueprint} />
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
                const isBurnedBlazingCarrot = isBlazingCarrotBurned(
                  game.blueprint,
                  index,
                  game.completedCropPerfections,
                )
                const isSelectedRootTunnel =
                  rootTunnelEditor.selectedTunnelIndex === index
                const isSelectedRootSender =
                  rootTunnelEditor.connectionDraft?.senderIndex === index
                const isValidRootSender =
                  rootTunnelEditor.validSenderIndexes.includes(index)
                const isValidRootRecipient =
                  rootTunnelEditor.validRecipientIndexes.includes(index)

                return (
                  <button
                    type="button"
                    className={`editor-plot ${crop ? `editor-plot-${crop}` : ''} ${isPendingMirrorCornSource ? 'editor-plot-mirror-source' : ''} ${isPendingMirrorCornTarget ? 'editor-plot-mirror-target' : ''} ${isBurnedBlazingCarrot ? 'editor-plot-blazing-carrot-burned' : ''} ${fieldInfested && crop ? 'editor-plot-water-lettuce-infested' : ''} ${isSelectedRootTunnel ? 'editor-plot-root-selected' : ''} ${isSelectedRootSender ? 'editor-plot-root-sender-selected' : ''} ${isValidRootSender ? 'editor-plot-root-sender-option' : ''} ${isValidRootRecipient ? 'editor-plot-root-recipient-option' : ''}`}
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
                        : crop === 'rootTunnel'
                          ? 'Configure this Root Tunnel'
                        : isValidRootSender
                          ? `Use ${getCropName(crop, game.completedCropPerfections)} as the Root Tunnel sender`
                        : isValidRootRecipient
                          ? `Use ${getCropName(crop, game.completedCropPerfections)} as the Root Tunnel recipient`
                        : crop === 'leechingGourd' || crop === 'leechingGourdPart'
                          ? 'Remove Leeching Gourd from blueprint'
                          : crop === 'splitweedPart' ||
                              (crop === 'knotweed' &&
                                game.completedCropPerfections.includes('splitweed'))
                            ? 'Remove Splitweed from blueprint'
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
          </div>

          <div className="crop-palette" aria-label="Crop selection">
            <p className="eyebrow">Selected crop</p>
            <div className="crop-options">
              {visibleCropIds.map((cropId) => {
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
                            game.seedAugmentations,
                            revealManateeEffects,
                          )
                        : getCropUnlockDescription(cropId)}
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
              Blueprint <FormattedNumber value={game.activeBlueprintSlot + 1} maximumFractionDigits={0} />
            </h3>
            <p>
              Export or replace only this slot. The current grid is{' '}
              <FormattedNumber value={game.blueprint.rows} maximumFractionDigits={0} />×<FormattedNumber value={game.blueprint.columns} maximumFractionDigits={0} />;
              imported blueprints are cropped or padded from the top-left and
              must use your unlocked Crops.
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
            rabbitContractsCompleted={rabbitContractsCompleted}
            totalRabbitRelationsEarned={
              game.trade?.totalRabbitRelationsEarned ?? 0
            }
            revealManateeEffects={revealManateeEffects}
            fortune={game.fortune}
            seedAugmentations={game.seedAugmentations}
            cursor={hoveredEditorCrop}
          />
        ) : null}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button blueprint-clear-button"
            onClick={onClearBlueprint}
            disabled={!game.blueprint.cells.some(Boolean)}
          >
            Clear blueprint
          </button>
          <button type="button" className="primary-button" onClick={onResume}>
            Resume harvest
          </button>
        </div>
      </section>
    </div>
  )
}

function areBlueprintEditorPropsEqual(previous, next) {
  const previousGame = previous.game
  const nextGame = next.game
  const previousTransfer = previous.blueprintTransfer
  const nextTransfer = next.blueprintTransfer

  return (
    previousGame.blueprint === nextGame.blueprint &&
    previousGame.completedCropPerfections ===
      nextGame.completedCropPerfections &&
    previousGame.seedAugmentations === nextGame.seedAugmentations &&
    previousGame.numberNotation === nextGame.numberNotation &&
    previousGame.suffixScientificExponent ===
      nextGame.suffixScientificExponent &&
    previousGame.fortune === nextGame.fortune &&
    previousGame.hasUnlockedSunflower === nextGame.hasUnlockedSunflower &&
    previousGame.activeBlueprintSlot === nextGame.activeBlueprintSlot &&
    previousGame.hamsters === nextGame.hamsters &&
    Object.is(previous.fieldIncomePerSecond, next.fieldIncomePerSecond) &&
    Object.is(
      previous.hamsterEfficiencyMultiplier,
      next.hamsterEfficiencyMultiplier,
    ) &&
    Object.is(
      previous.duplicatorEfficiencyMultiplier,
      next.duplicatorEfficiencyMultiplier,
    ) &&
    previous.selectedCrop === next.selectedCrop &&
    previous.pendingMirrorCornPlacement ===
      next.pendingMirrorCornPlacement &&
    previous.hoveredEditorCrop === next.hoveredEditorCrop &&
    previous.visibleCropIds === next.visibleCropIds &&
    previous.unlockedCropIds === next.unlockedCropIds &&
    Object.is(previous.rowsBuiltPerSecond, next.rowsBuiltPerSecond) &&
    previous.rabbitContractsCompleted === next.rabbitContractsCompleted &&
    previous.showMonocropLimit === next.showMonocropLimit &&
    Object.is(previous.monocropLimit, next.monocropLimit) &&
    Object.is(
      previous.monocropPenaltyMultiplier,
      next.monocropPenaltyMultiplier,
    ) &&
    previous.mirrorCornLinks === next.mirrorCornLinks &&
    previous.pendingMirrorCornLinks === next.pendingMirrorCornLinks &&
    previous.hasMirrorCorn === next.hasMirrorCorn &&
    previous.rootTunnelEditor.selectedTunnelIndex ===
      next.rootTunnelEditor.selectedTunnelIndex &&
    previous.rootTunnelEditor.connectionDraft ===
      next.rootTunnelEditor.connectionDraft &&
    previous.rootTunnelEditor.connectionState ===
      next.rootTunnelEditor.connectionState &&
    previous.rootTunnelEditor.validSenderIndexes ===
      next.rootTunnelEditor.validSenderIndexes &&
    previous.rootTunnelEditor.validRecipientIndexes ===
      next.rootTunnelEditor.validRecipientIndexes &&
    previousTransfer.blueprintCode === nextTransfer.blueprintCode &&
    previousTransfer.blueprintTransferStatus ===
      nextTransfer.blueprintTransferStatus
  )
}

export const BlueprintEdit = memo(
  BlueprintEditContent,
  areBlueprintEditorPropsEqual,
)
