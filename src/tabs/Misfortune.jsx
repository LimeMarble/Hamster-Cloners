import {
  FORTUNES_WRATH_PASSIVE_MULTIPLIER,
} from '../game/gameLogic.js'
import { FormattedNumber } from './ui.jsx'

export function MisfortuneStatus() {
  return (
    <aside className="misfortune-status" aria-label="Fortune's Wrath">
      <strong>Fortune&apos;s Wrath</strong>
      <span>
        Crop production /1.777M
      </span>
      <span>Machinery costs ×100</span>
      <span>
        Crop passives −
        <FormattedNumber
          value={(1 - FORTUNES_WRATH_PASSIVE_MULTIPLIER) * 100}
          maximumFractionDigits={0}
        />
        %
      </span>
      <span>Breezes of Fortune disabled</span>
    </aside>
  )
}

export function Misfortune({ onLeave }) {
  return (
    <section className="misfortune-panel" aria-labelledby="misfortune-title">
      <p className="eyebrow">Demonstration 2 challenge area</p>
      <h1 id="misfortune-title">Misfortune</h1>
      <p>
        This area keeps its own Crops, Hamsters, Row Duplicators, farmland,
        blueprints, paid Row and Column expansions, and milestone Crop
        unlocks. Floor Replicators and other permanent progression are shared
        with the main field.
      </p>
      <p>
        Its −1 Row and −1 Column modifiers offset the two Rabbit expansion
        rewards, so the untouched Misfortune blueprint begins at 1×1.
      </p>
      <div className="misfortune-upgrades-empty">
        <p className="eyebrow">Permanent upgrades</p>
        <h2>Nothing discovered yet</h2>
        <p>
          Misfortune upgrades will appear here once their effects and prices
          have been defined.
        </p>
      </div>
      <button type="button" className="secondary-button" onClick={onLeave}>
        Return to main field
      </button>
    </section>
  )
}
