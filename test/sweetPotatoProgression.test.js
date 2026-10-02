import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  createInitialGame,
  canUnlockMisfortuneUpgrade,
  getCropPerfectionCost,
  getNextMajorProgressionGoal,
  isMisfortuneUpgradeVisible,
  MAJOR_PROGRESSION_GOALS,
  MISFORTUNE_UPGRADES,
  purchaseMisfortuneUpgrade,
} from '../src/game/gameLogic.js'

let server, Misfortune, MajorProgressionBar
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Misfortune } = await server.ssrLoadModule('/src/tabs/Misfortune.jsx'))
  ;({ MajorProgressionBar } = await server.ssrLoadModule('/src/tabs/MajorProgressionBar.jsx'))
})
after(async () => { await server?.close() })

function afterDemoOne(overrides = {}) {
  return {
    ...createInitialGame(),
    totalHamstersHired: 1000,
    unionized: true,
    hamsters: 125,
    completedBlueprintExpansions: ['firstColumn'],
    hasUnlockedTurnip: true,
    hasUnlockedCropPerfection: true,
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn', 'leechingGourd', 'splitweed'],
    hasUnlockedAppleTree: true,
    hasUnlockedLentil: true,
    hasUnlockedKnotweed: true,
    hasUnlockedRowDuplicators: true,
    hasUnlockedWheat: true,
    hasUnlockedSunflower: true,
    rowDuplicators: 500,
    trade: { established: true, rabbitUnlocks: ['carrot', 'fourLeafClover', 'capybaraContact'] },
    capybara: { completedDemonstrations: ['introduction', 'demonstrationOne'] },
    ...overrides,
  }
}

const laterUpgradeIds = [
  'adversityGrownTubers', 'burdenedFoundations', 'nourishingMisery',
  'huntForSomethingGreater', 'fortunateColumn', 'finalSupport', 'notSoFinalSupport',
]

test('Sweet Potato is between Demo 1 and Soybean without teasing before Demo 1', () => {
  const ids = MAJOR_PROGRESSION_GOALS.map(({ id }) => id)
  assert.ok(ids.indexOf('perfection-sweetPotato') > ids.indexOf('capybara-demonstration-one'))
  assert.ok(ids.indexOf('perfection-sweetPotato') < ids.indexOf('crop-soybean'))
  const definition = MAJOR_PROGRESSION_GOALS.find(({ id }) => id === 'perfection-sweetPotato')
  assert.equal(definition.isApplicable(createInitialGame()), false)
  assert.equal(definition.isApplicable(afterDemoOne()), true)
})

test('locked Sweet Potato shows a Misfortune clue and a dash, never its cost or prerequisite', () => {
  const game = afterDemoOne({ crops: 1e300 })
  for (const state of [game, { ...game, areaProgress: { misfortune: {} } }]) {
    const goal = getNextMajorProgressionGoal(state)
    assert.equal(goal.id, 'perfection-sweetPotato')
    assert.equal(goal.current, 0)
    assert.equal(goal.target, 0)
    assert.equal(goal.progress, 0)
    assert.equal(goal.isReady, false)
    assert.equal(goal.displayProgressAsDash, true)
    assert.equal(goal.progressLabel, null)
    assert.equal(goal.description,
      'Continue progressing in Misfortune to discover how to perfect Potato.')
    const markup = renderToStaticMarkup(createElement(MajorProgressionBar, { goal }))
    assert.match(markup, /Unlock Sweet Potato/)
    assert.match(markup, /Continue progressing in Misfortune/)
    assert.match(markup, /major-progression-values[^>]*>-<\/span>/)
    assert.doesNotMatch(markup, /Oily Treats|Ready to unlock|\/.*Crops/)
  }
})

test('Oily Treats reveals the regular cost, and perfecting Sweet Potato advances to Soybean', () => {
  const game = afterDemoOne({ areaProgress: { misfortune: {} },
    completedMisfortuneUpgrades: ['oilyTreats'], crops: 2e99 })
  game.crops = getCropPerfectionCost('sweetPotato', game)
  const goal = getNextMajorProgressionGoal(game)
  assert.equal(goal.id, 'perfection-sweetPotato')
  assert.ok(Math.abs(goal.target / 2e99 - 1) < 1e-12)
  assert.equal(goal.current, game.crops)
  assert.equal(goal.progress, 1)
  assert.equal(goal.isReady, true)
  assert.equal(goal.displayProgressAsDash, false)
  assert.equal(goal.description, 'Purchase Sweet Potato in Inventions → Crop Perfection.')
  assert.equal(getNextMajorProgressionGoal({ ...game,
    completedCropPerfections: [...game.completedCropPerfections, 'sweetPotato'],
  }).id, 'crop-soybean')
})

test('later Misfortune upgrades and their goals stay hidden until Sweet Potato is perfected', () => {
  const locked = afterDemoOne({ activeArea: 'misfortune',
    completedMisfortuneUpgrades: ['oilyTreats'], crops: 1e200 })
  const perfected = { ...locked,
    completedCropPerfections: [...locked.completedCropPerfections, 'sweetPotato'] }
  const fullyRevealed = { ...perfected,
    completedMisfortuneUpgrades: ['oilyTreats', 'huntForSomethingGreater'],
    cloverAssembly: { assembled: true } }
  for (const id of ['unfortunateRow', 'rushedStart', 'oilyTreats']) {
    assert.equal(isMisfortuneUpgradeVisible(locked, id), true)
  }
  for (const id of laterUpgradeIds) {
    const goal = MAJOR_PROGRESSION_GOALS.find(({ id: goalId }) => goalId === `misfortune-upgrade-${id}`)
    assert.equal(isMisfortuneUpgradeVisible(locked, id), false)
    assert.equal(goal.isApplicable(locked), false)
    const needsMoreProgress = ['fortunateColumn', 'finalSupport', 'notSoFinalSupport'].includes(id)
    assert.equal(isMisfortuneUpgradeVisible(perfected, id), !needsMoreProgress)
    assert.equal(goal.isApplicable(perfected), !needsMoreProgress)
    assert.equal(isMisfortuneUpgradeVisible(fullyRevealed, id), true)
    assert.equal(goal.isApplicable(fullyRevealed), true)
    assert.equal(goal.isApplicable({ ...perfected, activeArea: 'main' }), false)
  }
  assert.equal(isMisfortuneUpgradeVisible(locked, 'invalid'), false)
})

test('the Misfortune page hides later cards until perfection, not just the Oily Treats purchase', () => {
  const props = { ...MISFORTUNE_UPGRADES, hasOilyTreats: true }
  const locked = renderToStaticMarkup(createElement(Misfortune, props))
  for (const id of ['unfortunateRow', 'rushedStart', 'oilyTreats']) {
    assert.ok(locked.includes(MISFORTUNE_UPGRADES[id].name))
  }
  for (const id of laterUpgradeIds) {
    assert.ok(!locked.includes(MISFORTUNE_UPGRADES[id].name))
  }
  assert.match(locked, /View Sweet Potato in Main/)
  const perfected = renderToStaticMarkup(createElement(Misfortune, {
    ...props, hasSweetPotato: true, hasHuntForSomethingGreater: true, hasFiveLeafClover: true }))
  for (const id of laterUpgradeIds) {
    assert.ok(perfected.includes(MISFORTUNE_UPGRADES[id].name))
  }
  assert.doesNotMatch(perfected, /View Sweet Potato in Main/)
})

test('Fortunate Column and Final Support require Hunt for both visibility and purchasing', () => {
  const game = afterDemoOne({ activeArea: 'misfortune', crops: 1e200,
    completedCropPerfections: ['sweetPotato'] })
  for (const id of ['fortunateColumn', 'finalSupport']) {
    assert.equal(isMisfortuneUpgradeVisible(game, id), false)
    assert.equal(canUnlockMisfortuneUpgrade(game, id), false)
    assert.equal(purchaseMisfortuneUpgrade(game, id), null)
    const ready = { ...game, completedMisfortuneUpgrades: ['huntForSomethingGreater'] }
    assert.equal(isMisfortuneUpgradeVisible(ready, id), true)
    assert.equal(canUnlockMisfortuneUpgrade(ready, id), true)
    assert.ok(purchaseMisfortuneUpgrade(ready, id).completedMisfortuneUpgrades.includes(id))
  }
  for (const id of ['adversityGrownTubers', 'burdenedFoundations', 'nourishingMisery', 'huntForSomethingGreater']) {
    assert.equal(isMisfortuneUpgradeVisible(game, id), true)
    assert.equal(canUnlockMisfortuneUpgrade(game, id), true)
  }
})

test('Not-So-Final Support requires assembled 5-Leaf Clover, not just filled assembly progress', () => {
  const game = afterDemoOne({ activeArea: 'misfortune', crops: 1e200,
    completedCropPerfections: ['sweetPotato'],
    completedMisfortuneUpgrades: ['huntForSomethingGreater'] })
  for (const cloverAssembly of [undefined, { assembled: false, progress: 7.77e58 }]) {
    const locked = { ...game, cloverAssembly }
    assert.equal(isMisfortuneUpgradeVisible(locked, 'notSoFinalSupport'), false)
    assert.equal(canUnlockMisfortuneUpgrade(locked, 'notSoFinalSupport'), false)
    assert.equal(purchaseMisfortuneUpgrade(locked, 'notSoFinalSupport'), null)
  }
  const ready = { ...game, cloverAssembly: { assembled: true } }
  assert.equal(isMisfortuneUpgradeVisible(ready, 'notSoFinalSupport'), true)
  assert.equal(canUnlockMisfortuneUpgrade(ready, 'notSoFinalSupport'), true)
  assert.ok(purchaseMisfortuneUpgrade(ready, 'notSoFinalSupport'))
})

test('the page reveals Hunt-gated and Clover-gated cards separately, with simple cost wording', () => {
  const props = { ...MISFORTUNE_UPGRADES, hasSweetPotato: true }
  const beforeHunt = renderToStaticMarkup(createElement(Misfortune, props))
  assert.match(beforeHunt, /Hunt for Something Greater/)
  assert.doesNotMatch(beforeHunt, /Fortunate Column|Final Support/)
  const afterHunt = renderToStaticMarkup(createElement(Misfortune, {
    ...props, hasHuntForSomethingGreater: true }))
  assert.match(afterHunt, /Fortunate Column/)
  assert.match(afterHunt, /Final Support/)
  assert.doesNotMatch(afterHunt, /Not-So-Final Support/)
  const afterClover = renderToStaticMarkup(createElement(Misfortune, {
    ...props, hasHuntForSomethingGreater: true, hasFiveLeafClover: true }))
  assert.match(afterClover, /Not-So-Final Support/)
  const precursorCard = afterClover.slice(afterClover.indexOf('<h2>Not-So-Final Support</h2>'))
  assert.match(precursorCard, /Need .*Crops/)
  assert.doesNotMatch(precursorCard, /Misfortune Crops/)
  assert.doesNotMatch(afterClover, /This choice is permanent|progress is wiped|Permanent upgrades/)
})
