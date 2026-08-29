import { memo, useEffect, useState } from 'react'
import { formatTimeSinceSave } from './uiHelpers.js'

function OptionsContent({
  numberNotation,
  onNumberNotationChange,
  suffixScientificExponent,
  onSuffixScientificExponentChange,
  manualSaveStatus,
  onSaveNow,
  lastSavedAt,
  saveCode,
  onSaveCodeChange,
  saveTransferStatus,
  hardResetClicks,
  onExportSave,
  onImportSave,
  onHardReset,
  codeEntry,
}) {
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setCurrentTime(Date.now()),
      1000,
    )

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <section className="inventions-panel options-panel" aria-labelledby="options-title">
      <p className="eyebrow">Game options</p>
      <h1 id="options-title">Options</h1>
      <article className="invention-card notation-card">
        <div>
          <p className="eyebrow">Number display</p>
          <h2>Notation</h2>
          <p>
            Choose how large values are abbreviated. Suffix notation can
            switch to scientific at your selected exponent and is always
            scientific from e3003 onward.
          </p>
        </div>
        <div className="notation-controls">
          <div
            className="notation-options"
            role="group"
            aria-label="Number notation"
          >
            <button
              type="button"
              className={`notation-option ${numberNotation === 'suffix' ? 'notation-option-active' : ''}`}
              onClick={() => onNumberNotationChange('suffix')}
              aria-pressed={numberNotation === 'suffix'}
            >
              Suffix
            </button>
            <button
              type="button"
              className={`notation-option ${numberNotation === 'scientific' ? 'notation-option-active' : ''}`}
              onClick={() => onNumberNotationChange('scientific')}
              aria-pressed={numberNotation === 'scientific'}
            >
              Scientific
            </button>
          </div>
          {numberNotation === 'suffix' ? (
            <div className="notation-threshold">
              <span>Switch suffix to scientific at</span>
              <div
                className="notation-options notation-threshold-options"
                role="group"
                aria-label="Suffix scientific threshold"
              >
                {[33, 303, 3003].map((exponent) => (
                  <button
                    type="button"
                    className={`notation-option ${suffixScientificExponent === exponent ? 'notation-option-active' : ''}`}
                    key={exponent}
                    onClick={() => onSuffixScientificExponentChange(exponent)}
                    aria-pressed={suffixScientificExponent === exponent}
                  >
                    1e{exponent}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </article>
      <article className="invention-card code-entry-card">
        <div>
          <p className="eyebrow">Codes</p>
          <h2>Enter a code</h2>
          <p>Valid codes can unlock special game features.</p>
        </div>
        <form
          className="code-entry-form"
          onSubmit={(event) => {
            event.preventDefault()
            codeEntry.onSubmitCode()
          }}
        >
          <label htmlFor="game-code">Code</label>
          <div className="code-entry-controls">
            <input
              id="game-code"
              type="text"
              value={codeEntry.codeInput}
              onChange={(event) =>
                codeEntry.onCodeInputChange(event.target.value)
              }
              placeholder="Enter a code"
              autoComplete="off"
              spellCheck="false"
            />
            <button
              type="submit"
              className="secondary-button"
              disabled={!codeEntry.codeInput.trim()}
            >
              Submit
            </button>
          </div>
        </form>
        {codeEntry.codeStatus ? (
          <p
            className={`code-entry-status code-entry-status-${codeEntry.codeStatus.type}`}
            role="status"
          >
            {codeEntry.codeStatus.message}
          </p>
        ) : null}
      </article>
      <article className="invention-card manual-save-card">
        <div>
          <p className="eyebrow">Local progress</p>
          <h2>Save game</h2>
          <p>
            The game saves automatically every 2 minutes and whenever this
            page is closed or hidden.
          </p>
          <p className="manual-save-timer">
            Last saved: {formatTimeSinceSave(lastSavedAt, currentTime)}
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={onSaveNow}
        >
          Save now
        </button>
        {manualSaveStatus ? (
          <p
            className={`save-transfer-status save-transfer-status-${manualSaveStatus.type}`}
            role="status"
          >
            {manualSaveStatus.message}
          </p>
        ) : null}
      </article>
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

function areOptionsPropsEqual(previous, next) {
  return (
    previous.numberNotation === next.numberNotation &&
    previous.suffixScientificExponent === next.suffixScientificExponent &&
    previous.lastSavedAt === next.lastSavedAt &&
    previous.manualSaveStatus === next.manualSaveStatus &&
    previous.saveCode === next.saveCode &&
    previous.saveTransferStatus === next.saveTransferStatus &&
    previous.hardResetClicks === next.hardResetClicks &&
    previous.codeEntry.codeInput === next.codeEntry.codeInput &&
    previous.codeEntry.codeStatus === next.codeEntry.codeStatus
  )
}

export const Options = memo(OptionsContent, areOptionsPropsEqual)
