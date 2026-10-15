import {
  MANATEE_DEVELOPMENT_GOAL_IDS,
  MANATEE_DEVELOPMENT_GOAL_TARGET,
  MANATEE_DEVELOPMENT_GOALS,
  MANATEE_RESOURCES,
  canCompleteManateeDevelopmentGoal,
  getCompletedManateeDevelopmentGoalCount,
  getManateeDevelopmentGoalProgress,
  getManateeDivingHamsterCapacity,
  hasCompletedManateeDevelopmentGoal,
} from '../game/gameLogic.js'
import { AllocatedManateeSurvey } from './UnderwaterMarsh.jsx'
import { FormattedNumber } from './ui.jsx'
import { WetlandsConnectionPuzzle } from './WetlandsConnectionPuzzle.jsx'

function DevelopmentProgress({ label, current, target }) {
  const progress = target > 0 ? Math.min(1, current / target) : 0

  return (
    <>
      <div
        className="manatee-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progress * 100)}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="manatee-development-progress-copy">
        <FormattedNumber value={current} maximumFractionDigits={0} /> /{' '}
        <FormattedNumber value={target} maximumFractionDigits={0} /> {label}
      </p>
    </>
  )
}

function DevelopmentCosts({ resources, cost }) {
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

function FeedingGroundsGoal({ game, state, onComplete }) {
  const goal =
    MANATEE_DEVELOPMENT_GOALS[
      MANATEE_DEVELOPMENT_GOAL_IDS.RESTORE_FEEDING_GROUNDS
    ]
  const completed = hasCompletedManateeDevelopmentGoal(game, goal.id)
  const canComplete = canCompleteManateeDevelopmentGoal(game, goal.id)

  return (
    <article
      className={`manatee-development-card ${completed ? 'manatee-development-card-complete' : ''}`}
    >
      <header className="manatee-card-heading">
        <div>
          <p className="eyebrow">Construction project</p>
          <h3>{goal.name}</h3>
        </div>
        <span className="manatee-survey-status">
          {completed ? 'Goal complete' : canComplete ? 'Ready' : 'Gathering materials'}
        </span>
      </header>
      <p className="trade-copy">{goal.description}</p>
      {completed ? (
        <p className="manatee-development-complete-copy">
          The restored feeding grounds are ready for the Manatees.
        </p>
      ) : (
        <>
          <DevelopmentCosts resources={state.resources} cost={goal.cost} />
          <button
            type="button"
            className="trade-primary-button"
            disabled={!canComplete}
            onClick={() => onComplete(goal.id)}
          >
            Restore the Feeding Grounds
          </button>
        </>
      )}
    </article>
  )
}

function WasteCleanupGoal({
  game,
  state,
  coordination,
  surveyTimeEffect,
  onStartSurvey,
  onCancelSurvey,
  onCollectFind,
}) {
  const goal =
    MANATEE_DEVELOPMENT_GOALS[
      MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE
    ]
  const current = getManateeDevelopmentGoalProgress(game, goal.id)
  const completed = hasCompletedManateeDevelopmentGoal(game, goal.id)

  return (
    <section className="manatee-development-survey-goal">
      <article
        className={`manatee-development-card ${completed ? 'manatee-development-card-complete' : ''}`}
      >
        <header className="manatee-card-heading">
          <div>
            <p className="eyebrow">Survey project</p>
            <h3>{goal.name}</h3>
          </div>
          <span className="manatee-survey-status">
            {completed ? 'Goal complete' : 'Cleanup underway'}
          </span>
        </header>
        <p className="trade-copy">{goal.description}</p>
        <DevelopmentProgress
          label={goal.progressUnit}
          current={current}
          target={goal.target}
        />
      </article>

      {!completed ? (
        <AllocatedManateeSurvey
          game={game}
          state={state}
          surveyId={goal.surveyId}
          coordination={coordination}
          surveyTimeEffect={surveyTimeEffect}
          divingCapacity={getManateeDivingHamsterCapacity(game)}
          onStartSurvey={onStartSurvey}
          onCancelSurvey={onCancelSurvey}
          onCollectFind={onCollectFind}
        />
      ) : null}
    </section>
  )
}

function EstuaryView({
  game,
  state,
  onToggleWetlandsObstruction,
  onClearWetlandsObstructions,
}) {
  return (
    <section className="estuary-view" aria-labelledby="estuary-view-title">
      <div className="section-heading manatee-zone-heading">
        <div>
          <p className="eyebrow">Environmental management</p>
          <h3 id="estuary-view-title">Estuary View</h3>
        </div>
      </div>
      <nav className="estuary-view-sections" aria-label="Estuary sections">
        <button
          type="button"
          className="estuary-view-section estuary-view-section-active"
          aria-pressed="true"
        >
          <strong>Wetlands Connection</strong>
          <span>Contains one Development Goal</span>
        </button>
      </nav>
      <WetlandsConnectionPuzzle
        game={game}
        state={state}
        onToggleObstruction={onToggleWetlandsObstruction}
        onClearObstructions={onClearWetlandsObstructions}
      />
    </section>
  )
}

export function EstuaryZone({
  game,
  state,
  coordination,
  surveyTimeEffect,
  onStartSurvey,
  onCancelSurvey,
  onCollectFind,
  onCompleteDevelopmentGoal,
  onToggleWetlandsObstruction,
  onClearWetlandsObstructions,
}) {
  const completedGoalCount = getCompletedManateeDevelopmentGoalCount(game)

  return (
    <section className="manatee-zone manatee-estuary" aria-labelledby="manatee-estuary-title">
      <div className="section-heading manatee-zone-heading">
        <div>
          <p className="eyebrow">Tidal territory</p>
          <h3 id="manatee-estuary-title">Estuary</h3>
        </div>
        <strong className="manatee-development-total">
          <FormattedNumber value={completedGoalCount} maximumFractionDigits={0} />
          {' / '}
          <FormattedNumber
            value={MANATEE_DEVELOPMENT_GOAL_TARGET}
            maximumFractionDigits={0}
          />{' '}
          Development Goals
        </strong>
      </div>
      <p className="trade-copy">
        Use the Diving Hub&apos;s flippers to help repair the Estuary. Complete all
        three Development Goals required by Capybara Demonstration 2.
      </p>
      <div className="manatee-development-grid">
        <FeedingGroundsGoal
          game={game}
          state={state}
          onComplete={onCompleteDevelopmentGoal}
        />
        <WasteCleanupGoal
          game={game}
          state={state}
          coordination={coordination}
          surveyTimeEffect={surveyTimeEffect}
          onStartSurvey={onStartSurvey}
          onCancelSurvey={onCancelSurvey}
          onCollectFind={onCollectFind}
        />
      </div>
      <EstuaryView
        game={game}
        state={state}
        onToggleWetlandsObstruction={onToggleWetlandsObstruction}
        onClearWetlandsObstructions={onClearWetlandsObstructions}
      />
    </section>
  )
}
