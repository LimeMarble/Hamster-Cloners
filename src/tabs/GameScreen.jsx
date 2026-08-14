import { Blueprint } from './Blueprint.jsx'
import { DuplicatorPurchase } from './DuplicatorPurchase.jsx'
import { HamsterPurchase } from './HamsterPurchase.jsx'
import { Inventions } from './Inventions.jsx'
import { Options } from './Options.jsx'
import { Statistics } from './Statistics.jsx'
import { Trade } from './Trade.jsx'
import { FormattedNumber } from './ui.jsx'

function FieldScreen({
  game,
  productionPerSecond,
  blueprint,
  hamsterPurchase,
  duplicatorPurchase,
}) {
  return (
    <>
      <section className="hero-panel" id="main" aria-labelledby="game-title">
        <div>
          <p className="eyebrow">Current crop total</p>
          <h1 id="game-title">
            <FormattedNumber value={game.crops} /> Crops
          </h1>
          <p className="hero-copy">
            You are gaining <FormattedNumber value={productionPerSecond} /> Crops per second.
          </p>
        </div>
      </section>

      <section className="game-grid" aria-label="Farm controls">
        <Blueprint {...blueprint} />
        <HamsterPurchase {...hamsterPurchase} />
        {duplicatorPurchase ? (
          <DuplicatorPurchase {...duplicatorPurchase} />
        ) : null}
      </section>
    </>
  )
}

export function GameScreen({
  activeTab,
  field,
  inventions,
  trade,
  statistics,
  options,
}) {
  if (activeTab === 'field') {
    return <FieldScreen {...field} />
  }

  if (activeTab === 'inventions') {
    return <Inventions {...inventions} />
  }

  if (activeTab === 'trade') {
    return <Trade {...trade} />
  }

  if (activeTab === 'statistics') {
    return <Statistics {...statistics} />
  }

  return <Options {...options} />
}
