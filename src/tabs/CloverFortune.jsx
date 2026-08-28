import {
  getFortuneEffect,
  normalizeFortuneState,
} from '../game/fortuneLogic.js'
import { FormattedNumber } from './ui.jsx'

export function CloverFortune({ fortune, onCollect }) {
  const state = normalizeFortuneState(fortune)

  return (
    <>
      {state.bundle ? (
        <button
          type="button"
          className="clover-bundle"
          style={{ left: `${state.bundle.x}%`, top: `${state.bundle.y}%` }}
          onClick={onCollect}
          aria-label="Collect Clover Bundle"
        >
          <span aria-hidden="true">🍀</span>
          <span aria-hidden="true">🍀</span>
          <span aria-hidden="true">🍀</span>
          <strong>Collect</strong>
        </button>
      ) : null}

      {state.activeEffects.length > 0 ? (
        <aside className="fortune-active-effects" aria-live="polite">
          <span className="fortune-panel-label">Breezes of fortune</span>
          {state.activeEffects.map((activeEffect) => {
            const effect = getFortuneEffect(activeEffect.id)

            return effect ? (
              <div key={activeEffect.id}>
                <strong>{effect.name}</strong>
                <span>{effect.description}</span>
                <time><FormattedNumber value={Math.ceil(activeEffect.remainingSeconds)} maximumFractionDigits={0} />s</time>
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