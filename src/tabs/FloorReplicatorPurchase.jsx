import { memo } from 'react'
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
          <p className="eyebrow">Shared machinery</p>
          <h2>Floor Replicators</h2>
        </div>
        <span className="hamster-badge" aria-label="Floor Replicators owned">
          <WholeNumber value={floorReplicators} />
        </span>
      </div>
      <p className="card-copy">
        Floor Replicators follow you between field areas. Each supplies a base
        0.1 Floors per second, and their effectiveness grows by 1.5% per
        Replicator.
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
          <dt>Replicator effectiveness</dt>
          <dd>
            ×<FormattedNumber
              value={floorReplicatorCoordinationMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
      </dl>
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
