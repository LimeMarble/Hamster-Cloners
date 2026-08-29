import { memo } from 'react'
import { FormattedNumber, WholeNumber } from './ui.jsx'

const DuplicatorDetails = memo(function DuplicatorDetails({
  rowDuplicators,
  nextRowDuplicatorCost,
  rowDuplicatorEffectivenessMultiplier,
  rowDuplicatorCoordinationMultiplier,
  rowDuplicatorExternalMultiplier,
  rowsBuiltPerSecond,
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Income engine</p>
          <h2>Row Duplicators</h2>
        </div>
        <span className="hamster-badge" aria-label="Row Duplicators owned">
          <WholeNumber value={rowDuplicators} />
        </span>
      </div>
      <p className="card-copy">
        Row Duplicators are the only source of farmland Rows. Each supplies a
        base 0.1 Rows per second, and their coordination grows by 2% per
        Duplicator.
      </p>
      <dl className="replicator-stats">
        <div>
          <dt>Rows built / sec</dt>
          <dd>
            <FormattedNumber
              value={rowsBuiltPerSecond}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>Duplicator coordination</dt>
          <dd>
            x<FormattedNumber
              value={rowDuplicatorCoordinationMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>Duplicator effectiveness</dt>
          <dd>
            ×<FormattedNumber
              value={rowDuplicatorEffectivenessMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
        <div>
          <dt>External multipliers</dt>
          <dd>
            ×<FormattedNumber
              value={rowDuplicatorExternalMultiplier}
              maximumFractionDigits={2}
            />
          </dd>
        </div>
      </dl>
      <div className="replicator-summary next-lesson">
        <span>Next duplicator</span>
        <strong>
          <FormattedNumber
            value={nextRowDuplicatorCost}
            maximumFractionDigits={0}
          />{' '}
          Crops
        </strong>
      </div>
    </>
  )
})

export function DuplicatorPurchase({
  game,
  nextRowDuplicatorCost,
  rowDuplicatorEffectivenessMultiplier,
  rowDuplicatorCoordinationMultiplier,
  rowDuplicatorExternalMultiplier,
  rowsBuiltPerSecond,
  onBuyRowDuplicator,
  onBuyMaxRowDuplicators,
}) {
  const canAffordDuplicator = game.crops >= nextRowDuplicatorCost

  return (
    <article className="replicator-card row-duplicator-upgrade-card">
      <DuplicatorDetails
        rowDuplicators={game.rowDuplicators}
        nextRowDuplicatorCost={nextRowDuplicatorCost}
        rowDuplicatorEffectivenessMultiplier={
          rowDuplicatorEffectivenessMultiplier
        }
        rowDuplicatorCoordinationMultiplier={
          rowDuplicatorCoordinationMultiplier
        }
        rowDuplicatorExternalMultiplier={rowDuplicatorExternalMultiplier}
        rowsBuiltPerSecond={rowsBuiltPerSecond}
        numberNotation={game.numberNotation}
        suffixScientificExponent={game.suffixScientificExponent}
      />
      <div className="hire-actions">
        <button
          type="button"
          className="primary-button"
          onClick={onBuyRowDuplicator}
          disabled={!canAffordDuplicator}
        >
          Build Row Duplicator
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onBuyMaxRowDuplicators}
          disabled={!canAffordDuplicator}
        >
          Buy max
        </button>
      </div>
      <p className="affordability" aria-live="polite">
        {canAffordDuplicator ? (
          'Ready to build another Row generator.'
        ) : (
          <>
            <FormattedNumber value={nextRowDuplicatorCost - game.crops} /> more
            Crops needed.
          </>
        )}
      </p>
    </article>
  )
}
