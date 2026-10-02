import { memo } from 'react'
import {
  BLUEPRINT_SLOT_UNLOCK_HINTS,
  CAPYBARA_DEMONSTRATION_IDS,
  canRestartFields,
  getFieldsPlanted,
  hasCompletedCapybaraDemonstration,
  isWaterLettuceFieldInfested,
} from '../game/gameLogic.js'
import { getCropName, hasVisitedMisfortune } from '../game/crops.js'
import {
  getPercentageGainPerSecond,
  getProductPercentageGainPerSecond,
} from '../game/fieldGrowth.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber, MonocropStatus, PercentageGain } from './ui.jsx'
import { getBlueprintCropSummary } from './uiHelpers.js'

const FIELD_UNIT_KEYS = ['rows', 'columns', 'floors', 'farms']

function FieldUnitStat({ label, value, producedPerSecond }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <FormattedNumber value={value} maximumFractionDigits={0} />
        <PercentageGain
          value={getPercentageGainPerSecond(value, producedPerSecond)}
        />
      </dd>
    </div>
  )
}

function BlueprintPanel({
  game,
  fieldIncomePerSecond,
  columnsBuiltPerSecond,
  rowsBuiltPerSecond,
  floorsBuiltPerSecond,
  showMonocropLimit,
  monocropLimit,
  monocropPenaltyMultiplier,
  blueprintSlots,
  unlockedBlueprintSlotCount,
  visibleCropIds,
  onSelectBlueprintSlot,
  onOpenEditor,
  onRestartFields,
}) {
  const unitRates = {
    columns: columnsBuiltPerSecond,
    rows: rowsBuiltPerSecond,
    floors: floorsBuiltPerSecond,
    farms: 0,
  }
  const fieldsGainPerSecond = getProductPercentageGainPerSecond(
    FIELD_UNIT_KEYS.map((key) => ({
      current: getFlooredFarmlandValue(game, key),
      producedPerSecond: unitRates[key],
    })),
  )
  const visibleFieldUnits = [
    { key: 'columns', label: 'Columns built', visible: game.hasUnlockedRowDuplicators },
    { key: 'rows', label: 'Rows built', visible: game.hasUnlockedRowDuplicators },
    { key: 'floors', label: 'Floors built', visible: game.hasUnlockedFloorReplicators },
  ]
  const plantedCrops = getBlueprintCropSummary(game.blueprint.cells)
  const fieldInfested = isWaterLettuceFieldInfested(game.blueprint)
  const hasUnlockedManatees = hasCompletedCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
  )
  const visibleBlueprintSlotCount = hasUnlockedManatees
    ? BLUEPRINT_SLOT_UNLOCK_HINTS.length
    : visibleCropIds.includes('soybean')
      ? 4
      : game.hasUnlockedKnotweed
        ? 3
        : 2
  const visibleBlueprintSlotIndexes = Array.from(
    { length: visibleBlueprintSlotCount },
    (_, slotIndex) => slotIndex,
  ).filter((slotIndex) =>
    slotIndex !== 3 || slotIndex < unlockedBlueprintSlotCount || hasVisitedMisfortune(game),
  )
  const plantedCropDescription =
    plantedCrops.length > 0
      ? plantedCrops
          .map(
            ({ cropId, count }) =>
              `${cropId === 'fourLeafClover' && game.cloverAssembly?.assembled === true
                ? '5-Leaf Clover'
                : getCropName(cropId, game.completedCropPerfections)}: ${count}`,
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
          <FormattedNumber value={game.blueprint.rows} maximumFractionDigits={0} /> ×{' '}
          <FormattedNumber value={game.blueprint.columns} maximumFractionDigits={0} />
        </span>
      </div>

      <nav className="blueprint-slots" aria-label="Blueprint slots">
        {visibleBlueprintSlotIndexes.map((slotIndex) => {
          const unlocked =
            slotIndex < unlockedBlueprintSlotCount &&
            Boolean(blueprintSlots[slotIndex])
          const active = game.activeBlueprintSlot === slotIndex
          const unlockHint = BLUEPRINT_SLOT_UNLOCK_HINTS[slotIndex]

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
              const cropName = cropId === 'fourLeafClover' &&
                game.cloverAssembly?.assembled === true
                  ? '5-Leaf Clover'
                  : getCropName(cropId, game.completedCropPerfections)

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

      {fieldInfested ? (
        <p className="water-lettuce-infestation-warning">
          Field infested: planting more than 11 Water Lettuces disables every
          harvest and Crop passive in this blueprint.
        </p>
      ) : null}

      <dl className="field-stats">
        <div>
          <dt>Field income / sec</dt>
          <dd>
            <FormattedNumber value={fieldIncomePerSecond} /> Crops
          </dd>
        </div>
        <div>
          <dt>Fields planted</dt>
          <dd>
            <FormattedNumber value={getFieldsPlanted(game.farmland)} maximumFractionDigits={0} />
            <PercentageGain value={fieldsGainPerSecond} />
          </dd>
        </div>
        {visibleFieldUnits.filter(({ visible }) => visible).map(({ key, label }) => (
          <FieldUnitStat
            key={key}
            label={label}
            value={getFlooredFarmlandValue(game, key)}
            producedPerSecond={unitRates[key]}
          />
        ))}
      </dl>
      {canRestartFields(game) ? (
        <div className="field-restart-controls">
          <button type="button" className="secondary-button" onClick={onRestartFields}>
            Restart Fields
          </button>
          <p>
            Reset this area&apos;s Crops and field growth. Keep machinery,
            blueprints and unlocks; restart Rushed Start.
          </p>
        </div>
      ) : null}
    </article>
  )
}

function getFlooredFarmlandValue(game, key) {
  return Math.floor(Math.max(0, Number(game.farmland?.[key]) || 0))
}

function areBlueprintPropsEqual(previous, next) {
  const previousGame = previous.game
  const nextGame = next.game

  return (
    Object.is(previous.fieldIncomePerSecond, next.fieldIncomePerSecond) &&
    Object.is(previous.columnsBuiltPerSecond, next.columnsBuiltPerSecond) &&
    Object.is(previous.rowsBuiltPerSecond, next.rowsBuiltPerSecond) &&
    Object.is(previous.floorsBuiltPerSecond, next.floorsBuiltPerSecond) &&
    previous.showMonocropLimit === next.showMonocropLimit &&
    Object.is(previous.monocropLimit, next.monocropLimit) &&
    Object.is(
      previous.monocropPenaltyMultiplier,
      next.monocropPenaltyMultiplier,
    ) &&
    previous.blueprintSlots === next.blueprintSlots &&
    previous.unlockedBlueprintSlotCount ===
      next.unlockedBlueprintSlotCount &&
    previous.visibleCropIds === next.visibleCropIds &&
    previousGame.blueprint === nextGame.blueprint &&
    previousGame.completedCropPerfections ===
      nextGame.completedCropPerfections &&
    previousGame.numberNotation === nextGame.numberNotation &&
    previousGame.suffixScientificExponent ===
      nextGame.suffixScientificExponent &&
    previousGame.activeBlueprintSlot === nextGame.activeBlueprintSlot &&
    previousGame.hasUnlockedKnotweed === nextGame.hasUnlockedKnotweed &&
    canRestartFields(previousGame) === canRestartFields(nextGame) &&
    hasVisitedMisfortune(previousGame) === hasVisitedMisfortune(nextGame) &&
    hasCompletedCapybaraDemonstration(
      previousGame,
      CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
    ) ===
      hasCompletedCapybaraDemonstration(
        nextGame,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
      ) &&
    previousGame.hasUnlockedRowDuplicators ===
      nextGame.hasUnlockedRowDuplicators &&
    previousGame.hasUnlockedFloorReplicators ===
      nextGame.hasUnlockedFloorReplicators &&
    ['rows', 'columns', 'floors', 'farms'].every(
      (key) =>
        getFlooredFarmlandValue(previousGame, key) ===
        getFlooredFarmlandValue(nextGame, key),
    )
  )
}

export const Blueprint = memo(BlueprintPanel, areBlueprintPropsEqual)
