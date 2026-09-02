import { memo } from 'react'
import {
  getFortuneEffect,
  normalizeFortuneState,
} from '../game/fortuneLogic.js'
import { FormattedNumber } from './ui.jsx'

function CloverFortuneContent({ fortune, onCollect }) {
  const state = normalizeFortuneState(fortune)

  return (
    <>
      {state.bundles.map((bundle, bundleIndex) => (
        <button
          type="button"
          className="clover-bundle"
          style={{ left: `${bundle.x}%`, top: `${bundle.y}%` }}
          onClick={() => onCollect(bundleIndex)}
          aria-label="Collect Clover Bundle"
          key={`${bundle.x}-${bundle.y}-${bundleIndex}`}
        >
          <span aria-hidden="true">🍀</span>
          <span aria-hidden="true">🍀</span>
          <span aria-hidden="true">🍀</span>
          <strong>Collect</strong>
        </button>
      ))}

      {state.activeEffects.length > 0 ? (
        <aside
          className="fortune-active-effects"
          aria-label="Active Breezes of Fortune"
          aria-live="polite"
        >
          {state.activeEffects.map((activeEffect) => {
            const effect = getFortuneEffect(activeEffect.id)
            const remainingSeconds = Math.ceil(activeEffect.remainingSeconds)

            return effect ? (
              <div
                className="fortune-effect-box"
                key={activeEffect.id}
                tabIndex={0}
                aria-label={`${effect.name}: ${effect.description}. ${remainingSeconds} seconds remaining.`}
              >
                <span className="fortune-effect-icon" aria-hidden="true">
                  {effect.icon}
                </span>
                <time className="fortune-effect-time">
                  <FormattedNumber
                    value={remainingSeconds}
                    maximumFractionDigits={0}
                  />
                  s
                </time>
                <div className="fortune-effect-tooltip" role="tooltip">
                  <strong>{effect.name}</strong>
                  <span>{effect.description}</span>
                  <time>
                    <FormattedNumber
                      value={remainingSeconds}
                      maximumFractionDigits={0}
                    />{' '}
                    seconds remaining
                  </time>
                </div>
              </div>
            ) : null
          })}
        </aside>
      ) : null}

      {state.notice ? (
        <aside className="fortune-result-toast" role="status" aria-live="assertive">
          <span className="fortune-panel-label">Clover Bundle opened</span>
          <strong>{getFortuneEffect(state.notice.effectId)?.name}</strong>
          <span>{getFortuneEffect(state.notice.effectId)?.description}</span>
        </aside>
      ) : null}
    </>
  )
}

export const CloverFortune = memo(
  CloverFortuneContent,
  (previous, next) =>
    previous.fortune === next.fortune &&
    previous.numberNotation === next.numberNotation &&
    previous.suffixScientificExponent === next.suffixScientificExponent,
)
