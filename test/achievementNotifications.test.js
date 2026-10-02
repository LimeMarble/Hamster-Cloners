import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAchievementNotificationState, observeAchievementNotifications,
  dismissAchievementNotification, ACHIEVEMENT_NOTIFICATION_DURATION_MS,
  getVisibleAchievementNotificationIds, MAX_VISIBLE_ACHIEVEMENT_NOTIFICATIONS,
} from '../src/game/achievementNotifications.js'

test('loading earned achievements establishes a baseline without showing old popups', () => {
  const ids = ['cropRotation', 'trade']
  const initial = createAchievementNotificationState(ids)
  assert.equal(initial.observedIds, ids)
  assert.deepEqual(initial.pendingIds, [])
  assert.deepEqual(observeAchievementNotifications(initial, [...ids]).pendingIds, [])
})

test('new awards queue in order and repeated snapshots never duplicate notifications', () => {
  const initial = createAchievementNotificationState(['cropRotation'])
  const earned = ['cropRotation', 'firstExpansion', 'inventions']
  const queued = observeAchievementNotifications(initial, earned)
  assert.deepEqual(queued.pendingIds, ['firstExpansion', 'inventions'])
  const repeated = observeAchievementNotifications(queued, [...earned])
  assert.deepEqual(repeated.pendingIds, queued.pendingIds)
  const appended = observeAchievementNotifications(repeated, [...earned, 'unionized', 'invalid'])
  assert.deepEqual(appended.pendingIds, ['firstExpansion', 'inventions', 'unionized'])
})

test('up to three awards are visible together and only excess awards wait', () => {
  const ids = ['cropRotation', 'firstExpansion', 'inventions', 'unionized', 'trade']
  for (let count = 1; count <= 3; count++) {
    const state = observeAchievementNotifications(createAchievementNotificationState(), ids.slice(0, count))
    assert.deepEqual(getVisibleAchievementNotificationIds(state), ids.slice(0, count))
  }
  const state = observeAchievementNotifications(createAchievementNotificationState(), ids)
  assert.deepEqual(getVisibleAchievementNotificationIds(state), ids.slice(0, 3))
  assert.deepEqual(state.pendingIds.slice(3), ids.slice(3))
  assert.equal(MAX_VISIBLE_ACHIEVEMENT_NOTIFICATIONS, 3)
})

test('each visible notification can dismiss independently; stale or queued IDs are ignored', () => {
  const queued = observeAchievementNotifications(createAchievementNotificationState(),
    ['cropRotation', 'inventions'])
  const next = dismissAchievementNotification(queued, 'cropRotation')
  assert.deepEqual(next.pendingIds, ['inventions'])
  assert.equal(dismissAchievementNotification(next, 'cropRotation'), next)
  assert.deepEqual(dismissAchievementNotification(queued, 'inventions').pendingIds, ['cropRotation'])
  assert.equal(dismissAchievementNotification(queued, 'invalid'), queued)
  assert.equal(ACHIEVEMENT_NOTIFICATION_DURATION_MS, 6000)
})

test('dismissing any visible popup promotes one queued award without dropping the others', () => {
  const ids = ['cropRotation', 'firstExpansion', 'inventions', 'unionized', 'trade']
  const state = observeAchievementNotifications(createAchievementNotificationState(), ids)
  assert.equal(dismissAchievementNotification(state, 'unionized'), state)
  const next = dismissAchievementNotification(state, 'firstExpansion')
  assert.deepEqual(next.pendingIds, ['cropRotation', 'inventions', 'unionized', 'trade'])
  assert.deepEqual(getVisibleAchievementNotificationIds(next), ['cropRotation', 'inventions', 'unionized'])
  assert.equal(dismissAchievementNotification(next, 'firstExpansion'), next)
})

test('hard reset or restoring earlier progress clears stale queued awards', () => {
  const queued = observeAchievementNotifications(createAchievementNotificationState(),
    ['cropRotation', 'inventions'])
  const reset = observeAchievementNotifications(queued, [])
  assert.deepEqual(reset.pendingIds, [])
  assert.deepEqual(observeAchievementNotifications(reset, ['cropRotation']).pendingIds, ['cropRotation'])
  assert.deepEqual(observeAchievementNotifications(queued, ['cropRotation']).pendingIds, [])
})
