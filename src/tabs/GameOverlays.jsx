import { BlueprintEdit } from './BlueprintEdit.jsx'
import { CloverFortune } from './CloverFortune.jsx'
import { TestingPanel } from './TestingPanel.jsx'

function MonocropWarning({ onClose }) {
  return (
    <div className="modal-backdrop monocrop-warning-backdrop" role="presentation">
      <section
        className="monocrop-warning-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="monocrop-warning-title"
      >
        <p className="eyebrow">Field warning</p>
        <h2 id="monocrop-warning-title">Monocrop limit reached</h2>
        <p>
          One crop has reached the monocrop limit for this field, reducing its
          yield.
        </p>
        <p>
          The penalty also weakens positive crop buffs and makes crop debuffs
          stronger. Mix in other crops to keep your field productive.
        </p>
        <button type="button" className="primary-button" onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  )
}

function BlueprintMastery({ onClose }) {
  return (
    <div className="modal-backdrop blueprint-mastery-backdrop" role="presentation">
      <section
        className="blueprint-mastery-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blueprint-mastery-title"
      >
        <div className="blueprint-mastery-flowers" aria-hidden="true">
          <span>🌻</span>
          <span>🌻</span>
          <span>🌻</span>
        </div>
        <p className="eyebrow">Blueprint mastery</p>
        <h2 id="blueprint-mastery-title">Every expansion is complete!</h2>
        <p>
          Your blueprint has reached its full Row and Column potential. Every
          future field can now grow within this finished design.
        </p>
        <button type="button" className="primary-button" onClick={onClose}>
          Keep farming
        </button>
      </section>
    </div>
  )
}

function UnionConfirmation({ onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="union-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="union-title"
      >
        <p className="eyebrow">A workforce decision</p>
        <h2 id="union-title">The hamsters are ready to unionize.</h2>
        <p>
          Hiring this 1,000th hamster will cause 900 hamsters to leave. The 100
          who remain will continue working, but future hires must follow the
          union&apos;s growing hiring costs.
        </p>
        <p>
          Once you make a post-union hire, the organized workforce may find a
          faster way to work.
        </p>
        <div className="union-modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Not yet
          </button>
          <button type="button" className="primary-button" onClick={onConfirm}>
            Comply &amp; hire the 1,000th
          </button>
        </div>
      </section>
    </div>
  )
}

export function GameOverlays({
  blueprintEditor,
  monocropWarning,
  blueprintMastery,
  unionConfirmation,
  testingPanel,
  fortune,
}) {
  return (
    <>
      {blueprintEditor ? <BlueprintEdit {...blueprintEditor} /> : null}
      {testingPanel ? <TestingPanel {...testingPanel} /> : null}
      <CloverFortune {...fortune} />
      {monocropWarning.isOpen ? (
        <MonocropWarning onClose={monocropWarning.onClose} />
      ) : null}
      {blueprintMastery.isOpen ? (
        <BlueprintMastery onClose={blueprintMastery.onClose} />
      ) : null}
      {unionConfirmation.isOpen ? (
        <UnionConfirmation
          onCancel={unionConfirmation.onCancel}
          onConfirm={unionConfirmation.onConfirm}
        />
      ) : null}
    </>
  )
}
