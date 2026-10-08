import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  CAPYBARA_DEMONSTRATIONS,
  CLOVER_ASSEMBLY_PART_REQUIREMENT,
  GREATER_BLUEPRINTING_COST,
  MAJOR_PROGRESSION_GOALS,
  MISFORTUNE_CROP_GOAL,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  RABBIT_UNLOCK_IDS,
  RABBIT_UNLOCKS,
  ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  MISFORTUNE_ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  SEED_AUGMENTATION_IDS,
  SEED_AUGMENTATIONS,
  TRADE_ESTABLISHMENT_COST,
  MISFORTUNE_TRADE_ESTABLISHMENT_COST,
  advanceGameSimulationStep,
  canUnlockCropPerfection,
  canUnlockRowDuplicators,
  createInitialGame,
  createRabbitContract,
  establishTradeRelations,
  getBlueprintExpansionCost,
  getCapybaraDemonstrationStatus,
  getCropPerfectionCost,
  getAreaCropValue,
  getGameAreaCostMultiplier,
  getGreaterBlueprintingCost,
  getNextFloorReplicatorCost,
  getNextHamsterCost,
  getNextMajorProgressionGoal,
  getNextRowDuplicatorCost,
  getNextSeedAugmentationCost,
  getRowDuplicatorsUnlockCropCount,
  getSeedAugmentationCost,
  getTradeEstablishmentCost,
  isCloverAssemblyReady,
  purchaseMisfortuneUpgrade,
  purchaseSeedAugmentation,
  switchGameArea,
  unlockCropPerfection,
  unlockGreaterBlueprinting,
} from '../src/game/gameLogic.js'
import {
  CROP_PERFECTIONS,
  getCropUnlockDescription,
  getCropUnlockRequirement,
} from '../src/game/crops.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'
import { getCachedFormattedNumber } from '../src/game/numberFormat.js'

const stages = [
  { area: 'main', demos: [] },
  { area: 'main', demos: ['introduction', 'demonstrationOne'] },
  { area: 'main', demos: ['introduction', 'demonstrationOne', 'misfortuneTrial'] },
  { area: 'misfortune', demos: ['introduction', 'demonstrationOne'] },
  { area: 'misfortune', demos: ['introduction', 'demonstrationOne', 'misfortuneTrial'] },
]

function stageGame(stage) {
  const initial = createInitialGame()
  return {
    ...initial,
    activeArea: stage.area,
    capybara: { ...initial.capybara, completedDemonstrations: stage.demos },
  }
}

test('the price resolver only selects explicit area values, regardless of demonstrations', () => {
  assert.equal(getAreaCropValue(undefined, null), null)
  for (const stage of stages) {
    const game = stageGame(stage)
    assert.equal(getAreaCropValue(game, 123, 456), stage.area === 'misfortune' ? 456 : 123)
    assert.equal(getAreaCropValue(game, 123), 123)
  }
})

for (const stage of stages) {
  const label = `${stage.area} / ${stage.demos.length} demos`

  test(`perfection prices and purchase deductions agree in ${label}`, () => {
    const game = {
      ...stageGame(stage),
      hasUnlockedCropPerfection: true,
      hasUnlockedRowDuplicators: true,
    }
    for (const perfection of Object.values(CROP_PERFECTIONS).filter(({ cost }) => cost != null)) {
      assert.equal(
        getCropPerfectionCost(perfection.id, game),
        stage.area === 'misfortune' ? perfection.misfortuneCost ?? perfection.cost : perfection.cost,
      )
    }
    const cost = getCropPerfectionCost('enrichingLeek', game)
    assert.equal(canUnlockCropPerfection({ ...game, crops: cost * 0.99 }, 'enrichingLeek'), false)
    const purchased = unlockCropPerfection({ ...game, crops: cost }, 'enrichingLeek')
    assert.equal(purchased.crops, 0)
    assert.ok(purchased.completedCropPerfections.includes('enrichingLeek'))
  })

  test(`crop thresholds agree between live simulation and save restoration in ${label}`, () => {
    const game = { ...stageGame(stage), hasUnlockedRowDuplicators: true }
    for (const [flag, cropId] of [
      ['hasUnlockedTurnip', 'turnip'],
      ['hasUnlockedAppleTree', 'appleTree'],
      ['hasUnlockedLentil', 'lentil'],
      ['hasUnlockedKnotweed', 'knotweed'],
      ['hasUnlockedWheat', 'wheat'],
      ['hasUnlockedSunflower', 'sunflower'],
      ['hasUnlockedCropPerfection', 'cropPerfection'],
    ]) {
      const threshold = getCropUnlockRequirement(cropId, stage.area)
      const below = { ...game, crops: threshold * 0.99, [flag]: false }
      const reached = { ...game, crops: threshold, [flag]: false }
      assert.equal(advanceGameSimulationStep(below, 1 / 60)[flag], false, flag)
      assert.equal(normalizeGame(below)[flag], false, flag)
      assert.equal(advanceGameSimulationStep(reached, 1 / 60)[flag], true, flag)
      assert.equal(normalizeGame(reached)[flag], true, flag)
    }
  })

  test(`augment prices preserve level scaling and actual payment in ${label}`, () => {
    const game = {
      ...stageGame(stage),
      completedCropPerfections: ['enrichingLeek'],
      capybara: { completedDemonstrations: ['introduction', ...stage.demos] },
    }
    const id = SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT
    const augmentation = SEED_AUGMENTATIONS[id]
    const cost = stage.area === 'misfortune' ? augmentation.misfortuneCost : augmentation.baseCost
    assert.equal(getNextSeedAugmentationCost(game, id), cost)
    assert.equal(purchaseSeedAugmentation({ ...game, crops: cost * 0.99 }, id), null)
    const purchased = purchaseSeedAugmentation({ ...game, crops: cost }, id)
    assert.equal(purchased.crops, 0)
    assert.equal(purchased.seedAugmentations.leekEnrichmentLevel, 1)
    assert.equal(getNextSeedAugmentationCost(purchased, id), cost * augmentation.costGrowth)
    const diagonalId = SEED_AUGMENTATION_IDS.LEEK_DIAGONAL
    assert.equal(getSeedAugmentationCost(game, diagonalId), stage.area === 'misfortune'
      ? SEED_AUGMENTATIONS[diagonalId].misfortuneCost : SEED_AUGMENTATIONS[diagonalId].cost)
    assert.equal(getNextSeedAugmentationCost({
      ...game, seedAugmentations: { ...game.seedAugmentations, leekDiagonalUnlocked: true },
    }, diagonalId), null)
  })
}

test('milestone purchases use fixed area costs, but the Row Duplicator reset remains a threshold', () => {
  for (const stage of stages) {
    const game = { ...stageGame(stage), hasUnlockedSunflower: true }
    const tradeCost = stage.area === 'misfortune' ? MISFORTUNE_TRADE_ESTABLISHMENT_COST : TRADE_ESTABLISHMENT_COST
    assert.equal(getTradeEstablishmentCost(game), tradeCost)
    assert.equal(establishTradeRelations({ ...game, crops: tradeCost * 0.99 }), null)
    assert.equal(establishTradeRelations({ ...game, crops: tradeCost }).crops, 0)
    const rowCost = stage.area === 'misfortune' ? MISFORTUNE_ROW_DUPLICATORS_UNLOCK_CROP_COUNT : ROW_DUPLICATORS_UNLOCK_CROP_COUNT
    assert.equal(getRowDuplicatorsUnlockCropCount(game), rowCost)
    assert.equal(canUnlockRowDuplicators({ ...game, crops: rowCost * 0.99 }), false)
    assert.equal(canUnlockRowDuplicators({ ...game, crops: rowCost }), true)
    const precursor = { ...game, activeArea: 'main', completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER] }
    const precursorCost = getGreaterBlueprintingCost(precursor)
    assert.equal(getGreaterBlueprintingCost(game), precursorCost, 'Greater Blueprinting always uses main currency')
    assert.equal(precursorCost, GREATER_BLUEPRINTING_COST)
    assert.equal(unlockGreaterBlueprinting({ ...precursor, crops: precursorCost }).crops, 0)
  }
})

test('Misfortune upgrade and assembly requirements are final values, with no second multiplier', () => {
  assert.equal(MISFORTUNE_UPGRADES.rushedStart.cost, 250_000_000)
  assert.equal(MISFORTUNE_UPGRADES.notSoFinalSupport.cost, 1e71)
  const game = stageGame(stages[4])
  const cost = MISFORTUNE_UPGRADES.rushedStart.cost
  assert.equal(purchaseMisfortuneUpgrade({ ...game, crops: cost * 0.99 }, 'rushedStart'), null)
  assert.equal(purchaseMisfortuneUpgrade({ ...game, crops: cost }, 'rushedStart').crops, 0)
  const richSoilId = SEED_AUGMENTATION_IDS.RICH_SOIL
  assert.equal(getSeedAugmentationCost(game, richSoilId), SEED_AUGMENTATIONS[richSoilId].cost)
  assert.equal(getSeedAugmentationCost({ ...game, activeArea: 'main' }, richSoilId), SEED_AUGMENTATIONS[richSoilId].cost)
  assert.equal(CLOVER_ASSEMBLY_PART_REQUIREMENT, 7.77e64)
  assert.equal(isCloverAssemblyReady({ progress: 7.77e58 }), false)
  assert.equal(isCloverAssemblyReady({ progress: CLOVER_ASSEMBLY_PART_REQUIREMENT }), true)
})

test('demonstrations store final goals, without applying progression multipliers', () => {
  assert.equal(CAPYBARA_DEMONSTRATIONS[0].target, 2e13)
  assert.equal(CAPYBARA_DEMONSTRATIONS[1].target, 2.5e20)
  assert.equal(CAPYBARA_DEMONSTRATIONS[2].target, MISFORTUNE_CROP_GOAL)
  assert.equal(CAPYBARA_DEMONSTRATIONS[3].target, 3)
  const game = stageGame(stages[3])
  assert.equal(getCapybaraDemonstrationStatus({ ...game, crops: MISFORTUNE_CROP_GOAL * 0.99 }, 'misfortuneTrial').hasReachedGoal, false)
  assert.equal(getCapybaraDemonstrationStatus({ ...game, crops: MISFORTUNE_CROP_GOAL }, 'misfortuneTrial').hasReachedGoal, true)
})

test('machinery, paid blueprint expansions, Rabbit relation prices and contract quantities do not scale', () => {
  const initial = createInitialGame()
  const baselineContract = createRabbitContract(initial, () => 0.5)
  for (const stage of stages) {
    const game = stageGame(stage)
    assert.equal(getBlueprintExpansionCost(game, 'firstColumn'), getBlueprintExpansionCost(initial, 'firstColumn'))
    assert.equal(getBlueprintExpansionCost(game, 'firstRow'), getBlueprintExpansionCost(initial, 'firstRow'))
    const machineryMultiplier = getGameAreaCostMultiplier(game)
    assert.equal(machineryMultiplier, stage.area === 'misfortune' ? 100 : 1)
    assert.equal(getNextHamsterCost(0, false, machineryMultiplier), getNextHamsterCost(0, false) * machineryMultiplier)
    assert.equal(getNextRowDuplicatorCost(0, machineryMultiplier), getNextRowDuplicatorCost(0) * machineryMultiplier)
    assert.equal(getNextFloorReplicatorCost(0, machineryMultiplier), getNextFloorReplicatorCost(0) * machineryMultiplier)
    assert.deepEqual(createRabbitContract(game, () => 0.5), baselineContract)
    assert.equal(getCropPerfectionCost('blazingCarrot', game), CROP_PERFECTIONS.blazingCarrot.cost)
  }
  assert.equal(RABBIT_UNLOCKS.find(({ id }) => id === RABBIT_UNLOCK_IDS.CARROT).cost, 500)
})

test('existing earned unlocks, augmentation levels and completed challenges survive restoring an older save', () => {
  const game = {
    ...stageGame(stages[2]), crops: 0,
    hasUnlockedTurnip: true, hasUnlockedSunflower: true, hasUnlockedCropPerfection: true,
    completedCropPerfections: ['enrichingLeek', 'samplingLentil'],
    seedAugmentations: { ...createInitialGame().seedAugmentations, leekEnrichmentLevel: 3 },
    hasUnlockedGreaterBlueprinting: true,
    cloverAssembly: { progress: 7.77e58, assembled: true },
  }
  const restored = importGame(exportGame(game))
  assert.equal(restored.hasUnlockedTurnip, true)
  assert.equal(restored.hasUnlockedSunflower, true)
  assert.equal(restored.hasUnlockedCropPerfection, true)
  assert.deepEqual(restored.completedCropPerfections, game.completedCropPerfections)
  assert.equal(restored.seedAugmentations.leekEnrichmentLevel, 3)
  assert.deepEqual(restored.capybara.completedDemonstrations, game.capybara.completedDemonstrations)
  assert.equal(restored.cloverAssembly.assembled, true)
  assert.equal(getCropPerfectionCost('sweetPotato', switchGameArea(restored, 'misfortune')), 2e99)
  assert.equal(getCropPerfectionCost('sweetPotato', switchGameArea(switchGameArea(restored, 'misfortune'), 'main')), 2e99)
})

test('the actual progress bar uses the same fixed area requirement as the unlock check', () => {
  for (const stage of stages) {
    const game = {
      ...stageGame(stage), unionized: true, totalHamstersHired: 1000, hamsters: 125,
      completedBlueprintExpansions: ['firstColumn'],
      completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW, MISFORTUNE_UPGRADE_IDS.RUSHED_START],
      crops: getCropUnlockRequirement('turnip', stage.area) * 0.5,
    }
    const goal = getNextMajorProgressionGoal(game)
    assert.equal(goal.id, 'crop-turnip')
    assert.equal(goal.target, getCropUnlockRequirement('turnip', stage.area))
    assert.equal(goal.progress, 0.5)
    const corn = MAJOR_PROGRESSION_GOALS.find(({ id }) => id === 'crop-corn')
    assert.equal(corn.getTarget(game), stage.area === 'misfortune'
      ? 2.5e6
      : getBlueprintExpansionCost(createInitialGame(), 'firstColumn'))
  }
})

let server
let Inventions
let LeekAugmentations
let CloverAssembly
before(async () => {
  server = await createServer({ logLevel: 'silent', resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Inventions } = await server.ssrLoadModule('/src/tabs/Inventions.jsx'))
  ;({ LeekAugmentations } = await server.ssrLoadModule('/src/tabs/LeekAugmentations.jsx'))
  ;({ CloverAssembly } = await server.ssrLoadModule('/src/tabs/CloverAssembly.jsx'))
})
after(async () => { await server?.close() })

test('Inventions, augmentation cards and crop palette descriptions display fixed final costs', () => {
  for (const stage of stages.slice(1)) {
    const game = { ...stageGame(stage), hasUnlockedCropPerfection: true }
    const format = (value) => getCachedFormattedNumber(value, 0)
    const html = renderToStaticMarkup(createElement(Inventions, {
      game, activeInventionsTab: 'cropPerfection', blueprintExpansionTracks: [],
    }))
    for (const id of ['enrichingLeek', 'mirrorCorn', 'leechingGourd']) {
      assert.ok(html.includes(format(getCropPerfectionCost(id, game))), id)
    }
    const augmentationHtml = renderToStaticMarkup(createElement(LeekAugmentations, { game }))
    assert.ok(augmentationHtml.includes(format(getSeedAugmentationCost(game, 'leekDiagonal'))))
    assert.equal(getCropUnlockDescription('sunflower', stage.area, false, game), `Unlocks at ${format(getCropUnlockRequirement('sunflower', stage.area))} Crops`)
    const precursorHtml = renderToStaticMarkup(createElement(CloverAssembly, {
      game: { ...game, completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER] },
    }))
    assert.ok(precursorHtml.includes(format(getGreaterBlueprintingCost(game))))
  }
})
