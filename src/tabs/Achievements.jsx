import { memo, useEffect, useRef, useState } from 'react'
import { ACHIEVEMENTS, getAchievementsForTier } from '../game/achievementDefinitions.js'
import { getAchievementHamsterMultiplier, getHamsterTreats } from '../game/achievementState.js'
import { FormattedNumber } from './ui.jsx'

const TIERS = [
  { id: 1, label: 'Experiments' },
  { id: 2, label: 'Significant unlocks' },
  { id: 3, label: 'Phase shifts' },
]

function Requirement({ achievement }) {
  if (achievement.monocropFactor) return <>Have one crop type count at least <FormattedNumber value={achievement.monocropFactor} /> times the Monocrop limit in one field blueprint.</>
  if (!achievement.metric) return achievement.description
  const { subject, target, unit } = achievement
  const isPercentage = unit === 'hamsterBonus' || unit === 'duplicatorBonus'
  const value = <FormattedNumber value={isPercentage ? target * 100 : target} />
  if (unit === 'hamsterBonus') return <>{subject} gives +{value}% Hamster efficiency.</>
  if (unit === 'duplicatorBonus') return <>{subject} gives +{value}% Row Duplicator efficiency.</>
  if (unit === 'harvestBonus') return <>{subject} gives +{value} adjacent crop harvest.</>
  if (unit === 'harvest') return <>{subject} harvests {value} Crops per field.</>
  if (unit === 'rowMultiplier') return <>{subject} gives ×{value} total row production.</>
  return <>{subject} gives a ×{value} effect multiplier.</>
}

export function AchievementDetails({ achievement, isEarned }) {
  return (
    <>
      <strong className="achievement-details-name">{achievement.name}</strong>
      <span className={isEarned ? 'achievement-details-earned' : ''}>{isEarned ? '✓ Earned' : 'Not earned'}</span>
      <p><Requirement achievement={achievement} /></p>
      <strong className="achievement-details-reward"><FormattedNumber value={achievement.treats} /> Hamster Treats</strong>
    </>
  )
}

function AchievementCard({ achievement, isEarned }) {
  const [position, setPosition] = useState(null)
  const cardRef = useRef(null)
  const detailsId = `achievement-details-${achievement.id}`

  function showDetails() {
    const bounds = cardRef.current.getBoundingClientRect()
    const width = Math.min(320, window.innerWidth - 32)
    const left = Math.max(16, Math.min(window.innerWidth - width - 16,
      bounds.left + bounds.width / 2 - width / 2))
    const placeAbove = window.innerHeight - bounds.bottom < 220 && bounds.top > window.innerHeight / 2
    setPosition({ left, width, ...(placeAbove
      ? { bottom: window.innerHeight - bounds.top }
      : { top: bounds.bottom }) })
  }

  useEffect(() => {
    if (!position) return
    const hide = () => setPosition(null)
    const hideOutside = (event) => {
      if (!cardRef.current?.contains(event.target)) hide()
    }
    const hideOnScroll = (event) => {
      if (!cardRef.current?.contains(event.target)) hide()
    }
    window.addEventListener('resize', hide)
    window.addEventListener('scroll', hideOnScroll, true)
    document.addEventListener('pointerdown', hideOutside)
    return () => {
      window.removeEventListener('resize', hide)
      window.removeEventListener('scroll', hideOnScroll, true)
      document.removeEventListener('pointerdown', hideOutside)
    }
  }, [position])

  return (
    <div className={`achievement-card ${isEarned ? 'achievement-earned' : ''}`} ref={cardRef}
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') showDetails() }}
      onPointerLeave={(event) => { if (event.pointerType !== 'touch') setPosition(null) }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPosition(null) }}>
      <button type="button" className="achievement-name" aria-label={`${achievement.name}: ${isEarned ? 'Earned' : 'Not earned'}`}
        aria-describedby={position ? detailsId : undefined}
        onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) showDetails() }}
        onClick={(event) => {
          if (position && (event.nativeEvent.pointerType === 'touch' || window.matchMedia('(hover: none)').matches)) {
            setPosition(null)
          } else showDetails()
        }}
        onKeyDown={(event) => { if (event.key === 'Escape') setPosition(null) }}>
        <span className="achievement-tile-name">{achievement.name}</span>
      </button>
      {position ? (
        <div className={`achievement-details-anchor ${position.bottom !== undefined ? 'achievement-details-above' : ''}`} style={position}>
          <div className="achievement-details" id={detailsId} role="tooltip">
            <AchievementDetails achievement={achievement} isEarned={isEarned} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AchievementTier({ tier, earnedAchievementIds = [] }) {
  const earned = new Set(earnedAchievementIds)
  return (
    <section className="achievement-tier" role="tabpanel" id={`achievement-tier-${tier}`}
      aria-labelledby={`achievement-tier-tab-${tier}`}>
      <div className="achievement-grid">
        {getAchievementsForTier(tier).map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} isEarned={earned.has(achievement.id)} />
        ))}
      </div>
    </section>
  )
}

export const Achievements = memo(function Achievements({ earnedAchievementIds = [],
  hamsterTreatMultiplier, hamsterTreatExponent = 1, numberNotation, suffixScientificExponent }) {
  const [activeTier, setActiveTier] = useState(1)
  // The notation props also invalidate memoization when the display setting changes.
  const earned = new Set(earnedAchievementIds)
  return (
    <section className="achievements-panel" aria-labelledby="achievements-title"
      data-notation={numberNotation} data-scientific-threshold={suffixScientificExponent}>
      <div className="section-heading">
        <div><p className="eyebrow">Rewards for progress and experimentation</p>
          <h2 id="achievements-title">Achievements</h2></div>
        <span>{earned.size} / {ACHIEVEMENTS.length} earned</span>
      </div>
      <dl className="achievement-summary field-stats">
        <div><dt>Hamster Treats</dt><dd><FormattedNumber value={getHamsterTreats(earnedAchievementIds)} /></dd></div>
        <div><dt>External Hamster multiplier</dt><dd>×<FormattedNumber value={hamsterTreatMultiplier ?? getAchievementHamsterMultiplier(earnedAchievementIds)} maximumFractionDigits={2} /></dd></div>
        {hamsterTreatExponent > 1 ? <div><dt>Hamster Treat exponent</dt><dd><FormattedNumber value={hamsterTreatExponent} maximumFractionDigits={3} /></dd></div> : null}
      </dl>
      <p className="card-copy">Each Treat adds 1% to the base external Hamster multiplier{hamsterTreatExponent > 1 ? ', raised to the exponent above by Peanuts' : ''}. Awards stay earned across resets and both areas.</p>
      <div className="achievement-tier-tabs" role="tablist" aria-label="Achievement tiers">
        {TIERS.map(({ id, label }, index) => (
          <button type="button" role="tab" id={`achievement-tier-tab-${id}`} key={id}
            className={`achievement-tier-tab ${activeTier === id ? 'achievement-tier-tab-active' : ''}`}
            aria-selected={activeTier === id} aria-controls={`achievement-tier-${id}`}
            tabIndex={activeTier === id ? 0 : -1} onClick={() => setActiveTier(id)}
            onKeyDown={(event) => {
              const nextIndex = event.key === 'ArrowRight' ? (index + 1) % TIERS.length
                : event.key === 'ArrowLeft' ? (index + TIERS.length - 1) % TIERS.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? TIERS.length - 1 : null
              if (nextIndex === null) return
              event.preventDefault()
              setActiveTier(TIERS[nextIndex].id)
              event.currentTarget.parentElement.children[nextIndex].focus()
            }}>
            Tier {id} · {label}
          </button>
        ))}
      </div>
      <p className="achievement-help">Hover, focus, or tap an achievement to see its requirement and reward.</p>
      <AchievementTier key={activeTier} tier={activeTier} earnedAchievementIds={earnedAchievementIds} />
    </section>
  )
})
