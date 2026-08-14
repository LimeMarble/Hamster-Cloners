import {
  RABBIT_UNLOCKS,
  TRADE_ESTABLISHMENT_COST,
  hasRabbitUnlock,
} from '../game/gameLogic.js'
import { CROP_DEFINITIONS, getCropName } from '../game/crops.js'
import { FormattedNumber } from './ui.jsx'

function EstablishTradeCard({ game, onEstablishTrade }) {
  const canAfford = game.crops >= TRADE_ESTABLISHMENT_COST

  return (
    <article className="trade-establishment-card">
      <div>
        <p className="eyebrow">New gameplay system</p>
        <h2>Establish trade relations</h2>
        <p>
          Open a permanent trade route without resetting any progress. Your
          first trading partners will be the Rabbits.
        </p>
      </div>
      <div className="trade-establishment-action">
        <strong>
          <FormattedNumber
            value={TRADE_ESTABLISHMENT_COST}
            maximumFractionDigits={0}
          />{' '}
          Crops
        </strong>
        <button
          type="button"
          className="trade-primary-button"
          onClick={onEstablishTrade}
          disabled={!canAfford}
        >
          Establish relations
        </button>
      </div>
    </article>
  )
}

function RabbitContract({
  game,
  productionPerSecond,
  onClaimRabbitContract,
}) {
  const contract = game.trade.rabbitContract

  if (!contract) {
    return (
      <article className="rabbit-contract-card">
        <p>The Rabbits are preparing their next contract.</p>
      </article>
    )
  }

  const cropDefinition = CROP_DEFINITIONS[contract.cropId]
  const cropName = getCropName(
    contract.cropId,
    game.completedCropPerfections,
  )
  const progress = Math.min(
    1,
    Math.max(0, contract.progress / contract.requiredAmount),
  )
  const canClaim = contract.progress >= contract.requiredAmount

  return (
    <article className="rabbit-contract-card">
      <div className="rabbit-contract-heading">
        <div className="rabbit-contract-crop">
          <span aria-hidden="true">{cropDefinition?.icon ?? '🌾'}</span>
          <div>
            <p className="eyebrow">Active Rabbit contract</p>
            <h2>Deliver {cropName}</h2>
          </div>
        </div>
        <strong className="relations-reward">
          +<FormattedNumber
            value={contract.relationsReward}
            maximumFractionDigits={0}
          />{' '}
          relations
        </strong>
      </div>

      <p className="trade-copy">
        Contract progress counts this crop's real harvest while the contract is
        active.
      </p>

      <div
        className="rabbit-contract-track"
        role="progressbar"
        aria-label={`${cropName} contract progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 1000) / 10}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="rabbit-contract-values">
        <span>
          <FormattedNumber value={contract.progress} /> /{' '}
          <FormattedNumber value={contract.requiredAmount} /> {cropName}
        </span>
        <span>
          <FormattedNumber value={productionPerSecond} /> / sec
        </span>
      </div>

      <button
        type="button"
        className="trade-primary-button"
        onClick={onClaimRabbitContract}
        disabled={!canClaim}
      >
        {canClaim ? 'Complete contract' : 'Delivery in progress'}
      </button>
    </article>
  )
}

function RabbitUnlocks({ game, onPurchaseRabbitUnlock }) {
  return (
    <section className="rabbit-unlocks" aria-labelledby="rabbit-unlocks-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Spend Rabbit relations</p>
          <h2 id="rabbit-unlocks-title">Rabbit unlocks</h2>
        </div>
      </div>
      <div className="rabbit-unlock-grid">
        {RABBIT_UNLOCKS.map((unlock) => {
          const isPurchased = hasRabbitUnlock(game, unlock.id)
          const canAfford = game.trade.rabbitRelations >= unlock.cost

          return (
            <article
              className={`rabbit-unlock-card ${
                isPurchased ? 'rabbit-unlock-purchased' : ''
              }`}
              key={unlock.id}
            >
              <div>
                <h3>{unlock.name}</h3>
                <p>{unlock.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onPurchaseRabbitUnlock(unlock.id)}
                disabled={isPurchased || !canAfford}
              >
                {isPurchased ? (
                  'Unlocked'
                ) : (
                  <>
                    <FormattedNumber
                      value={unlock.cost}
                      maximumFractionDigits={0}
                    />{' '}
                    relations
                  </>
                )}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function Trade({
  game,
  rabbitContractProductionPerSecond,
  onEstablishTrade,
  onClaimRabbitContract,
  onPurchaseRabbitUnlock,
}) {
  return (
    <section className="trade-panel" aria-labelledby="trade-title">
      <header className="trade-header">
        <div>
          <p className="eyebrow">Inter-farm exchange</p>
          <h1 id="trade-title">Trade</h1>
          <p className="trade-copy">
            Fulfill crop-specific contracts and spend the relations you earn
            on permanent unlocks.
          </p>
        </div>
        {game.trade.established ? (
          <div className="relations-balance">
            <span>Rabbit relations</span>
            <strong>
              <FormattedNumber
                value={game.trade.rabbitRelations}
                maximumFractionDigits={0}
              />
            </strong>
          </div>
        ) : null}
      </header>

      {game.trade.established ? (
        <>
          <section className="trading-group" aria-labelledby="rabbits-title">
            <div className="trading-group-title">
              <span aria-hidden="true">🐇</span>
              <div>
                <p className="eyebrow">Trading partner</p>
                <h2 id="rabbits-title">Rabbits</h2>
              </div>
            </div>
            <RabbitContract
              game={game}
              productionPerSecond={rabbitContractProductionPerSecond}
              onClaimRabbitContract={onClaimRabbitContract}
            />
          </section>
          <RabbitUnlocks
            game={game}
            onPurchaseRabbitUnlock={onPurchaseRabbitUnlock}
          />
        </>
      ) : (
        <EstablishTradeCard
          game={game}
          onEstablishTrade={onEstablishTrade}
        />
      )}
    </section>
  )
}
