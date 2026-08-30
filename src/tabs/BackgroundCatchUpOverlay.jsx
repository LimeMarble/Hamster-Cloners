import {
  CATCH_UP_SPEED_FACTOR,
  SKIPPED_CATCH_UP_STEPS,
} from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

export function BackgroundCatchUpOverlay({
  ticksRemaining,
  remainingSeconds,
  totalSeconds,
  compressionMultiplier,
  strategy,
  isPreparing = false,
  onCompress,
  onSkip,
}) {
  const progress =
    totalSeconds > 0
      ? Math.max(0, Math.min(1, 1 - remainingSeconds / totalSeconds))
      : 1
  const progressPercent = progress * 100
  const canSkip = !isPreparing && ticksRemaining > SKIPPED_CATCH_UP_STEPS

  return (
    <div className="background-catch-up-overlay">
      <section
        className="background-catch-up-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="background-catch-up-title"
        aria-describedby="background-catch-up-description"
      >
        <p className="eyebrow">Welcome back</p>
        <h2 id="background-catch-up-title">
          {isPreparing ? 'Preparing catch-up' : 'Processing background ticks'}
        </h2>

        <div className="background-catch-up-counter" aria-live="polite">
          <strong><WholeNumber value={ticksRemaining} /></strong>
          <span>ticks left to process</span>
        </div>

        <div
          className="background-catch-up-track"
          role="progressbar"
          aria-label="Background calculation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
        >
          <span style={{ width: progressPercent + '%' }} />
        </div>

        <p className="background-catch-up-compression">
          {isPreparing ? (
            <>Loading the saved simulation state…</>
          ) : strategy === 'skipped' ? (
            <>The remaining time is being approximated in <WholeNumber value={SKIPPED_CATCH_UP_STEPS} /> ticks.</>
          ) : (
            <>Current catch-up compression: ×<FormattedNumber value={compressionMultiplier} maximumFractionDigits={0} /></>
          )}
        </p>
        <p id="background-catch-up-description">
          Larger compression processes the same missed time with fewer, broader
          simulation steps. This finishes sooner, but per-tick events are less
          exact.
        </p>

        <div className="background-catch-up-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={isPreparing}
            onClick={onCompress}
          >
            Speed up ×{CATCH_UP_SPEED_FACTOR}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!canSkip}
            onClick={onSkip}
          >
            Skip to{' '}
            <WholeNumber value={SKIPPED_CATCH_UP_STEPS} /> ticks
          </button>
        </div>
      </section>
    </div>
  )
}
