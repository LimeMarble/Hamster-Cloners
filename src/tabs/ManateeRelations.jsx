import {
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_RESOURCES,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEYS,
  canConstructManateeBuilding,
  getBlazingCarrotSurveyTimeEffect,
  getFortuneModifiers,
  getHamsterCoordinationMultiplier,
  getManateeDivingHamsterCapacity,
  getManateeSurveyingHamsterCount,
  getMarshSurveyDurationSeconds,
  getMarshSurveyWorkPerSecond,
  normalizeManateeState,
} from '../game/gameLogic.js'
import {
  SurveyCropBonus,
  SurveyProgress,
  SurveyResults,
  SurveyTime,
} from './ManateeSurveyUi.jsx'
import { UnderwaterMarsh } from './UnderwaterMarsh.jsx'
import { FormattedNumber, WholeNumber } from './ui.jsx'

function ManateeResources({ resources }) {
  return (
    <dl className="manatee-resource-grid" aria-label="Manatee resources">
      {Object.values(MANATEE_RESOURCES).map((resource) => (
        <div key={resource.id}>
          <dt>{resource.name}</dt>
          <dd>
            <span
              className={`manatee-resource-icon manatee-resource-icon-${resource.iconClass}`}
              aria-hidden="true"
            />
            <FormattedNumber
              value={resources[resource.id]}
              maximumFractionDigits={0}
            />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function MarshSurvey({
  game,
  state,
  coordination,
  surveyTimeEffect,
  onStartSurvey,
  onCollectFind,
}) {
  const survey = MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH]
  const activeSurvey =
    state.activeSurvey?.id === survey.id ? state.activeSurvey : null
  const hasFinds = state.pendingSurveyId === survey.id
  const surveyingHamsters = activeSurvey
    ? getManateeSurveyingHamsterCount(game)
    : game.hamsters
  const currentWorkRate =
    getMarshSurveyWorkPerSecond(surveyingHamsters, coordination) /
    surveyTimeEffect.multiplier
  const estimatedDuration = getMarshSurveyDurationSeconds(
    game.hamsters,
    coordination,
    surveyTimeEffect.multiplier,
  )
  const progress = activeSurvey
    ? Math.min(1, activeSurvey.workCompleted / survey.requiredWork)
    : 0
  const remainingSeconds = activeSurvey
    ? (survey.requiredWork - activeSurvey.workCompleted) / currentWorkRate
    : estimatedDuration
  const isBlocked = Boolean(
    (state.activeSurvey && !activeSurvey) ||
      (state.pendingFinds.length > 0 && !hasFinds),
  )

  return (
    <article className="manatee-survey-card">
      <header className="manatee-card-heading">
        <div>
          <p className="eyebrow">Initial surface survey</p>
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
          allocatedHamsters={surveyingHamsters}
          progress={progress}
          remainingSeconds={remainingSeconds}
        />
      ) : (
        <div className="manatee-survey-start">
          <dl>
            <div>
              <dt>Hamsters sent</dt>
              <dd><WholeNumber value={game.hamsters} /></dd>
            </div>
            <div>
              <dt>Estimated time</dt>
              <dd><SurveyTime seconds={estimatedDuration} /></dd>
            </div>
          </dl>
          <p>
            This surface survey silently sends every owned hamster. Underwater
            expeditions introduce control over the allocated diving team.
          </p>
          <button
            type="button"
            className="trade-primary-button"
            onClick={() =>
              onStartSurvey(
                survey.id,
                MANATEE_SURVEY_LENGTH_IDS.STANDARD,
              )
            }
            disabled={
              isBlocked || game.hamsters <= 0 || currentWorkRate <= 0
            }
          >
            Search the Marsh
          </button>
        </div>
      )}
    </article>
  )
}

function DivingCabinSite({ game, state, onConstructBuilding }) {
  const building = MANATEE_BUILDINGS[MANATEE_BUILDING_IDS.DIVING_CABIN]
  const isComplete = state.completedBuildings.includes(building.id)
  const canBuild = canConstructManateeBuilding(game, building.id)
  const divingCapacity = getManateeDivingHamsterCapacity(game)

  return (
    <article
      className={`manatee-building-site ${isComplete ? 'manatee-building-site-complete' : ''}`}
    >
      <div className="manatee-cabin-visual" aria-hidden="true">
        <span className="manatee-cabin-roof" />
        <span className="manatee-cabin-body" />
        <span className="manatee-cabin-door" />
        {!isComplete ? <span className="manatee-scaffold" /> : null}
      </div>
      <div className="manatee-building-copy">
        <p className="eyebrow">
          {isComplete ? 'Structure complete' : 'Construction site'}
        </p>
        <h3>{building.name}</h3>
        <p className="trade-copy">{building.description}</p>
        <dl className="manatee-building-costs">
          {Object.entries(building.cost).map(([resourceId, amount]) => (
            <div key={resourceId}>
              <dt>{MANATEE_RESOURCES[resourceId].name}</dt>
              <dd>
                <FormattedNumber
                  value={state.resources[resourceId]}
                  maximumFractionDigits={0}
                />{' '}
                / <FormattedNumber value={amount} maximumFractionDigits={0} />
              </dd>
            </div>
          ))}
        </dl>
        {isComplete ? (
          <p className="manatee-capacity-note">
            Diving hamster capacity:{' '}
            <strong><WholeNumber value={divingCapacity} /></strong>
          </p>
        ) : (
          <button
            type="button"
            className="trade-primary-button"
            disabled={!canBuild}
            onClick={() => onConstructBuilding(building.id)}
          >
            Build the Diving Cabin
          </button>
        )}
      </div>
    </article>
  )
}

export function ManateeRelations({
  game,
  onStartManateeSurvey,
  onCollectManateeFind,
  onConstructManateeBuilding,
}) {
  const state = normalizeManateeState(game.manatees)
  const coordination = getHamsterCoordinationMultiplier(
    game.hamsters,
    game.postUnionHamstersHired,
  )
  const surveyTimeEffect = getBlazingCarrotSurveyTimeEffect(
    game.blueprint,
    game.completedCropPerfections,
    game.trade?.totalRabbitRelationsEarned ?? 0,
    getFortuneModifiers(game.fortune).passiveEffectMultiplier,
  )

  return (
    <section className="trading-group manatee-relations" aria-labelledby="manatees-title">
      <div className="trading-group-title">
        <span aria-hidden="true">🌊</span>
        <div>
          <p className="eyebrow">New territory</p>
          <h2 id="manatees-title">Manatees</h2>
        </div>
      </div>
      <p className="trade-copy">
        The Manatees have no use for ordinary trade goods, but they will let
        your hamsters survey their waterside territory and help with construction.
      </p>
      <ManateeResources resources={state.resources} />
      <div className="manatee-content-grid">
        <MarshSurvey
          game={game}
          state={state}
          coordination={coordination}
          surveyTimeEffect={surveyTimeEffect}
          onStartSurvey={onStartManateeSurvey}
          onCollectFind={onCollectManateeFind}
        />
        <DivingCabinSite
          game={game}
          state={state}
          onConstructBuilding={onConstructManateeBuilding}
        />
      </div>
      <UnderwaterMarsh
        game={game}
        state={state}
        coordination={coordination}
        surveyTimeEffect={surveyTimeEffect}
        onStartSurvey={onStartManateeSurvey}
        onCollectFind={onCollectManateeFind}
      />
    </section>
  )
}
