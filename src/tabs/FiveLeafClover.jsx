import { useState } from 'react'
import {
  FIVE_LEAF_FORTUNES,
  getFiveLeafLoadoutCost,
  getFiveLeafPointBudget,
  getFiveLeafSchedule,
  normalizeFiveLeafState,
} from '../game/fiveLeafCloverLogic.js'
import { getFortuneEffect } from '../game/fortuneLogic.js'
import { FormattedNumber } from './ui.jsx'

export function FiveLeafClover({ game, onSelectLoadout, onUpdateLoadout }) {
  const [activeSection, setActiveSection] = useState('loadouts')
  const state = normalizeFiveLeafState(game.fortune?.fiveLeaf)
  const pointBudget = getFiveLeafPointBudget(game)
  const loadout = state.loadouts[state.activeLoadoutIndex]
  const spent = getFiveLeafLoadoutCost(loadout)
  const schedule = getFiveLeafSchedule(loadout, pointBudget)
  const allocated = Object.values(loadout.allocations).reduce(
    (total, percent) => total + percent, 0,
  )

  return (
    <section className="five-leaf-panel" aria-labelledby="five-leaf-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Clover perfection</p>
          <h1 id="five-leaf-title">5-Leaf Clover</h1>
        </div>
        <span className="invention-complete">Fortunes awakened</span>
      </div>
      <p>
        Your clover now survives Misfortune. Choose the fortunes it can grant
        and how many bundles arrive together. Unassigned chance becomes
        Fortune&apos;s Mirage.
      </p>
      <nav className="invention-tabs" aria-label="5-Leaf Clover sections">
        <button type="button" className={`invention-tab ${activeSection === 'loadouts' ? 'invention-tab-active' : ''}`} onClick={() => setActiveSection('loadouts')}>Loadouts</button>
        <button type="button" className={`invention-tab ${activeSection === 'rabbits' ? 'invention-tab-active' : ''}`} onClick={() => setActiveSection('rabbits')}>Rabbit&apos;s Fortune</button>
        <button type="button" className={`invention-tab ${activeSection === 'cookies' ? 'invention-tab-active' : ''}`} onClick={() => setActiveSection('cookies')}>Fortune Cookies</button>
      </nav>
      {activeSection === 'loadouts' ? (
        <>
          <div className="five-leaf-loadouts" aria-label="Clover loadouts">
            {state.loadouts.map((option, index) => (
              <button
                key={index}
                type="button"
                className={`invention-tab ${index === state.activeLoadoutIndex ? 'invention-tab-active' : ''}`}
                onClick={() => onSelectLoadout(index)}
              >
                {option.name}
              </button>
            ))}
          </div>
          <p className="five-leaf-points">
            Fortune points: <FormattedNumber value={spent} maximumFractionDigits={0} /> /{' '}
            <FormattedNumber value={pointBudget} maximumFractionDigits={0} />
            <small>Earn 50 per completed demonstration and 25 per distinct fortune used.</small>
            {schedule.overloadFactor > 1 ? (
              <small>Overloaded: appearances take ×{schedule.overloadFactor.toFixed(2)} longer.</small>
            ) : null}
          </p>
          <div className="five-leaf-settings">
            <label>
              <span>Spawn chance: {loadout.chancePercent}%</span>
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
            </label>
            <label>
              <span>Bundles per appearance</span>
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
            </label>
          </div>
          <p className="five-leaf-note">
            Lower spawn chance means more frequent attempts. Larger batches
            take longer to arrive. Changing an active loadout or switching
            loadouts clears its current bundles, effects, and spawn progress.
          </p>
          <div className="five-leaf-fortunes">
            {FIVE_LEAF_FORTUNES.map(({ id, pointCost }) => {
              const effect = getFortuneEffect(id)
              const percentage = loadout.allocations[id]
              const otherPercent = allocated - percentage
              const maximum = 100 - otherPercent

              return (
                <label className="five-leaf-fortune" key={id}>
                  <span className="five-leaf-fortune-heading">
                    <strong>{effect.icon} {effect.name}</strong>
                    <span>{percentage}%</span>
                  </span>
                  <small>{effect.description} · {pointCost} {pointCost === 1 ? 'point' : 'points'} per 1%</small>
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
                </label>
              )
            })}
            <div className="five-leaf-fortune five-leaf-mirage">
              <strong>… Fortune&apos;s Mirage</strong>
              <span>{100 - allocated}% · free</span>
            </div>
          </div>
        </>
      ) : (
        <p className="five-leaf-note">
          {activeSection === 'rabbits'
            ? 'Rabbit\'s Fortune is not available yet.'
            : 'Crop-themed Fortune Cookies are not available yet.'}
        </p>
      )}
    </section>
  )
}
