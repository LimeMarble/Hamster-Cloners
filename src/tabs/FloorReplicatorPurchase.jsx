import { memo } from 'react'
import { FLOOR_REPLICATOR_COST_TIER_SIZE } from '../game/gameLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

const FloorReplicatorDetails = memo(function FloorReplicatorDetails({
  floorReplicators,
  nextFloorReplicatorCost,
  floorReplicatorCoordinationMultiplier,
  floorReplicatorEffectivenessMultiplier,
  floorReplicatorExternalMultiplier,
  floorsBuiltPerSecond,
  canPurchaseFloorReplicators,
  hasFloorReplicatorSupport,
  isFloorReplicatorSupportMode,
  floorReplicatorSupportPassiveEffectBonus,
  onToggleFloorReplicatorMode,
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
        second. Every ten Replicators multiply their effectiveness by 2.
        Tier prices grow by ×10 until 500 Replicators; afterward, the next
        growth factor rises by a further +5, +10, +15, and so on each tier.
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
        <div>
          <dt>Crop effectiveness</dt>
          <dd>
            ×<FormattedNumber
              value={floorReplicatorEffectivenessMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>External multipliers</dt>
          <dd>
            ×<FormattedNumber
              value={floorReplicatorExternalMultiplier}
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
      {hasFloorReplicatorSupport ? (
        <div className="replicator-mode-control">
          <p className="eyebrow">Operating mode</p>
          <div
            className="hire-actions"
            role="group"
            aria-label="Floor Replicator mode"
          >
            <button
              type="button"
              className={
                isFloorReplicatorSupportMode
                  ? 'secondary-button'
                  : 'primary-button'
              }
              onClick={onToggleFloorReplicatorMode}
              disabled={!isFloorReplicatorSupportMode}
            >
              Construction
            </button>
            <button
              type="button"
              className={
                isFloorReplicatorSupportMode
                  ? 'primary-button'
                  : 'secondary-button'
              }
              onClick={onToggleFloorReplicatorMode}
              disabled={isFloorReplicatorSupportMode}
            >
              Support
            </button>
          </div>
          <p className="card-copy">
            {isFloorReplicatorSupportMode
              ? <>
                  Floor construction is paused. Support grants
                  {' '}+<FormattedNumber
                    value={floorReplicatorSupportPassiveEffectBonus * 100}
                  />% Crop passive effects.
                </>
              : 'Floor Replicators are constructing Floors normally.'}
          </p>
        </div>
      ) : null}
      <div className="replicator-summary next-lesson">
        <span>
          {canPurchaseFloorReplicators ? 'Next replicator' : 'Construction'}
        </span>
        <strong>
          {canPurchaseFloorReplicators ? (
            <>
              <FormattedNumber
                value={nextFloorReplicatorCost}
                maximumFractionDigits={0}
              />{' '}
              Crops
            </>
          ) : (
            'Misfortune only'
          )}
        </strong>
      </div>
    </>
  )
})

export function FloorReplicatorPurchase({
  game,
  nextFloorReplicatorCost,
  floorReplicatorCoordinationMultiplier,
  floorReplicatorEffectivenessMultiplier,
  floorReplicatorExternalMultiplier,
  floorsBuiltPerSecond,
  canPurchaseFloorReplicators,
  hasFloorReplicatorSupport,
  isFloorReplicatorSupportMode,
  floorReplicatorSupportPassiveEffectBonus,
  onBuyFloorReplicator,
  onBuyMaxFloorReplicators,
  onToggleFloorReplicatorMode,
}) {
  const canAfford =
    canPurchaseFloorReplicators && game.crops >= nextFloorReplicatorCost

  return (
    <article className="replicator-card floor-replicator-upgrade-card">
      <FloorReplicatorDetails
        floorReplicators={game.floorReplicators}
        nextFloorReplicatorCost={nextFloorReplicatorCost}
        floorReplicatorCoordinationMultiplier={
          floorReplicatorCoordinationMultiplier
        }
        floorReplicatorEffectivenessMultiplier={
          floorReplicatorEffectivenessMultiplier
        }
        floorReplicatorExternalMultiplier={
          floorReplicatorExternalMultiplier
        }
        floorsBuiltPerSecond={floorsBuiltPerSecond}
        canPurchaseFloorReplicators={canPurchaseFloorReplicators}
        hasFloorReplicatorSupport={hasFloorReplicatorSupport}
        isFloorReplicatorSupportMode={isFloorReplicatorSupportMode}
        floorReplicatorSupportPassiveEffectBonus={
          floorReplicatorSupportPassiveEffectBonus
        }
        onToggleFloorReplicatorMode={onToggleFloorReplicatorMode}
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
        {!canPurchaseFloorReplicators ? (
          'Return to Misfortune to build more Floor Replicators.'
        ) : canAfford ? (
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
