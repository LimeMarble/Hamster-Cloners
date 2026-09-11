import {
  FORTUNES_WRATH_CROP_DIVISOR,
  FORTUNES_WRATH_CROP_EXPONENT,
  FORTUNES_WRATH_PASSIVE_MULTIPLIER,
} from '../game/gameLogic.js'
import { FormattedNumber } from './ui.jsx'

export function MisfortuneStatus() {
  return (
    <aside className="misfortune-status" aria-label="Fortune's Wrath">
      <strong>Fortune&apos;s Wrath</strong>
      <span>
        Crop production /<FormattedNumber value={FORTUNES_WRATH_CROP_DIVISOR} />
        , then ^
        <FormattedNumber
          value={FORTUNES_WRATH_CROP_EXPONENT}
          maximumFractionDigits={2}
        />
      </span>
      <span>Machinery costs ×100</span>
      <span>Blueprint Rows −1</span>
      <span>Blueprint Columns −1</span>
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

export function Misfortune({
  unfortunateRow,
  hasUnfortunateRow,
  canUnlockUnfortunateRow,
  onUnlockUnfortunateRow,
  rushedStart,
  hasRushedStart,
  canUnlockRushedStart,
  onUnlockRushedStart,
  adversityGrownTubers,
  hasAdversityGrownTubers,
  canUnlockAdversityGrownTubers,
  onUnlockAdversityGrownTubers,
  onLeave,
}) {
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
      <div className="misfortune-upgrades">
        <p className="eyebrow">Permanent upgrades</p>
        <article className="misfortune-upgrade-card">
          <div>
            <h2>Unfortunate Row</h2>
            <p>
              Crop production /1.25 in both areas. Purchasing resets Crops
              and field growth in both areas, then gives the blueprints in
              both areas one permanent Row.
            </p>
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={unfortunateRow.cost} /> Crops.
              This choice is permanent until Misfortune progress is wiped.
            </p>
          </div>
          <button
            type="button"
            className={hasUnfortunateRow ? 'secondary-button' : 'primary-button'}
            onClick={onUnlockUnfortunateRow}
            disabled={hasUnfortunateRow || !canUnlockUnfortunateRow}
          >
            {hasUnfortunateRow
              ? 'Accepted'
              : canUnlockUnfortunateRow
                ? 'Accept Unfortunate Row'
                : (
                    <>
                      Need <FormattedNumber value={unfortunateRow.cost} /> Crops
                    </>
                  )}
          </button>
        </article>
        <article className="misfortune-upgrade-card">
          <div>
            <h2>Rushed Start</h2>
            <p>
              After every field reset, external Column, Row, and Floor
              production is ×10 for 60 seconds, then ÷2 for 60 seconds before
              returning to normal. This applies in both field areas.
            </p>
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={rushedStart.cost} /> Crops. This
              choice is permanent until Misfortune progress is wiped.
            </p>
          </div>
          <button
            type="button"
            className={hasRushedStart ? 'secondary-button' : 'primary-button'}
            onClick={onUnlockRushedStart}
            disabled={hasRushedStart || !canUnlockRushedStart}
          >
            {hasRushedStart
              ? 'Accepted'
              : canUnlockRushedStart
                ? 'Accept Rushed Start'
                : (
                    <>
                      Need <FormattedNumber value={rushedStart.cost} /> Crops
                    </>
                  )}
          </button>
        </article>
        <article className="misfortune-upgrade-card">
          <div>
            <h2>Adversity-Grown Tubers</h2>
            <p>
              Unlocks Sweet Potato modifications within Seed Augmentation.
              This research does not alter Sweet Potatoes by itself.
            </p>
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={adversityGrownTubers.cost} />
              {' '}Crops. This choice is permanent until Misfortune progress
              is wiped.
            </p>
          </div>
          <button
            type="button"
            className={
              hasAdversityGrownTubers
                ? 'secondary-button'
                : 'primary-button'
            }
            onClick={onUnlockAdversityGrownTubers}
            disabled={
              hasAdversityGrownTubers || !canUnlockAdversityGrownTubers
            }
          >
            {hasAdversityGrownTubers
              ? 'Accepted'
              : canUnlockAdversityGrownTubers
                ? 'Study adversity-grown tubers'
                : (
                    <>
                      Need{' '}
                      <FormattedNumber value={adversityGrownTubers.cost} />
                      {' '}Crops
                    </>
                  )}
          </button>
        </article>
      </div>
      <button type="button" className="secondary-button" onClick={onLeave}>
        Return to main field
      </button>
    </section>
  )
}
