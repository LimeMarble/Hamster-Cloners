import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  createInitialGame,
  getUnlockedBlueprintSlotCount,
} from '../src/game/blueprintLogic.js'

let server, Blueprint
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Blueprint } = await server.ssrLoadModule('/src/tabs/Blueprint.jsx'))
})
after(async () => { await server?.close() })

function render(
  game,
  unlockedBlueprintSlotCount = getUnlockedBlueprintSlotCount(game),
  visibleCropIds = ['leek', 'soybean'],
) {
  return renderToStaticMarkup(createElement(Blueprint, {
    game, blueprintSlots: Array(unlockedBlueprintSlotCount).fill(game.blueprint),
    unlockedBlueprintSlotCount, visibleCropIds,
    fieldIncomePerSecond: 1, columnsBuiltPerSecond: 0, rowsBuiltPerSecond: 0,
    floorsBuiltPerSecond: 0, showMonocropLimit: false,
  }))
}

test('Blueprint 4 teaser is absent before Misfortune, even if Soybean visibility is stale', () => {
  const markup = render(createInitialGame())
  assert.doesNotMatch(markup, /Blueprint 4|Unlocks with Peanuts|Unlocks with Soybean/)
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
  assert.match(render(game, 1, ['leek']), /Blueprint 4: Unlocks with Peanuts/)
  assert.match(render({ ...createInitialGame(), earnedAchievementIds: ['misfortune'] }),
    /Blueprint 4: Unlocks with Peanuts/)
})

test('already unlocked Blueprint 4 remains usable in older saves', () => {
  assert.match(render(createInitialGame(), 4), /Select Blueprint 4/)
})

test('Main shows the fourth slot unlocked by Peanuts before Soybean is visible', () => {
  const game = { ...createInitialGame(), earnedAchievementIds: ['makingPeanuts'] }
  const markup = render(game, undefined, ['leek', 'peanuts'])
  assert.match(markup, /Select Blueprint 4/)
  assert.doesNotMatch(markup, /Unlocks with Soybean/)
})

test('Misfortune uses Peanuts for its second slot rather than Potato', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune', unionized: true, hamsters: 125 }
  const markup = render(game, undefined, ['leek', 'sweetPotato'])
  assert.match(markup, /Blueprint 2: Unlocks with Peanuts/)
  assert.doesNotMatch(markup, /Unlocks with Potato|Select Blueprint 2/)
})

test('Misfortune keeps its third slot usable even before the Knotweed teaser gate', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune', hasUnlockedSunflower: true }
  assert.match(render(game, undefined, ['leek', 'sunflower']), /Select Blueprint 3/)
})

test('Main keeps its existing Potato and Sunflower lock messages', () => {
  const markup = render({ ...createInitialGame(), hasUnlockedKnotweed: true }, 1, ['leek'])
  assert.match(markup, /Blueprint 2: Unlocks with Potato/)
  assert.match(markup, /Blueprint 3: Unlocks with Sunflower/)
})
