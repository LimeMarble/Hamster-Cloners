import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  MAJOR_PROGRESSION_GOALS,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
  createBlueprint,
  createBlueprintBlockFromSelection,
  createInitialGame,
  getBaseFieldIncome,
  getBaseFieldProductionSnapshot,
  getBlueprintCropStats,
  getLeekAugmentationYieldBonus,
  getNextSeedAugmentationCost,
  isSeedAugmentationVisible,
  normalizeSeedAugmentationState,
  purchaseSeedAugmentation,
  switchGameArea,
  wipeMisfortuneAreaProgress,
} from '../src/game/gameLogic.js'
import { getCropHarvestEffectStrength, getHarvestBonusConnections } from '../src/game/cropEffects.js'
import { getCropEffectDescription } from '../src/game/crops.js'
import { normalizeGame } from '../src/game/storage.js'

const id = SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED
const perfected = ['enrichingLeek']
const augmented = { leekOrthogonalSquaredUnlocked: true }

function readyGame() {
  const game = createInitialGame()
  return {
    ...game,
    crops: 1e157,
    completedCropPerfections: perfected,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT],
    capybara: { ...game.capybara, completedDemonstrations: ['introduction', 'demonstrationOne'] },
  }
}

function stats(blueprint, index, augmentations = augmented, perfections = perfected, fortune = {}) {
  return getBlueprintCropStats(blueprint, index, perfections, 0, 0, 0, fortune, augmentations)
}

test('Orthogonal² costs exactly 1e157, requires Final Support and perfected Leek, and is a one-time shared purchase', () => {
  const game = readyGame()
  assert.equal(SEED_AUGMENTATIONS[id].name, 'Orthogonal²')
  assert.equal(getNextSeedAugmentationCost(game, id), 1e157)
  for (const area of Object.values(GAME_AREA_IDS)) {
    const inArea = { ...game, activeArea: area }
    const locked = { ...inArea, completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER] }
    assert.equal(isSeedAugmentationVisible(locked, id), false)
    assert.equal(purchaseSeedAugmentation(locked, id), null)
    assert.equal(purchaseSeedAugmentation({ ...inArea, completedCropPerfections: [] }, id), null)
    assert.equal(purchaseSeedAugmentation({ ...inArea, crops: 9e156 }, id), null)
    assert.equal(isSeedAugmentationVisible(inArea, id), true)
    const purchased = purchaseSeedAugmentation(inArea, id)
    assert.equal(purchased.crops, 0)
    assert.equal(purchased.seedAugmentations.leekOrthogonalSquaredUnlocked, true)
    assert.equal(getNextSeedAugmentationCost(purchased, id), null)
    assert.equal(purchaseSeedAugmentation({ ...purchased, crops: 1e157 }, id), null)
  }
})

test('the 400 enrichment adds to Layered Enrichment and leaves its original levels intact', () => {
  assert.equal(getLeekAugmentationYieldBonus(augmented), 400)
  assert.equal(getLeekAugmentationYieldBonus({ ...augmented, leekEnrichmentLevel: 5 }), 475)
  assert.equal(getLeekAugmentationYieldBonus({ leekEnrichmentLevel: 5 }), 75)
  const blueprint = createBlueprint({ rows: 3, columns: 3, cells: ['leek', null, 'corn'] })
  assert.equal(stats(blueprint, 2).harvestYield, 407)
  assert.equal(stats(blueprint, 0).harvestYield, 406)
  assert.equal(stats(blueprint, 2, { ...augmented, leekEnrichmentLevel: 5 }).harvestYield, 482)
  assert.equal(getBaseFieldIncome(blueprint, [], 0, 1, augmented), 3)
})

test('reach adds only the four two-tile orthogonal recipients and retains existing reach and self-enrichment', () => {
  for (const diagonal of [false, true]) {
    const seedAugmentations = { ...augmented, leekDiagonalUnlocked: diagonal }
    for (let target = 0; target < 25; target += 1) {
      if (target === 12) continue
      const cells = Array(25).fill(null)
      cells[12] = 'leek'
      cells[target] = 'corn'
      const blueprint = createBlueprint({ rows: 5, columns: 5, cells })
      const inReach = [2, 7, 10, 11, 13, 14, 17, 22].includes(target) ||
        (diagonal && [6, 8, 16, 18].includes(target))
      assert.equal(stats(blueprint, target, seedAugmentations).harvestYield,
        inReach ? 407 : 2, `target ${target}, diagonal ${diagonal}`)
      assert.equal(stats(blueprint, 12, seedAugmentations).harvestYield, 406)
    }
  }
})

test('reach passes over occupied tiles, never wraps field edges and does not transfer other passives', () => {
  const blueprint = createBlueprint({ rows: 3, columns: 3,
    cells: ['leek', 'turnip', 'corn', null, null, null, 'corn'] })
  assert.equal(stats(blueprint, 2).harvestYield, stats(blueprint, 6).harvestYield)
  assert.ok(stats(blueprint, 2).harvestYield > 407) // Turnip buffs the source Leek only.
  assert.deepEqual(getHarvestBonusConnections(blueprint, 2, perfected, augmented), [
    { index: 0, adjacencyDistance: 0 }, { index: 1, adjacencyDistance: 0 },
  ])
  const edge = createBlueprint({ rows: 3, columns: 3, cells: [null, null, 'leek', 'corn'] })
  assert.equal(stats(edge, 3).harvestYield, 2)
  const noTransfer = createBlueprint({ rows: 3, columns: 3, cells: ['turnip', null, 'corn'] })
  assert.deepEqual(getHarvestBonusConnections(noTransfer, 2, perfected, augmented), [])
})

test('Root Tunnel and direct enrichment reach cannot count the same Leek twice', () => {
  const blueprint = createBlueprint({ rows: 3, columns: 3, cells: ['leek', 'rootTunnel', 'corn'],
    rootTunnelConnections: [{ tunnelIndex: 1, senderIndex: 0, recipientIndex: 2 }] })
  assert.deepEqual(getHarvestBonusConnections(blueprint, 2, perfected, augmented), [
    { index: 0, adjacencyDistance: 0 },
  ])
  assert.equal(stats(blueprint, 2).harvestYield, 407)
})

test('extended enrichment uses source buffs and matches the production snapshot and hover in both areas', () => {
  const cells = Array(25).fill(null)
  cells[12] = 'leek'
  cells[11] = 'turnip'
  cells[6] = 'corn'
  cells[14] = 'appleTree'
  const targets = Array(25).fill(null)
  targets[6] = 12
  const blueprint = createBlueprint({ rows: 5, columns: 5, cells, mirrorCornTargets: targets })
  const perfections = ['enrichingLeek', 'mirrorCorn']
  const seedAugmentations = { ...augmented, leekEnrichmentLevel: 5 }
  const snapshot = getBaseFieldProductionSnapshot(blueprint, perfections, 0, 1.2, seedAugmentations)
  const before = getBaseFieldProductionSnapshot(blueprint, perfections, 0, 1.2, {})
  assert.notStrictEqual(snapshot, before)
  assert.strictEqual(snapshot,
    getBaseFieldProductionSnapshot(blueprint, perfections, 0, 1.2, seedAugmentations))
  for (const activeArea of Object.values(GAME_AREA_IDS)) {
    const hover = stats(blueprint, 14, seedAugmentations, perfections, { activeArea, passiveEffectMultiplier: 1.2 })
    assert.equal(hover.harvestYield, snapshot.byCrop.appleTree)
    assert.ok(hover.harvestYield > before.byCrop.appleTree)
    const withSoil = { ...seedAugmentations, richSoilUnlocked: true }
    const withCookie = { activeArea, passiveEffectMultiplier: 1.2, leekEnrichmentExponent: 1.2 }
    const cookieSnapshot = getBaseFieldProductionSnapshot(blueprint, perfections, 0, 1.2, withSoil,
      0, activeArea, 1.2)
    const cookieHover = stats(blueprint, 14, withSoil, perfections, withCookie)
    assert.equal(cookieHover.harvestYield, cookieSnapshot.byCrop.appleTree)
    assert.ok(cookieHover.harvestYield > hover.harvestYield)
  }
})

test('legacy saves default to false; ownership survives saving, area switching and a Misfortune wipe', () => {
  assert.equal(normalizeSeedAugmentationState({}).leekOrthogonalSquaredUnlocked, false)
  assert.equal(normalizeSeedAugmentationState({ leekOrthogonalSquaredUnlocked: 'yes' }).leekOrthogonalSquaredUnlocked, false)
  const purchased = purchaseSeedAugmentation(readyGame(), id)
  const restored = normalizeGame(JSON.parse(JSON.stringify(purchased)))
  assert.equal(restored.seedAugmentations.leekOrthogonalSquaredUnlocked, true)
  const misfortune = switchGameArea(restored, GAME_AREA_IDS.MISFORTUNE)
  assert.equal(misfortune.seedAugmentations.leekOrthogonalSquaredUnlocked, true)
  assert.equal(wipeMisfortuneAreaProgress(misfortune).seedAugmentations.leekOrthogonalSquaredUnlocked, true)
})

test('crop descriptions and saved block requirements include Orthogonal²', () => {
  const description = getCropEffectDescription('leek', perfected, { ...augmented, leekEnrichmentLevel: 5 })
  assert.match(description, /\+480 Crop yield/)
  assert.match(description, /two tiles away orthogonally at full strength/)
  const block = createBlueprintBlockFromSelection(createBlueprint({ cells: ['leek'] }), 0, 0,
    { completedCropPerfections: perfected, seedAugmentations: augmented })
  assert.ok(block.requiredSeedAugmentations.some((requirement) => requirement.id === id && requirement.level === 1))
})

test('the added enrichment obeys monocrop suppression and burnt-source rules', () => {
  const crowded = createBlueprint({ rows: 1, columns: 5, cells: Array(5).fill('leek') })
  const baseState = { leekEnrichmentLevel: 5 }
  const increased = getCropHarvestEffectStrength(crowded, 0, perfected, 1, { ...baseState, ...augmented })
  const original = getCropHarvestEffectStrength(crowded, 0, perfected, 1, baseState)
  assert.ok(increased > 0 && increased < 480)
  assert.ok(Math.abs(increased / original - 6) < 1e-12)

  const cells = Array(25).fill(null)
  cells[12] = 'leek'
  cells[14] = 'corn'
  const targets = Array(25).fill(null)
  for (const index of [6, 8, 16]) {
    cells[index] = 'corn'
    targets[index] = 12
  }
  const burnt = createBlueprint({ rows: 5, columns: 5, cells, mirrorCornTargets: targets })
  assert.equal(stats(burnt, 14, augmented, ['enrichingLeek', 'mirrorCorn']).harvestYield, 5)
})

test('the new progression goal follows Final Support and precedes Clover, using the main-area crop balance', () => {
  const goal = MAJOR_PROGRESSION_GOALS.find(({ id }) => id === 'augmentation-leek-orthogonal-squared')
  const ids = MAJOR_PROGRESSION_GOALS.map(({ id }) => id)
  assert.ok(ids.indexOf(goal.id) > ids.indexOf('misfortune-upgrade-finalSupport'))
  assert.ok(ids.indexOf(goal.id) < ids.indexOf('perfection-five-leaf-clover'))
  const game = readyGame()
  assert.equal(goal.isApplicable({ ...game, completedMisfortuneUpgrades: [] }), false)
  assert.equal(goal.target, 1e157)
  assert.equal(goal.getCurrent(game), 1e157)
  assert.equal(goal.getCurrent({ ...game, activeArea: 'misfortune', crops: 1e68,
    areaProgress: { main: { crops: 1e157 } } }), 1e157)
  assert.equal(goal.isComplete(game), false)
  assert.equal(goal.isComplete(purchaseSeedAugmentation(game, id)), true)
})
