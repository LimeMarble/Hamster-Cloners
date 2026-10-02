import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { createInitialGame } from '../src/game/blueprintLogic.js'

let server, Blueprint
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Blueprint } = await server.ssrLoadModule('/src/tabs/Blueprint.jsx'))
})
after(async () => { await server?.close() })

function render(game, unlockedBlueprintSlotCount = 1) {
  return renderToStaticMarkup(createElement(Blueprint, {
    game, blueprintSlots: Array(unlockedBlueprintSlotCount).fill(game.blueprint),
    unlockedBlueprintSlotCount, visibleCropIds: ['leek', 'soybean'],
    fieldIncomePerSecond: 1, columnsBuiltPerSecond: 0, rowsBuiltPerSecond: 0,
    floorsBuiltPerSecond: 0, showMonocropLimit: false,
  }))
}

test('Blueprint 4 teaser is absent before Misfortune, even if Soybean visibility is stale', () => {
  const markup = render(createInitialGame())
  assert.doesNotMatch(markup, /Blueprint 4|Unlocks with Soybean/)
  assert.match(markup, /Select Blueprint 1/)
  assert.match(markup, /Blueprint 2:/)
})

test('entering Misfortune permits the existing Blueprint 4 teaser', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune' }
  const markup = render(game)
  assert.match(markup, /Blueprint 4: Unlocks with Soybean/)
  assert.doesNotMatch(markup, /Select Blueprint 4/)
})

test('the teaser stays available after returning to the main area', () => {
  const game = { ...createInitialGame(), areaProgress: { main: null, misfortune: {} } }
  assert.match(render(game), /Blueprint 4: Unlocks with Soybean/)
  assert.match(render({ ...createInitialGame(), earnedAchievementIds: ['misfortune'] }),
    /Blueprint 4: Unlocks with Soybean/)
})

test('already unlocked Blueprint 4 remains usable in older saves', () => {
  assert.match(render(createInitialGame(), 4), /Select Blueprint 4/)
})
