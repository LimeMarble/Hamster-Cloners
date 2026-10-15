import { useEffect, useRef } from 'react'
import {
  MANATEE_DEVELOPMENT_GOALS,
  MANATEE_RESOURCES,
} from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'
import { createSurveyFindCollector } from './surveyFindCollection.js'

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

function MarshFind({ find, onCollect, onHoldStart }) {
  const resourceName =
    MANATEE_RESOURCES[find.resourceId]?.name ??
    MANATEE_DEVELOPMENT_GOALS[find.developmentGoalId]?.progressUnit ??
    'Progress'
  const findName = find.kind.replaceAll('-', ' ')

  return (
    <button
      type="button"
      className={`manatee-find manatee-find-${find.kind}`}
      data-manatee-find-id={find.id}
      style={{
        left: `${find.x}%`,
        top: `${find.y}%`,
        '--find-rotation': `${find.rotation}deg`,
      }}
      onPointerDown={(event) => onHoldStart(event, find.id)}
      onClick={(event) => onCollect(find.id, event)}
      aria-label={`Clear ${findName} worth ${find.amount} ${resourceName}`}
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
  const sceneRef = useRef(null)
  const collectorRef = useRef(null)
  const onCollectRef = useRef(onCollectFind)

  useEffect(() => {
    onCollectRef.current = onCollectFind
  }, [onCollectFind])

  useEffect(() => {
    const collector = createSurveyFindCollector({
      browserWindow: window,
      browserDocument: document,
      getScene: () => sceneRef.current,
      onCollect: (findId) => onCollectRef.current(findId),
    })
    collectorRef.current = collector
    return () => collector.destroy()
  }, [])

  function startHeldCollection(event, startingFindId) {
    collectorRef.current?.start(event, startingFindId, finds)
  }

  function collectSingleFind(findId, event) {
    collectorRef.current?.collectSingle(findId, event)
  }

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
        ref={sceneRef}
        style={{ minHeight: `${Math.max(350, rowCount * 82)}px` }}
      >
        <div className="manatee-marsh-water" aria-hidden="true" />
        {finds.map((find) => (
          <MarshFind
            key={find.id}
            find={find}
            onCollect={collectSingleFind}
            onHoldStart={startHeldCollection}
          />
        ))}
      </div>
      <p className="manatee-interaction-note">
        Select an object to collect it.{' '}
        <span className="manatee-mouse-help">
          Hold the left mouse button and move over objects to collect them.
        </span>
        <span className="manatee-touch-help">
          Press and hold an object to keep collecting.
        </span>
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
  surveyName,
  onCancel,
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
      <button
        type="button"
        className="secondary-button manatee-cancel-survey"
        onClick={onCancel}
        aria-label={`Cancel ${surveyName}`}
      >
        Cancel survey
      </button>
    </div>
  )
}
