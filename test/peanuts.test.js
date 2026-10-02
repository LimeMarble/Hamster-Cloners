import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACHIEVEMENTS, FLOOR_REPLICATOR_MODES, MISFORTUNE_UPGRADES, MAJOR_PROGRESSION_GOALS,
  advanceGameSimulationStep, awardAchievements, canUnlockCropPerfection,
  createBlueprint, createInitialGame, getAchievementHamsterMultiplier,
  getAchievementTreatExponent, getBlueprintCropStats, getCropPerfectionCost,
  getFortuneModifiers, getHamsterTreats, getMonocropCropCount,
  getNextSeedAugmentationCost,
  getOilyTreatsFloorMultiplier, getPeanutTreatEffect,
  isCropPerfectionVisible, purchaseMisfortuneUpgrade, switchGameArea,
} from '../src/game/gameLogic.js'
import { CROP_DEFINITIONS, CROP_IDS, getUnlockedCropIds, getVisibleCropIds } from '../src/game/crops.js'
import { exportGame, importGame } from '../src/game/storage.js'

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12,
    `${actual} should be approximately ${expected}`)
}

test('Peanuts appear immediately before Soybean without becoming a prerequisite for it', () => {
  assert.equal(CROP_IDS.indexOf('peanuts') + 1, CROP_IDS.indexOf('soybean'))
  const visible = getVisibleCropIds(CROP_IDS, 1000, true, true, true)
  assert.equal(visible.indexOf('peanuts') + 1, visible.indexOf('soybean'))
  const withoutPeanuts = getVisibleCropIds(
    CROP_IDS.filter((id) => id !== 'peanuts'), 1000, true, true, true,
  )
  assert.ok(withoutPeanuts.includes('soybean'))
  assert.ok(!withoutPeanuts.includes('peanuts'))
  assert.deepEqual(visible.filter((id) => id !== 'peanuts'), withoutPeanuts)
  assert.deepEqual(getVisibleCropIds(['leek', 'peanuts']), ['leek', 'peanuts'])
})

function peanutGame(count = 7, extra = {}) {
  const blueprint = createBlueprint({ rows: 14, columns: 14, cells: Array(count).fill('peanuts') })
  return { ...createInitialGame(), blueprint, blueprintSlots: [blueprint],
    earnedAchievementIds: ACHIEVEMENTS.filter(({ tier }) => tier > 1).map(({ id }) => id),
    ...extra }
}

function earlyMisfortune() {
  const blueprint = createBlueprint({ rows: 5, columns: 4,
    cells: ['corn', 'turnip', 'corn', null, 'turnip', 'leek', 'turnip', 'corn',
      'corn', 'turnip', 'leek', 'turnip', null, null, 'turnip', 'corn'],
    mirrorCornTargets: [5, null, 5, null, null, null, null, 10, 5, null, null,
      null, null, null, null, 10] })
  const initial = createInitialGame()
  return { ...initial, activeArea: 'misfortune', blueprint, blueprintSlots: [blueprint],
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn'],
    seedAugmentations: { ...initial.seedAugmentations, leekEnrichmentLevel: 5,
      mirrorCornEffectivenessLevel: 8, mirrorCornReflectionLimitUnlocked: true,
      mirrorCornDebuffRemovalUnlocked: true, mirrorCornDebuffRemovalEnabled: true } }
}

test('Peanuts harvest 150 per tile and have quadratic monocrop weight', () => {
  assert.equal(CROP_DEFINITIONS.peanuts.baseYield, 150)
  for (const [count, weighted] of [[0, 0], [1, 1], [3, 9], [7, 49]]) {
    const game = peanutGame(count)
    assert.equal(getMonocropCropCount(game.blueprint, 'peanuts'), weighted)
  }
  const stats = getBlueprintCropStats(peanutGame(1).blueprint, 0)
  assert.equal(stats.harvestYield, 150)
  assert.equal(stats.passiveStats.find(({ id }) => id === 'peanut-treat-exponent').value, 0.5)
})

test('300 Treats and seven unpenalized Peanuts give exponent 4.5 and multiplier 512', () => {
  const game = peanutGame()
  assert.equal(getHamsterTreats(game), 300)
  assert.equal(getAchievementTreatExponent(game), 4.5)
  assert.equal(getAchievementHamsterMultiplier(game), 512)
  assert.equal(getAchievementHamsterMultiplier(game.earnedAchievementIds), 4)
  assert.equal(getAchievementHamsterMultiplier(game) / 4, 128)
  assert.equal(getHamsterTreats(game), 300, 'planting does not create permanent Treats')
})

test('only the active blueprint contributes Peanuts, not the sum across slots', () => {
  const game = peanutGame(3)
  const other = peanutGame(7).blueprint
  assert.equal(getAchievementTreatExponent({ ...game, blueprintSlots: [game.blueprint, other] }), 2.5)
  assert.equal(getAchievementTreatExponent({ ...game, blueprint: other }), 4.5)
})

test('Peanut exponent effects are cached until relevant blueprint modifiers change', () => {
  const game = peanutGame()
  const first = getPeanutTreatEffect(game.blueprint, game.completedCropPerfections,
    1, game.seedAugmentations)
  assert.strictEqual(getPeanutTreatEffect(game.blueprint, game.completedCropPerfections,
    1, game.seedAugmentations), first)
  assert.notStrictEqual(getPeanutTreatEffect(game.blueprint, game.completedCropPerfections,
    1.1, game.seedAugmentations), first)
})

test('monocrop and universal modifiers, including Wrath, affect the exponent bonus', () => {
  const blueprint = createBlueprint({ rows: 3, columns: 3, cells: Array(3).fill('peanuts') })
  const penalty = getPeanutTreatEffect(blueprint)
  assert.ok(penalty.bonusPerPeanut > 0 && penalty.bonusPerPeanut < 0.5)
  near(getPeanutTreatEffect(blueprint, [], 1.1).exponentBonus, penalty.exponentBonus * 1.1)
  const game = peanutGame(7, { activeArea: 'misfortune' })
  const passive = getFortuneModifiers(game).passiveEffectMultiplier
  near(getAchievementTreatExponent(game), 1 + 3.5 * passive)
  const stats = getBlueprintCropStats(game.blueprint, 0, [], 0, 0, 0,
    getFortuneModifiers(game))
  near(stats.passiveStats.find(({ id }) => id === 'peanut-treat-exponent').value, 0.5 * passive)
})

test('Turnips and Mirror Corn cannot amplify the Peanut exponent', () => {
  const blueprint = createBlueprint({ rows: 4, columns: 4,
    cells: ['corn', null, null, null, 'turnip', 'peanuts'], mirrorCornTargets: [5] })
  const effect = getPeanutTreatEffect(blueprint, ['mirrorCorn'])
  assert.equal(effect.exponentBonus, 0.5)
  const stats = getBlueprintCropStats(blueprint, 5, ['mirrorCorn'])
  assert.equal(stats.passiveStats.find(({ id }) => id === 'peanut-treat-exponent').value, 0.5)
})

test('burnt Peanuts and infested fields lose their exponent effects', () => {
  const burned = createBlueprint({ rows: 4, columns: 4,
    cells: ['corn', null, 'corn', null, null, 'peanuts', null, null, 'corn'],
    mirrorCornTargets: [5, null, 5, null, null, null, null, null, 5] })
  assert.equal(getPeanutTreatEffect(burned, ['mirrorCorn']).exponentBonus, 0)
  const infested = createBlueprint({ rows: 6, columns: 6,
    cells: [...Array(12).fill('waterLettuce'), 'peanuts'] })
  assert.equal(getPeanutTreatEffect(infested).exponentBonus, 0)
})

test('Making Peanuts is inclusive at five, only in Misfortune, with a five-Treat reward', () => {
  const achievement = ACHIEVEMENTS.find(({ id }) => id === 'makingPeanuts')
  assert.equal(achievement.tier, 1)
  assert.equal(achievement.treats, 5)
  assert.equal(achievement.condition({ activeArea: 'misfortune' }, { misfortuneFieldYield: 5 }), true)
  assert.equal(achievement.condition({ activeArea: 'misfortune' }, { misfortuneFieldYield: 4.999 }), false)
  assert.equal(achievement.condition({ activeArea: 'main' }, { misfortuneFieldYield: 5 }), false)
})

test('Making Peanuts checks one intrinsic blueprint after penalties, including inactive slots', () => {
  const strong = earlyMisfortune()
  assert.ok(awardAchievements(strong).earnedAchievementIds.includes('makingPeanuts'))
  assert.ok(!awardAchievements({ ...strong, activeArea: 'main' }).earnedAchievementIds.includes('makingPeanuts'))
  const weak = createBlueprint()
  assert.ok(!awardAchievements({ ...strong, blueprint: weak, blueprintSlots: [weak],
    farmland: { rows: 1e100, columns: 1e100, floors: 1e50, farms: 1 },
    testingCheats: { cropMultiplierEnabled: true } }).earnedAchievementIds.includes('makingPeanuts'))
  assert.ok(awardAchievements({ ...strong, blueprint: weak, blueprintSlots: [weak, strong.blueprint] })
    .earnedAchievementIds.includes('makingPeanuts'))
})

test('the achievement unlocks Peanuts permanently in both areas and survives save restoration', () => {
  const awarded = awardAchievements(earlyMisfortune())
  const restored = importGame(exportGame(awarded))
  assert.ok(restored.earnedAchievementIds.includes('makingPeanuts'))
  const main = switchGameArea(restored, 'main')
  assert.ok(main.earnedAchievementIds.includes('makingPeanuts'))
  const unlocked = getUnlockedCropIds(createBlueprint(), false, 0, false, false,
    false, false, false, false, 0, false, false, false, [], 0,
    main.earnedAchievementIds.includes('makingPeanuts'))
  assert.ok(unlocked.includes('peanuts'))
  assert.ok(getVisibleCropIds(unlocked).includes('peanuts'), 'no unrelated late crop prerequisite')
})

test('Oily Treats costs exactly 1.8e12 Misfortune Crops and unlocks access, not perfection itself', () => {
  const game = { ...earlyMisfortune(), hasUnlockedCropPerfection: true, hasUnlockedRowDuplicators: true }
  assert.equal(MISFORTUNE_UPGRADES.oilyTreats.cost, 1.8e12)
  assert.equal(isCropPerfectionVisible(game, 'sweetPotato'), false)
  assert.equal(purchaseMisfortuneUpgrade({ ...game, crops: 1.8e12 - 1 }, 'oilyTreats'), null)
  assert.equal(purchaseMisfortuneUpgrade({ ...game, activeArea: 'main', crops: 1.8e12 }, 'oilyTreats'), null)
  const purchased = purchaseMisfortuneUpgrade({ ...game, crops: 1.8e12 }, 'oilyTreats')
  assert.equal(purchased.crops, 0)
  assert.equal(isCropPerfectionVisible(purchased, 'sweetPotato'), true)
  assert.ok(!purchased.completedCropPerfections.includes('sweetPotato'))
  assert.equal(purchaseMisfortuneUpgrade({ ...purchased, crops: 1.8e12 }, 'oilyTreats'), null)
  const restored = importGame(exportGame(purchased))
  assert.ok(restored.completedMisfortuneUpgrades.includes('oilyTreats'))
})

test('Oily Treats multiplies floors only, in both areas, and leaves support mode paused', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = peanutGame(3, { activeArea, hamsters: 10, rowDuplicators: 10,
      hasUnlockedRowDuplicators: true, hasUnlockedFloorReplicators: true, floorReplicators: 10 })
    const oily = { ...game, completedMisfortuneUpgrades: ['oilyTreats'] }
    const baseline = advanceGameSimulationStep(game, 1 / 60)
    const boosted = advanceGameSimulationStep(oily, 1 / 60)
    near(boosted.farmland.columns, baseline.farmland.columns)
    near(boosted.farmland.rows, baseline.farmland.rows)
    const floorMultiplier = getOilyTreatsFloorMultiplier(oily)
    near(floorMultiplier, Math.sqrt(getAchievementHamsterMultiplier(oily)))
    near(boosted.farmland.floors - game.farmland.floors,
      (baseline.farmland.floors - game.farmland.floors) * floorMultiplier)
    const support = { ...oily, floorReplicatorMode: FLOOR_REPLICATOR_MODES.SUPPORT,
      completedMisfortuneUpgrades: ['oilyTreats', 'finalSupport'] }
    assert.equal(advanceGameSimulationStep(support, 1 / 60).farmland.floors, support.farmland.floors)
  }
})

test('shared Sweet Potato and later Crop costs receive another 500× in both areas; earlier costs do not', () => {
  const game = { ...createInitialGame(), activeArea: 'main',
    capybara: { completedDemonstrations: ['introduction', 'demonstrationOne'] },
    hasUnlockedCropPerfection: true, hasUnlockedRowDuplicators: true,
    areaProgress: { misfortune: {} }, completedMisfortuneUpgrades: ['oilyTreats'] }
  near(getCropPerfectionCost('sweetPotato', game), 2e99)
  near(getCropPerfectionCost('samplingLentil', game), 5e126)
  assert.equal(getCropPerfectionCost('enrichingLeek', game), 2e11)
  near(getNextSeedAugmentationCost(game, 'sweeterBond'), 3.5e103)
  near(getNextSeedAugmentationCost(game, 'leekDiagonal'), 1e69)
  const misfortune = { ...game, activeArea: 'misfortune' }
  near(getCropPerfectionCost('sweetPotato', misfortune), 2e99)
  near(getCropPerfectionCost('samplingLentil', misfortune), 5e126)
  near(getNextSeedAugmentationCost(misfortune, 'sweeterBond'), 3.5e103)
  const cost = getCropPerfectionCost('sweetPotato', game)
  assert.equal(canUnlockCropPerfection({ ...game, crops: cost * 0.99 }, 'sweetPotato'), false)
  assert.equal(canUnlockCropPerfection({ ...game, crops: cost }, 'sweetPotato'), true)
  const goal = MAJOR_PROGRESSION_GOALS.find(({ id }) => id === 'perfection-sweetPotato')
  near(goal.getTarget(game), cost)
  assert.equal(goal.isApplicable(game), true)
  assert.equal(goal.isApplicable({ ...game, completedMisfortuneUpgrades: [] }), true)
  assert.equal(goal.isLocked({ ...game, completedMisfortuneUpgrades: [] }), true)
})

test('older saves retain an already owned Sweet Potato despite the new gate', () => {
  const game = { ...createInitialGame(), completedCropPerfections: ['sweetPotato'] }
  const restored = importGame(exportGame(game))
  assert.ok(restored.completedCropPerfections.includes('sweetPotato'))
  assert.equal(isCropPerfectionVisible(restored, 'sweetPotato'), true)
})
