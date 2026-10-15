import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { createInitialGame } from '../src/game/gameLogic.js'

let server, Blueprint, AchievementDetails, ACHIEVEMENTS
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Blueprint } = await server.ssrLoadModule('/src/tabs/Blueprint.jsx'))
  ;({ AchievementDetails } = await server.ssrLoadModule('/src/tabs/Achievements.jsx'))
  ;({ ACHIEVEMENTS } = await server.ssrLoadModule('/src/game/achievementDefinitions.js'))
})
after(async () => { await server?.close() })

function renderBlueprint(game) {
  return renderToStaticMarkup(createElement(Blueprint, {
    game, blueprintSlots: game.blueprintSlots, unlockedBlueprintSlotCount: 1,
    visibleCropIds: ['leek'], onRestartFields: () => {},
  }))
}

test('Restart Fields is hidden before Rushed Start and visible in either area afterward', () => {
  const initial = createInitialGame()
  assert.doesNotMatch(renderBlueprint(initial), /Restart Fields/)
  for (const activeArea of ['main', 'misfortune']) {
    const markup = renderBlueprint({ ...initial, activeArea,
      completedMisfortuneUpgrades: ['rushedStart'] })
    assert.match(markup, /<button[^>]*class="secondary-button"[^>]*>Restart Fields<\/button>/)
    assert.match(markup, /Keep machinery/)
    assert.match(markup, /restart Rushed Start/)
  }
})

test('False Start hover describes the minute, Rushed Start prerequisite, and reward', () => {
  const achievement = ACHIEVEMENTS.find(({ id }) => id === 'falseStart')
  const markup = renderToStaticMarkup(createElement(AchievementDetails, { achievement }))
  assert.match(markup, /first 60 seconds/)
  assert.match(markup, /blueprint reset or Restart Fields/)
  assert.match(markup, /Rushed Start purchased/)
  assert.match(markup, /5 Hamster Treats/)
})
