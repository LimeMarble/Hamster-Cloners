import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  createInitialGame, getUnlockedBlueprintSlotCount, getRabbitContractCropIds,
  advanceGameSimulationStep, createBlueprint, getNextMajorProgressionGoal,
  purchaseMisfortuneUpgrade, MISFORTUNE_UPGRADES, MISFORTUNE_UPGRADE_IDS,
  MAJOR_PROGRESSION_GOALS,
  switchGameArea, wipeMisfortuneAreaProgress,
} from '../src/game/gameLogic.js'
import {
  APPLE_TREE_UNLOCK_CROP_COUNT, KNOTWEED_UNLOCK_CROP_COUNT, LENTIL_UNLOCK_CROP_COUNT,
  getUnlockedCropIds, getVisibleCropIds, hasUnlockedCarrotInMisfortune,
  hasUnlockedCanolaInMisfortune, hasUnlockedCorn,
  hasUnlockedSoybean, getCropUnlockDescription, getCropUnlockBaseRequirement,
  getCropUnlockRequirement,
} from '../src/game/crops.js'
import { getCropRequirement } from '../src/game/cropRequirements.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'
import { getCachedFormattedNumber } from '../src/game/numberFormat.js'

let server, useGameDerivedState
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ useGameDerivedState } = await server.ssrLoadModule('/src/hooks/useGameDerivedState.js'))
})
after(async () => { await server?.close() })

function derive(game) {
  let derived
  function Probe() {
    derived = useGameDerivedState(game)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  return derived
}

function earlyMisfortune(overrides = {}) {
  const initial = createInitialGame()
  return { ...initial, activeArea: 'misfortune', unionized: true,
    totalHamstersHired: 1000, hasUnlockedRowDuplicators: true,
    ...overrides }
}

test('Misfortune Corn unlocks automatically at exactly 2.5M Crops, not blueprint expansion', () => {
  const expanded = createBlueprint({ rows: 2, columns: 2 })
  const below = earlyMisfortune({ crops: 2.5e6 - 1,
    blueprint: expanded, blueprintSlots: [expanded], completedBlueprintExpansions: ['firstColumn'] })
  assert.equal(hasUnlockedCorn(below), false)
  assert.ok(!derive(below).visibleUnlockedCropIds.includes('corn'))
  assert.ok(!getRabbitContractCropIds(below).includes('corn'))
  const goal = getNextMajorProgressionGoal(below)
  assert.equal(goal.id, 'crop-corn')
  assert.equal(goal.target, 2.5e6)
  assert.doesNotMatch(goal.description, /Expansion/)
  assert.match(getCropUnlockDescription('corn', 'misfortune', false, below), /2\.50M Crops/)

  const reached = earlyMisfortune({ crops: 2.5e6 })
  assert.equal(reached.blueprint.columns, 1)
  assert.equal(hasUnlockedCorn(reached), true)
  assert.ok(derive(reached).visibleUnlockedCropIds.includes('corn'))
  assert.ok(getRabbitContractCropIds(reached).includes('corn'))
  assert.equal(advanceGameSimulationStep(below, 1 / 60).hasUnlockedCorn, false)
  const unlocked = advanceGameSimulationStep(reached, 1 / 60)
  assert.equal(unlocked.hasUnlockedCorn, true)
  assert.equal(unlocked.crops, 2.5e6)
  assert.equal(normalizeGame(reached).hasUnlockedCorn, true)
})

test('Misfortune Corn remains unlocked across resets, saves and area switches, but not a wipe', () => {
  const unlocked = advanceGameSimulationStep(earlyMisfortune({ crops: 2.5e6 }), 1 / 60)
  const reset = purchaseMisfortuneUpgrade(unlocked, MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW)
  assert.ok(reset)
  assert.equal(reset.crops, 0)
  assert.equal(reset.hasUnlockedCorn, true)
  assert.equal(hasUnlockedCorn(importGame(exportGame(reset))), true)
  const main = switchGameArea(reset, 'main')
  const restored = switchGameArea(importGame(exportGame(main)), 'misfortune')
  assert.equal(hasUnlockedCorn(restored), true)
  assert.equal(hasUnlockedCorn(wipeMisfortuneAreaProgress(restored)), false)
  assert.equal(MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW].cost, 2.5e6)
})

test('Main Corn still requires blueprint column expansion, regardless of Crops or Misfortune Corn', () => {
  const main = { ...createInitialGame(), crops: 1e30, hasUnlockedCorn: true }
  assert.equal(hasUnlockedCorn(main), false)
  assert.ok(!derive(main).unlockedCropIds.includes('corn'))
  assert.match(getCropUnlockDescription('corn', 'main'), /first blueprint column expansion/)
  const expanded = createBlueprint({ rows: 1, columns: 2 })
  assert.equal(hasUnlockedCorn({ ...main, crops: 0, blueprint: expanded }), true)
})

test('Misfortune reveals later crops without requiring the preceding crop unlocks', () => {
  const visible = getVisibleCropIds(['leek', 'lentil'], 1000, true, false, true, 'misfortune')
  for (const id of ['corn', 'pumpkin', 'sweetPotato', 'turnip', 'appleTree',
    'lentil', 'knotweed', 'wheat', 'sunflower', 'canola', 'carrot', 'fourLeafClover']) {
    assert.ok(visible.includes(id), id)
  }
  assert.ok(!visible.includes('soybean'))
  for (const id of ['rootTunnel', 'peanuts', 'shoalGrass', 'waterLettuce', 'mangroveSapling']) {
    assert.ok(!visible.includes(id), 'unearned rewards stay hidden: ' + id)
  }
})

test('Main retains its previous-crop reveal rules', () => {
  const visible = getVisibleCropIds(['leek', 'lentil'], 1000, true, false, true, 'main')
  assert.deepEqual(visible, ['leek', 'corn'])
  const game = { ...earlyMisfortune({ hasUnlockedLentil: true }), activeArea: 'main' }
  const derived = derive(game)
  assert.ok(!derived.visibleCropIds.includes('lentil'))
  assert.ok(!derived.visibleUnlockedCropIds.includes('lentil'))
})

test('the editor exposes an independently unlocked Lentil, but locked crops remain unplantable', () => {
  const derived = derive(earlyMisfortune({ hasUnlockedLentil: true }))
  assert.ok(derived.visibleCropIds.includes('lentil'))
  assert.ok(derived.unlockedCropIds.includes('lentil'))
  assert.ok(derived.visibleUnlockedCropIds.includes('lentil'))
  assert.ok(derived.visibleCropIds.includes('appleTree'))
  assert.ok(!derived.unlockedCropIds.includes('appleTree'))
  assert.ok(!derived.visibleUnlockedCropIds.includes('appleTree'))
  assert.ok(!derived.unlockedCropIds.includes('corn'))
  assert.ok(!derived.unlockedCropIds.includes('sweetPotato'))
  const unlocked = getUnlockedCropIds(earlyMisfortune().blueprint, true, 1,
    false, false, true)
  assert.ok(unlocked.includes('lentil'))
  assert.ok(!unlocked.includes('appleTree'))
})

test('Carrot is independent, while Soybean requires Misfortune Canola and 555 Floors', () => {
  const game = earlyMisfortune({ floorReplicators: 555, rowDuplicators: 0 })
  assert.equal(hasUnlockedCarrotInMisfortune(game), false)
  assert.equal(hasUnlockedSoybean(game), false)
  assert.ok(!derive(game).visibleCropIds.includes('soybean'))
  assert.ok(!derive(game).unlockedCropIds.includes('soybean'))
  assert.ok(!getRabbitContractCropIds(game).includes('soybean'))
  const withCarrot = { ...game, trade: { ...game.trade, rabbitUnlocks: ['carrot'] } }
  assert.equal(hasUnlockedCarrotInMisfortune(withCarrot), true)
  assert.equal(hasUnlockedSoybean(withCarrot), false)
  const carrotDerived = derive(withCarrot)
  assert.ok(carrotDerived.visibleUnlockedCropIds.includes('carrot'))
  assert.ok(!carrotDerived.visibleCropIds.includes('soybean'))
  assert.ok(!carrotDerived.unlockedCropIds.includes('canola'))
  assert.ok(!getRabbitContractCropIds(withCarrot).includes('soybean'))

  const withCanola = { ...game, rowDuplicators: 500 }
  assert.equal(hasUnlockedCarrotInMisfortune(withCanola), false)
  assert.equal(hasUnlockedCanolaInMisfortune(withCanola), true)
  assert.equal(hasUnlockedSoybean(withCanola), true)
  assert.equal(hasUnlockedSoybean({ ...withCanola, rowDuplicators: 499 }), false)
  assert.equal(hasUnlockedSoybean({ ...withCanola, floorReplicators: 554 }), false)
  const derived = derive(withCanola)
  assert.ok(derived.visibleUnlockedCropIds.includes('soybean'))
  assert.ok(derived.unlockedCropIds.includes('canola'))
  assert.ok(getRabbitContractCropIds(withCanola).includes('soybean'))
  assert.equal(getUnlockedBlueprintSlotCount(withCanola), 4)

  const mainBeforeVisit = { ...withCarrot, activeArea: 'main', rowDuplicators: 500 }
  assert.equal(hasUnlockedCarrotInMisfortune(mainBeforeVisit), false)
  assert.equal(hasUnlockedCanolaInMisfortune(mainBeforeVisit), false)
  assert.equal(hasUnlockedSoybean(mainBeforeVisit), false)
  const mainAfterVisit = { ...mainBeforeVisit, rowDuplicators: 0,
    areaProgress: { misfortune: withCanola } }
  assert.equal(hasUnlockedSoybean(mainAfterVisit), true)
  assert.ok(derive(mainAfterVisit).visibleUnlockedCropIds.includes('soybean'))
  assert.equal(hasUnlockedSoybean({ ...mainBeforeVisit,
    areaProgress: { misfortune: { ...withCanola, rowDuplicators: 499 } } }), false)
})

test('Clover retains its own perfection requirement, and Peanuts keep their display position', () => {
  const game = earlyMisfortune({ floorReplicators: 555, rowDuplicators: 500,
    earnedAchievementIds: ['makingPeanuts'],
    trade: { ...createInitialGame().trade, rabbitUnlocks: ['carrot', 'fourLeafClover'] } })
  const derived = derive(game)
  assert.ok(derived.visibleCropIds.includes('fourLeafClover'))
  assert.ok(!derived.unlockedCropIds.includes('fourLeafClover'))
  assert.ok(!derived.unlockedCropIds.includes('sunflower'))
  assert.equal(derived.visibleCropIds.indexOf('peanuts') + 1, derived.visibleCropIds.indexOf('soybean'))
  assert.ok(derive({ ...game, cloverAssembly: { ...game.cloverAssembly, assembled: true } })
    .visibleUnlockedCropIds.includes('fourLeafClover'))
})

test('main crop costs stay unchanged, and Potato has no previous-crop requirement in Misfortune', () => {
  assert.equal(APPLE_TREE_UNLOCK_CROP_COUNT, 1e15)
  assert.equal(LENTIL_UNLOCK_CROP_COUNT, 8e16)
  assert.equal(KNOTWEED_UNLOCK_CROP_COUNT, 2e19)
  assert.equal(getCropRequirement(createInitialGame(), getCropUnlockBaseRequirement('appleTree')), 1e15)
  assert.equal(getCropRequirement(createInitialGame(), getCropUnlockBaseRequirement('lentil')), 8e16)
  assert.equal(getCropRequirement(createInitialGame(), getCropUnlockBaseRequirement('knotweed')), 2e19)
  assert.doesNotMatch(getCropUnlockDescription('sweetPotato', 'misfortune'), /after Pumpkin/)
  assert.match(getCropUnlockDescription('sweetPotato', 'main'), /after Pumpkin/)
})

test('Misfortune Apple, Lentil and Knotweed use the exact thresholds in ticks, saves, goals and descriptions', () => {
  for (const [cropId, flag, target, goalId] of [
    ['appleTree', 'hasUnlockedAppleTree', 1e18, 'crop-apple-tree'],
    ['lentil', 'hasUnlockedLentil', 8e20, 'crop-lentil'],
    ['knotweed', 'hasUnlockedKnotweed', 2e22, 'crop-knotweed'],
  ]) {
    const below = earlyMisfortune({ crops: target * 0.999, [flag]: false })
    const reached = earlyMisfortune({ crops: target, [flag]: false })
    assert.equal(getCropRequirement(reached, getCropUnlockBaseRequirement(cropId, 'misfortune')), target)
    assert.equal(advanceGameSimulationStep(below, 1 / 60)[flag], false, cropId)
    assert.equal(normalizeGame(below)[flag], false, cropId)
    const unlocked = advanceGameSimulationStep(reached, 1 / 60)
    assert.equal(unlocked[flag], true, cropId)
    assert.equal(normalizeGame(reached)[flag], true, cropId)
    const goal = MAJOR_PROGRESSION_GOALS.find(({ id }) => id === goalId)
    assert.equal(goal.getTarget(reached), target, cropId)
    assert.equal(getCropUnlockDescription(cropId, 'misfortune', false, reached),
      `Unlocks at ${getCachedFormattedNumber(target, 0)} Crops`)
    assert.equal(importGame(exportGame({ ...unlocked, crops: 0 }))[flag], true, cropId)
    const main = switchGameArea(unlocked, 'main')
    const restored = switchGameArea(importGame(exportGame(main)), 'misfortune')
    assert.equal(restored[flag], true, cropId)
  }
  assert.equal(MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS].cost, 7e23)
})

test('previously earned Misfortune Apple, Lentil and Knotweed unlocks remain earned below the new costs', () => {
  const game = earlyMisfortune({ crops: 0, hasUnlockedAppleTree: true,
    hasUnlockedLentil: true, hasUnlockedKnotweed: true })
  for (const state of [advanceGameSimulationStep(game, 1 / 60), importGame(exportGame(game))]) {
    assert.equal(state.hasUnlockedAppleTree, true)
    assert.equal(state.hasUnlockedLentil, true)
    assert.equal(state.hasUnlockedKnotweed, true)
  }
})

test('Misfortune Wheat unlocks at 1.25e36, keeps Row Duplicators required and preserves earned unlocks', () => {
  const target = 1.25e36
  const below = earlyMisfortune({ crops: target * 0.999, hasUnlockedWheat: false })
  const reached = { ...below, crops: target }
  assert.equal(getCropUnlockRequirement('wheat', 'misfortune', 10), target)
  assert.equal(advanceGameSimulationStep(below, 1 / 60).hasUnlockedWheat, false)
  assert.equal(normalizeGame(below).hasUnlockedWheat, false)
  assert.equal(advanceGameSimulationStep(reached, 1 / 60).hasUnlockedWheat, true)
  assert.equal(normalizeGame(reached).hasUnlockedWheat, true)
  const withoutDuplicators = { ...reached, hasUnlockedRowDuplicators: false }
  assert.equal(advanceGameSimulationStep(withoutDuplicators, 1 / 60).hasUnlockedWheat, false)
  assert.equal(normalizeGame(withoutDuplicators).hasUnlockedWheat, false)
  assert.equal(MAJOR_PROGRESSION_GOALS.find(({ id }) => id === 'crop-wheat').getTarget(reached), target)
  assert.equal(getCropUnlockDescription('wheat', 'misfortune', false, reached),
    `Unlocks at ${getCachedFormattedNumber(target, 0)} Crops after Row Duplicators`)
  const earned = { ...below, crops: 0, hasUnlockedWheat: true }
  assert.equal(advanceGameSimulationStep(earned, 1 / 60).hasUnlockedWheat, true)
  assert.equal(importGame(exportGame(earned)).hasUnlockedWheat, true)
  assert.equal(getCropRequirement(createInitialGame(), getCropUnlockBaseRequirement('wheat', 'main')), 1.25e32)
})
