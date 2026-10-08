import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  addRandomFortuneEffect,
  advanceFortuneState,
  advanceGameSimulationStep,
  applyCropProductionModifiers,
  chooseFiveLeafEffect,
  createBlueprint,
  createInitialGame,
  DEFAULT_CLOVER_FORTUNE_PERCENTAGES,
  FIVE_LEAF_FORTUNES,
  FORTUNE_EFFECT_IDS,
  getAvailableFiveLeafFortunes,
  getBaseFieldProductionSnapshot,
  getBlueprintCropStats,
  getCapybaraBlueprintCropYield,
  getCropProductionSnapshotPerSecond,
  getFiveLeafLoadoutCost,
  getFiveLeafPointBudget,
  getFortuneEffect,
  getFortuneModifiers,
  MISFORTUNE_UPGRADE_IDS,
  normalizeFiveLeafState,
  purchaseSeedAugmentation,
  selectFiveLeafLoadout,
  SEED_AUGMENTATION_IDS,
  updateFiveLeafLoadout,
  wipeMisfortuneAreaProgress,
} from '../src/game/gameLogic.js'
import { getCropHarvestEffectStrength, getExternalCropBuffMultiplier } from '../src/game/cropEffects.js'
import { exportGame, importGame } from '../src/game/storage.js'
import { useGameDerivedState } from '../src/hooks/useGameDerivedState.js'

const cookieId = FORTUNE_EFFECT_IDS.LEEK_COOKIE
const emptyAllocations = Object.fromEntries(FIVE_LEAF_FORTUNES.map(({ id }) => [id, 0]))

function close(actual, expected) {
  assert.ok(Math.abs(actual / expected - 1) < 1e-12, `${actual} ≠ ${expected}`)
}

function createCookieGame(activeArea = 'main') {
  const initial = createInitialGame()
  const blueprint = createBlueprint({
    rows: 5, columns: 5,
    cells: [
      null, null, null, null, null,
      null, 'corn', 'turnip', 'turnip', null,
      null, 'turnip', 'leek', 'appleTree', 'knotweed',
      null, null, null, 'turnip', null,
    ],
    mirrorCornTargets: [null, null, null, null, null, null, 12],
  })
  return {
    ...initial,
    activeArea,
    blueprint,
    blueprintSlots: [blueprint],
    farmland: { rows: 1, columns: 1, floors: 1, farms: 1, otherMultiplier: 1 },
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn'],
    seedAugmentations: { ...initial.seedAugmentations, leekEnrichmentLevel: 5, richSoilUnlocked: true },
    cloverAssembly: { ...initial.cloverAssembly, assembled: true },
  }
}

function withCookie(game) {
  return {
    ...game,
    fortune: { ...game.fortune, activeEffects: [{ id: cookieId, remainingSeconds: 55 }] },
  }
}

function field(game, modifiers = getFortuneModifiers(game)) {
  return getBaseFieldProductionSnapshot(
    game.blueprint, game.completedCropPerfections, 0,
    modifiers.passiveEffectMultiplier, game.seedAugmentations, 0,
    game.activeArea, modifiers.leekEnrichmentExponent,
  )
}

test('Rich Soil unlocks the cookie directly, leaving every existing loadout at 0% for it', () => {
  const initial = createInitialGame()
  const before = {
    ...initial, activeArea: 'misfortune', crops: 5e71,
    completedCropPerfections: ['enrichingLeek'],
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT],
    capybara: { ...initial.capybara, completedDemonstrations: ['introduction'] },
  }
  assert.ok(!getAvailableFiveLeafFortunes(before).some(({ id }) => id === cookieId))
  const unlocked = purchaseSeedAugmentation(before, SEED_AUGMENTATION_IDS.RICH_SOIL)
  assert.ok(getAvailableFiveLeafFortunes(unlocked).some(({ id }) => id === cookieId))
  assert.ok(getAvailableFiveLeafFortunes({ ...unlocked, activeArea: 'main' }).some(({ id }) => id === cookieId))
  for (const loadout of unlocked.fortune.fiveLeaf.loadouts) {
    assert.deepEqual(loadout.allocations, DEFAULT_CLOVER_FORTUNE_PERCENTAGES)
    assert.equal(loadout.allocations[cookieId], 0)
  }
  assert.equal(getFortuneEffect(cookieId).durationSeconds, 55)
  assert.equal(getFortuneEffect(cookieId).description, 'Leek Enrichment ^1.2')
  assert.equal(getFortuneEffect(cookieId).leekEnrichmentExponent, 1.2)
})

test('older saves gain a zero allocation without overwriting custom loadouts', () => {
  const restored = normalizeFiveLeafState({ loadouts: [{
    name: 'Existing combo', chancePercent: 40, batchSize: 3,
    allocations: { opus: 33, fortuneOpus: 67 },
  }] })
  assert.equal(restored.loadouts[0].allocations[cookieId], 0)
  assert.equal(restored.loadouts[0].allocations.fortuneOpus, 67)
  assert.equal(restored.loadouts[0].name, 'Existing combo')
  assert.equal(restored.loadouts[0].chancePercent, 40)
  assert.equal(restored.loadouts[0].batchSize, 3)
})

test('the cookie costs 3 points per percentage and can only be allocated or rolled after Rich Soil', () => {
  const game = createCookieGame()
  const allocations = { ...emptyAllocations, opus: 33, fortuneOpus: 34, [cookieId]: 33 }
  const configured = updateFiveLeafLoadout(game, 0, { allocations })
  const loadout = configured.fortune.fiveLeaf.loadouts[0]
  assert.equal(getFiveLeafLoadoutCost(loadout), 200)
  assert.equal(chooseFiveLeafEffect(loadout, 0.68, game), cookieId)
  const locked = { ...game, seedAugmentations: { ...game.seedAugmentations, richSoilUnlocked: false } }
  const rejected = updateFiveLeafLoadout(locked, 0, { allocations })
  assert.equal(rejected.fortune.fiveLeaf.loadouts[0].allocations[cookieId], 0)
  assert.equal(chooseFiveLeafEffect(loadout, 0.68, locked), FORTUNE_EFFECT_IDS.MIRAGE)
  const collected = addRandomFortuneEffect(configured, () => 0.68)
  assert.equal(collected.fortune.notice.effectId, cookieId)
  assert.deepEqual(collected.fortune.activeEffects, [{ id: cookieId, remainingSeconds: 55 }])
})

test('4-Leaf Clover never rolls the cookie, even with Rich Soil owned', () => {
  const game = { ...createCookieGame(), cloverAssembly: { assembled: false } }
  for (const roll of [0, 0.17, 0.52, 0.99, 1]) {
    assert.notEqual(addRandomFortuneEffect(game, () => roll).fortune.notice.effectId, cookieId)
  }
})

test('repeat cookies extend the timer, not the exponent; discovery points are awarded once', () => {
  const game = updateFiveLeafLoadout(createCookieGame(), 0, {
    allocations: { ...emptyAllocations, [cookieId]: 100 },
  })
  const once = addRandomFortuneEffect(game, () => 0)
  const twice = addRandomFortuneEffect(once, () => 0)
  assert.deepEqual(twice.fortune.activeEffects, [{ id: cookieId, remainingSeconds: 110 }])
  assert.equal(getFortuneModifiers(twice).leekEnrichmentExponent, 1.2)
  assert.equal(getFiveLeafPointBudget(twice), getFiveLeafPointBudget(game) + 25)
  assert.equal(getFortuneModifiers(advanceFortuneState(twice, 109)).leekEnrichmentExponent, 1.2)
  assert.equal(getFortuneModifiers(advanceFortuneState(twice, 110)).leekEnrichmentExponent, 1)
})

test('the exponent applies to the full Leek source before Rich Soil and Apple reception, never to negative effects', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = withCookie(createCookieGame(activeArea))
    // Isolate the cookie from Wrath here to verify the source/receiver ordering.
    const modifiers = { activeArea, leekEnrichmentExponent: 1.2 }
    const stats = getBlueprintCropStats(game.blueprint, 13, game.completedCropPerfections, 0, 0, 0, modifiers, game.seedAugmentations)
    const sourceStrength = 80 * 2 * 2 * 4
    const richSoil = activeArea === 'misfortune' ? 10 : 1
    const appleAbsorption = (1.8 * 2) ** 2
    const contribution = sourceStrength ** 1.2 * richSoil
    close(stats.receivedEffects.find((effect) => effect.sourceCropId === 'leek').bonus, contribution)
    assert.equal(stats.receivedEffects.find((effect) => effect.sourceCropId === 'knotweed').bonus, -10)
    close(stats.harvestYield, 10 + (contribution - 10) * appleAbsorption)
    close(field(game, modifiers).byCrop.appleTree, stats.harvestYield)
    const leek = getBlueprintCropStats(game.blueprint, 12, game.completedCropPerfections, 0, 0, 0, modifiers, game.seedAugmentations)
    close(leek.passiveStats.find((effect) => effect.id === 'adjacent-crop-yield').value, sourceStrength ** 1.2)
    assert.equal(leek.harvestYield, 0) // Apple destroys harvest, not enrichment.
  }
})

test('Demonstration and Opus strengthen the source before exponentiation in both areas', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = withCookie(createCookieGame(activeArea))
    game.fortune.activeEffects.push(
      { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 37 },
      { id: FORTUNE_EFFECT_IDS.OPUS, remainingSeconds: 27 },
    )
    const modifiers = getFortuneModifiers(game)
    const unexponentiated = getCropHarvestEffectStrength(game.blueprint, 12, game.completedCropPerfections, modifiers.passiveEffectMultiplier, game.seedAugmentations)
    const stats = getBlueprintCropStats(game.blueprint, 13, game.completedCropPerfections, 0, 0, 0, modifiers, game.seedAugmentations)
    const soil = activeArea === 'misfortune' ? 10 : 1
    close(stats.receivedEffects.find((effect) => effect.sourceCropId === 'leek').bonus, unexponentiated ** 1.2 * soil)
    const expectedApple = 10 + (unexponentiated ** 1.2 * soil -
      10 * modifiers.passiveEffectMultiplier) * getExternalCropBuffMultiplier(
      game.blueprint, 13, 'appleTree', game.completedCropPerfections, modifiers.passiveEffectMultiplier, game.seedAugmentations,
    )
    close(field(game).byCrop.appleTree, expectedApple)
  }
})

test('field income, hover, displayed income, and live simulation agree under the cookie', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = withCookie(createCookieGame(activeArea))
    const modifiers = getFortuneModifiers(game)
    const rawField = field(game)
    const rate = getCropProductionSnapshotPerSecond(game.blueprint, game.farmland, game.completedCropPerfections, 1, 0, modifiers, game.seedAugmentations)
    close(rate.total, getCapybaraBlueprintCropYield(game))
    close(rate.total, applyCropProductionModifiers(rawField.total, modifiers))
    const stats = getBlueprintCropStats(game.blueprint, 13, game.completedCropPerfections, 0, 0, 0, modifiers, game.seedAugmentations)
    close(stats.harvestYield, rawField.byCrop.appleTree * rate.total / rawField.total)
    close(advanceGameSimulationStep(game, 1, { random: () => 1 }).crops - game.crops, rate.total)
    let displayedRate
    function RateProbe() {
      displayedRate = useGameDerivedState(game).productionPerSecond
      return null
    }
    renderToStaticMarkup(createElement(RateProbe))
    close(displayedRate, rate.total)
  }
})

test('cached snapshots invalidate when the cookie starts or expires, not as its timer counts down', () => {
  const game = createCookieGame()
  const snapshot = (current) => getCropProductionSnapshotPerSecond(
    current.blueprint, current.farmland, current.completedCropPerfections, 1, 0,
    getFortuneModifiers(current), current.seedAugmentations,
  )
  const base = snapshot(game)
  const boosted = snapshot(withCookie(game))
  assert.ok(boosted.total > base.total)
  assert.notStrictEqual(boosted, base)
  assert.strictEqual(snapshot(advanceFortuneState(withCookie(game), 1)), boosted)
  assert.deepEqual(snapshot(advanceFortuneState(withCookie(game), 55)), base)
})

test('cookie allocations and timers survive save/export/import and clear with loadout switches or Misfortune wipe', () => {
  const game = withCookie(updateFiveLeafLoadout(createCookieGame(), 0, {
    allocations: { ...emptyAllocations, [cookieId]: 100 },
  }))
  const restored = importGame(exportGame(game))
  assert.equal(restored.seedAugmentations.richSoilUnlocked, true)
  assert.equal(restored.fortune.fiveLeaf.loadouts[0].allocations[cookieId], 100)
  assert.deepEqual(restored.fortune.activeEffects, game.fortune.activeEffects)
  const switched = selectFiveLeafLoadout(restored, 1)
  assert.deepEqual(switched.fortune.activeEffects, [])
  const wiped = wipeMisfortuneAreaProgress(restored)
  assert.ok(!getAvailableFiveLeafFortunes(wiped).some(({ id }) => id === cookieId))
  assert.equal(wiped.fortune.fiveLeaf.loadouts[0].allocations[cookieId], 0)
  assert.deepEqual(wiped.fortune.activeEffects, [])
})

test('fields without Enriching Leek receive no cookie harvest boost', () => {
  const game = createCookieGame()
  game.blueprint = createBlueprint({ rows: 3, columns: 3, cells: ['wheat', 'knotweed'] })
  assert.deepEqual(field(withCookie(game)), field(game))
})
