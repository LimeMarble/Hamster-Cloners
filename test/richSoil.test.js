import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceGameSimulationStep,
  applyCropProductionModifiers,
  CAPYBARA_DEMONSTRATION_IDS,
  createBlueprint,
  createInitialGame,
  FORTUNES_WRATH_PASSIVE_MULTIPLIER,
  GAME_AREA_IDS,
  getBaseFieldProductionSnapshot,
  getBlueprintCropStats,
  getCapybaraBlueprintCropYield,
  getCropProductionSnapshotPerSecond,
  getFortuneModifiers,
  getNextSeedAugmentationCost,
  getRichSoilYieldMultiplier,
  isSeedAugmentationVisible,
  MAJOR_PROGRESSION_GOALS,
  MISFORTUNE_UPGRADE_IDS,
  purchaseSeedAugmentation,
  SEED_AUGMENTATION_IDS,
  switchGameArea,
  wipeMisfortuneAreaProgress,
} from '../src/game/gameLogic.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'

const augmentationId = SEED_AUGMENTATION_IDS.RICH_SOIL
const richSoil = { leekEnrichmentLevel: 5, richSoilUnlocked: true }
const perfections = ['enrichingLeek']

function createRichSoilGame() {
  const initial = createInitialGame()
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: ['leek', 'wheat'],
  })
  return {
    ...initial,
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    crops: 5e71,
    hasUnlockedWheat: true,
    blueprint,
    blueprintSlots: [blueprint],
    farmland: { rows: 2, columns: 3, floors: 4, farms: 1, otherMultiplier: 1 },
    completedCropPerfections: perfections,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT],
    seedAugmentations: { ...initial.seedAugmentations, leekEnrichmentLevel: 5 },
    capybara: {
      ...initial.capybara,
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
    },
  }
}

function fieldSnapshot(blueprint, activeArea, augmentations = richSoil, perfected = perfections) {
  return getBaseFieldProductionSnapshot(
    blueprint, perfected, 0, 1, augmentations, 0, activeArea,
  )
}

test('Rich Soil spends exactly 5e71 Misfortune crops and requires Seed Augmentation and Enriching Leek', () => {
  const game = createRichSoilGame()
  assert.equal(getNextSeedAugmentationCost(game, augmentationId), 5e71)
  assert.equal(isSeedAugmentationVisible(game, augmentationId), true)
  assert.equal(isSeedAugmentationVisible({ ...game, activeArea: 'main' }, augmentationId), false)
  assert.equal(purchaseSeedAugmentation({ ...game, activeArea: 'main' }, augmentationId), null)
  assert.equal(purchaseSeedAugmentation({ ...game, completedCropPerfections: [] }, augmentationId), null)
  assert.equal(purchaseSeedAugmentation({ ...game, capybara: {} }, augmentationId), null)
  assert.equal(purchaseSeedAugmentation({
    ...game,
    crops: 2.5e71,
    areaProgress: { main: { crops: 1e150 }, misfortune: null },
  }, augmentationId), null)

  const purchased = purchaseSeedAugmentation({
    ...game,
    areaProgress: { main: { crops: 1e150 }, misfortune: null },
  }, augmentationId)
  assert.equal(purchased.crops, 0)
  assert.equal(purchased.areaProgress.main.crops, 1e150)
  assert.equal(purchased.seedAugmentations.richSoilUnlocked, true)
  assert.equal(getNextSeedAugmentationCost(purchased, augmentationId), null)
  assert.equal(purchaseSeedAugmentation({ ...purchased, crops: 5e71 }, augmentationId), null)
})

test('Rich Soil scales only Leek contributions by unmodified recipient base harvest, with a minimum of one', () => {
  for (const [recipient, baseHarvest] of [
    ['leek', 1], ['turnip', 0.5], ['wheat', 100], ['appleTree', 10], ['corn', 5],
  ]) {
    const blueprint = createBlueprint({ rows: 3, columns: 3, cells: ['leek', recipient] })
    const perfected = recipient === 'corn' ? [...perfections, 'mirrorCorn'] : perfections
    const main = getBlueprintCropStats(blueprint, 1, perfected, 0, 0, 0, { activeArea: 'main' }, richSoil)
    const misfortune = getBlueprintCropStats(blueprint, 1, perfected, 0, 0, 0, { activeArea: 'misfortune' }, richSoil)
    const mainBonus = main.receivedEffects.find((effect) => effect.type === 'crop-yield' && effect.sourceCropId === 'leek').bonus
    const misfortuneBonus = misfortune.receivedEffects.find((effect) => effect.type === 'crop-yield' && effect.sourceCropId === 'leek').bonus
    assert.equal(misfortuneBonus, mainBonus * Math.max(1, baseHarvest), recipient)
  }
  assert.equal(getRichSoilYieldMultiplier('knotweed', 100, richSoil, 'misfortune'), 1)
  assert.equal(getRichSoilYieldMultiplier('leek', 100, {}, 'misfortune'), 1)
  assert.equal(getRichSoilYieldMultiplier('leek', 0, richSoil, 'misfortune'), 1)
})

test('Production and hover agree on boosted enrichment while negative harvest effects remain unchanged', () => {
  const blueprint = createBlueprint({ rows: 3, columns: 3, cells: ['leek', 'wheat', 'knotweed'] })
  const snapshot = fieldSnapshot(blueprint, 'misfortune')
  assert.equal(snapshot.byCrop.wheat, 8090)
  assert.equal(fieldSnapshot(blueprint, 'main').byCrop.wheat, 170)
  const stats = getBlueprintCropStats(
    blueprint, 1, perfections, 0, 0, 0, { activeArea: 'misfortune' }, richSoil,
  )
  assert.equal(stats.harvestYield, snapshot.byCrop.wheat)
  assert.equal(stats.receivedEffects.find((effect) => effect.type === 'rich-soil').multiplier, 100)
  assert.equal(stats.receivedEffects.find((effect) => effect.sourceCropId === 'leek').bonus, 8000)
  assert.equal(stats.receivedEffects.find((effect) => effect.sourceCropId === 'knotweed').bonus, -10)
})

test('Multiple Leeks scale independently and global harvest boosts do not increase the Rich Soil multiplier', () => {
  const blueprint = createBlueprint({
    rows: 3, columns: 4, cells: ['leek', 'wheat', 'leek', null, null, 'lentil'],
  })
  const snapshot = fieldSnapshot(blueprint, 'misfortune')
  assert.equal(snapshot.byCrop.wheat, 16100 * 1.25)
  const stats = getBlueprintCropStats(
    blueprint, 1, perfections, 0, 0, 0, { activeArea: 'misfortune' }, richSoil,
  )
  assert.equal(stats.harvestYield, snapshot.byCrop.wheat)
  assert.equal(stats.receivedEffects.find((effect) => effect.type === 'rich-soil').multiplier, 100)
  assert.equal(stats.receivedEffects.find((effect) => effect.sourceCropId === 'leek').count, 2)
})

test('Rich Soil retains diagonal enrichment, source buffs, and recipient harvest destruction', () => {
  const blueprint = createBlueprint({
    rows: 3, columns: 3,
    cells: ['corn', 'turnip', null, null, 'leek', null, null, null, 'wheat'],
    mirrorCornTargets: [4],
  })
  const perfected = [...perfections, 'mirrorCorn']
  const augmentations = { ...richSoil, leekDiagonalUnlocked: true }
  const main = fieldSnapshot(blueprint, 'main', augmentations, perfected)
  const misfortune = fieldSnapshot(blueprint, 'misfortune', augmentations, perfected)
  assert.equal(main.byCrop.wheat, 100 + 80 * 2 * 4)
  assert.equal(misfortune.byCrop.wheat, 100 + 80 * 2 * 4 * 100)

  const destroyed = createBlueprint({
    rows: 3, columns: 3, cells: ['leek', 'wheat', 'appleTree'],
  })
  assert.equal(fieldSnapshot(destroyed, 'misfortune').byCrop.wheat, 0)
})

test('Production caches keep Rich Soil isolated to Misfortune, including an otherwise identical partial-Misfortune modifier set', () => {
  const game = createRichSoilGame()
  const snapshot = (activeArea) => getCropProductionSnapshotPerSecond(
    game.blueprint, game.farmland, perfections, 1, 0,
    { activeArea, source: 'fortunesWrath' }, richSoil,
  )
  const main = snapshot('main')
  const misfortune = snapshot('misfortune')
  assert.equal(main.byCrop.wheat, 180 * 24)
  assert.equal(misfortune.byCrop.wheat, 8100 * 24)
  assert.deepEqual(snapshot('main'), main)
  assert.deepEqual(snapshot('misfortune'), misfortune)
})

test('Live simulation, blueprint income and hover all include Rich Soil under Fortune’s Wrath and floor support', () => {
  const game = {
    ...purchaseSeedAugmentation(createRichSoilGame(), augmentationId),
    floorReplicators: 100,
    floorReplicatorMode: 'support',
    hasUnlockedFloorReplicators: true,
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
      MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    ],
  }
  const modifiers = getFortuneModifiers(game)
  assert.ok(modifiers.passiveEffectMultiplier > FORTUNES_WRATH_PASSIVE_MULTIPLIER)
  const field = getBaseFieldProductionSnapshot(game.blueprint, perfections, 0, modifiers.passiveEffectMultiplier, game.seedAugmentations, 0, game.activeArea)
  const snapshot = getCropProductionSnapshotPerSecond(game.blueprint, game.farmland, perfections, 1, 0, modifiers, game.seedAugmentations)
  const advanced = advanceGameSimulationStep(game, 1, { random: () => 1 })
  assert.equal(advanced.crops, snapshot.total)
  assert.equal(getCapybaraBlueprintCropYield(game), applyCropProductionModifiers(field.total, modifiers))
  const stats = getBlueprintCropStats(game.blueprint, 1, perfections, 0, 0, 0, modifiers, game.seedAugmentations)
  const expectedHover = field.byCrop.wheat * getCapybaraBlueprintCropYield(game) / field.total
  assert.ok(Math.abs(stats.harvestYield / expectedHover - 1) < 1e-12)
})

test('Save round trips and area switches retain ownership without activating Rich Soil in main', () => {
  const purchased = purchaseSeedAugmentation(createRichSoilGame(), augmentationId)
  const restored = importGame(exportGame(purchased))
  assert.equal(restored.seedAugmentations.richSoilUnlocked, true)
  assert.equal(restored.activeArea, 'misfortune')
  const main = switchGameArea(restored, 'main')
  assert.equal(main.seedAugmentations.richSoilUnlocked, true)
  assert.equal(isSeedAugmentationVisible(main, augmentationId), true)
  assert.equal(getRichSoilYieldMultiplier('leek', 100, main.seedAugmentations, main.activeArea), 1)
  const again = switchGameArea(main, 'misfortune')
  assert.equal(again.seedAugmentations.richSoilUnlocked, true)
  assert.equal(getRichSoilYieldMultiplier('leek', 100, again.seedAugmentations, again.activeArea), 100)
  assert.equal(normalizeGame({}).seedAugmentations.richSoilUnlocked, false)
  assert.equal(normalizeGame({ seedAugmentations: { richSoilUnlocked: 'yes' } }).seedAugmentations.richSoilUnlocked, false)
})

test('Wiping Misfortune removes Rich Soil from either area while preserving existing shared augmentations', () => {
  const purchased = purchaseSeedAugmentation(createRichSoilGame(), augmentationId)
  for (const game of [purchased, switchGameArea(purchased, 'main')]) {
    const wiped = wipeMisfortuneAreaProgress(game)
    assert.equal(wiped.seedAugmentations.richSoilUnlocked, false)
    assert.equal(wiped.seedAugmentations.leekEnrichmentLevel, 5)
  }
})

test('Rich Soil is a Misfortune progression goal after Clover assembly and follows its purchase state', () => {
  const goalIndex = MAJOR_PROGRESSION_GOALS.findIndex((goal) => goal.id === 'augmentation-rich-soil')
  const cloverIndex = MAJOR_PROGRESSION_GOALS.findIndex((goal) => goal.id === 'perfection-five-leaf-clover')
  assert.equal(goalIndex, cloverIndex + 2)
  const goal = MAJOR_PROGRESSION_GOALS[goalIndex]
  const game = createRichSoilGame()
  assert.equal(goal.target, 5e71)
  assert.equal(goal.isApplicable(game), true)
  assert.equal(goal.isApplicable({ ...game, activeArea: 'main' }), false)
  assert.equal(goal.isComplete(game), false)
  assert.equal(goal.isComplete(purchaseSeedAugmentation(game, augmentationId)), true)
})
