import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  CAPYBARA_DEMONSTRATIONS, createInitialGame,
  isCapybaraDemonstrationVisible, getCapybaraDemonstrationStatus,
  completeNextCapybaraDemonstrationForTesting,
  getNextMajorProgressionGoal,
} from '../src/game/gameLogic.js'

let server, Trade
before(async () => {
  server = await createServer({ logLevel: 'silent',
    resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Trade } = await server.ssrLoadModule('/src/tabs/Trade.jsx'))
})
after(async () => { await server?.close() })

function contactGame() {
  const game = createInitialGame()
  return { ...game, trade: { ...game.trade, established: true,
    rabbitUnlocks: ['capybaraContact'] } }
}

test('Rabbit lore contains only the in-game preference text', () => {
  const markup = renderToStaticMarkup(createElement(Trade, {
    game: contactGame(), activeRelation: 'rabbits',
  }))
  assert.match(markup, /The Rabbits insist they dislike apples, pumpkins, and pesky weeds\./)
  assert.doesNotMatch(markup, /Whether that is accurate rabbit lore is another question/)
})

test('only Demo 0 is initially visible and unknown demonstrations stay hidden', () => {
  const game = contactGame()
  assert.deepEqual(CAPYBARA_DEMONSTRATIONS.map(({ id }) =>
    isCapybaraDemonstrationVisible(game, id)), [true, false, false, false])
  assert.equal(isCapybaraDemonstrationVisible(game, 'unknown'), false)
})

test('each completion reveals exactly the next demonstration, keeping completed ones visible', () => {
  let game = contactGame()
  const availableCount = CAPYBARA_DEMONSTRATIONS.filter(({ available }) => available !== false).length
  for (let completedCount = 0; completedCount <= availableCount; completedCount += 1) {
    assert.deepEqual(CAPYBARA_DEMONSTRATIONS.map(({ id }) =>
      isCapybaraDemonstrationVisible(game, id)),
    CAPYBARA_DEMONSTRATIONS.map((demo, index) => demo.available !== false && index <= completedCount))
    const markup = renderToStaticMarkup(createElement(Trade, {
      game, activeRelation: 'capybaras', capybaraBlueprintCropYield: 0,
    }))
    CAPYBARA_DEMONSTRATIONS.forEach(({ name, available }, index) => {
      assert.equal(markup.includes(`<h3>${name.replaceAll("'", '&#x27;')}</h3>`),
        available !== false && index <= completedCount, `Demo ${index}: ${name}`)
    })
    if (completedCount < availableCount) {
      game = completeNextCapybaraDemonstrationForTesting(game)
    }
  }
})

test('hidden demonstrations still cannot be completed merely by meeting their numerical target', () => {
  const game = contactGame()
  CAPYBARA_DEMONSTRATIONS.slice(1).forEach(({ id, target }) => {
    const status = getCapybaraDemonstrationStatus(game, id, {
      blueprintCropYield: target, misfortuneCrops: target, manateeDevelopmentGoalsCompleted: target,
    })
    assert.equal(status.hasPrerequisite, false)
    assert.equal(status.canComplete, false)
  })
})

test('the major goal bar does not expose a demonstration whose predecessor is incomplete', () => {
  const initial = contactGame()
  // An unusual imported state: later demos are marked complete but Demo 0 is not.
  const game = { ...initial, capybara: { completedDemonstrations:
    CAPYBARA_DEMONSTRATIONS.slice(1).map(({ id }) => id) } }
  const goal = getNextMajorProgressionGoal(game)
  assert.notEqual(goal.id, 'capybara-demonstration-one')
  assert.notEqual(goal.id, 'capybara-demonstration-two')
  assert.notEqual(goal.id, 'capybara-demonstration-three')
})

test('Demo 2 remains available but advertises the content endpoint instead of Manatees', () => {
  const game = contactGame()
  game.capybara.completedDemonstrations = ['introduction', 'demonstrationOne']
  const markup = renderToStaticMarkup(createElement(Trade, {
    game, activeRelation: 'capybaras', capybaraBlueprintCropYield: 0,
  }))
  assert.match(markup, /Fortune&#x27;s Wrath/)
  assert.match(markup, /End of current content/)
  assert.doesNotMatch(markup, /Establish contact with Manatees|Estuary Development/)
})

test('legacy Manatee tab requests fall back to Rabbits even after Demo 2 or Demo 3', () => {
  for (const completed of [3, 4]) {
    const game = contactGame()
    game.capybara.completedDemonstrations = CAPYBARA_DEMONSTRATIONS.slice(0, completed)
      .map(({ id }) => id)
    for (const activeRelation of ['rabbits', 'manatees']) {
      const markup = renderToStaticMarkup(createElement(Trade, { game, activeRelation }))
      assert.match(markup, /<h2 id="rabbits-title">Rabbits<\/h2>/)
      assert.doesNotMatch(markup, />Manatees<|manatee-relations|manatees-title/)
      assert.doesNotMatch(markup, /shortens survey time/)
    }
  }
})
