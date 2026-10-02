import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { ACHIEVEMENTS } from '../game/achievementDefinitions.js'
import {
  ACHIEVEMENT_NOTIFICATION_DURATION_MS,
  createAchievementNotificationState,
  dismissAchievementNotification,
  getVisibleAchievementNotificationIds,
  observeAchievementNotifications,
} from '../game/achievementNotifications.js'
import { FormattedNumber } from './ui.jsx'

const EMPTY_IDS = []

function AchievementToast({ achievement, queuedCount, onDismiss, onOpenAchievements }) {
  // Only visible popups mount: queued awards get their full lifetime later.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss?.(achievement.id), ACHIEVEMENT_NOTIFICATION_DURATION_MS)
    return () => clearTimeout(timer)
  }, [achievement.id, onDismiss])

  return (
    <aside className="achievement-toast" role="status" aria-live="polite" aria-atomic="true">
      <span className="achievement-toast-label">Achievement earned · Tier {achievement.tier}</span>
      <button type="button" className="achievement-toast-close" onClick={() => onDismiss?.(achievement.id)}
        aria-label={`Dismiss ${achievement.name} notification`}>×</button>
      <button type="button" className="achievement-toast-title" onClick={() => {
        onOpenAchievements?.()
        onDismiss?.(achievement.id)
      }}
        aria-label={`View achievements: ${achievement.name}`}>{achievement.name}</button>
      <span className="achievement-toast-reward">+<FormattedNumber value={achievement.treats} /> Hamster Treats</span>
      {queuedCount > 0 ? <small><FormattedNumber value={queuedCount} /> more queued</small> : null}
    </aside>
  )
}

export function AchievementNotificationStack({ pendingIds, onDismiss, onOpenAchievements }) {
  const visibleIds = getVisibleAchievementNotificationIds({ pendingIds })
  return visibleIds.map((id, index) => {
    const achievement = ACHIEVEMENTS.find((award) => award.id === id)
    return achievement ? (
      <AchievementToast key={id} achievement={achievement}
        queuedCount={index === visibleIds.length - 1 ? pendingIds.length - visibleIds.length : 0}
        onDismiss={onDismiss} onOpenAchievements={onOpenAchievements} />
    ) : null
  })
}

export const AchievementNotifications = memo(function AchievementNotifications({
  earnedAchievementIds = EMPTY_IDS,
  onOpenAchievements,
  numberNotation,
  suffixScientificExponent,
}) {
  const [state, setState] = useState(() => createAchievementNotificationState(earnedAchievementIds))
  const stackRef = useRef(null)
  // Conditional adjustment records new awards before rendering the notification.
  // The IDs array is structurally shared between ordinary production updates.
  if (state.observedIds !== earnedAchievementIds) {
    setState(observeAchievementNotifications(state, earnedAchievementIds))
  }
  const visibleKey = getVisibleAchievementNotificationIds(state).join(',')
  const dismiss = useCallback((id) => {
    setState((current) => dismissAchievementNotification(current, id))
  }, [])

  useEffect(() => {
    if (!visibleKey || !stackRef.current) return
    const stack = stackRef.current
    let blockers = []
    function updatePosition() {
      const coveredHeight = Math.max(0, ...Array.from(blockers, (element) =>
        window.innerHeight - element.getBoundingClientRect().top,
      ))
      stack.style.setProperty('--achievement-bottom-offset', `${coveredHeight + 28}px`)
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updatePosition) : null
    function refreshBlockers() {
      observer?.disconnect()
      blockers = document.querySelectorAll('.major-progression-bar, .fortune-result-toast')
      blockers.forEach((element) => observer?.observe(element))
      updatePosition()
    }
    refreshBlockers()
    // Observe only top-level additions/removals, not production text updates.
    const shell = stack.closest('.game-shell')
    const contentObserver = typeof MutationObserver === 'function' && shell
      ? new MutationObserver(refreshBlockers) : null
    contentObserver?.observe(shell, { childList: true })
    window.addEventListener('resize', updatePosition)
    return () => {
      observer?.disconnect()
      contentObserver?.disconnect()
      window.removeEventListener('resize', updatePosition)
    }
  }, [visibleKey])

  return (
    <div className="achievement-notifications" ref={stackRef} data-notation={numberNotation}
      data-scientific-threshold={suffixScientificExponent}>
      <AchievementNotificationStack pendingIds={state.pendingIds}
        onDismiss={dismiss} onOpenAchievements={onOpenAchievements} />
    </div>
  )
})
