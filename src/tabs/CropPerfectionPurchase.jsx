import { FormattedNumber } from './ui.jsx'

export function CropPerfectionPurchase({
  game,
  eyebrow,
  perfection,
  description,
  isComplete,
  canUnlock,
  onUnlock,
}) {
  return (
    <>
      <article className="invention-card crop-perfection-card">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{perfection.name}</h2>
          <p>{description}</p>
        </div>
        {isComplete ? (
          <span className="invention-complete">Perfected</span>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={onUnlock}
            disabled={!canUnlock}
          >
            Spend{' '}
            <FormattedNumber
              value={perfection.cost}
              maximumFractionDigits={0}
            />{' '}
            Crops
          </button>
        )}
      </article>
      {!isComplete ? (
        <p className="invention-progress">
          <FormattedNumber
            value={Math.min(game.crops, perfection.cost)}
            maximumFractionDigits={0}
          />{' '}
          /{' '}
          <FormattedNumber
            value={perfection.cost}
            maximumFractionDigits={0}
          />{' '}
          Crops
        </p>
      ) : null}
    </>
  )
}
