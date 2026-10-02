import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, AchievementNotifications, AchievementNotificationStack
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ AchievementNotifications, AchievementNotificationStack } =
    await server.ssrLoadModule('/src/tabs/AchievementNotifications.jsx'))
})
after(async () => { await server?.close() })

const ids = ['cropRotation', 'firstExpansion', 'inventions', 'unionized', 'trade']
const renderStack = (pendingIds) => renderToStaticMarkup(
  createElement(AchievementNotificationStack, { pendingIds }),
)
const popupCount = (markup) => (markup.match(/class="achievement-toast"/g) || []).length

test('an existing save does not replay already-earned achievement popups', () => {
  const markup = renderToStaticMarkup(createElement(AchievementNotifications, {
    earnedAchievementIds: ids,
  }))
  assert.equal(popupCount(markup), 0)
})

test('one, two, and three unlocks display together without a queue message', () => {
  for (let count = 1; count <= 3; count++) {
    const markup = renderStack(ids.slice(0, count))
    assert.equal(popupCount(markup), count)
    assert.doesNotMatch(markup, /more queued/)
  }
})

test('more than three unlocks display three popups and only queue the overflow', () => {
  const markup = renderStack(ids)
  assert.equal(popupCount(markup), 3)
  assert.match(markup, /Crop Rotation/)
  assert.match(markup, /Room to Grow/)
  assert.match(markup, /A Bright Idea/)
  assert.doesNotMatch(markup, /Collective Bargaining|Open for Business/)
  assert.match(markup, /2 more queued/)
  assert.equal((markup.match(/more queued/g) || []).length, 1)
})

test('popups show the reward, announce politely, and expose dismissal and navigation controls', () => {
  const markup = renderStack(['cropRotation', 'agriculturalDiversity', 'trade'])
  assert.match(markup, /Achievement earned · Tier 1/)
  assert.match(markup, /Achievement earned · Tier 3/)
  assert.match(markup, /\+5 Hamster Treats/)
  assert.match(markup, /\+10 Hamster Treats/)
  assert.match(markup, /\+50 Hamster Treats/)
  assert.equal((markup.match(/aria-live="polite"/g) || []).length, 3)
  assert.match(markup, /aria-label="Dismiss Crop Rotation notification"/)
  assert.match(markup, /aria-label="View achievements: Crop Rotation"/)
})
