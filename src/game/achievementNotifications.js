import { normalizeAchievementIds } from './achievementState.js'

export const ACHIEVEMENT_NOTIFICATION_DURATION_MS = 6000
export const MAX_VISIBLE_ACHIEVEMENT_NOTIFICATIONS = 3

export function createAchievementNotificationState(earnedIds = []) {
  // Loaded awards are the baseline, not a backlog of new notifications.
  return { observedIds: earnedIds, pendingIds: [] }
}

export function observeAchievementNotifications(state, earnedIds = []) {
  const previous = new Set(state.observedIds)
  const current = new Set(earnedIds)
  const progressWasReplaced = state.observedIds.some((id) => !current.has(id))
  const queued = new Set(state.pendingIds)
  const added = normalizeAchievementIds(earnedIds).filter((id) =>
    !previous.has(id) && !queued.has(id),
  )
  return {
    observedIds: earnedIds,
    // Hard resets and imports of earlier progress clear stale popups.
    pendingIds: progressWasReplaced ? [] : [...state.pendingIds, ...added],
  }
}

export function dismissAchievementNotification(state, id) {
  const index = state.pendingIds.indexOf(id)
  return index >= 0 && index < MAX_VISIBLE_ACHIEVEMENT_NOTIFICATIONS
    ? { ...state, pendingIds: state.pendingIds.filter((pendingId) => pendingId !== id) }
    : state
}

export function getVisibleAchievementNotificationIds(state) {
  return state.pendingIds.slice(0, MAX_VISIBLE_ACHIEVEMENT_NOTIFICATIONS)
}
