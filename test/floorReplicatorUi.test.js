import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { canPurchaseFloorReplicatorsInArea, createInitialGame } from '../src/game/gameLogic.js'

let server, FloorReplicatorPurchase
before(async () => {
  server = await createServer({ logLevel: 'silent',
    resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ FloorReplicatorPurchase } = await server.ssrLoadModule('/src/tabs/FloorReplicatorPurchase.jsx'))
})

test('Main Floor Replicator purchase controls unlock with Parting Gift', () => {
  for (const hasGift of [false, true]) {
    const game = { ...createInitialGame(), crops: 100, hasUnlockedFloorReplicators: true,
      completedMisfortuneUpgrades: hasGift ? ['finalSupport', 'partingGift'] : ['finalSupport'] }
    const markup = renderToStaticMarkup(createElement(FloorReplicatorPurchase, {
      game, nextFloorReplicatorCost: 0.01,
      floorReplicatorCoordinationMultiplier: 1, floorReplicatorEffectivenessMultiplier: 1,
      floorReplicatorExternalMultiplier: 1, floorsBuiltPerSecond: 0,
      canPurchaseFloorReplicators: canPurchaseFloorReplicatorsInArea(game),
    }))
    if (hasGift) {
      assert.doesNotMatch(markup, /Misfortune only|Return to Misfortune/)
      assert.match(markup, /Ready to build another Floor generator/)
      assert.match(markup, /class="primary-button">Build Floor Replicator/)
    } else {
      assert.match(markup, /Return to Misfortune/)
      assert.match(markup, /class="primary-button" disabled="">Build Floor Replicator/)
    }
  }
})
after(async () => { await server?.close() })

test('Floor Replicators hide the accelerated cost threshold but keep prices and effectiveness information', () => {
  for (const floorReplicators of [0, 500, 550]) {
    const markup = renderToStaticMarkup(createElement(FloorReplicatorPurchase, {
      game: { crops: 100, floorReplicators },
      nextFloorReplicatorCost: 25,
      floorReplicatorCoordinationMultiplier: 2,
      floorReplicatorEffectivenessMultiplier: 1,
      floorReplicatorExternalMultiplier: 1,
      floorsBuiltPerSecond: 1,
      canPurchaseFloorReplicators: true,
    }))
    assert.doesNotMatch(markup, /until 500|afterward|growth factor|\+5, \+10|softcap/i)
    assert.match(markup, /Every ten Replicators multiply their effectiveness by 2/)
    assert.match(markup, /Tier prices initially grow by ×10/)
    assert.match(markup, /Next ×2 tier at/)
    assert.match(markup, /25.*Crops/s)
    assert.match(markup, /Build Floor Replicator/)
    assert.match(markup, /Ready to build another Floor generator/)
  }
})
