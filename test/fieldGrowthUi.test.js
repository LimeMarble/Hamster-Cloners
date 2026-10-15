import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { createInitialGame } from '../src/game/gameLogic.js'
import {
  getPercentageGainColor,
  getProductPercentageGainPerSecond,
} from '../src/game/fieldGrowth.js'

let server, PercentageGain, Blueprint
before(async () => {
  server = await createServer({
    logLevel: 'silent',
    // Avoid Windows native realpath failures in the local test sandbox.
    resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })
  ;({ PercentageGain } = await server.ssrLoadModule('/src/tabs/ui.jsx'))
  ;({ Blueprint } = await server.ssrLoadModule('/src/tabs/Blueprint.jsx'))
})
after(async () => { await server?.close() })

test('the gain indicator keeps its numeric text and applies its rate color', () => {
  for (const value of [0.1, 0.5, 1, 2, 5, 25, 100]) {
    const markup = renderToStaticMarkup(createElement(PercentageGain, { value }))
    assert.ok(markup.includes(`--percentage-gain-color:${getPercentageGainColor(value)}`))
    assert.ok(markup.includes(`+${value}%/s`))
    assert.match(markup, /Estimated gain at current production rates/)
  }
})

test('adding growth colors does not change indicator visibility', () => {
  for (const value of [NaN, Infinity, -1, 0, 0.01]) {
    assert.equal(renderToStaticMarkup(createElement(PercentageGain, { value })), '')
  }
  assert.match(
    renderToStaticMarkup(createElement(PercentageGain, { value: 0.0101 })),
    /percentage-gain-color:hsl\(0 85% 65%\)/,
  )
})

test('field, column, row and floor indicators all use the same color scale', () => {
  const game = {
    ...createInitialGame(),
    farmland: { rows: 100, columns: 100, floors: 100, farms: 1, otherMultipliers: 1 },
    hasUnlockedRowDuplicators: true,
    hasUnlockedFloorReplicators: true,
  }
  const markup = renderToStaticMarkup(createElement(Blueprint, {
    game,
    blueprintSlots: game.blueprintSlots,
    unlockedBlueprintSlotCount: 1,
    visibleCropIds: ['leek'],
    fieldIncomePerSecond: 1,
    columnsBuiltPerSecond: 2,
    rowsBuiltPerSecond: 0.5,
    floorsBuiltPerSecond: 5,
  }))
  const fieldsRate = getProductPercentageGainPerSecond([
    { current: 100, producedPerSecond: 2 },
    { current: 100, producedPerSecond: 0.5 },
    { current: 100, producedPerSecond: 5 },
    { current: 1, producedPerSecond: 0 },
  ])
  for (const [label, rate] of [
    ['Fields planted', fieldsRate], ['Columns built', 2],
    ['Rows built', 0.5], ['Floors built', 5],
  ]) {
    const section = markup.match(new RegExp(`<dt>${label}</dt><dd>(.*?)</dd>`))?.[1]
    assert.ok(section?.includes(`--percentage-gain-color:${getPercentageGainColor(rate)}`), label)
  }
})
