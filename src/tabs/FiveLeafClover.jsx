import { useState } from 'react'
import {
  FIVE_LEAF_FREE_BATCH_SIZE,
  FIVE_LEAF_MAX_BATCH_SIZE,
  FIVE_LEAF_MAXIMUM_INTERVAL_FACTOR,
  FIVE_LEAF_MINIMUM_ATTEMPT_SECONDS,
  FIVE_LEAF_MINIMUM_INTERVAL_FACTOR,
  FIVE_LEAF_MINIMUM_POINT_TIME_FACTOR,
  FIVE_LEAF_MINIMUM_SPAWN_SECONDS,
  getAvailableFiveLeafFortunes,
  getFiveLeafBatchEffectCount,
  getFiveLeafLoadoutCost,
  getFiveLeafPointBudget,
  getFiveLeafSchedule,
  normalizeFiveLeafState,
} from '../game/fiveLeafCloverLogic.js'
import {
  FORTUNE_OVERCHARGE_DURATION_SECONDS,
  FORTUNE_OVERCHARGE_STRENGTH_STEP,
  getFortuneEffect,
} from '../game/fortuneLogic.js'
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

function BatchSizeInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const parsed = Number(draft)
    const next = draft.trim() !== '' && Number.isFinite(parsed)
      ? Math.min(FIVE_LEAF_MAX_BATCH_SIZE, Math.max(1, Math.floor(parsed)))
      : value
    setDraft(String(next))
    if (next !== value) onCommit(next)
  }

  return (
    <input
      type="number"
      aria-label="Base batch size"
      aria-describedby="five-leaf-batch-help"
      min="1"
      max={FIVE_LEAF_MAX_BATCH_SIZE}
      step="1"
      inputMode="numeric"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

export function FiveLeafClover({ game, onSelectLoadout, onUpdateLoadout }) {
  const state = normalizeFiveLeafState(game.fortune?.fiveLeaf, game)
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
      <p className="five-leaf-help">
        Fortune durations and Clover appearance timers pause while you are away.
        Temporary fortunes do not boost offline production.
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
          Switching or editing the active loadout clears pending bundles and spawn
          progress, but keeps active effects and their remaining durations.
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
          <dt>Loadout overload</dt>
          <dd>
            {schedule.overloadFactor > 1
              ? `×${schedule.overloadFactor.toFixed(2)} time`
              : 'None'}
          </dd>
        </div>
      </dl>
      <p className="five-leaf-help five-leaf-point-help">
        Each earned Hamster Treat grants 1 Fortune point, without spending treats.
        Used points set appearance time linearly, down to ×
        {FIVE_LEAF_MINIMUM_POINT_TIME_FACTOR}; this loadout is at ×
        <FormattedNumber value={schedule.pointTimeFactor} maximumFractionDigits={3} />.
        Allocating beyond your points adds overload separately.
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
              <strong>Base batch size</strong>
              <strong><FormattedNumber value={getFiveLeafBatchEffectCount(loadout)} /> effects per batch</strong>
            </span>
            <BatchSizeInput
              key={`${state.activeLoadoutIndex}:${loadout.batchSize}`}
              value={loadout.batchSize}
              onCommit={(batchSize) => onUpdateLoadout(state.activeLoadoutIndex, {
                batchSize,
              })}
            />
            <small id="five-leaf-batch-help">
              Select 1 to <FormattedNumber value={FIVE_LEAF_MAX_BATCH_SIZE} /> base effects,
              plus <FormattedNumber value={FIVE_LEAF_FREE_BATCH_SIZE} /> free effect per batch.
              One collectible batch rolls all its effects at once.
              Waiting time scales linearly with the base size only.
              Press Enter or leave the input to apply.
            </small>
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
          the adjusted {formatDuration(schedule.baseSeconds)} base interval or{' '}
          {FIVE_LEAF_MINIMUM_SPAWN_SECONDS}s, whichever is later. A batch is
          guaranteed by {FIVE_LEAF_MAXIMUM_INTERVAL_FACTOR}× that interval,
          never sooner than {FIVE_LEAF_MINIMUM_SPAWN_SECONDS}s. Attempts are at
          least {FIVE_LEAF_MINIMUM_ATTEMPT_SECONDS}s apart and pause while a
          batch is on screen.
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
        <p className="five-leaf-help">
          Timed fortunes overcharge as their stored duration grows past{' '}
          <FormattedNumber value={FORTUNE_OVERCHARGE_DURATION_SECONDS} />s.
          Strength p = duration / <FormattedNumber value={FORTUNE_OVERCHARGE_DURATION_SECONDS} />,
          rounded down in <FormattedNumber value={FORTUNE_OVERCHARGE_STRENGTH_STEP} /> steps, with a minimum of 1.
          Multipliers become their base value ^p and timers run at ×2^(p − 1).
          Leek Cookie instead scales its bonus above 1 linearly: 1 + 0.2 × p.
          Strength and timer speed fall as duration is consumed. Split and Mirage do not overcharge.
        </p>
        <div className="five-leaf-fortunes">
          {getAvailableFiveLeafFortunes(game).map(({ id, pointCost }) => {
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
                  {effect.durationSeconds > 0 ? (
                    <small>Lasts {formatDuration(effect.durationSeconds)} · repeat rolls extend the timer</small>
                  ) : null}
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
          Rabbit&apos;s Fortune and further crop-themed Fortune Cookies will join this
          effect list when available.
        </p>
      </section>
    </section>
  )
}
