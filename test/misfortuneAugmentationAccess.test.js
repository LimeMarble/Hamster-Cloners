import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canUnlockMisfortuneUpgrade,
  canPurchaseFloorReplicatorsInArea,
  createInitialGame,
  getAvailableFiveLeafFortunes,
  getBulkPurchaseQuote,
  getMaxFloorReplicatorPurchase,
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

const precursorId = MISFORTUNE_UPGRADE_IDS.PARTING_GIFT
const richSoilId = SEED_AUGMENTATION_IDS.RICH_SOIL

function createAugmentationGame() {
  const initial = createInitialGame()
  return {
    ...initial,
    activeArea: 'misfortune',
    crops: 1e78,
    secondsSinceAreaReset: 345,
    hamsters: 200,
    rowDuplicators: 123,
    floorReplicators: 500,
    hasUnlockedFloorReplicators: true,
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn', 'sweetPotato'],
    cloverAssembly: { ...initial.cloverAssembly, assembled: true },
    capybara: { ...initial.capybara, completedDemonstrations: ['introduction', 'demonstrationOne'] },
    areaProgress: { main: { ...initial, crops: 1e140 }, misfortune: null },
  }
}

test('Parting Gift costs exactly 1e77 Misfortune crops, with no support bonus', () => {
  assert.equal(MISFORTUNE_UPGRADES[precursorId].name, 'Parting Gift')
  assert.equal(MISFORTUNE_UPGRADES[precursorId].cost, 1e77)
  assert.equal(MISFORTUNE_UPGRADES[precursorId].passiveEffectBonusPerTier, undefined)
  const game = createAugmentationGame()
  assert.equal(canUnlockMisfortuneUpgrade({ ...game, crops: 9e76 }, precursorId), false)
  assert.equal(purchaseMisfortuneUpgrade({ ...game, crops: 9e76 }, precursorId), null)
  assert.equal(canUnlockMisfortuneUpgrade({ ...game, activeArea: 'main' }, precursorId), false)
  assert.equal(purchaseMisfortuneUpgrade({ ...game, activeArea: 'main' }, precursorId), null)
})

test('buying Parting Gift spends current-area crops once and does not reset either area', () => {
  const game = { ...createAugmentationGame(), crops: 2e77 }
  const purchased = purchaseMisfortuneUpgrade(game, precursorId)
  assert.equal(purchased.crops, 1e77)
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

test('Rich Soil and Leek Cookie stay unavailable before and after Parting Gift', () => {
  const game = createAugmentationGame()
  for (const augmentation of Object.values(SEED_AUGMENTATIONS).filter((entry) => entry.purchaseArea === 'misfortune')) {
    assert.equal(isSeedAugmentationVisible(game, augmentation.id), false)
    assert.equal(purchaseSeedAugmentation(game, augmentation.id), null)
  }
  assert.ok(!getAvailableFiveLeafFortunes(game).some(({ id }) => id === 'leekFortuneCookie'))
  const researched = purchaseMisfortuneUpgrade(game, precursorId)
  assert.equal(isSeedAugmentationVisible(researched, richSoilId), false)
  assert.equal(purchaseSeedAugmentation(researched, richSoilId), null)
  const legacyOwned = { ...researched, seedAugmentations: { richSoilUnlocked: true } }
  assert.ok(!getAvailableFiveLeafFortunes(legacyOwned).some(({ id }) => id === 'leekFortuneCookie'))
})

test('shared augmentations retain their existing prerequisites', () => {
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

test('Parting Gift leaves support unchanged, including Main at 0.2 percent per tier', () => {
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
  const main = { ...purchaseMisfortuneUpgrade(game, precursorId), activeArea: 'main' }
  assert.equal(getFloorReplicatorSupportPassiveEffectBonus(main), 50 * 0.002)
  assert.equal(getFloorReplicatorSupportPassiveEffectBonus({ ...main, completedMisfortuneUpgrades: [
    MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
  ] }), getFloorReplicatorSupportPassiveEffectBonus(main))
})

test('Parting Gift survives saving and importing, and a Misfortune wipe preserves formerly Main-purchasable Floors', () => {
  const game = purchaseMisfortuneUpgrade(createAugmentationGame(), precursorId)
  const restored = importGame(exportGame(game))
  assert.equal(hasMisfortuneUpgrade(restored, precursorId), true)
  assert.equal(isSeedAugmentationVisible(restored, richSoilId), false)
  assert.equal(hasMisfortuneUpgrade(wipeMisfortuneAreaProgress(restored), precursorId), false)
  assert.equal(isSeedAugmentationVisible(wipeMisfortuneAreaProgress(restored), richSoilId), false)
  assert.deepEqual(normalizeGame({ completedMisfortuneUpgrades: [precursorId, precursorId, 'invalid'] }).completedMisfortuneUpgrades, [precursorId])
  for (const activeArea of ['main', 'misfortune']) {
    const wiped = wipeMisfortuneAreaProgress({ ...restored, activeArea })
    assert.equal(wiped.floorReplicators, restored.floorReplicators)
    assert.equal(canPurchaseFloorReplicatorsInArea({ ...wiped, activeArea: 'main' }), false)
  }
})

test('the Misfortune goal bar puts Parting Gift after Clover without removed research goals', () => {
  const precursorIndex = MAJOR_PROGRESSION_GOALS.findIndex((goal) => goal.id === `misfortune-upgrade-${precursorId}`)
  const cloverIndex = MAJOR_PROGRESSION_GOALS.findIndex((goal) => goal.id === 'perfection-five-leaf-clover')
  assert.equal(precursorIndex, cloverIndex + 1)
  const precursor = MAJOR_PROGRESSION_GOALS[precursorIndex]
  const game = createAugmentationGame()
  assert.equal(precursor.target, 1e77)
  assert.equal(precursor.isApplicable(game), true)
  assert.equal(precursor.isApplicable({ ...game, activeArea: 'main' }), false)
  assert.equal(precursor.isComplete(game), false)
  const purchased = purchaseMisfortuneUpgrade(game, precursorId)
  assert.equal(precursor.isComplete(purchased), true)
  assert.ok(!MAJOR_PROGRESSION_GOALS.some(({ id }) => [
    'augmentation-rich-soil', 'misfortune-upgrade-notSoFinalSupport',
  ].includes(id)))
})

test('Main single, Buy 10 and Buy Max floor purchases require Parting Gift and use normal area prices', () => {
  const game = { ...createAugmentationGame(), activeArea: 'main', floorReplicators: 0, crops: 10 }
  assert.equal(canPurchaseFloorReplicatorsInArea(game), false)
  assert.equal(getMaxFloorReplicatorPurchase(game, 1).purchased, 0)
  assert.equal(getMaxFloorReplicatorPurchase(game, 10).purchased, 0)
  assert.equal(getMaxFloorReplicatorPurchase(game).purchased, 0)
  const unlocked = { ...game, completedMisfortuneUpgrades: [precursorId] }
  assert.equal(canPurchaseFloorReplicatorsInArea(unlocked), true)
  assert.equal(getBulkPurchaseQuote(unlocked, 'floor', 1).cost, 0.01)
  assert.equal(getMaxFloorReplicatorPurchase(unlocked, 1).purchased, 1)
  assert.equal(getMaxFloorReplicatorPurchase(unlocked, 10).purchased, 10)
  assert.ok(getMaxFloorReplicatorPurchase(unlocked).purchased > 10)
  assert.equal(getBulkPurchaseQuote({ ...unlocked, activeArea: 'misfortune' }, 'floor', 1).cost, 1)
  assert.equal(getMaxFloorReplicatorPurchase({ ...unlocked, hasUnlockedFloorReplicators: false }, 1).purchased, 0)
})

test('retired Not-So-Final Support is rejected and never grants Parting Gift when importing old saves', () => {
  const restored = normalizeGame({
    ...createAugmentationGame(), completedMisfortuneUpgrades: ['notSoFinalSupport'],
  })
  assert.equal(MISFORTUNE_UPGRADES.notSoFinalSupport, undefined)
  assert.equal(purchaseMisfortuneUpgrade(createAugmentationGame(), 'notSoFinalSupport'), null)
  assert.deepEqual(restored.completedMisfortuneUpgrades, [])
  assert.equal(canPurchaseFloorReplicatorsInArea({ ...restored, activeArea: 'main' }), false)
})
