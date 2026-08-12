export function TestingPanel({
  cropMultiplierEnabled,
  hamsterEfficiencyEnabled,
  columnExpansionCount,
  maximumColumnExpansions,
  rowExpansionCount,
  maximumRowExpansions,
  onToggleCropMultiplier,
  onToggleHamsterEfficiency,
  onMultiplyCurrentCrops,
  onGrantColumnExpansion,
  onGrantRowExpansion,
}) {
  const columnsMaxed = columnExpansionCount >= maximumColumnExpansions
  const rowsMaxed = rowExpansionCount >= maximumRowExpansions

  return (
    <aside className="testing-panel" aria-labelledby="testing-panel-title">
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
          onClick={onGrantColumnExpansion}
          disabled={columnsMaxed}
        >
          +1 Column expansion ({columnExpansionCount}/{maximumColumnExpansions})
        </button>
        <button
          type="button"
          className="testing-action"
          onClick={onGrantRowExpansion}
          disabled={rowsMaxed}
        >
          +1 Row expansion ({rowExpansionCount}/{maximumRowExpansions})
        </button>
      </div>
    </aside>
  )
}
