import { FormattedNumber, WholeNumber } from './ui.jsx'
import { formatPlaytime } from './uiHelpers.js'

export function Statistics({
  game,
  unlockedCropIds,
  cloverBundleChancePerMinute,
}) {
  return (
    <section className="inventions-panel statistics-panel" aria-labelledby="statistics-title">
      <p className="eyebrow">Lifetime progress</p>
      <h1 id="statistics-title">Statistics</h1>
      <p className="inventions-intro">
        These counters persist through field resets and blueprint changes.
      </p>
      <dl className="statistics-grid">
        <div>
          <dt>Crops made</dt>
          <dd>
            <FormattedNumber value={game.totalCropsMade} maximumFractionDigits={2} />
          </dd>
        </div>
        <div>
          <dt>Hamsters hired</dt>
          <dd>
            <WholeNumber value={game.totalHamstersHired} />
          </dd>
        </div>
        <div>
          <dt>Crops unlocked</dt>
          <dd>
            <FormattedNumber value={unlockedCropIds.length} maximumFractionDigits={0} />
          </dd>
        </div>
        <div>
          <dt>Crops perfected</dt>
          <dd>
            <FormattedNumber value={game.completedCropPerfections.length} maximumFractionDigits={0} />
          </dd>
        </div>
        <div>
          <dt>Rabbit contracts completed</dt>
          <dd>
            <FormattedNumber value={game.trade?.rabbitContractsCompleted ?? 0} maximumFractionDigits={0} />
          </dd>
        </div>
        <div>
          <dt>Clover Bundle chance per minute</dt>
          <dd>
            <FormattedNumber
              value={cloverBundleChancePerMinute * 100}
              maximumFractionDigits={2}
            />
            %
          </dd>
        </div>
        <div className="statistics-playtime">
          <dt>Playtime</dt>
          <dd>{formatPlaytime(game.playtimeSeconds)}</dd>
        </div>
      </dl>
    </section>
  )
}
