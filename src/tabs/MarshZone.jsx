import {
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_RESOURCES,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEYS,
  canUpgradeManateeBuilding,
  canConstructManateeBuilding,
  getManateeBuildingStage,
  getManateeDivingHamsterCapacity,
  getNextManateeBuildingStage,
  getManateeRemainingHamsterCount,
  getManateeSurveyAllocatedHamsterCount,
  getMarshSurveyDurationSeconds,
  getMarshSurveyWorkPerSecond,
} from '../game/gameLogic.js'
import {
  SurveyCropBonus,
  SurveyProgress,
  SurveyResults,
  SurveyTime,
} from './ManateeSurveyUi.jsx'
import { FormattedNumber, WholeNumber } from './ui.jsx'

function MarshSurvey({
  game,
  state,
  coordination,
  surveyTimeEffect,
  onStartSurvey,
  onCancelSurvey,
  onCollectFind,
}) {
  const survey = MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH]
  const activeSurvey = state.activeSurveys.find(
    (candidate) => candidate.id === survey.id,
  )
  const surveyFinds = state.pendingFinds.filter(
    (find) => find.surveyId === survey.id,
  )
  const hasFinds = surveyFinds.length > 0
  const availableHamsters = getManateeRemainingHamsterCount(game)
  const surveyingHamsters = activeSurvey
    ? getManateeSurveyAllocatedHamsterCount(game, survey.id)
    : availableHamsters
  const currentWorkRate =
    getMarshSurveyWorkPerSecond(surveyingHamsters, coordination) /
    surveyTimeEffect.multiplier
  const estimatedDuration = getMarshSurveyDurationSeconds(
    availableHamsters,
    coordination,
    surveyTimeEffect.multiplier,
  )
  const progress = activeSurvey
    ? Math.min(1, activeSurvey.workCompleted / survey.requiredWork)
    : 0
  const remainingSeconds = activeSurvey
    ? (survey.requiredWork - activeSurvey.workCompleted) / currentWorkRate
    : estimatedDuration

  return (
    <article className="manatee-survey-card">
      <header className="manatee-card-heading">
        <div>
          <p className="eyebrow">Surface survey</p>
          <h3>{survey.name}</h3>
        </div>
        <span className="manatee-survey-status">
          {hasFinds
            ? 'Results ready'
            : activeSurvey
              ? 'In progress'
              : availableHamsters <= 0
                ? 'No hamsters free'
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
          allocatedHamsters={surveyingHamsters}
          progress={progress}
          remainingSeconds={remainingSeconds}
          surveyName={survey.name}
          onCancel={() => onCancelSurvey(survey.id)}
        />
      ) : (
        <div className="manatee-survey-start">
          <dl>
            <div>
              <dt>Hamsters sent</dt>
              <dd><WholeNumber value={availableHamsters} /></dd>
            </div>
            <div>
              <dt>Estimated time</dt>
              <dd><SurveyTime seconds={estimatedDuration} /></dd>
            </div>
          </dl>
          <p>
            This surface survey silently sends every currently unallocated
            hamster. Underwater expeditions introduce control over the
            allocated diving team.
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
            disabled={availableHamsters <= 0 || currentWorkRate <= 0}
          >
            Search the Marsh
          </button>
        </div>
      )}
    </article>
  )
}

function BuildingCosts({ resources, cost }) {
  return (
    <dl className="manatee-building-costs">
      {Object.entries(cost).map(([resourceId, amount]) => (
        <div key={resourceId}>
          <dt>{MANATEE_RESOURCES[resourceId].name}</dt>
          <dd>
            <FormattedNumber
              value={resources[resourceId]}
              maximumFractionDigits={0}
            />{' '}
            / <FormattedNumber value={amount} maximumFractionDigits={0} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function DivingCabinSite({
  game,
  state,
  onConstructBuilding,
  onUpgradeBuilding,
}) {
  const building = MANATEE_BUILDINGS[MANATEE_BUILDING_IDS.DIVING_CABIN]
  const isComplete = state.completedBuildings.includes(building.id)
  const canBuild = canConstructManateeBuilding(game, building.id)
  const currentStage = getManateeBuildingStage(game, building.id)
  const completedStage = building.stages?.find(
    (stage) => stage.stage === currentStage,
  )
  const nextStage = getNextManateeBuildingStage(game, building.id)
  const canUpgrade = canUpgradeManateeBuilding(game, building.id)
  const divingCapacity = getManateeDivingHamsterCapacity(game)

  return (
    <article
      className={`manatee-building-site ${isComplete ? 'manatee-building-site-complete' : ''}`}
    >
      <div
        className={`manatee-cabin-visual ${currentStage >= 1 ? 'manatee-diving-hub-visual' : ''}`}
        aria-hidden="true"
      >
        <span className="manatee-cabin-roof" />
        <span className="manatee-cabin-body" />
        <span className="manatee-cabin-door" />
        {currentStage >= 1 ? <span className="manatee-cabin-flippers" /> : null}
        {!isComplete ? <span className="manatee-scaffold" /> : null}
      </div>
      <div className="manatee-building-copy">
        <p className="eyebrow">
          {isComplete ? 'Structure complete' : 'Construction site'}
        </p>
        <h3>{completedStage?.name ?? building.name}</h3>
        <p className="trade-copy">
          {completedStage?.description ?? building.description}
        </p>
        {isComplete ? (
          <>
            <p className="manatee-capacity-note">
              Diving hamster capacity:{' '}
              <strong><WholeNumber value={divingCapacity} /></strong>
            </p>
            {nextStage ? (
              <section className="manatee-building-upgrade">
                <p className="eyebrow">Next structure upgrade</p>
                <h4>{nextStage.name}</h4>
                <p className="trade-copy">{nextStage.description}</p>
                <BuildingCosts
                  resources={state.resources}
                  cost={nextStage.cost}
                />
                <button
                  type="button"
                  className="trade-primary-button"
                  disabled={!canUpgrade}
                  onClick={() => onUpgradeBuilding(building.id)}
                >
                  Upgrade to {nextStage.name}
                </button>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <BuildingCosts resources={state.resources} cost={building.cost} />
            <button
              type="button"
              className="trade-primary-button"
              disabled={!canBuild}
              onClick={() => onConstructBuilding(building.id)}
            >
              Build the Diving Cabin
            </button>
          </>
        )}
      </div>
    </article>
  )
}

export function MarshZone({
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
  return (
    <section className="manatee-zone" aria-labelledby="manatee-marsh-title">
      <div className="section-heading manatee-zone-heading">
        <div>
          <p className="eyebrow">Surface territory</p>
          <h3 id="manatee-marsh-title">Marsh</h3>
        </div>
      </div>
      <div className="manatee-content-grid">
        <section className="manatee-zone-group" aria-label="Marsh surveys">
          <p className="eyebrow">Surveys</p>
          <MarshSurvey
            game={game}
            state={state}
            coordination={coordination}
            surveyTimeEffect={surveyTimeEffect}
            onStartSurvey={onStartSurvey}
            onCancelSurvey={onCancelSurvey}
            onCollectFind={onCollectFind}
          />
        </section>
        <section className="manatee-zone-group" aria-label="Marsh structures">
          <p className="eyebrow">Structures</p>
          <DivingCabinSite
            game={game}
            state={state}
            onConstructBuilding={onConstructBuilding}
            onUpgradeBuilding={onUpgradeBuilding}
          />
        </section>
      </div>
    </section>
  )
}
