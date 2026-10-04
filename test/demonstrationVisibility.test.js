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
  for (let completedCount = 0; completedCount <= CAPYBARA_DEMONSTRATIONS.length; completedCount += 1) {
    assert.deepEqual(CAPYBARA_DEMONSTRATIONS.map(({ id }) =>
      isCapybaraDemonstrationVisible(game, id)),
    CAPYBARA_DEMONSTRATIONS.map((_demo, index) => index <= completedCount))
    const markup = renderToStaticMarkup(createElement(Trade, {
      game, activeRelation: 'capybaras', capybaraBlueprintCropYield: 0,
    }))
    CAPYBARA_DEMONSTRATIONS.forEach(({ name }, index) => {
      assert.equal(markup.includes(`<h3>${name.replaceAll("'", '&#x27;')}</h3>`),
        index <= completedCount, `Demo ${index}: ${name}`)
    })
    if (completedCount < CAPYBARA_DEMONSTRATIONS.length) {
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
