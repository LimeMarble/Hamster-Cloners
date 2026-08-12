export function Options({
  saveCode,
  onSaveCodeChange,
  saveTransferStatus,
  hardResetClicks,
  onExportSave,
  onImportSave,
  onHardReset,
}) {
  return (
    <section className="inventions-panel options-panel" aria-labelledby="options-title">
      <p className="eyebrow">Game options</p>
      <h1 id="options-title">Options</h1>
      <article className="invention-card save-transfer-card">
        <div>
          <p className="eyebrow">Save transfer</p>
          <h2>Export or import save data</h2>
          <p>
            Your progress is stored locally as a Base64 save code. Export it
            before changing browsers or devices; importing replaces this
            browser&apos;s current progress.
          </p>
        </div>
        <div className="save-transfer-controls">
          <button type="button" className="primary-button" onClick={onExportSave}>
            Export save
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onImportSave}
            disabled={!saveCode.trim()}
          >
            Import save
          </button>
        </div>
        <label className="save-code-label" htmlFor="save-code">
          Save code
          <textarea
            id="save-code"
            className="save-code-input"
            value={saveCode}
            onChange={(event) => onSaveCodeChange(event.target.value)}
            placeholder="Export a save or paste a Base64 save code here"
            spellCheck="false"
          />
        </label>
        {saveTransferStatus ? (
          <p
            className={`save-transfer-status save-transfer-status-${saveTransferStatus.type}`}
            role="status"
          >
            {saveTransferStatus.message}
          </p>
        ) : null}
      </article>
      <article className="invention-card hard-reset-card">
        <div>
          <p className="eyebrow">Irreversible</p>
          <h2>Hard Reset</h2>
          <p>
            Completely erase all local progress and return to the beginning.
            This has no reward.
          </p>
        </div>
        <button type="button" className="hard-reset-button" onClick={onHardReset}>
          {hardResetClicks === 0
            ? 'Hard reset'
            : `Hard reset — click 5 times within 4 seconds (${hardResetClicks}/5)`}
        </button>
      </article>
    </section>
  )
}
