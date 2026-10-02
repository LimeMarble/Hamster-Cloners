import { getBulkPurchaseQuote } from '../game/purchaseLogic.js'
import { FormattedNumber, WholeNumber } from './ui.jsx'

function BulkPurchaseButton({ quote, label, onClick }) {
  const unavailableText = quote.blockedReason === 'unionization'
    ? 'Hire the 1,000th separately'
    : quote.blockedReason === 'area' ? 'Misfortune only' : 'Unavailable'

  return (
    <button
      type="button"
      className="secondary-button bulk-purchase-button"
      onClick={onClick}
      disabled={!quote.canAfford}
    >
      <span>{label}</span>
      {quote.cost !== 0 ? <span className="bulk-purchase-cost">
        {quote.cost === null ? unavailableText : <>
          <FormattedNumber value={quote.cost} maximumFractionDigits={2} /> Crops
        </>}
      </span> : null}
      {quote.blockedReason && quote.cost !== null ? (
        <span className="bulk-purchase-shortfall">{unavailableText}</span>
      ) : null}
      {quote.shortfall > 0 ? (
        <span className="bulk-purchase-shortfall">
          <FormattedNumber value={quote.shortfall} maximumFractionDigits={2} /> more Crops needed
        </span>
      ) : null}
    </button>
  )
}

export function BulkPurchaseButtons({ game, kind, onBuyTen, onBuyMax }) {
  const tenQuote = getBulkPurchaseQuote(game, kind, 10)
  const maxQuote = getBulkPurchaseQuote(game, kind)

  return (
    <>
      <BulkPurchaseButton quote={tenQuote} label="Buy 10" onClick={onBuyTen} />
      <BulkPurchaseButton
        quote={maxQuote}
        label={maxQuote.quantity > 0
          ? <>Buy max (<WholeNumber value={maxQuote.quantity} />)</>
          : 'Buy max'}
        onClick={onBuyMax}
      />
    </>
  )
}
