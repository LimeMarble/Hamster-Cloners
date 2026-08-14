export function GameHeader() {
  return (
    <header className="topbar">
      <a className="brand" href="#main" aria-label="Hamster Cloners home">
        <span className="brand-mark" aria-hidden="true">H</span>
        <span>Hamster Cloners</span>
      </a>
      <span className="save-status">Saved locally</span>
    </header>
  )
}

export function GameNavigation({
  activeTab,
  areInventionsUnlocked,
  showInventionsUnlockPrompt,
  inventionsUnlockCount,
  isTradeTabVisible,
  onShowField,
  onOpenInventions,
  onShowTrade,
  onShowStatistics,
  onOpenOptions,
}) {
  return (
    <nav className="game-tabs" aria-label="Game sections">
      <button
        type="button"
        className={`game-tab ${activeTab === 'field' ? 'game-tab-active' : ''}`}
        onClick={onShowField}
      >
        Field
      </button>
      <div className="inventions-tab-wrap">
        <button
          type="button"
          className={`game-tab ${activeTab === 'inventions' ? 'game-tab-active' : ''}`}
          onClick={onOpenInventions}
          disabled={!areInventionsUnlocked}
          title={
            areInventionsUnlocked
              ? 'View inventions'
              : `Unlocks after ${inventionsUnlockCount} Hamsters`
          }
        >
          Inventions
        </button>
        {showInventionsUnlockPrompt ? (
          <aside
            className="inventions-unlock-callout"
            role="status"
            aria-live="polite"
          >
            <strong>Inventions unlocked!</strong>
            <span>Visit this tab to discover your first milestone reset.</span>
          </aside>
        ) : null}
      </div>
      {isTradeTabVisible ? (
        <button
          type="button"
          className={`game-tab ${activeTab === 'trade' ? 'game-tab-active' : ''}`}
          onClick={onShowTrade}
        >
          Trade
        </button>
      ) : null}
      <button
        type="button"
        className={`game-tab ${activeTab === 'statistics' ? 'game-tab-active' : ''}`}
        onClick={onShowStatistics}
      >
        Statistics
      </button>
      <button
        type="button"
        className={`game-tab ${activeTab === 'options' ? 'game-tab-active' : ''}`}
        onClick={onOpenOptions}
      >
        Options
      </button>
    </nav>
  )
}
