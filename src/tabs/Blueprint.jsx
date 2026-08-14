import { getFieldsPlanted } from '../game/gameLogic.js'
import { getCropName } from '../game/crops.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber, MonocropStatus } from './ui.jsx'
import { getBlueprintCropSummary } from './uiHelpers.js'

export function Blueprint({
  game,
  showMonocropLimit,
  monocropLimit,
  monocropPenaltyMultiplier,
  blueprintSlots,
  unlockedBlueprintSlotCount,
  onSelectBlueprintSlot,
  onOpenEditor,
}) {
  const plantedCrops = getBlueprintCropSummary(game.blueprint.cells)
  const plantedCropDescription =
    plantedCrops.length > 0
      ? plantedCrops
          .map(
            ({ cropId, count }) =>
              `${getCropName(cropId, game.completedCropPerfections)}: ${count}`,
          )
          .join(', ')
      : 'empty blueprint'

  return (
    <article className="field-card">
      <div className="section-heading blueprint-heading">
        <div>
          <p className="eyebrow">Blueprint</p>
          <h2>Your clonable field</h2>
        </div>
        {showMonocropLimit ? (
          <MonocropStatus
            limit={monocropLimit}
            multiplier={monocropPenaltyMultiplier}
          />
        ) : null}
        <span className="size-pill">
          {game.blueprint.rows} × {game.blueprint.columns}
        </span>
      </div>

      <nav className="blueprint-slots" aria-label="Blueprint slots">
        {(game.hasUnlockedKnotweed ? [0, 1, 2] : [0, 1]).map((slotIndex) => {
          const unlocked =
            slotIndex < unlockedBlueprintSlotCount &&
            Boolean(blueprintSlots[slotIndex])
          const active = game.activeBlueprintSlot === slotIndex
          const unlockHint =
            slotIndex === 1 ? 'Unlocks with Potato' : 'Unlocks with Sunflower'

          return (
            <button
              type="button"
              className={`blueprint-slot ${active ? 'blueprint-slot-active' : ''}`}
              key={slotIndex}
              onClick={() => onSelectBlueprintSlot(slotIndex)}
              disabled={!unlocked}
              aria-label={
                unlocked
                  ? `Select Blueprint ${slotIndex + 1}`
                  : `Blueprint ${slotIndex + 1}: ${unlockHint}`
              }
            >
              {unlocked
                ? `Blueprint ${slotIndex + 1}`
                : `Locked · ${unlockHint}`}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        className="blueprint-preview"
        onClick={onOpenEditor}
        aria-label={`Open the blueprint editor. ${plantedCropDescription}`}
      >
        <span className="blueprint-crop-summary">
          {plantedCrops.length > 0 ? (
            plantedCrops.map(({ cropId, count }) => {
              const cropName = getCropName(
                cropId,
                game.completedCropPerfections,
              )

              return (
                <span
                  className={`blueprint-crop-chip plot-${cropId}`}
                  key={cropId}
                  title={`${cropName}: ${count} planted`}
                >
                  <CropVisual
                    cropId={cropId}
                    completedCropPerfections={
                      game.completedCropPerfections
                    }
                    className="blueprint-crop-icon"
                  />
                  <span
                    className="blueprint-crop-count"
                    aria-label={`${cropName}: ${count} planted`}
                  >
                    ×<FormattedNumber value={count} maximumFractionDigits={0} />
                  </span>
                </span>
              )
            })
          ) : (
            <span className="blueprint-empty-summary">Empty blueprint</span>
          )}
        </span>
        <span className="edit-hint">Click field to edit blueprint</span>
      </button>

      <dl className="field-stats">
        <div>
          <dt>Fields planted</dt>
          <dd>
            <FormattedNumber value={getFieldsPlanted(game.farmland)} maximumFractionDigits={0} />
          </dd>
        </div>
        {game.hasUnlockedRowDuplicators ? (
          <>
            <div>
              <dt>Columns built</dt>
              <dd>
                <FormattedNumber value={Math.floor(game.farmland.columns)} maximumFractionDigits={0} />
              </dd>
            </div>
            <div>
              <dt>Rows built</dt>
              <dd>
                <FormattedNumber value={Math.floor(game.farmland.rows)} maximumFractionDigits={0} />
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </article>
  )
}
