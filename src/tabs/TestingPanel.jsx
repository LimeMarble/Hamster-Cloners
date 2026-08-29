import { memo } from 'react'
function TestingPanelContent({
  isVisible,
  cropMultiplierEnabled,
  hamsterEfficiencyEnabled,
  columnExpansionCount,
  maximumColumnExpansions,
  rowExpansionCount,
  maximumRowExpansions,
  onToggleVisibility,
  onToggleCropMultiplier,
  onToggleHamsterEfficiency,
  onMultiplyCurrentCrops,
  onDivideCurrentCrops,
  onGrantColumnExpansion,
  onGrantRowExpansion,
  onRevokeColumnExpansion,
  onRevokeRowExpansion,
  onSpawnCloverBundle,
  onWipeCloverEffects,
}) {
  const columnsMaxed = columnExpansionCount >= maximumColumnExpansions
  const rowsMaxed = rowExpansionCount >= maximumRowExpansions

  return (
    <div
      className={`testing-panel-shell ${
        isVisible ? 'testing-panel-shell-open' : 'testing-panel-shell-hidden'
      }`}
    >
      <button
        type="button"
        className="testing-panel-visibility-toggle"
        onClick={onToggleVisibility}
        aria-controls="testing-panel"
        aria-expanded={isVisible}
      >
        {isVisible ? 'Hide cheats' : 'Show cheats'}
      </button>

      {isVisible ? (
        <aside
          className="testing-panel"
          id="testing-panel"
          aria-labelledby="testing-panel-title"
        >
          <p className="eyebrow">Testing tools</p>
          <h2 id="testing-panel-title">Cheat panel</h2>
          <p className="testing-panel-warning">
            These controls alter this save and are intended for playtesting.
          </p>
          <div className="testing-panel-controls">
            <button
              type="button"
              className={`testing-toggle ${cropMultiplierEnabled ? 'testing-toggle-active' : ''}`}
              onClick={onToggleCropMultiplier}
              aria-pressed={cropMultiplierEnabled}
            >
              ×10 Crop production: {cropMultiplierEnabled ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className={`testing-toggle ${hamsterEfficiencyEnabled ? 'testing-toggle-active' : ''}`}
              onClick={onToggleHamsterEfficiency}
              aria-pressed={hamsterEfficiencyEnabled}
            >
              ×10 Hamster efficiency: {hamsterEfficiencyEnabled ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className="testing-action"
              onClick={onMultiplyCurrentCrops}
            >
              ×1,000 current Crops
            </button>
            <button
              type="button"
              className="testing-action"
              onClick={onDivideCurrentCrops}
            >
              /1,000 current Crops
            </button>
            <button
              type="button"
              className="testing-action"
              onClick={onGrantColumnExpansion}
              disabled={columnsMaxed}
            >
              +1 Column expansion ({columnExpansionCount}/{maximumColumnExpansions})
            </button>
            <button
              type="button"
              className="testing-action"
              onClick={onRevokeColumnExpansion}
              disabled={columnExpansionCount <= 0}
            >
              -1 Column expansion ({columnExpansionCount}/{maximumColumnExpansions})
            </button>
            <button
              type="button"
              className="testing-action"
              onClick={onGrantRowExpansion}
              disabled={rowsMaxed}
            >
              +1 Row expansion ({rowExpansionCount}/{maximumRowExpansions})
            </button>
            <button
              type="button"
              className="testing-action"
              onClick={onRevokeRowExpansion}
              disabled={rowExpansionCount <= 0}
            >
              -1 Row expansion ({rowExpansionCount}/{maximumRowExpansions})
            </button>            <button
              type="button"
              className="testing-action"
              onClick={onSpawnCloverBundle}
            >
              Spawn Clover Bundle
            </button>
            <button
              type="button"
              className="testing-action"
              onClick={onWipeCloverEffects}
            >
              Wipe active Clover effects
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  )
}

const TESTING_PANEL_DISPLAY_KEYS = [
  'isVisible',
  'cropMultiplierEnabled',
  'hamsterEfficiencyEnabled',
  'columnExpansionCount',
  'maximumColumnExpansions',
  'rowExpansionCount',
  'maximumRowExpansions',
]

function areTestingPanelPropsEqual(previous, next) {
  return TESTING_PANEL_DISPLAY_KEYS.every(
    (key) => Object.is(previous[key], next[key]),
  )
}

export const TestingPanel = memo(
  TestingPanelContent,
  areTestingPanelPropsEqual,
)
