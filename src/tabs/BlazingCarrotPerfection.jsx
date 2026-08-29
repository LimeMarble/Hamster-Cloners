import { CROP_PERFECTIONS } from '../game/crops.js'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  hasCompletedCapybaraDemonstration,
} from '../game/gameLogic.js'
import { FormattedNumber } from './ui.jsx'

export function BlazingCarrotPerfection({
  game,
  canUnlock,
  hasUnlocked,
  onUnlock,
}) {
  const isVisible = hasCompletedCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
  )
  const revealSurveyEffect = hasCompletedCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
  )

  if (!isVisible) return null

  const perfection = CROP_PERFECTIONS.blazingCarrot

  return (
    <>
      <article className="invention-card crop-perfection-card">
        <div>
          <p className="eyebrow">Carrot perfection</p>
          <h2>{perfection.name}</h2>
          <p>
            Each active Blazing Carrot grants +10% Rabbit relations, +50%
            global harvest per log10 of total Rabbit relations earned (capped
            at +1,900%), and +25% global harvest per Crop type with at least{' '}
            <FormattedNumber value={1e12} maximumFractionDigits={0} /> harvest
            before this multiplier. Orthogonally adjacent Blazing Carrots burn
            each other, disabling their harvest and every passive.
          </p>
          {revealSurveyEffect ? (
            <p>
              Each active Blazing Carrot also shortens survey time by 2%. The
              contributing count is limited by log10 of total Rabbit relations
              earned, reaching its −80% hard cap at{' '}
              <FormattedNumber value={1e40} maximumFractionDigits={0} /> total
              Rabbit relations.
            </p>
          ) : null}
        </div>
        {hasUnlocked ? (
          <span className="invention-complete">Perfected</span>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={onUnlock}
            disabled={!canUnlock}
          >
            Spend{' '}
            <FormattedNumber
              value={perfection.cost}
              maximumFractionDigits={0}
            />{' '}
            Rabbit relations
          </button>
        )}
      </article>
      {!hasUnlocked ? (
        <p className="invention-progress">
          <FormattedNumber
            value={Math.min(
              game.trade?.rabbitRelations ?? 0,
              perfection.cost,
            )}
            maximumFractionDigits={0}
          />{' '}
          /{' '}
          <FormattedNumber
            value={perfection.cost}
            maximumFractionDigits={0}
          />{' '}
          Rabbit relations
        </p>
      ) : null}
    </>
  )
}