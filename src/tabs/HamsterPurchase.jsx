import {
  getHamsterClonerDescription,
  HIRE_MAX_UNLOCK_COUNT,
} from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

export function HamsterPurchase({
  game,
  nextHamsterCost,
  columnsBuiltPerSecond,
  hamsterCoordinationMultiplier,
  cropHamsterEfficiencyMultiplier,
  hamsterExternalMultiplier,
  unionStatus,
  canHireMax,
  onBuyHamster,
  onBuyMaxHamsters,
}) {
  return (
    <article className="replicator-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Workforce</p>
          <h2>Hamster Cloners</h2>
        </div>
        <span className="hamster-badge" aria-label="Hamster Cloners owned">
          <WholeNumber value={game.hamsters} />
        </span>
      </div>
      <p className="card-copy">
        {getHamsterClonerDescription(game)}
      </p>
      {unionStatus ? (
        <p className={`union-status ${game.unionized ? 'union-status-complete' : ''}`}>
          {unionStatus}
        </p>
      ) : null}
      <dl className="replicator-stats">
        <div>
          <dt>Columns planted / sec</dt>
          <dd>
            <FormattedNumber value={columnsBuiltPerSecond} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>Hamster coordination</dt>
          <dd>
            ×<FormattedNumber value={hamsterCoordinationMultiplier} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>Field efficiency</dt>
          <dd>
            ×<FormattedNumber value={cropHamsterEfficiencyMultiplier} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>External multipliers</dt>
          <dd>
            ×<FormattedNumber value={hamsterExternalMultiplier} maximumFractionDigits={2} />
          </dd>
        </div>
      </dl>
      <div className="replicator-summary next-lesson">
        <span>Next lesson</span>
        <strong>
          <FormattedNumber value={nextHamsterCost} maximumFractionDigits={0} /> Crops
        </strong>
      </div>
      <div className="hire-actions">
        <button
          type="button"
          className="primary-button"
          onClick={onBuyHamster}
          disabled={game.crops < nextHamsterCost}
        >
          Hire &amp; teach hamster
        </button>
        {game.totalHamstersHired >= HIRE_MAX_UNLOCK_COUNT ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onBuyMaxHamsters}
            disabled={!canHireMax}
          >
            Hire max
          </button>
        ) : null}
      </div>
      <p className="affordability" aria-live="polite">
        {game.crops >= nextHamsterCost ? (
          'Ready for a new recruit.'
        ) : (
          <>
            <FormattedNumber value={nextHamsterCost - game.crops} /> more Crops needed.
          </>
        )}
      </p>
    </article>
  )
}
