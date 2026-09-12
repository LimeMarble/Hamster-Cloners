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
        Base Crop passives −
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
  fortunateColumn,
  hasFortunateColumn,
  canUnlockFortunateColumn,
  onUnlockFortunateColumn,
  rushedStart,
  hasRushedStart,
  canUnlockRushedStart,
  onUnlockRushedStart,
  adversityGrownTubers,
  hasAdversityGrownTubers,
  canUnlockAdversityGrownTubers,
  onUnlockAdversityGrownTubers,
  burdenedFoundations,
  hasBurdenedFoundations,
  canUnlockBurdenedFoundations,
  onUnlockBurdenedFoundations,
  nourishingMisery,
  hasNourishingMisery,
  canUnlockNourishingMisery,
  onUnlockNourishingMisery,
  huntForSomethingGreater,
  hasHuntForSomethingGreater,
  canUnlockHuntForSomethingGreater,
  huntForSomethingGreaterMultiplier,
  missingMisfortuneCropTypeCount,
  onUnlockHuntForSomethingGreater,
  finalSupport,
  hasFinalSupport,
  canUnlockFinalSupport,
  onUnlockFinalSupport,
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
              This choice is permanent.
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
              choice is permanent.
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
              {' '}Crops. This choice is permanent.
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
        <article className="misfortune-upgrade-card">
          <div>
            <h2>{burdenedFoundations.name}</h2>
            <p>
              Unlocks Construction and Support modes for Floor Replicators.
              Support pauses Floor production and additively grants +
              {burdenedFoundations.passiveEffectBonusPerTier * 100}% Crop
              passive effects for every complete tier of{' '}
              {burdenedFoundations.floorReplicatorsPerTier} Floor Replicators.
            </p>
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={burdenedFoundations.cost} />
              {' '}Crops. This choice is permanent.
            </p>
          </div>
          <button
            type="button"
            className={
              hasBurdenedFoundations
                ? 'secondary-button'
                : 'primary-button'
            }
            onClick={onUnlockBurdenedFoundations}
            disabled={
              hasBurdenedFoundations || !canUnlockBurdenedFoundations
            }
          >
            {hasBurdenedFoundations
              ? 'Accepted'
              : canUnlockBurdenedFoundations
                ? 'Burden the foundations'
                : (
                    <>
                      Need{' '}
                      <FormattedNumber value={burdenedFoundations.cost} />
                      {' '}Crops
                    </>
                  )}
          </button>
        </article>
        <article className="misfortune-upgrade-card">
          <div>
            <h2>{nourishingMisery.name}</h2>
            <p>
              Unlocks the Leeching Vine modification for Leeching Gourd
              within Seed Augmentation. This research does not alter the
              Gourd by itself.
            </p>
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={nourishingMisery.cost} /> Crops.
              This choice is permanent.
            </p>
          </div>
          <button
            type="button"
            className={
              hasNourishingMisery ? 'secondary-button' : 'primary-button'
            }
            onClick={onUnlockNourishingMisery}
            disabled={
              hasNourishingMisery || !canUnlockNourishingMisery
            }
          >
            {hasNourishingMisery
              ? 'Accepted'
              : canUnlockNourishingMisery
                ? 'Study Gourd nourishment'
                : (
                    <>
                      Need{' '}
                      <FormattedNumber value={nourishingMisery.cost} /> Crops
                    </>
                  )}
          </button>
        </article>
        <article className="misfortune-upgrade-card">
          <div>
            <h2>{huntForSomethingGreater.name}</h2>
            <p>
              Multiplies Column, Row, and Floor production by 1 plus the
              number of Crop types available in the main field but still
              missing from Misfortune, then by the number of minutes since
              the last field reset. The time multiplier starts at ×1 and
              caps at ×{huntForSomethingGreater.maximumTimeMultiplier}.
              Main progression inherits the time multiplier with zero
              missing Crop types.
            </p>
            {hasHuntForSomethingGreater ? (
              <p>
                Current effect: ×
                <FormattedNumber
                  value={huntForSomethingGreaterMultiplier}
                  maximumFractionDigits={2}
                />{' '}
                production from{' '}
                <FormattedNumber
                  value={missingMisfortuneCropTypeCount}
                  maximumFractionDigits={0}
                />{' '}
                missing Crop types and the current run time.
              </p>
            ) : null}
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={huntForSomethingGreater.cost} />{' '}
              Crops. This choice is permanent.
            </p>
          </div>
          <button
            type="button"
            className={
              hasHuntForSomethingGreater
                ? 'secondary-button'
                : 'primary-button'
            }
            onClick={onUnlockHuntForSomethingGreater}
            disabled={
              hasHuntForSomethingGreater ||
              !canUnlockHuntForSomethingGreater
            }
          >
            {hasHuntForSomethingGreater
              ? 'Accepted'
              : canUnlockHuntForSomethingGreater
                ? 'Begin the hunt'
                : (
                    <>
                      Need{' '}
                      <FormattedNumber
                        value={huntForSomethingGreater.cost}
                      />{' '}
                      Crops
                    </>
                  )}
          </button>
        </article>
        <article className="misfortune-upgrade-card">
          <div>
            <h2>{fortunateColumn.name}</h2>
            <p>
              Crop production ×1.25 in both areas. Purchasing resets Crops
              and field growth in both areas, then gives the blueprints in
              both areas one permanent Column.
            </p>
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={fortunateColumn.cost} /> Crops.
              This choice is permanent until Misfortune progress is wiped.
            </p>
          </div>
          <button
            type="button"
            className={
              hasFortunateColumn ? 'secondary-button' : 'primary-button'
            }
            onClick={onUnlockFortunateColumn}
            disabled={hasFortunateColumn || !canUnlockFortunateColumn}
          >
            {hasFortunateColumn
              ? 'Accepted'
              : canUnlockFortunateColumn
                ? 'Accept Fortunate Column'
                : (
                    <>
                      Need <FormattedNumber value={fortunateColumn.cost} />{' '}
                      Crops
                    </>
                  )}
          </button>
        </article>
        <article className="misfortune-upgrade-card">
          <div>
            <h2>{finalSupport.name}</h2>
            <p>
              Adds +{finalSupport.passiveEffectBonusPerTier * 100}% Crop
              passive effects per complete tier of{' '}
              {finalSupport.floorReplicatorsPerTier} Floor Replicators while
              they operate in Support mode. It unlocks Support mode in the
              main field, where only this bonus applies. In Misfortune it
              stacks with Burdened Foundations for +
              {(finalSupport.passiveEffectBonusPerTier +
                burdenedFoundations.passiveEffectBonusPerTier) * 100}% per
              tier.
            </p>
            <p className="misfortune-upgrade-note">
              Cost: <FormattedNumber value={finalSupport.cost} /> Crops. This
              choice is permanent until Misfortune progress is wiped.
            </p>
          </div>
          <button
            type="button"
            className={hasFinalSupport ? 'secondary-button' : 'primary-button'}
            onClick={onUnlockFinalSupport}
            disabled={hasFinalSupport || !canUnlockFinalSupport}
          >
            {hasFinalSupport
              ? 'Accepted'
              : canUnlockFinalSupport
                ? 'Commit Final Support'
                : (
                    <>
                      Need <FormattedNumber value={finalSupport.cost} /> Crops
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
