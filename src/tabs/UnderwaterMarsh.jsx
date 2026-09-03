import { useState } from 'react'
import {
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEYS,
  getManateeDivingHamsterCapacity,
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  getManateeSurveyDurationMultiplier,
  getManateeSurveyDurationSeconds,
  getManateeSurveyLengths,
  getManateeSurveyRequiredWork,
  getManateeSurveyRewardMultipliers,
  getManateeSurveyAllocatedHamsterCount,
  getMarshSurveyWorkPerSecond,
} from '../game/gameLogic.js'
import {
  SurveyCropBonus,
  SurveyProgress,
  SurveyResults,
  SurveyTime,
} from './ManateeSurveyUi.jsx'
import { SubmergedGarden } from './SubmergedGarden.jsx'
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
      {getManateeSurveyLengths(survey.id).map((length) => {
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

export function AllocatedManateeSurvey({
  game,
  state,
  surveyId,
  coordination,
  surveyTimeEffect,
  divingCapacity,
  onStartSurvey,
  onCancelSurvey,
  onCollectFind,
}) {
  const [selectedLengthId, setSelectedLengthId] = useState(
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  )
  const [selectedHamsters, setSelectedHamsters] = useState(
    Math.max(1, Math.min(game.hamsters, divingCapacity)),
  )
  const survey = MANATEE_SURVEYS[surveyId]
  const activeSurvey = state.activeSurveys.find(
    (candidate) => candidate.id === survey.id,
  )
  const surveyFinds = state.pendingFinds.filter(
    (find) => find.surveyId === survey.id,
  )
  const hasFinds = surveyFinds.length > 0
  const availableHamsters = Math.min(
    getManateeRemainingHamsterCount(game),
    getManateeRemainingDivingHamsterCapacity(game),
  )
  const displayedLengthId = activeSurvey?.lengthId ?? selectedLengthId
  const allocatedHamsters = activeSurvey
    ? getManateeSurveyAllocatedHamsterCount(game, survey.id)
    : Math.min(availableHamsters, selectedHamsters)
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
              : availableHamsters <= 0
                ? 'No gear or hamsters free'
                : 'Available'}
        </span>
      </header>
      <p className="trade-copy">{survey.description}</p>
      <SurveyCropBonus surveyTimeEffect={surveyTimeEffect} />

      {hasFinds ? (
        <SurveyResults
          finds={surveyFinds}
          survey={survey}
          onCollectFind={onCollectFind}
        />
      ) : activeSurvey ? (
        <SurveyProgress
          allocatedHamsters={allocatedHamsters}
          progress={progress}
          remainingSeconds={remainingSeconds}
          surveyName={survey.name}
          onCancel={() => onCancelSurvey(survey.id)}
        />
      ) : (
        <div className="manatee-survey-start">
          {survey.supportsTimeLengths ? (
            <SurveyLengthSelector
              survey={survey}
              selectedLengthId={selectedLengthId}
              disabled={availableHamsters <= 0}
              onSelect={setSelectedLengthId}
            />
          ) : null}
          <label className="manatee-hamster-allocation">
            <span>
              Hamsters allocated:{' '}
              <strong><WholeNumber value={allocatedHamsters} /></strong>
            </span>
            <input
              type="range"
              min="1"
              max={Math.max(1, availableHamsters)}
              step="1"
              value={Math.max(1, allocatedHamsters)}
              onChange={(event) =>
                setSelectedHamsters(Number(event.target.value))
              }
              disabled={availableHamsters <= 0}
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
              allocatedHamsters <= 0 || currentWorkRate <= 0
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
  onCancelSurvey,
  onCollectFind,
  onConstructBuilding,
  onUpgradeBuilding,
}) {
  const divingCapacity = getManateeDivingHamsterCapacity(game)

  return (
    <section className="manatee-underwater-section manatee-zone" aria-labelledby="underwater-marsh-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Diving territory</p>
          <h3 id="underwater-marsh-title">Underwater Marsh</h3>
        </div>
      </div>
      <section
        className="manatee-zone-group"
        aria-label="Underwater Marsh surveys"
      >
        <p className="eyebrow">Surveys</p>
        {divingCapacity <= 0 ? (
          <p className="manatee-underwater-locked">
            Complete the Diving Cabin in the Marsh to equip hamsters for
            underwater expeditions.
          </p>
        ) : (
          <>
            <p className="trade-copy">
              Choose a duration and allocate part of the shared diving team.
              Different expeditions can run together as long as enough
              hamsters and diving gear remain. Longer choices multiply object
              counts and values, but occupy those hamsters much longer.
            </p>
            <div className="manatee-expedition-grid">
              {UNDERWATER_SURVEY_IDS.map((surveyId) => (
                <AllocatedManateeSurvey
                  key={surveyId}
                  game={game}
                  state={state}
                  surveyId={surveyId}
                  coordination={coordination}
                  surveyTimeEffect={surveyTimeEffect}
                  divingCapacity={divingCapacity}
                  onStartSurvey={onStartSurvey}
                  onCancelSurvey={onCancelSurvey}
                  onCollectFind={onCollectFind}
                />
              ))}
            </div>
          </>
        )}
      </section>
      <section
        className="manatee-zone-group"
        aria-label="Underwater Marsh structures"
      >
        <p className="eyebrow">Structures</p>
        <SubmergedGarden
          game={game}
          state={state}
          coordination={coordination}
          onConstructBuilding={onConstructBuilding}
          onUpgradeBuilding={onUpgradeBuilding}
          onStartSurvey={onStartSurvey}
          onCancelSurvey={onCancelSurvey}
          onCollectFind={onCollectFind}
        />
      </section>
    </section>
  )
}
