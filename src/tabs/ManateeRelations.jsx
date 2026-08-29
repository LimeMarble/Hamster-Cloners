import {
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_RESOURCE_IDS,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEYS,
  canConstructManateeBuilding,
  getHamsterCoordinationMultiplier,
  getBlazingCarrotSurveyTimeEffect,
  getFortuneModifiers,
  getManateeDivingHamsterCapacity,
  getManateeSurveyingHamsterCount,
  getMarshSurveyDurationSeconds,
  getMarshSurveyWorkPerSecond,
  normalizeManateeState,
} from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

function SurveyTime({ seconds }) {
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

function ManateeResources({ resources }) {
  return (
    <dl className="manatee-resource-grid" aria-label="Manatee resources">
      <div>
        <dt>Wood</dt>
        <dd>
          <span className="manatee-resource-icon manatee-resource-icon-wood" aria-hidden="true" />
          <FormattedNumber
            value={resources[MANATEE_RESOURCE_IDS.WOOD]}
            maximumFractionDigits={0}
          />
        </dd>
      </div>
      <div>
        <dt>Stone</dt>
        <dd>
          <span className="manatee-resource-icon manatee-resource-icon-stone" aria-hidden="true" />
          <FormattedNumber
            value={resources[MANATEE_RESOURCE_IDS.STONE]}
            maximumFractionDigits={0}
          />
        </dd>
      </div>
    </dl>
  )
}

function MarshFind({ find, onCollect }) {
  const resourceName =
    find.resourceId === MANATEE_RESOURCE_IDS.WOOD ? 'Wood' : 'Stone'

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

function MarshSurvey({ game, state, onStartSurvey, onCollectFind }) {
  const survey = MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH]
  const activeSurvey = state.activeSurvey
  const surveyingHamsters = getManateeSurveyingHamsterCount(game)
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
  const baseWorkRate = getMarshSurveyWorkPerSecond(
    activeSurvey ? surveyingHamsters : game.hamsters,
    coordination,
  )
  const currentWorkRate = baseWorkRate / surveyTimeEffect.multiplier
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
  const hasFinds = state.pendingFinds.length > 0

  return (
    <article className="manatee-survey-card">
      <header className="manatee-card-heading">
        <div>
          <p className="eyebrow">Initial survey</p>
          <h3>{survey.name}</h3>
        </div>
        <span className="manatee-survey-status">
          {hasFinds ? 'Results ready' : activeSurvey ? 'In progress' : 'Available'}
        </span>
      </header>
      <p className="trade-copy">{survey.description}</p>
      {surveyTimeEffect.activeCarrotCount > 0 ? (
        <p className="manatee-survey-crop-bonus">
          Blazing Carrots shorten this survey by{' '}
          <strong>
            <FormattedNumber
              value={surveyTimeEffect.reduction * 100}
              maximumFractionDigits={2}
            />
            %
          </strong>{' '}
          ({' '}
          <FormattedNumber
            value={surveyTimeEffect.contributingCarrotCount}
            maximumFractionDigits={2}
          />{' '}
          effective of{' '}
          <WholeNumber value={surveyTimeEffect.activeCarrotCount} /> active).
        </p>
      ) : null}

      {hasFinds ? (
        <section className="manatee-marsh-results" aria-label="Marsh survey results">
          <div className="manatee-results-heading">
            <div>
              <p className="eyebrow">Survey results</p>
              <h4>Collect the finds</h4>
            </div>
            <p>
              <FormattedNumber
                value={state.pendingFinds.length}
                maximumFractionDigits={0}
              />{' '}
              objects remain
            </p>
          </div>
          <div className="manatee-marsh-scene">
            <div className="manatee-marsh-water" aria-hidden="true" />
            {state.pendingFinds.map((find) => (
              <MarshFind
                key={find.id}
                find={find}
                onCollect={onCollectFind}
              />
            ))}
          </div>
          <p className="manatee-interaction-note">
            Select each branch and pebble in the marsh to collect it.
          </p>
        </section>
      ) : activeSurvey ? (
        <div className="manatee-survey-progress">
          <div className="manatee-progress-copy">
            <span>
              <WholeNumber value={surveyingHamsters} /> hamsters surveying
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
            This first survey silently sends every owned hamster. Allocation
            controls begin with later surveys.
          </p>
          <button
            type="button"
            className="trade-primary-button"
            onClick={onStartSurvey}
            disabled={game.hamsters <= 0 || currentWorkRate <= 0}
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
          <div>
            <dt>Wood</dt>
            <dd>
              <FormattedNumber
                value={state.resources[MANATEE_RESOURCE_IDS.WOOD]}
                maximumFractionDigits={0}
              />{' '}
              / <FormattedNumber value={building.cost.wood} maximumFractionDigits={0} />
            </dd>
          </div>
          <div>
            <dt>Stone</dt>
            <dd>
              <FormattedNumber
                value={state.resources[MANATEE_RESOURCE_IDS.STONE]}
                maximumFractionDigits={0}
              />{' '}
              / <FormattedNumber value={building.cost.stone} maximumFractionDigits={0} />
            </dd>
          </div>
        </dl>
        {isComplete ? (
          <p className="manatee-capacity-note">
            Diving hamster capacity: <strong><WholeNumber value={divingCapacity} /></strong>
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
          onStartSurvey={onStartManateeSurvey}
          onCollectFind={onCollectManateeFind}
        />
        <DivingCabinSite
          game={game}
          state={state}
          onConstructBuilding={onConstructManateeBuilding}
        />
      </div>
    </section>
  )
}
