import {
  FIVE_LEAF_MAXIMUM_INTERVAL_FACTOR,
  FIVE_LEAF_MINIMUM_INTERVAL_FACTOR,
  FIVE_LEAF_FORTUNES,
  getFiveLeafLoadoutCost,
  getFiveLeafPointBudget,
  getFiveLeafSchedule,
  normalizeFiveLeafState,
} from '../game/fiveLeafCloverLogic.js'
import { getFortuneEffect } from '../game/fortuneLogic.js'
import { FormattedNumber } from './ui.jsx'

const durationFormatter = new Intl.NumberFormat(undefined, {
  maximumSignificantDigits: 3,
})

function formatDuration(seconds) {
  if (seconds >= 86400) return `${durationFormatter.format(seconds / 86400)}d`
  if (seconds >= 3600) return `${durationFormatter.format(seconds / 3600)}h`
  if (seconds >= 60) return `${durationFormatter.format(seconds / 60)}min`
  return `${durationFormatter.format(seconds)}s`
}

export function FiveLeafClover({ game, onSelectLoadout, onUpdateLoadout }) {
  const state = normalizeFiveLeafState(game.fortune?.fiveLeaf)
  const pointBudget = getFiveLeafPointBudget(game)
  const loadout = state.loadouts[state.activeLoadoutIndex]
  const spent = getFiveLeafLoadoutCost(loadout)
  const schedule = getFiveLeafSchedule(loadout, pointBudget)
  const allocated = Object.values(loadout.allocations).reduce(
    (total, percent) => total + percent,
    0,
  )

  return (
    <section className="five-leaf-panel" aria-labelledby="five-leaf-title">
      <div className="section-heading five-leaf-heading">
        <div>
          <p className="eyebrow">Clover perfection</p>
          <h1 id="five-leaf-title">5-Leaf Clover</h1>
        </div>
        <span className="invention-complete">Assembled</span>
      </div>
      <p className="five-leaf-intro">
        Configure the fortunes granted by your Clover Bundles. The perfected
        clover can also be planted in Misfortune.
      </p>

      <section className="five-leaf-section" aria-labelledby="five-leaf-loadouts-title">
        <div className="five-leaf-section-heading">
          <div>
            <p className="eyebrow">Saved configurations</p>
            <h2 id="five-leaf-loadouts-title">Loadouts</h2>
          </div>
        </div>
        <div className="five-leaf-loadouts" aria-label="Clover loadouts">
          {state.loadouts.map((option, index) => (
            <button
              key={index}
              type="button"
              className={`five-leaf-loadout ${index === state.activeLoadoutIndex ? 'five-leaf-loadout-active' : ''}`}
              onClick={() => onSelectLoadout(index)}
              aria-pressed={index === state.activeLoadoutIndex}
            >
              {option.name}
            </button>
          ))}
        </div>
        <p className="five-leaf-help">
          Switching loadouts clears pending bundles, active effects, and spawn progress.
        </p>
      </section>

      <dl className="five-leaf-summary">
        <div>
          <dt>Fortune points</dt>
          <dd>
            <FormattedNumber value={spent} maximumFractionDigits={0} /> /{' '}
            <FormattedNumber value={pointBudget} maximumFractionDigits={0} />
          </dd>
        </div>
        <div>
          <dt>Unassigned chance</dt>
          <dd>{100 - allocated}%</dd>
        </div>
        <div>
          <dt>Loadout overload</dt>
          <dd>
            {schedule.overloadFactor > 1
              ? `×${schedule.overloadFactor.toFixed(2)} time`
              : 'None'}
          </dd>
        </div>
      </dl>
      <p className="five-leaf-help five-leaf-point-help">
        Earn 50 Fortune points per completed demonstration and 25 per distinct
        fortune used. Spending beyond your points makes bundles take longer to appear.
      </p>

      <section className="five-leaf-section" aria-labelledby="five-leaf-appearance-title">
        <div className="five-leaf-section-heading">
          <div>
            <p className="eyebrow">Active loadout</p>
            <h2 id="five-leaf-appearance-title">Appearance</h2>
          </div>
        </div>
        <div className="five-leaf-settings">
          <label className="five-leaf-control">
            <span className="five-leaf-control-heading">
              <strong>Spawn chance</strong>
              <strong>{loadout.chancePercent}%</strong>
            </span>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={loadout.chancePercent}
              onChange={(event) => onUpdateLoadout(state.activeLoadoutIndex, {
                chancePercent: Number(event.target.value),
              })}
            />
            <small>Lower chance means more frequent attempts.</small>
          </label>
          <label className="five-leaf-control">
            <span className="five-leaf-control-heading">
              <strong>Bundles per appearance</strong>
            </span>
            <select
              value={loadout.batchSize}
              onChange={(event) => onUpdateLoadout(state.activeLoadoutIndex, {
                batchSize: Number(event.target.value),
              })}
            >
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
            <small>Larger groups take longer to arrive.</small>
          </label>
        </div>
        <dl className="five-leaf-timing">
          <div>
            <dt>Attempt frequency</dt>
            <dd>Every {formatDuration(schedule.rollIntervalSeconds)}</dd>
          </div>
          <div>
            <dt>First attempt</dt>
            <dd>After {formatDuration(schedule.firstRollSeconds)}</dd>
          </div>
          <div>
            <dt>Guaranteed appearance</dt>
            <dd>By {formatDuration(schedule.maximumSeconds)}</dd>
          </div>
        </dl>
        <p className="five-leaf-help five-leaf-timing-help">
          The first attempt cannot happen before {FIVE_LEAF_MINIMUM_INTERVAL_FACTOR}×
          the {formatDuration(schedule.baseSeconds)} base interval. A bundle is
          guaranteed by {FIVE_LEAF_MAXIMUM_INTERVAL_FACTOR}× that interval.
          Attempts pause while a bundle is on screen.
        </p>
      </section>

      <section className="five-leaf-section" aria-labelledby="five-leaf-effects-title">
        <div className="five-leaf-section-heading">
          <div>
            <p className="eyebrow">Active loadout</p>
            <h2 id="five-leaf-effects-title">Fortune effects</h2>
          </div>
          <span className="five-leaf-allocation">{allocated}% allocated</span>
        </div>
        <p className="five-leaf-help">
          Assign chance to each effect. Any chance left over becomes Fortune&apos;s
          Mirage at no point cost.
        </p>
        <div className="five-leaf-fortunes">
          {FIVE_LEAF_FORTUNES.map(({ id, pointCost }) => {
            const effect = getFortuneEffect(id)
            const percentage = loadout.allocations[id]
            const maximum = 100 - (allocated - percentage)

            return (
              <label className="five-leaf-fortune" key={id}>
                <span className="five-leaf-fortune-icon" aria-hidden="true">
                  {effect.icon}
                </span>
                <span className="five-leaf-fortune-copy">
                  <strong>{effect.name}</strong>
                  <small>{effect.description}</small>
                  <small>{pointCost} {pointCost === 1 ? 'point' : 'points'} per 1%</small>
                </span>
                <span className="five-leaf-fortune-control">
                  <strong>{percentage}%</strong>
                  <input
                    type="range"
                    min="0"
                    max={maximum}
                    step="1"
                    value={Math.min(percentage, maximum)}
                    onChange={(event) => onUpdateLoadout(state.activeLoadoutIndex, {
                      allocations: { [id]: Number(event.target.value) },
                    })}
                  />
                </span>
              </label>
            )
          })}
          <div className="five-leaf-fortune five-leaf-mirage">
            <span className="five-leaf-fortune-icon" aria-hidden="true">…</span>
            <span className="five-leaf-fortune-copy">
              <strong>Fortune&apos;s Mirage</strong>
              <small>Nothing happens · free</small>
            </span>
            <strong className="five-leaf-mirage-chance">{100 - allocated}%</strong>
          </div>
        </div>
        <p className="five-leaf-help five-leaf-future-note">
          Rabbit&apos;s Fortune and crop-themed Fortune Cookies will join this
          effect list when available.
        </p>
      </section>
    </section>
  )
}
