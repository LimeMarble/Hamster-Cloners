import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  CAPYBARA_DEMONSTRATION_IDS, MISFORTUNE_UPGRADES,
  canUnlockMisfortuneUpgrade, createInitialGame, purchaseMisfortuneUpgrade,
  switchGameArea,
} from '../src/game/gameLogic.js'

let server, Misfortune, GameNavigation, useGameDerivedState
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Misfortune } = await server.ssrLoadModule('/src/tabs/Misfortune.jsx'))
  ;({ GameNavigation } = await server.ssrLoadModule('/src/tabs/GameNavigation.jsx'))
  ;({ useGameDerivedState } = await server.ssrLoadModule('/src/hooks/useGameDerivedState.js'))
})
after(async () => { await server?.close() })

function derive(game) {
  let result
  function Probe() {
    result = useGameDerivedState(game)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  return result
}

function upgradeProps(extra = {}) {
  return {
    ...MISFORTUNE_UPGRADES,
    ...Object.fromEntries(Object.keys(MISFORTUNE_UPGRADES).map((id) =>
      [`canUnlock${id[0].toUpperCase()}${id.slice(1)}`, true])),
    hasSweetPotato: true, hasFiveLeafClover: true,
    hasHuntForSomethingGreater: true,
    huntForSomethingGreaterMultiplier: 1, missingMisfortuneCropTypeCount: 0,
    ...extra,
  }
}

function purchaseButtons(markup) {
  return [...markup.matchAll(/<article class="misfortune-upgrade-card">([\s\S]*?)<\/article>/g)]
    .map(([, card]) => [...card.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].at(-1))
}

test('Misfortune is hidden before Demo 2 unlocks, and available from main after Demo 1', () => {
  const initial = createInitialGame()
  const before = derive(initial)
  assert.equal(before.isMisfortuneTabVisible, false)
  assert.equal(before.isMisfortuneAreaActive, false)
  const after = derive({ ...initial, capybara: { ...initial.capybara,
    completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE] } })
  assert.equal(after.isMisfortuneTabVisible, true)
  assert.equal(after.isMisfortuneAreaActive, false)
  const nav = renderToStaticMarkup(createElement(GameNavigation, {
    activeTab: 'misfortune', isMisfortuneTabVisible: after.isMisfortuneTabVisible,
  }))
  assert.match(nav, /game-tab-misfortune game-tab-active[^>]*>Misfortune/)
})

test('leaving or completing Demo 2 keeps the tab available without keeping Wrath active', () => {
  const inside = switchGameArea(createInitialGame(), 'misfortune')
  const insideDerived = derive(inside)
  assert.equal(insideDerived.isMisfortuneTabVisible, true)
  assert.equal(insideDerived.isMisfortuneAreaActive, true)
  const outside = switchGameArea(inside, 'main')
  const outsideDerived = derive(outside)
  assert.equal(outsideDerived.isMisfortuneTabVisible, true)
  assert.equal(outsideDerived.isMisfortuneAreaActive, false)
  const completed = derive({ ...createInitialGame(), capybara: {
    completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO],
  } })
  assert.equal(completed.isMisfortuneTabVisible, true)
  assert.equal(completed.isMisfortuneAreaActive, false)
})

test('browsing from main disables every purchase even if supplied affordability flags are true', () => {
  const markup = renderToStaticMarkup(createElement(Misfortune,
    upgradeProps({ isMisfortuneAreaActive: false })))
  assert.match(markup, /must enter Demo 2 to purchase them/)
  assert.match(markup, /Enter Misfortune \(Demo 2\)/)
  assert.doesNotMatch(markup, /Return to main field/)
  const buttons = purchaseButtons(markup)
  assert.equal(buttons.length, Object.keys(MISFORTUNE_UPGRADES).length)
  assert.ok(buttons.every((button) => button[1].includes('disabled=""')))
})

test('inside Demo 2 eligible purchases remain enabled and the return action is shown', () => {
  const markup = renderToStaticMarkup(createElement(Misfortune,
    upgradeProps({ isMisfortuneAreaActive: true })))
  assert.doesNotMatch(markup, /must enter Demo 2 to purchase them|Enter Misfortune/)
  assert.match(markup, /Return to main field/)
  const buttons = purchaseButtons(markup)
  assert.equal(buttons.length, Object.keys(MISFORTUNE_UPGRADES).length)
  // Hunt is already owned to reveal its dependent upgrades; only it is disabled.
  assert.equal(buttons.filter((button) => button[1].includes('disabled=""')).length, 1)
})

test('read-only browsing keeps the Sweet Potato link enabled and hides unrevealed upgrades', () => {
  const markup = renderToStaticMarkup(createElement(Misfortune,
    upgradeProps({ isMisfortuneAreaActive: false, hasOilyTreats: true,
      hasSweetPotato: false, hasFiveLeafClover: false })))
  assert.match(markup, /<button[^>]*>View Sweet Potato in Main<\/button>/)
  assert.doesNotMatch(markup, /<button[^>]*disabled[^>]*>View Sweet Potato in Main/)
  assert.doesNotMatch(markup, /Adversity-Grown Tubers|Not-So-Final Support/)
})

test('the purchase logic rejects every Misfortune upgrade from main regardless of available Crops', () => {
  for (const id of Object.keys(MISFORTUNE_UPGRADES)) {
    const main = { ...createInitialGame(), crops: 1e200,
      completedCropPerfections: ['sweetPotato'], cloverAssembly: { assembled: true },
      completedMisfortuneUpgrades: ['huntForSomethingGreater'].filter((owned) => owned !== id) }
    const original = JSON.stringify(main)
    assert.equal(canUnlockMisfortuneUpgrade(main, id), false, id)
    assert.equal(purchaseMisfortuneUpgrade(main, id), null, id)
    assert.equal(JSON.stringify(main), original, id)
    const inside = { ...main, activeArea: 'misfortune' }
    assert.equal(canUnlockMisfortuneUpgrade(inside, id), true, id)
    assert.ok(purchaseMisfortuneUpgrade(inside, id), id)
  }
})
