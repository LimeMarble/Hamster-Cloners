import { useState } from 'react'
import { FormattedNumber, WholeNumber } from './ui.jsx'

export function MajorProgressionBar({ goal }) {
  const [isMinimized, setIsMinimized] = useState(false)
  const progressPercent = Math.max(
    0,
    Math.min(100, (Number(goal.progress) || 0) * 100),
  )
  const valuesClassName =
    'major-progression-values' +
    (goal.isReady ? ' major-progression-ready' : '')
  const barClassName =
    'major-progression-bar' +
    (isMinimized ? ' major-progression-bar-minimized' : '')
  const usesWholeNumberCounters = [
    'Hamsters',
    'Hamsters hired',
    'Row Duplicators',
  ].includes(goal.unit)

  return (
    <aside className={barClassName} aria-label="Major progression">
      <button
        type="button"
        className="major-progression-toggle"
        aria-label={
          isMinimized
            ? 'Show major progression bar'
            : 'Minimize major progression bar'
        }
        aria-expanded={!isMinimized}
        title={
          isMinimized
            ? 'Show major progression bar'
            : 'Minimize major progression bar'
        }
        onClick={() => setIsMinimized((wasMinimized) => !wasMinimized)}
      />

      {!isMinimized && (
        <>
          <div className="major-progression-heading">
            <div>
              <span className="major-progression-category">
                {goal.isComplete
                  ? 'Major progression'
                  : 'Next major goal · ' + goal.category}
              </span>
              <strong aria-live="polite">{goal.title}</strong>
            </div>
            <span className={valuesClassName}>
              {goal.isComplete ? (
                'Complete'
              ) : goal.isReady ? (
                'Ready to unlock'
              ) : goal.displayProgressAsDash ? (
                '-'
              ) : (
                <>
                  {usesWholeNumberCounters ? (
                    <WholeNumber value={goal.current} />
                  ) : (
                    <FormattedNumber value={goal.current} />
                  )}{' '}
                  /{' '}
                  {usesWholeNumberCounters ? (
                    <WholeNumber value={goal.target} />
                  ) : (
                    <FormattedNumber value={goal.target} />
                  )}{' '}
                  {goal.unit}
                </>
              )}
            </span>
          </div>

          <div
            className="major-progression-track"
            role="progressbar"
            aria-label={goal.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent * 10) / 10}
          >
            <span style={{ width: progressPercent + '%' }} />
          </div>

          <p>{goal.description}</p>
        </>
      )}
    </aside>
  )
}
