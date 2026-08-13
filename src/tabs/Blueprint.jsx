import { getFieldsPlanted } from '../game/gameLogic.js'
import { FormattedNumber, MonocropStatus } from './ui.jsx'
import { getCropMark } from './uiHelpers.js'

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
        aria-label="Open the blueprint editor"
      >
        <span
          className="field-grid"
          style={{
            gridTemplateColumns: `repeat(${game.blueprint.columns}, minmax(54px, 1fr))`,
          }}
        >
          {game.blueprint.cells.map((crop, index) => (
            <span className={`plot ${crop ? `plot-${crop}` : ''}`} key={index}>
              {crop ? <span aria-hidden="true">{getCropMark(crop)}</span> : null}
            </span>
          ))}
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
