import { memo } from 'react'
import {
  getHamsterClonerDescription,
  HIRE_MAX_UNLOCK_COUNT,
} from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

const HamsterDetails = memo(function HamsterDetails({
  hamsters,
  unionized,
  postUnionHamstersHired,
  nextHamsterCost,
  columnsBuiltPerSecond,
  hamsterCoordinationMultiplier,
  cropHamsterEfficiencyMultiplier,
  hamsterExternalMultiplier,
  unionStatus,
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Workforce</p>
          <h2>Hamster Cloners</h2>
        </div>
        <span className="hamster-badge" aria-label="Hamster Cloners owned">
          <WholeNumber value={hamsters} />
        </span>
      </div>
      <p className="card-copy">
        {getHamsterClonerDescription({
          hamsters,
          unionized,
          postUnionHamstersHired,
        })}
      </p>
      {unionStatus ? (
        <p
          className={
            `union-status ${unionized ? 'union-status-complete' : ''}`
          }
        >
          {unionStatus}
        </p>
      ) : null}
      <dl className="replicator-stats">
        <div>
          <dt>Columns planted / sec</dt>
          <dd>
            <FormattedNumber
              value={columnsBuiltPerSecond}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>Hamster coordination</dt>
          <dd>
            ×<FormattedNumber
              value={hamsterCoordinationMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>Field efficiency</dt>
          <dd>
            ×<FormattedNumber
              value={cropHamsterEfficiencyMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>External multipliers</dt>
          <dd>
            ×<FormattedNumber
              value={hamsterExternalMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
      </dl>
      <div className="replicator-summary next-lesson">
        <span>Next lesson</span>
        <strong>
          <FormattedNumber
            value={nextHamsterCost}
            maximumFractionDigits={0}
          />{' '}
          Crops
        </strong>
      </div>
    </>
  )
})

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
  const canAffordHamster = game.crops >= nextHamsterCost

  return (
    <article className="replicator-card">
      <HamsterDetails
        hamsters={game.hamsters}
        unionized={game.unionized}
        postUnionHamstersHired={game.postUnionHamstersHired}
        nextHamsterCost={nextHamsterCost}
        columnsBuiltPerSecond={columnsBuiltPerSecond}
        hamsterCoordinationMultiplier={hamsterCoordinationMultiplier}
        cropHamsterEfficiencyMultiplier={cropHamsterEfficiencyMultiplier}
        hamsterExternalMultiplier={hamsterExternalMultiplier}
        unionStatus={unionStatus}
        numberNotation={game.numberNotation}
        suffixScientificExponent={game.suffixScientificExponent}
      />
      <div className="hire-actions">
        <button
          type="button"
          className="primary-button"
          onClick={onBuyHamster}
          disabled={!canAffordHamster}
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
        {canAffordHamster ? (
          'Ready for a new recruit.'
        ) : (
          <>
            <FormattedNumber value={nextHamsterCost - game.crops} /> more Crops
            needed.
          </>
        )}
      </p>
    </article>
  )
}
