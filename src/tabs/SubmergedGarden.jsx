import {
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_GARDEN_TENDING_DURATION_SECONDS,
  MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
  MANATEE_RESOURCES,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEYS,
  canConstructManateeBuilding,
  canUpgradeManateeBuilding,
  getManateeBuildingStage,
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  getManateeSurveyAllocatedHamsterCount,
  getManateeSurveyRequiredWork,
  getManateeSurveyWorkPerSecond,
  getNextManateeBuildingStage,
} from '../game/gameLogic.js'
import {
  SurveyProgress,
  SurveyResults,
  SurveyTime,
} from './ManateeSurveyUi.jsx'
import { FormattedNumber, WholeNumber } from './ui.jsx'

function ResourceCosts({ resources, cost }) {
  return (
    <dl className="manatee-building-costs manatee-garden-costs">
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

function GardenStages({ game, state, building, currentStage, onUpgrade }) {
  const nextStage = getNextManateeBuildingStage(game, building.id)
  const canUpgrade = canUpgradeManateeBuilding(game, building.id)

  return (
    <section className="manatee-garden-stages" aria-label="Submerged Garden stages">
      <div className="manatee-garden-stage-heading">
        <div>
          <p className="eyebrow">Garden development</p>
          <h4>Three growing stages</h4>
        </div>
        <strong>{currentStage} / {building.maximumStage}</strong>
      </div>
      <div className="manatee-garden-stage-list">
        {building.stages.map((stage) => {
          const isComplete = currentStage >= stage.stage
          const isNext = nextStage?.stage === stage.stage

          return (
            <article
              className={`manatee-garden-stage ${isComplete ? 'manatee-garden-stage-complete' : ''}`}
              key={stage.stage}
            >
              <header>
                <span>Stage {stage.stage}</span>
                <strong>{stage.name}</strong>
              </header>
              {stage.implemented ? (
                <>
                  <p>{stage.description}</p>
                  {isComplete ? (
                    <span className="manatee-garden-stage-status">
                      Crop access unlocked
                    </span>
                  ) : isNext ? (
                    <>
                      <ResourceCosts
                        resources={state.resources}
                        cost={stage.cost}
                      />
                      <button
                        type="button"
                        className="trade-primary-button"
                        disabled={!canUpgrade}
                        onClick={() => onUpgrade(building.id)}
                      >
                        Complete Stage {stage.stage}
                      </button>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <p>{stage.description}</p>
                  <ResourceCosts
                    resources={state.resources}
                    cost={stage.cost}
                  />
                  <span className="manatee-garden-stage-status">
                    Crop not implemented yet
                  </span>
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function GardenCropTending({
  game,
  state,
  coordination,
  surveyId,
  cropName,
  onStartSurvey,
  onCollectFind,
}) {
  const survey = MANATEE_SURVEYS[surveyId]
  const headingId = `${surveyId}-tending-title`
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
  const allocatedHamsters = activeSurvey
    ? getManateeSurveyAllocatedHamsterCount(game, survey.id)
    : availableHamsters >= MANATEE_GARDEN_TENDING_HAMSTER_COUNT
      ? MANATEE_GARDEN_TENDING_HAMSTER_COUNT
      : 0
  const workPerSecond = getManateeSurveyWorkPerSecond(
    allocatedHamsters,
    coordination,
    survey.id,
  )
  const requiredWork = getManateeSurveyRequiredWork(survey.id)
  const progress = activeSurvey
    ? Math.min(1, activeSurvey.workCompleted / requiredWork)
    : 0
  const remainingSeconds = activeSurvey
    ? (requiredWork - activeSurvey.workCompleted) / workPerSecond
    : MANATEE_GARDEN_TENDING_DURATION_SECONDS

  return (
    <section className="manatee-garden-tending" aria-labelledby={headingId}>
      <header className="manatee-card-heading">
        <div>
          <p className="eyebrow">Aquatic crop tending</p>
          <h4 id={headingId}>{cropName}</h4>
        </div>
        <span className="manatee-survey-status">
          {hasFinds
            ? 'Results ready'
            : activeSurvey
              ? 'In progress'
              : availableHamsters < MANATEE_GARDEN_TENDING_HAMSTER_COUNT
                ? '10 hamsters needed'
                : 'Available'}
        </span>
      </header>
      <p className="trade-copy">
        Exactly <WholeNumber value={MANATEE_GARDEN_TENDING_HAMSTER_COUNT} />{' '}
        hamsters tend this crop for a fixed{' '}
        <SurveyTime seconds={MANATEE_GARDEN_TENDING_DURATION_SECONDS} />. The
        harvest produces 25 collectible {cropName} objects worth 5–10 each.
      </p>
      <p className="manatee-fixed-time-note">
        Tending time is unaffected by Hamster Coordination, Blazing Carrots,
        or other survey-speed modifiers.
      </p>

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
        />
      ) : (
        <button
          type="button"
          className="trade-primary-button"
          disabled={allocatedHamsters < MANATEE_GARDEN_TENDING_HAMSTER_COUNT}
          onClick={() =>
            onStartSurvey(
              survey.id,
              MANATEE_SURVEY_LENGTH_IDS.STANDARD,
              MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
            )
          }
        >
          Tend {cropName}
        </button>
      )}
    </section>
  )
}

export function SubmergedGarden({
  game,
  state,
  coordination,
  onConstructBuilding,
  onUpgradeBuilding,
  onStartSurvey,
  onCollectFind,
}) {
  const building = MANATEE_BUILDINGS[MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]
  const isComplete = state.completedBuildings.includes(building.id)
  const canBuild = canConstructManateeBuilding(game, building.id)
  const currentStage = getManateeBuildingStage(game, building.id)

  return (
    <article
      className={`manatee-building-site manatee-submerged-garden ${isComplete ? 'manatee-building-site-complete' : ''}`}
    >
      <div className="manatee-garden-visual" aria-hidden="true">
        <span className="manatee-garden-water" />
        <span className="manatee-garden-bed" />
        {isComplete && currentStage >= 1 ? (
          <span className="manatee-garden-sprouts" />
        ) : null}
        {!isComplete ? <span className="manatee-scaffold" /> : null}
      </div>
      <div className="manatee-building-copy">
        <p className="eyebrow">
          {isComplete ? 'Underwater structure' : 'Construction site'}
        </p>
        <h3>{building.name}</h3>
        <p className="trade-copy">{building.description}</p>

        {!isComplete ? (
          <>
            <ResourceCosts resources={state.resources} cost={building.cost} />
            <button
              type="button"
              className="trade-primary-button"
              disabled={!canBuild}
              onClick={() => onConstructBuilding(building.id)}
            >
              Build the Empty Garden
            </button>
          </>
        ) : (
          <>
            <p className="manatee-capacity-note">
              {currentStage === 0
                ? 'The garden is built but empty. Complete its first growing stage to use it.'
                : `Garden stages completed: ${currentStage} / ${building.maximumStage}`}
            </p>
            <GardenStages
              game={game}
              state={state}
              building={building}
              currentStage={currentStage}
              onUpgrade={onUpgradeBuilding}
            />
            {currentStage >= 1 ? (
              <GardenCropTending
                game={game}
                state={state}
                coordination={coordination}
                surveyId={MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS}
                cropName="Shoal Grass"
                onStartSurvey={onStartSurvey}
                onCollectFind={onCollectFind}
              />
            ) : null}
            {currentStage >= 2 ? (
              <GardenCropTending
                game={game}
                state={state}
                coordination={coordination}
                surveyId={MANATEE_SURVEY_IDS.TEND_WATER_LETTUCE}
                cropName="Water Lettuce"
                onStartSurvey={onStartSurvey}
                onCollectFind={onCollectFind}
              />
            ) : null}
          </>
        )}
      </div>
    </article>
  )
}
