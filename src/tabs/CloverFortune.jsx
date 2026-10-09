import { memo } from 'react'
import {
  getCloverBundleEffectCount,
  getActiveFortuneEffectModifiers,
  getFortuneEffect,
  getFortuneOvercharge,
  normalizeFortuneState,
} from '../game/fortuneLogic.js'
import { getCachedFormattedNumber } from '../game/numberFormat.js'
import { FormattedNumber } from './ui.jsx'

function getActiveEffectDescription(effect, activeEffect) {
  if (getFortuneOvercharge(activeEffect.remainingSeconds).strengthExponent === 1) {
    return effect.description
  }
  const modifiers = getActiveFortuneEffectModifiers(activeEffect)
  return [
    effect.cropYieldMultiplier && `Crop yields ×${getCachedFormattedNumber(modifiers.cropYieldMultiplier, 3)}`,
    effect.passiveEffectMultiplier && `+${getCachedFormattedNumber((modifiers.passiveEffectMultiplier - 1) * 100, 3)}% Crop passive effects`,
    effect.leekEnrichmentExponent && `Leek Enrichment ^${getCachedFormattedNumber(modifiers.leekEnrichmentExponent, 3)}`,
  ].filter(Boolean).join(' and ')
}

function CloverFortuneContent({ fortune, isDisabled, onCollect, onRemoveEffect }) {
  if (isDisabled) return null

  const state = normalizeFortuneState(fortune)
  const noticeEffects = state.notice
    ? Array.from((state.notice.effectIds ?? [state.notice.effectId]).reduce((counts, id) =>
        counts.set(id, (counts.get(id) ?? 0) + 1), new Map()), ([id, count]) => ({
        effect: getFortuneEffect(id), count,
      }))
    : []

  return (
    <>
      {state.bundles.map((bundle, bundleIndex) => (
        <button
          type="button"
          className="clover-bundle"
          style={{ left: `${bundle.x}%`, top: `${bundle.y}%` }}
          onClick={() => onCollect(bundleIndex)}
          aria-label={getCloverBundleEffectCount(bundle) > 1
            ? `Collect Clover batch (${getCloverBundleEffectCount(bundle)} effect rolls)`
            : 'Collect Clover Bundle'}
          key={`${bundle.x}-${bundle.y}-${bundleIndex}`}
        >
          <span aria-hidden="true">🍀</span>
          <span aria-hidden="true">🍀</span>
          <span aria-hidden="true">🍀</span>
          <strong>Collect{getCloverBundleEffectCount(bundle) > 1
            ? ` · ${getCloverBundleEffectCount(bundle)} effects` : ''}</strong>
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
            const overcharge = getFortuneOvercharge(activeEffect.remainingSeconds)
            const description = getActiveEffectDescription(effect, activeEffect)
            const isOvercharged = overcharge.strengthExponent > 1
            const durationLabel = isOvercharged ? 'stored seconds' : 'seconds remaining'

            return effect ? (
              <div
                className={`fortune-effect-box${isOvercharged ? ' fortune-effect-overcharged' : ''}`}
                key={activeEffect.id}
                tabIndex={0}
                aria-label={`${effect.name}: ${description}. ${remainingSeconds} ${durationLabel}.${isOvercharged
                  ? ` Overcharged, timer consumes ${getCachedFormattedNumber(overcharge.timerSpeed, 3)} seconds per second.` : ''}`}
                onContextMenu={(event) => {
                  event.preventDefault()
                  onRemoveEffect?.(activeEffect.id)
                }}
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
                  <span>{description}</span>
                  {isOvercharged ? (
                    <span>
                      Overcharged: {effect.leekEnrichmentExponent ? 'Leek bonus ×' : 'multipliers ^'}
                      <FormattedNumber value={overcharge.strengthExponent} maximumFractionDigits={1} />
                      {' · '}timer ×<FormattedNumber value={overcharge.timerSpeed} maximumFractionDigits={3} />
                    </span>
                  ) : null}
                  <time>
                    <FormattedNumber
                      value={remainingSeconds}
                      maximumFractionDigits={0}
                    />{' '}
                    {durationLabel}
                  </time>
                  <small>Right-click to remove.</small>
                </div>
              </div>
            ) : null
          })}
        </aside>
      ) : null}

      {state.notice ? (
        <aside className="fortune-result-toast" role="status" aria-live="assertive">
          <span className="fortune-panel-label">
            {state.notice.effectIds ? 'Clover batch opened' : 'Clover Bundle opened'}
          </span>
          {state.notice.effectIds ? (
            <div className="fortune-batch-results">
              {noticeEffects.map(({ effect, count }) => (
                <div className="fortune-batch-result" key={effect.id}>
                  <strong>
                    {effect.name}{count > 1 ? <> ×<FormattedNumber value={count} /></> : null}
                  </strong>
                  <span>{effect.description}</span>
                </div>
              ))}
              <small>Repeated timed effects extend their duration.</small>
            </div>
          ) : (
            <>
              <strong>{getFortuneEffect(state.notice.effectId)?.name}</strong>
              <span>{getFortuneEffect(state.notice.effectId)?.description}</span>
            </>
          )}
        </aside>
      ) : null}
    </>
  )
}

export const CloverFortune = memo(
  CloverFortuneContent,
  (previous, next) =>
    previous.fortune === next.fortune &&
    previous.isDisabled === next.isDisabled &&
    previous.numberNotation === next.numberNotation &&
    previous.suffixScientificExponent === next.suffixScientificExponent,
)
