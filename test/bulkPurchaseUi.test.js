import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { createInitialGame, getBulkPurchaseQuote } from '../src/game/gameLogic.js'
import { readFileSync } from 'node:fs'

let server, BulkPurchaseButtons, HamsterPurchase, useGameActions, setActiveNumberNotation
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ BulkPurchaseButtons } = await server.ssrLoadModule('/src/tabs/BulkPurchaseButtons.jsx'))
  ;({ HamsterPurchase } = await server.ssrLoadModule('/src/tabs/HamsterPurchase.jsx'))
  ;({ useGameActions } = await server.ssrLoadModule('/src/hooks/useGameActions.js'))
  ;({ setActiveNumberNotation } = await server.ssrLoadModule('/src/game/numberFormat.js'))
})
after(async () => { setActiveNumberNotation?.('suffix'); await server?.close() })

function renderBulk(game, kind = 'hamster') {
  return renderToStaticMarkup(createElement(BulkPurchaseButtons, { game, kind }))
}

test('bulk buttons retain the original secondary color and show full cost, not a shortfall', () => {
  const game = { ...createInitialGame(), hamsters: 10, totalHamstersHired: 10, crops: 10 }
  const markup = renderBulk(game)
  assert.match(markup, /bulk-purchase-button/)
  assert.match(markup, /Buy 10.*195 Crops/s)
  assert.doesNotMatch(markup, /more Crops needed/)
  assert.equal((markup.match(/class="secondary-button bulk-purchase-button"/g) || []).length, 2)
  assert.match(markup, /<span>Buy max<\/span>/)
  assert.doesNotMatch(markup.slice(markup.indexOf('Buy max')), /bulk-purchase-cost|0 Crops|more Crops needed/)
  assert.equal((markup.match(/disabled=""/g) || []).length, 2)
  const funded = renderBulk({ ...game, crops: 195 })
  assert.doesNotMatch(funded, /disabled=""|more Crops needed/)
  assert.match(funded, /Buy max \(10\).*195 Crops/s)
  const css = readFileSync(new URL('../src/tabs/styles/controls-and-modals.css', import.meta.url), 'utf8')
  assert.match(css, /\.secondary-button\s*\{[^}]*background: var\(--panel-raised\)/s)
  assert.doesNotMatch(css, /\.bulk-purchase-button[^{]*\{[^}]*background:/s)
})

test('Buy 10 keeps its full cost visible without extra Crops needed for every machinery type', () => {
  const base = { ...createInitialGame(), crops: 0, hamsters: 10, totalHamstersHired: 10,
    hasUnlockedRowDuplicators: true, hasUnlockedFloorReplicators: true }
  setActiveNumberNotation('suffix')
  for (const kind of ['hamster', 'row', 'floor']) {
    const game = { ...base, activeArea: kind === 'floor' ? 'misfortune' : 'main' }
    assert.ok(getBulkPurchaseQuote(game, kind, 10).shortfall > 0)
    const markup = renderBulk(game, kind)
    assert.match(markup, /Buy 10<\/span><span class="bulk-purchase-cost">[^<]+ Crops/)
    assert.doesNotMatch(markup, /more Crops needed/)
    assert.equal((markup.match(/disabled=""/g) || []).length, 2)
  }
})

test('bulk cost labels follow the selected number notation', () => {
  const game = { ...createInitialGame(), hasUnlockedRowDuplicators: true, crops: 1e14 }
  setActiveNumberNotation('scientific')
  assert.match(renderBulk(game, 'row'), /e13/)
  setActiveNumberNotation('suffix')
  assert.match(renderBulk(game, 'row'), /T Crops/)
})

test('hamster bulk buttons retain the ten-hires visibility threshold', () => {
  const props = { game: { ...createInitialGame(), totalHamstersHired: 9 }, nextHamsterCost: 1 }
  const before = renderToStaticMarkup(createElement(HamsterPurchase, props))
  assert.doesNotMatch(before, /Buy 10|Buy max/)
  const after = renderToStaticMarkup(createElement(HamsterPurchase, {
    ...props, game: { ...props.game, totalHamstersHired: 10 } }))
  assert.match(after, /Buy 10/)
  assert.match(after, /Buy max/)
})

test('Buy Max shows the affordable quantity for each machinery type, falling back to its plain label at zero', () => {
  const base = { ...createInitialGame(), hasUnlockedRowDuplicators: true,
    hasUnlockedFloorReplicators: true }
  for (const [kind, game, quantity] of [
    ['hamster', { ...base, hamsters: 10, totalHamstersHired: 10, crops: 195 }, 10],
    ['row', { ...base, crops: 1e12 }, 1],
    ['floor', { ...base, activeArea: 'misfortune', crops: 10 }, 10],
  ]) {
    assert.match(renderBulk(game, kind), new RegExp(`Buy max \\(${quantity}\\)`))
    const empty = renderBulk({ ...game, crops: 0 }, kind)
    assert.match(empty, /<span>Buy max<\/span>/)
    assert.doesNotMatch(empty, /Buy max \(0\)/)
  }
  const beforeUnion = { ...base, hamsters: 990, totalHamstersHired: 990, crops: 1e9 }
  assert.match(renderBulk(beforeUnion), /Buy max \(9\)/)
})

test('bulk buttons explain unionization and Floor area restrictions', () => {
  const game = { ...createInitialGame(), hamsters: 999, totalHamstersHired: 999, crops: 1e6 }
  assert.match(renderBulk(game), /Hire the 1,000th separately/)
  assert.doesNotMatch(renderBulk(game), /more Crops needed/)
  assert.match(renderBulk({ ...game, hasUnlockedFloorReplicators: true }, 'floor'), /Misfortune only/)
})

function actionsFor(initial) {
  const gameRef = { current: initial }
  let actions
  function Probe() {
    actions = useGameActions({ gameRef, updateGame: (update) => {
      gameRef.current = update(gameRef.current)
    } })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  return { gameRef, actions: actions.purchaseActions }
}

test('Buy 10 handlers update each machinery count and check the current budget', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune', crops: 1e16,
    hamsters: 10, totalHamstersHired: 10,
    hasUnlockedRowDuplicators: true, hasUnlockedFloorReplicators: true }
  for (const [field, handler] of [
    ['hamsters', 'onBuyTenHamsters'], ['rowDuplicators', 'onBuyTenRowDuplicators'],
    ['floorReplicators', 'onBuyTenFloorReplicators'],
  ]) {
    const { gameRef, actions } = actionsFor(game)
    actions[handler]()
    assert.equal(gameRef.current[field], game[field] + 10)
    assert.ok(gameRef.current.crops < game.crops)
    const stale = actionsFor(game)
    stale.gameRef.current = { ...game, crops: 0 }
    stale.actions[handler]()
    assert.equal(stale.gameRef.current[field], game[field])
    assert.equal(stale.gameRef.current.crops, 0)
  }
})
