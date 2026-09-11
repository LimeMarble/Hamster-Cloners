import { memo } from 'react'
import { FLOOR_REPLICATOR_COST_TIER_SIZE } from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

const FloorReplicatorDetails = memo(function FloorReplicatorDetails({
  floorReplicators,
  nextFloorReplicatorCost,
  floorReplicatorCoordinationMultiplier,
  floorsBuiltPerSecond,
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Misfortune machinery</p>
          <h2>Floor Replicators</h2>
        </div>
        <span className="hamster-badge" aria-label="Floor Replicators owned">
          <WholeNumber value={floorReplicators} />
        </span>
      </div>
      <p className="card-copy">
        Floor Replicators follow you between field areas, but can initially
        only be built in Misfortune. Each supplies a base 0.1 Floors per
        second. Every ten Replicators multiply their effectiveness by 2 and
        the price of the next tier by 10.
      </p>
      <dl className="replicator-stats">
        <div>
          <dt>Floors built / sec</dt>
          <dd>
            <FormattedNumber
              value={floorsBuiltPerSecond}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>Tier effectiveness</dt>
          <dd>
            ×<FormattedNumber
              value={floorReplicatorCoordinationMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
      </dl>
      <p className="card-copy">
        Next ×2 tier at{' '}
        <WholeNumber
          value={
            (Math.floor(floorReplicators / FLOOR_REPLICATOR_COST_TIER_SIZE) +
              1) *
            FLOOR_REPLICATOR_COST_TIER_SIZE
          }
        />{' '}
        Floor Replicators.
      </p>
      <div className="replicator-summary next-lesson">
        <span>Next replicator</span>
        <strong>
          <FormattedNumber
            value={nextFloorReplicatorCost}
            maximumFractionDigits={0}
          />{' '}
          Crops
        </strong>
      </div>
    </>
  )
})

export function FloorReplicatorPurchase({
  game,
  nextFloorReplicatorCost,
  floorReplicatorCoordinationMultiplier,
  floorsBuiltPerSecond,
  onBuyFloorReplicator,
  onBuyMaxFloorReplicators,
}) {
  const canAfford = game.crops >= nextFloorReplicatorCost

  return (
    <article className="replicator-card floor-replicator-upgrade-card">
      <FloorReplicatorDetails
        floorReplicators={game.floorReplicators}
        nextFloorReplicatorCost={nextFloorReplicatorCost}
        floorReplicatorCoordinationMultiplier={
          floorReplicatorCoordinationMultiplier
        }
        floorsBuiltPerSecond={floorsBuiltPerSecond}
      />
      <div className="hire-actions">
        <button
          type="button"
          className="primary-button"
          onClick={onBuyFloorReplicator}
          disabled={!canAfford}
        >
          Build Floor Replicator
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onBuyMaxFloorReplicators}
          disabled={!canAfford}
        >
          Buy max
        </button>
      </div>
      <p className="affordability" aria-live="polite">
        {canAfford ? (
          'Ready to build another Floor generator.'
        ) : (
          <>
            <FormattedNumber value={nextFloorReplicatorCost - game.crops} />{' '}
            more Crops needed.
          </>
        )}
      </p>
    </article>
  )
}
