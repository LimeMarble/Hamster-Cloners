import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUnlockMisfortuneUpgrade,
  createInitialGame,
  getAvailableFiveLeafFortunes,
  getFloorReplicatorSupportPassiveEffectBonus,
  hasMisfortuneUpgrade,
  isSeedAugmentationVisible,
  MAJOR_PROGRESSION_GOALS,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  purchaseMisfortuneUpgrade,
  purchaseSeedAugmentation,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
  wipeMisfortuneAreaProgress,
} from '../src/game/gameLogic.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'

const precursorId = MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT
const richSoilId = SEED_AUGMENTATION_IDS.RICH_SOIL

function createAugmentationGame() {
  const initial = createInitialGame()
  return {
    ...initial,
    activeArea: 'misfortune',
    crops: 1e72,
    secondsSinceAreaReset: 345,
    hamsters: 200,
    rowDuplicators: 123,
    floorReplicators: 500,
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn'],
    capybara: { ...initial.capybara, completedDemonstrations: ['introduction', 'demonstrationOne'] },
    areaProgress: { main: { ...initial, crops: 1e140 }, misfortune: null },
  }
}

test('Not-So-Final Support costs exactly 1e71 Misfortune crops, with no support bonus', () => {
  assert.equal(MISFORTUNE_UPGRADES[precursorId].name, 'Not-So-Final Support')
  assert.equal(MISFORTUNE_UPGRADES[precursorId].cost, 1e71)
  assert.equal(MISFORTUNE_UPGRADES[precursorId].passiveEffectBonusPerTier, undefined)
  const game = createAugmentationGame()
  assert.equal(canUnlockMisfortuneUpgrade({ ...game, crops: 9e69 }, precursorId), false)
  assert.equal(purchaseMisfortuneUpgrade({ ...game, crops: 9e69 }, precursorId), null)
  assert.equal(canUnlockMisfortuneUpgrade({ ...game, activeArea: 'main' }, precursorId), false)
  assert.equal(purchaseMisfortuneUpgrade({ ...game, activeArea: 'main' }, precursorId), null)
})

test('buying the precursor spends current-area crops once and does not reset either area', () => {
  const game = { ...createAugmentationGame(), crops: 2e71 }
  const purchased = purchaseMisfortuneUpgrade(game, precursorId)
  assert.equal(purchased.crops, 1e71)
  assert.equal(purchased.secondsSinceAreaReset, 345)
  assert.equal(purchased.hamsters, game.hamsters)
  assert.equal(purchased.rowDuplicators, game.rowDuplicators)
  assert.equal(purchased.floorReplicators, game.floorReplicators)
  assert.strictEqual(purchased.blueprint, game.blueprint)
  assert.strictEqual(purchased.farmland, game.farmland)
  assert.strictEqual(purchased.areaProgress, game.areaProgress)
  assert.equal(purchased.areaProgress.main.crops, 1e140)
  assert.equal(hasMisfortuneUpgrade(purchased, precursorId), true)
  assert.equal(canUnlockMisfortuneUpgrade(purchased, precursorId), false)
  assert.equal(purchaseMisfortuneUpgrade(purchased, precursorId), null)
})

test('Misfortune-only augmentations are hidden and cannot be purchased before the precursor', () => {
  const game = createAugmentationGame()
  for (const augmentation of Object.values(SEED_AUGMENTATIONS).filter((entry) => entry.purchaseArea === 'misfortune')) {
    assert.equal(isSeedAugmentationVisible(game, augmentation.id), false)
    assert.equal(purchaseSeedAugmentation(game, augmentation.id), null)
  }
  assert.ok(!getAvailableFiveLeafFortunes(game).some(({ id }) => id === 'leekFortuneCookie'))
  const researched = purchaseMisfortuneUpgrade(game, precursorId)
  assert.equal(isSeedAugmentationVisible(researched, richSoilId), true)
  const richSoil = purchaseSeedAugmentation(researched, richSoilId)
  assert.equal(richSoil.seedAugmentations.richSoilUnlocked, true)
  assert.ok(getAvailableFiveLeafFortunes(richSoil).some(({ id }) => id === 'leekFortuneCookie'))
})

test('shared augmentations retain their old prerequisites and do not require Not-So-Final Support', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = { ...createAugmentationGame(), activeArea, crops: 1e80 }
    for (const id of [
      SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
      SEED_AUGMENTATION_IDS.LEEK_DIAGONAL,
      SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL,
    ]) {
      assert.equal(isSeedAugmentationVisible(game, id), true)
      assert.ok(purchaseSeedAugmentation(game, id))
    }
  }
})

test('the precursor leaves existing Floor Replicator support effectiveness unchanged', () => {
  const game = {
    ...createAugmentationGame(),
    floorReplicatorMode: 'support',
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
      MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    ],
  }
  const before = getFloorReplicatorSupportPassiveEffectBonus(game)
  assert.ok(before > 0)
  assert.equal(getFloorReplicatorSupportPassiveEffectBonus(purchaseMisfortuneUpgrade(game, precursorId)), before)
})

test('the precursor survives saving and importing, and is removed by wiping Misfortune', () => {
  const game = purchaseMisfortuneUpgrade(createAugmentationGame(), precursorId)
  const restored = importGame(exportGame(game))
  assert.equal(hasMisfortuneUpgrade(restored, precursorId), true)
  assert.equal(isSeedAugmentationVisible(restored, richSoilId), true)
  assert.equal(hasMisfortuneUpgrade(wipeMisfortuneAreaProgress(restored), precursorId), false)
  assert.equal(isSeedAugmentationVisible(wipeMisfortuneAreaProgress(restored), richSoilId), false)
  assert.deepEqual(normalizeGame({ completedMisfortuneUpgrades: [precursorId, precursorId, 'invalid'] }).completedMisfortuneUpgrades, [precursorId])
})

test('the Misfortune goal bar puts the precursor directly before Rich Soil', () => {
  const precursorIndex = MAJOR_PROGRESSION_GOALS.findIndex((goal) => goal.id === `misfortune-upgrade-${precursorId}`)
  const richSoilIndex = MAJOR_PROGRESSION_GOALS.findIndex((goal) => goal.id === 'augmentation-rich-soil')
  assert.equal(richSoilIndex, precursorIndex + 1)
  const precursor = MAJOR_PROGRESSION_GOALS[precursorIndex]
  const richSoil = MAJOR_PROGRESSION_GOALS[richSoilIndex]
  const game = createAugmentationGame()
  assert.equal(precursor.target, 1e71)
  assert.equal(precursor.isApplicable(game), true)
  assert.equal(precursor.isApplicable({ ...game, activeArea: 'main' }), false)
  assert.equal(precursor.isComplete(game), false)
  assert.equal(richSoil.isApplicable(game), false)
  const purchased = purchaseMisfortuneUpgrade(game, precursorId)
  assert.equal(precursor.isComplete(purchased), true)
  assert.equal(richSoil.isApplicable(purchased), true)
})
