import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, FloorReplicatorPurchase
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ FloorReplicatorPurchase } = await server.ssrLoadModule('/src/tabs/FloorReplicatorPurchase.jsx'))
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
