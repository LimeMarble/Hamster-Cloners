import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, Achievements, GameNavigation, GameScreen, setActiveNumberNotation
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Achievements } = await server.ssrLoadModule('/src/tabs/Achievements.jsx'))
  ;({ GameNavigation } = await server.ssrLoadModule('/src/tabs/GameNavigation.jsx'))
  ;({ GameScreen } = await server.ssrLoadModule('/src/tabs/GameScreen.jsx'))
  ;({ setActiveNumberNotation } = await server.ssrLoadModule('/src/game/numberFormat.js'))
})
after(async () => { await server?.close() })

test('achievement page exposes every requirement, earned status, rewards and only the hamster bonus', () => {
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
  assert.match(markup, /\+1(?:\.0+)?k adjacent crop harvest/)
  assert.match(markup, /✓ Earned/)
  assert.doesNotMatch(markup, /Fortune points|5-Leaf Clover/)
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
  setActiveNumberNotation('scientific', 303)
  const scientific = renderToStaticMarkup(createElement(Achievements, { earnedAchievementIds: [] }))
  setActiveNumberNotation('suffix', 303)
  const suffix = renderToStaticMarkup(createElement(Achievements, { earnedAchievementIds: [] }))
  assert.notEqual(scientific, suffix)
  assert.match(scientific, /1(?:\.0+)?e10/)
  assert.match(suffix, /10(?:\.0+)?B/)
})
