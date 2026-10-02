import { memo } from 'react'
import { ACHIEVEMENTS } from '../game/achievementDefinitions.js'
import { getAchievementHamsterMultiplier, getHamsterTreats } from '../game/achievementState.js'
import { FormattedNumber } from './ui.jsx'

function Requirement({ achievement }) {
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

export const Achievements = memo(function Achievements({ earnedAchievementIds = [], numberNotation, suffixScientificExponent }) {
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
        <div><dt>External Hamster multiplier</dt><dd>×<FormattedNumber value={getAchievementHamsterMultiplier(earnedAchievementIds)} maximumFractionDigits={2} /></dd></div>
      </dl>
      <p className="card-copy">Each Treat adds 1% external Hamster efficiency. Awards stay earned across resets and both areas.</p>
      {[1, 2, 3].map((tier) => (
        <section className="achievement-tier" key={tier} aria-labelledby={`achievement-tier-${tier}`}>
          <h3 id={`achievement-tier-${tier}`}>Tier {tier} · {['', 'Experiments', 'Significant unlocks', 'Phase shifts'][tier]}</h3>
          <div className="achievement-grid">
            {ACHIEVEMENTS.filter((achievement) => achievement.tier === tier).map((achievement) => (
              <article className={`achievement-card ${earned.has(achievement.id) ? 'achievement-earned' : ''}`} key={achievement.id}>
                <div className="achievement-card-heading"><h4>{achievement.name}</h4>
                  <span aria-label={earned.has(achievement.id) ? 'Earned' : 'Not earned'}>{earned.has(achievement.id) ? '✓ Earned' : 'Not earned'}</span></div>
                <p><Requirement achievement={achievement} /></p>
                <strong><FormattedNumber value={achievement.treats} /> Hamster Treats</strong>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  )
})
