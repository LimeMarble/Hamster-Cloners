import { useState } from 'react'
import {
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEY_LENGTHS,
  MANATEE_SURVEYS,
  getManateeDivingHamsterCapacity,
  getManateeSurveyDurationMultiplier,
  getManateeSurveyDurationSeconds,
  getManateeSurveyRequiredWork,
  getManateeSurveyRewardMultipliers,
  getManateeSurveyingHamsterCount,
  getMarshSurveyWorkPerSecond,
} from '../game/gameLogic.js'
import {
  SurveyCropBonus,
  SurveyProgress,
  SurveyResults,
  SurveyTime,
} from './ManateeSurveyUi.jsx'
import { FormattedNumber, WholeNumber } from './ui.jsx'

const UNDERWATER_SURVEY_IDS = Object.freeze([
  MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
  MANATEE_SURVEY_IDS.SEDIMENT,
])

function SurveyLengthSelector({
  survey,
  selectedLengthId,
  disabled,
  onSelect,
}) {
  return (
    <div className="manatee-survey-lengths" aria-label={`${survey.name} duration`}>
      {MANATEE_SURVEY_LENGTHS.map((length) => {
        const durationMultiplier = getManateeSurveyDurationMultiplier(
          survey.id,
          length.id,
        )
        const rewards = getManateeSurveyRewardMultipliers(
          survey.id,
          length.id,
        )

        return (
          <button
            type="button"
            className={
              selectedLengthId === length.id
                ? 'manatee-survey-length-active'
                : ''
            }
            key={length.id}
            onClick={() => onSelect(length.id)}
            disabled={disabled}
            aria-pressed={selectedLengthId === length.id}
          >
            <strong>{length.name}</strong>
            <span>
              ×<FormattedNumber value={durationMultiplier} /> time · ×
              <FormattedNumber value={rewards.objectCount} /> objects · ×
              <FormattedNumber value={rewards.objectValue} /> value
            </span>
          </button>
        )
      })}
    </div>
  )
}

function UnderwaterSurvey({
  game,
  state,
  surveyId,
  coordination,
  surveyTimeEffect,
  divingCapacity,
  onStartSurvey,
  onCollectFind,
}) {
  const [selectedLengthId, setSelectedLengthId] = useState(
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  )
  const [selectedHamsters, setSelectedHamsters] = useState(
    Math.max(1, Math.min(game.hamsters, divingCapacity)),
  )
  const survey = MANATEE_SURVEYS[surveyId]
  const activeSurvey =
    state.activeSurvey?.id === survey.id ? state.activeSurvey : null
  const hasFinds = state.pendingSurveyId === survey.id
  const displayedLengthId = activeSurvey?.lengthId ?? selectedLengthId
  const allocatedHamsters = activeSurvey
    ? getManateeSurveyingHamsterCount(game)
    : Math.min(game.hamsters, divingCapacity, selectedHamsters)
  const currentWorkRate =
    getMarshSurveyWorkPerSecond(allocatedHamsters, coordination) /
    surveyTimeEffect.multiplier
  const requiredWork = getManateeSurveyRequiredWork(
    survey.id,
    displayedLengthId,
  )
  const estimatedDuration = getManateeSurveyDurationSeconds(
    allocatedHamsters,
    coordination,
    survey.id,
    displayedLengthId,
    surveyTimeEffect.multiplier,
  )
  const progress = activeSurvey
    ? Math.min(1, activeSurvey.workCompleted / requiredWork)
    : 0
  const remainingSeconds = activeSurvey
    ? (requiredWork - activeSurvey.workCompleted) / currentWorkRate
    : estimatedDuration
  const isBlocked = Boolean(
    (state.activeSurvey && !activeSurvey) ||
      (state.pendingFinds.length > 0 && !hasFinds),
  )

  return (
    <article className="manatee-survey-card manatee-underwater-survey-card">
      <header className="manatee-card-heading">
        <div>
          <p className="eyebrow">Underwater expedition</p>
          <h3>{survey.name}</h3>
        </div>
        <span className="manatee-survey-status">
          {hasFinds
            ? 'Results ready'
            : activeSurvey
              ? 'In progress'
              : isBlocked
                ? 'Unavailable'
                : 'Available'}
        </span>
      </header>
      <p className="trade-copy">{survey.description}</p>
      <SurveyCropBonus surveyTimeEffect={surveyTimeEffect} />

      {hasFinds ? (
        <SurveyResults
          state={state}
          survey={survey}
          onCollectFind={onCollectFind}
        />
      ) : activeSurvey ? (
        <SurveyProgress
          allocatedHamsters={allocatedHamsters}
          progress={progress}
          remainingSeconds={remainingSeconds}
        />
      ) : (
        <div className="manatee-survey-start">
          <SurveyLengthSelector
            survey={survey}
            selectedLengthId={selectedLengthId}
            disabled={isBlocked}
            onSelect={setSelectedLengthId}
          />
          <label className="manatee-hamster-allocation">
            <span>
              Hamsters allocated:{' '}
              <strong><WholeNumber value={allocatedHamsters} /></strong>
            </span>
            <input
              type="range"
              min="1"
              max={Math.max(1, Math.min(game.hamsters, divingCapacity))}
              step="1"
              value={Math.max(1, allocatedHamsters)}
              onChange={(event) =>
                setSelectedHamsters(Number(event.target.value))
              }
              disabled={isBlocked || game.hamsters <= 0}
              aria-label={`${survey.name} hamsters allocated`}
            />
          </label>
          <dl>
            <div>
              <dt>Hamsters sent</dt>
              <dd><WholeNumber value={allocatedHamsters} /></dd>
            </div>
            <div>
              <dt>Estimated time</dt>
              <dd><SurveyTime seconds={estimatedDuration} /></dd>
            </div>
          </dl>
          <button
            type="button"
            className="trade-primary-button"
            onClick={() =>
              onStartSurvey(
                survey.id,
                selectedLengthId,
                allocatedHamsters,
              )
            }
            disabled={
              isBlocked || allocatedHamsters <= 0 || currentWorkRate <= 0
            }
          >
            Begin {survey.name}
          </button>
        </div>
      )}
    </article>
  )
}

export function UnderwaterMarsh({
  game,
  state,
  coordination,
  surveyTimeEffect,
  onStartSurvey,
  onCollectFind,
}) {
  const divingCapacity = getManateeDivingHamsterCapacity(game)

  return (
    <section className="manatee-underwater-section" aria-labelledby="underwater-marsh-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Diving territory</p>
          <h3 id="underwater-marsh-title">Underwater Marsh</h3>
        </div>
      </div>
      {divingCapacity <= 0 ? (
        <p className="manatee-underwater-locked">
          Complete the Diving Cabin to equip hamsters for underwater
          expeditions.
        </p>
      ) : (
        <>
          <p className="trade-copy">
            Choose a duration and allocate part of the diving team. Longer
            choices multiply object counts and values, but occupy those
            hamsters much longer.
          </p>
          <div className="manatee-expedition-grid">
            {UNDERWATER_SURVEY_IDS.map((surveyId) => (
              <UnderwaterSurvey
                key={surveyId}
                game={game}
                state={state}
                surveyId={surveyId}
                coordination={coordination}
                surveyTimeEffect={surveyTimeEffect}
                divingCapacity={divingCapacity}
                onStartSurvey={onStartSurvey}
                onCollectFind={onCollectFind}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
