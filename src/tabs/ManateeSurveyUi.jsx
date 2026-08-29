import { MANATEE_RESOURCES } from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

export function SurveyTime({ seconds }) {
  if (!Number.isFinite(seconds)) {
    return <>No progress at the current Hamster Coordination</>
  }

  return (
    <>
      <FormattedNumber
        value={Math.max(0, Math.ceil(seconds))}
        maximumFractionDigits={0}
      />{' '}
      seconds
    </>
  )
}

function MarshFind({ find, onCollect }) {
  const resourceName = MANATEE_RESOURCES[find.resourceId]?.name ?? 'Resource'

  return (
    <button
      type="button"
      className={`manatee-find manatee-find-${find.kind}`}
      style={{
        left: `${find.x}%`,
        top: `${find.y}%`,
        '--find-rotation': `${find.rotation}deg`,
      }}
      onClick={() => onCollect(find.id)}
      aria-label={`Collect ${find.kind} worth ${find.amount} ${resourceName}`}
    >
      <span className="manatee-find-shape" aria-hidden="true" />
      <span className="manatee-find-value">
        +<FormattedNumber value={find.amount} maximumFractionDigits={0} />{' '}
        {resourceName}
      </span>
    </button>
  )
}

export function SurveyResults({ finds, survey, onCollectFind }) {
  const rowCount = Math.max(1, Math.ceil(finds.length / 6))

  return (
    <section
      className="manatee-marsh-results"
      aria-label={`${survey.name} results`}
    >
      <div className="manatee-results-heading">
        <div>
          <p className="eyebrow">Survey results</p>
          <h4>Collect the finds</h4>
        </div>
        <p>
          <FormattedNumber
            value={finds.length}
            maximumFractionDigits={0}
          />{' '}
          objects remain
        </p>
      </div>
      <div
        className="manatee-marsh-scene"
        style={{ minHeight: `${Math.max(350, rowCount * 82)}px` }}
      >
        <div className="manatee-marsh-water" aria-hidden="true" />
        {finds.map((find) => (
          <MarshFind key={find.id} find={find} onCollect={onCollectFind} />
        ))}
      </div>
      <p className="manatee-interaction-note">
        Select each object in the marsh to collect it.
      </p>
    </section>
  )
}

export function SurveyCropBonus({ surveyTimeEffect }) {
  if (surveyTimeEffect.activeCarrotCount <= 0) return null

  return (
    <p className="manatee-survey-crop-bonus">
      Blazing Carrots shorten this survey by{' '}
      <strong>
        <FormattedNumber
          value={surveyTimeEffect.reduction * 100}
          maximumFractionDigits={2}
        />
        %
      </strong>{' '}
      (<FormattedNumber
        value={surveyTimeEffect.contributingCarrotCount}
        maximumFractionDigits={2}
      />{' '}
      effective of <WholeNumber value={surveyTimeEffect.activeCarrotCount} />{' '}
      active).
    </p>
  )
}

export function SurveyProgress({
  allocatedHamsters,
  progress,
  remainingSeconds,
}) {
  return (
    <div className="manatee-survey-progress">
      <div className="manatee-progress-copy">
        <span>
          <WholeNumber value={allocatedHamsters} /> hamsters surveying
        </span>
        <strong>
          <SurveyTime seconds={remainingSeconds} /> remaining
        </strong>
      </div>
      <div
        className="manatee-progress-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progress * 100)}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="manatee-workforce-warning">
        Surveying hamsters still contribute their full Hamster Coordination,
        but each one is temporarily removed from Columns/sec.
      </p>
    </div>
  )
}
