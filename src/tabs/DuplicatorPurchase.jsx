import { FormattedNumber } from './ui.jsx'

export function DuplicatorPurchase({
  game,
  nextRowDuplicatorCost,
  rowDuplicatorEffectivenessMultiplier,
  rowDuplicatorCoordinationMultiplier,
  rowsBuiltPerSecond,
  fieldsPlantedPerSecond,
  onBuyRowDuplicator,
  onBuyMaxRowDuplicators,
}) {
  return (
    <article className="replicator-card row-duplicator-upgrade-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Income engine</p>
          <h2>Row Duplicators</h2>
        </div>
        <span className="hamster-badge" aria-label={`${game.rowDuplicators} Row Duplicators`}>
          {game.rowDuplicators}
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
            <FormattedNumber value={rowsBuiltPerSecond} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>Fields planted / sec</dt>
          <dd>
            <FormattedNumber value={fieldsPlantedPerSecond} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>Duplicator coordination</dt>
          <dd>
            x<FormattedNumber value={rowDuplicatorCoordinationMultiplier} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>Duplicator effectiveness</dt>
          <dd>
            ×<FormattedNumber value={rowDuplicatorEffectivenessMultiplier} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>Next cost</dt>
          <dd>
            <FormattedNumber value={nextRowDuplicatorCost} maximumFractionDigits={0} /> Crops
          </dd>
        </div>
      </dl>
      <div className="replicator-summary next-lesson">
        <span>Next duplicator</span>
        <strong>
          <FormattedNumber value={nextRowDuplicatorCost} maximumFractionDigits={0} /> Crops
        </strong>
      </div>
      <div className="hire-actions">
        <button
          type="button"
          className="primary-button"
          onClick={onBuyRowDuplicator}
          disabled={game.crops < nextRowDuplicatorCost}
        >
          Build Row Duplicator
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onBuyMaxRowDuplicators}
          disabled={game.crops < nextRowDuplicatorCost}
        >
          Buy max
        </button>
      </div>
      <p className="affordability" aria-live="polite">
        {game.crops >= nextRowDuplicatorCost ? (
          'Ready to build another Row generator.'
        ) : (
          <>
            <FormattedNumber value={nextRowDuplicatorCost - game.crops} /> more Crops needed.
          </>
        )}
      </p>
    </article>
  )
}
