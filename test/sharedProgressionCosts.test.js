import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  CAPYBARA_DEMONSTRATIONS, MISFORTUNE_CROP_GOAL, MAJOR_PROGRESSION_GOALS,
  SEED_AUGMENTATIONS, canUnlockCropPerfection, createInitialGame,
  getCropPerfectionCost, getNextSeedAugmentationCost,
  getSeedAugmentationCost, getAreaCropValue,
  purchaseSeedAugmentation, unlockCropPerfection,
} from '../src/game/gameLogic.js'
import { CROP_PERFECTIONS } from '../src/game/crops.js'
import { getCachedFormattedNumber, setActiveNumberNotation } from '../src/game/numberFormat.js'
import { exportGame, importGame } from '../src/game/storage.js'

function progressionGame(activeArea = 'misfortune', extra = {}) {
  return { ...createInitialGame(), activeArea,
    hasUnlockedCropPerfection: true, hasUnlockedRowDuplicators: true,
    capybara: { completedDemonstrations: ['introduction', 'demonstrationOne'] },
    completedMisfortuneUpgrades: ['oilyTreats', 'adversityGrownTubers', 'nourishingMisery'],
    ...extra }
}

function near(actual, expected) {
  assert.ok(Math.abs(actual / expected - 1) < 1e-12, `${actual} vs ${expected}`)
}

const GOURD_AUGMENTATION_PRICES = [
  ['leechingVine', 'leechingVineUnlocked', 5e144],
  ['sneakyCrawler', 'sneakyCrawlerUnlocked', 1.5e148],
  ['greaterAbsorption', 'greaterAbsorptionUnlocked', 3e149],
]

test('Gourd augmentations charge their exact rebalanced prices in Main and Misfortune', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = progressionGame(activeArea, {
      completedCropPerfections: ['leechingGourd'],
      completedMisfortuneUpgrades: ['huntForSomethingGreater', 'nourishingMisery'],
    })
    for (const [id, flag, cost] of GOURD_AUGMENTATION_PRICES) {
      assert.equal(getSeedAugmentationCost(game, id), cost)
      assert.equal(getNextSeedAugmentationCost(game, id), cost)
      assert.equal(purchaseSeedAugmentation({ ...game, crops: cost * 0.999 }, id), null)
      const purchased = purchaseSeedAugmentation({ ...game, crops: cost }, id)
      assert.ok(purchased, id)
      assert.equal(purchased.crops, 0)
      assert.equal(purchased.seedAugmentations[flag], true)
      assert.equal(getNextSeedAugmentationCost(purchased, id), null)
    }
  }
})

test('perfections use their final configured area prices, including progress targets', () => {
  const misfortune = progressionGame()
  const main = progressionGame('main')
  for (const perfection of Object.values(CROP_PERFECTIONS).filter(({ cost }) => cost != null)) {
    near(getCropPerfectionCost(perfection.id, misfortune), perfection.misfortuneCost ?? perfection.cost)
    near(getCropPerfectionCost(perfection.id, main), perfection.cost)
  }
  near(getCropPerfectionCost('sweetPotato', misfortune), 2e99)
  near(getCropPerfectionCost('samplingLentil', misfortune), CROP_PERFECTIONS.samplingLentil.cost)
  for (const id of ['sweetPotato', 'samplingLentil']) {
    const goal = MAJOR_PROGRESSION_GOALS.find((goal) => goal.id === `perfection-${id}`)
    assert.equal(goal.getTarget(misfortune), getCropPerfectionCost(id, misfortune))
  }
})

test('augmentations only apply their own level growth to the final area price', () => {
  for (const [id, field] of [['sweeterBond', 'sweeterBondLevel'],
    ['loosenedBoundaries', 'loosenedBoundariesLevel'],
    ['splitweedMonocropLimit', 'splitweedMonocropLimitLevel']]) {
    const definition = SEED_AUGMENTATIONS[id]
    for (let level = 0; level < definition.maximumLevel; level += 1) {
      const game = progressionGame('misfortune', { seedAugmentations: { [field]: level } })
      const expected = (definition.misfortuneCost ?? definition.baseCost) * definition.costGrowth ** level
      near(getNextSeedAugmentationCost(game, id), expected)
      near(getNextSeedAugmentationCost({ ...game, activeArea: 'main' }, id), definition.baseCost * definition.costGrowth ** level)
      near(getSeedAugmentationCost(game, id), definition.misfortuneCost ?? definition.baseCost)
    }
    assert.equal(getNextSeedAugmentationCost(progressionGame('misfortune', {
      seedAugmentations: { [field]: definition.maximumLevel },
    }), id), null)
  }
  for (const id of ['restoredConnections', 'leechingVine', 'sneakyCrawler', 'greaterAbsorption']) {
    near(getNextSeedAugmentationCost(progressionGame(), id), SEED_AUGMENTATIONS[id].cost)
  }
})

test('Misfortune-only requirements, Rich Soil, earlier prices and relation prices stay unchanged', () => {
  const game = progressionGame()
  assert.equal(getAreaCropValue(game, null), null)
  near(getAreaCropValue(game, 1e90), 1e90)
  near(getAreaCropValue(game, 1e150, 2e150), 2e150)
  near(CAPYBARA_DEMONSTRATIONS[2].target, MISFORTUNE_CROP_GOAL)
  near(getSeedAugmentationCost(game, 'richSoil'), SEED_AUGMENTATIONS.richSoil.cost)
  near(getNextSeedAugmentationCost(game, 'leekDiagonal'), 1e69)
  assert.equal(getCropPerfectionCost('blazingCarrot', game), CROP_PERFECTIONS.blazingCarrot.cost)
  // Completing a demonstration does not raise prices of existing items.
  const completed = { ...game, capybara: { completedDemonstrations: ['misfortuneTrial'] } }
  near(getCropPerfectionCost('sweetPotato', completed), 2e99)
  near(getCropPerfectionCost('sweetPotato', { ...completed, activeArea: 'main' }), 2e99)
})

test('purchases in Misfortune charge the corrected price, not merely display it', () => {
  const game = progressionGame()
  const perfectionCost = getCropPerfectionCost('sweetPotato', game)
  assert.equal(canUnlockCropPerfection({ ...game, crops: perfectionCost / 500 }, 'sweetPotato'), false)
  assert.equal(unlockCropPerfection({ ...game, crops: perfectionCost / 500 }, 'sweetPotato'), null)
  const perfected = unlockCropPerfection({ ...game, crops: perfectionCost }, 'sweetPotato')
  assert.equal(perfected.crops, 0)
  const augmentationCost = getNextSeedAugmentationCost(perfected, 'sweeterBond')
  assert.equal(purchaseSeedAugmentation({ ...perfected, crops: augmentationCost / 500 }, 'sweeterBond'), null)
  const augmented = purchaseSeedAugmentation({ ...perfected, crops: augmentationCost }, 'sweeterBond')
  assert.equal(augmented.crops, 0)
  assert.equal(augmented.seedAugmentations.sweeterBondLevel, 1)
  const restored = importGame(exportGame(augmented))
  assert.ok(restored.completedCropPerfections.includes('sweetPotato'))
  assert.equal(restored.seedAugmentations.sweeterBondLevel, 1)
})

let server, CropPerfectionPurchase, SweetPotatoAugmentations, BlazingCarrotPerfection
let LeechingGourdAugmentations
before(async () => {
  server = await createServer({ logLevel: 'silent',
    resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ CropPerfectionPurchase } = await server.ssrLoadModule('/src/tabs/CropPerfectionPurchase.jsx'))
  ;({ SweetPotatoAugmentations } = await server.ssrLoadModule('/src/tabs/SweetPotatoAugmentations.jsx'))
  ;({ BlazingCarrotPerfection } = await server.ssrLoadModule('/src/tabs/BlazingCarrotPerfection.jsx'))
  ;({ LeechingGourdAugmentations } = await server.ssrLoadModule('/src/tabs/LeechingGourdAugmentations.jsx'))
  const numberFormat = await server.ssrLoadModule('/src/game/numberFormat.js')
  numberFormat.setActiveNumberNotation('suffix', 303)
})
after(async () => { setActiveNumberNotation('suffix', 303); await server?.close() })

test('Gourd cards display the rebalanced costs in both price labels and purchase buttons', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = progressionGame(activeArea, {
      completedCropPerfections: ['leechingGourd'],
      completedMisfortuneUpgrades: ['huntForSomethingGreater', 'nourishingMisery'],
    })
    const markup = renderToStaticMarkup(createElement(LeechingGourdAugmentations, {
      game, onPurchaseSeedAugmentation() {},
    }))
    for (const [id, , cost] of GOURD_AUGMENTATION_PRICES) {
      const expected = getCachedFormattedNumber(cost, 0, 'suffix', 303)
      assert.equal(markup.split(expected).length - 1, 2, id)
    }
  }
})

test('Blazing Carrot purchase and progress labels use 2.5e16 Rabbit relations in either area', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = progressionGame(activeArea)
    const markup = renderToStaticMarkup(createElement(BlazingCarrotPerfection, {
      game, hasUnlocked: false, canUnlock: false,
    }))
    const expected = getCachedFormattedNumber(2.5e16, 0, 'suffix', 303)
    assert.equal(markup.split(expected).length - 1, 2)
    assert.ok(!markup.includes(getCachedFormattedNumber(2.5e15, 0, 'suffix', 303)))
    const goal = MAJOR_PROGRESSION_GOALS.find(({ id }) => id === 'perfection-blazingCarrot')
    assert.equal(goal.getTarget(game), 2.5e16)
  }
})

test('Misfortune perfection cards show corrected prices in both purchase and progress text', () => {
  const game = progressionGame()
  for (const id of ['sweetPotato', 'samplingLentil']) {
    const cost = getCropPerfectionCost(id, game)
    const markup = renderToStaticMarkup(createElement(CropPerfectionPurchase, {
      game, perfection: CROP_PERFECTIONS[id], isComplete: false, canUnlock: false,
    }))
    const expected = getCachedFormattedNumber(cost, 0, 'suffix', 303)
    assert.equal(markup.split(expected).length - 1, 2)
    assert.ok(!markup.includes(getCachedFormattedNumber(cost / 500, 0, 'suffix', 303)))
  }
})

test('Misfortune Sweet Potato augmentation cards show the corrected next-level prices', () => {
  const game = progressionGame('misfortune', { completedCropPerfections: ['sweetPotato'] })
  const markup = renderToStaticMarkup(createElement(SweetPotatoAugmentations, { game }))
  for (const id of ['sweeterBond', 'loosenedBoundaries', 'restoredConnections']) {
    const cost = getNextSeedAugmentationCost(game, id)
    assert.ok(markup.includes(getCachedFormattedNumber(cost, 0, 'suffix', 303)), id)
    assert.ok(!markup.includes(getCachedFormattedNumber(cost / 500, 0, 'suffix', 303)), id)
  }
})
