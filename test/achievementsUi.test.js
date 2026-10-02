import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, Achievements, AchievementTier, AchievementDetails, GameNavigation, GameScreen, setActiveNumberNotation, ACHIEVEMENTS
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Achievements, AchievementTier, AchievementDetails } = await server.ssrLoadModule('/src/tabs/Achievements.jsx'))
  ;({ ACHIEVEMENTS } = await server.ssrLoadModule('/src/game/achievementDefinitions.js'))
  ;({ GameNavigation } = await server.ssrLoadModule('/src/tabs/GameNavigation.jsx'))
  ;({ GameScreen } = await server.ssrLoadModule('/src/tabs/GameScreen.jsx'))
  ;({ setActiveNumberNotation } = await server.ssrLoadModule('/src/game/numberFormat.js'))
})
after(async () => { await server?.close() })

test('achievement page shows compact names, earned styling, and only the hamster bonus initially', () => {
  setActiveNumberNotation('suffix', 303)
  const markup = renderToStaticMarkup(createElement(Achievements, {
    earnedAchievementIds: ['cropRotation', 'agriculturalDiversity'],
  }))
  assert.match(markup, /Achievements/)
  assert.match(markup, /Crop Rotation/)
  assert.doesNotMatch(markup, /Working for Free/)
  assert.match(markup, /You get NOTHING/)
  assert.match(markup, /15/)
  assert.match(markup, /1.15/)
  assert.match(markup, /External Hamster multiplier/)
  assert.match(markup, /Not earned/)
  assert.match(markup, /achievement-earned/)
  assert.match(markup, /aria-label="Crop Rotation: Earned"/)
  assert.doesNotMatch(markup, /Replace a planted Leek|adjacent crop harvest|role="tooltip"/)
  assert.doesNotMatch(markup, /Fortune points|5-Leaf Clover/)
})

test('all three tiers are selectable with only the active tier rendered', () => {
  const markup = renderToStaticMarkup(createElement(Achievements))
  assert.equal((markup.match(/role="tab"/g) || []).length, 3)
  assert.match(markup, /id="achievement-tier-tab-1"[^>]*aria-selected="true"/)
  assert.match(markup, /id="achievement-tier-tab-2"[^>]*aria-selected="false"/)
  assert.match(markup, /role="tabpanel" id="achievement-tier-1"/)
  assert.doesNotMatch(markup, /A Bright Idea|Open for Business/)
  const unlocks = renderToStaticMarkup(createElement(AchievementTier, { tier: 2 }))
  assert.match(unlocks, /A Bright Idea|Seeds of Potential/)
  assert.doesNotMatch(unlocks, /Crop Rotation|Open for Business/)
  const phases = renderToStaticMarkup(createElement(AchievementTier, { tier: 3 }))
  assert.match(phases, /Open for Business/)
  assert.match(phases, /Against the Odds/)
  assert.match(phases, /New Horizons/)
  assert.doesNotMatch(phases, /Crop Rotation|A Bright Idea/)
})

test('every tile uses its full name as an artwork placeholder, without extra labels or invented images', () => {
  for (const tier of [1, 2, 3]) {
    const markup = renderToStaticMarkup(createElement(AchievementTier, { tier }))
    const names = [...markup.matchAll(/<span class="achievement-tile-name">([^<]+)<\/span>/g)]
      .map((match) => match[1])
    const expected = ACHIEVEMENTS.filter((achievement) => achievement.tier === tier)
      .map((achievement) => achievement.name)
    assert.deepEqual(names.sort(), expected.sort())
    assert.doesNotMatch(markup, /<img|role="tooltip"|Hamster Treats|✓/)
  }
})

test('hover details show requirements, earned status, and the Treat reward', () => {
  const achievement = ACHIEVEMENTS.find(({ id }) => id === 'cropRotation')
  const markup = renderToStaticMarkup(createElement(AchievementDetails, { achievement, isEarned: true }))
  assert.match(markup, /Replace a planted Leek with another crop/)
  assert.match(markup, /✓ Earned/)
  assert.match(markup, /5 Hamster Treats/)
})

test('navigation and screen expose the Achievements tab', () => {
  const nav = renderToStaticMarkup(createElement(GameNavigation, { activeTab: 'achievements' }))
  assert.match(nav, /game-tab-active[^>]*>Achievements/)
  const screen = renderToStaticMarkup(createElement(GameScreen, {
    activeTab: 'achievements', achievements: { earnedAchievementIds: [] },
  }))
  assert.match(screen, /achievements-title/)
})

test('crop threshold descriptions follow the selected number notation', () => {
  const achievement = ACHIEVEMENTS.find(({ id }) => id === 'apple10B')
  setActiveNumberNotation('scientific', 303)
  const scientific = renderToStaticMarkup(createElement(AchievementDetails, { achievement }))
  setActiveNumberNotation('suffix', 303)
  const suffix = renderToStaticMarkup(createElement(AchievementDetails, { achievement }))
  assert.notEqual(scientific, suffix)
  assert.match(scientific, /1(?:\.0+)?e10/)
  assert.match(suffix, /10(?:\.0+)?B/)
})
