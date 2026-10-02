import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  CAPYBARA_DEMONSTRATION_IDS, MISFORTUNE_UPGRADES,
  canUnlockMisfortuneUpgrade, createInitialGame, purchaseMisfortuneUpgrade,
  switchGameArea, isMisfortuneUpgradeVisible,
} from '../src/game/gameLogic.js'
import { exportGame, importGame } from '../src/game/storage.js'

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

test('Hunt precedes Nourishing Misery in both purchase progression and the page', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune', crops: 1e200,
    completedCropPerfections: ['sweetPotato'] }
  assert.equal(MISFORTUNE_UPGRADES.huntForSomethingGreater.cost, 7.77e41)
  assert.equal(MISFORTUNE_UPGRADES.nourishingMisery.cost, 2e38)
  assert.equal(canUnlockMisfortuneUpgrade(game, 'huntForSomethingGreater'), true)
  assert.equal(isMisfortuneUpgradeVisible(game, 'nourishingMisery'), false)
  assert.equal(canUnlockMisfortuneUpgrade(game, 'nourishingMisery'), false)
  assert.equal(purchaseMisfortuneUpgrade(game, 'nourishingMisery'), null)
  const afterHunt = purchaseMisfortuneUpgrade(game, 'huntForSomethingGreater')
  assert.equal(isMisfortuneUpgradeVisible(afterHunt, 'nourishingMisery'), true)
  assert.equal(canUnlockMisfortuneUpgrade(afterHunt, 'nourishingMisery'), true)
  assert.ok(purchaseMisfortuneUpgrade(afterHunt, 'nourishingMisery'))

  const beforeMarkup = renderToStaticMarkup(createElement(Misfortune,
    upgradeProps({ hasHuntForSomethingGreater: false })))
  assert.match(beforeMarkup, /Hunt for Something Greater/)
  assert.doesNotMatch(beforeMarkup, /Nourishing Misery/)
  const afterMarkup = renderToStaticMarkup(createElement(Misfortune, upgradeProps()))
  assert.ok(afterMarkup.indexOf('<h2>Hunt for Something Greater</h2>') <
    afterMarkup.indexOf('<h2>Nourishing Misery</h2>'))
})

test('older saves keep an already purchased Nourishing Misery even without Hunt', () => {
  const legacy = { ...createInitialGame(), activeArea: 'misfortune',
    completedCropPerfections: ['sweetPotato', 'leechingGourd'],
    completedMisfortuneUpgrades: ['nourishingMisery'],
    seedAugmentations: { leechingVineUnlocked: true } }
  const restored = importGame(exportGame(legacy))
  assert.ok(restored.completedMisfortuneUpgrades.includes('nourishingMisery'))
  assert.ok(!restored.completedMisfortuneUpgrades.includes('huntForSomethingGreater'))
  assert.equal(restored.seedAugmentations.leechingVineUnlocked, true)
  assert.equal(isMisfortuneUpgradeVisible(restored, 'nourishingMisery'), true)
  const markup = renderToStaticMarkup(createElement(Misfortune,
    upgradeProps({ hasHuntForSomethingGreater: false, hasNourishingMisery: true })))
  assert.match(markup, /Nourishing Misery/)
})
