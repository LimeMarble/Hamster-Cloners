import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  CAPYBARA_DEMONSTRATIONS, MISFORTUNE_CROP_GOAL, MAJOR_PROGRESSION_GOALS,
  SEED_AUGMENTATIONS, canUnlockCropPerfection, createInitialGame,
  getCropPerfectionCost, getCropRequirement, getNextSeedAugmentationCost,
  getSeedAugmentationCost, getSharedCropProgressionCost,
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

test('shared late perfections keep the 500× factor in Misfortune, including progress targets', () => {
  const misfortune = progressionGame()
  const main = progressionGame('main')
  for (const perfection of Object.values(CROP_PERFECTIONS).filter(({ cost }) => cost != null)) {
    const expected = perfection.costCurrency === 'rabbitRelations' ? perfection.cost
      : perfection.cost * 10 * (perfection.cost >= 4e95 ? 500 : 1)
    near(getCropPerfectionCost(perfection.id, misfortune), expected)
    near(getCropPerfectionCost(perfection.id, main), expected)
  }
  near(getCropPerfectionCost('sweetPotato', misfortune), 2e99)
  near(getCropPerfectionCost('samplingLentil', misfortune), 5e126)
  for (const id of ['sweetPotato', 'samplingLentil']) {
    const goal = MAJOR_PROGRESSION_GOALS.find((goal) => goal.id === `perfection-${id}`)
    assert.equal(goal.getTarget(misfortune), getCropPerfectionCost(id, misfortune))
  }
})

test('shared augmentations keep the factor through level growth and static cost labels', () => {
  for (const [id, field] of [['sweeterBond', 'sweeterBondLevel'],
    ['loosenedBoundaries', 'loosenedBoundariesLevel'],
    ['splitweedMonocropLimit', 'splitweedMonocropLimitLevel']]) {
    const definition = SEED_AUGMENTATIONS[id]
    for (let level = 0; level < definition.maximumLevel; level += 1) {
      const game = progressionGame('misfortune', { seedAugmentations: { [field]: level } })
      const expected = definition.baseCost * definition.costGrowth ** level * 10 * 500
      near(getNextSeedAugmentationCost(game, id), expected)
      near(getNextSeedAugmentationCost({ ...game, activeArea: 'main' }, id), expected)
      near(getSeedAugmentationCost(game, id), definition.baseCost * 10 * 500)
    }
    assert.equal(getNextSeedAugmentationCost(progressionGame('misfortune', {
      seedAugmentations: { [field]: definition.maximumLevel },
    }), id), null)
  }
  for (const id of ['restoredConnections', 'leechingVine', 'sneakyCrawler', 'greaterAbsorption']) {
    near(getNextSeedAugmentationCost(progressionGame(), id), SEED_AUGMENTATIONS[id].cost * 10 * 500)
  }
})

test('Misfortune-only requirements, Rich Soil, earlier prices and relation prices stay unchanged', () => {
  const game = progressionGame()
  assert.equal(getSharedCropProgressionCost(game, null), null)
  near(getSharedCropProgressionCost(game, 1e90), 1e91)
  near(getCropRequirement(game, 1e150), 1e151)
  near(CAPYBARA_DEMONSTRATIONS[2].target, MISFORTUNE_CROP_GOAL * 10)
  near(getSeedAugmentationCost(game, 'richSoil'), SEED_AUGMENTATIONS.richSoil.cost * 10)
  near(getNextSeedAugmentationCost(game, 'leekDiagonal'), 1e69)
  assert.equal(getCropPerfectionCost('blazingCarrot', game), CROP_PERFECTIONS.blazingCarrot.cost)
  // Keep the existing area-specific ×10/×100 progression factors; only the
  // missing shared ×500 balancing factor is corrected.
  const completed = { ...game, capybara: { completedDemonstrations: ['misfortuneTrial'] } }
  near(getCropPerfectionCost('sweetPotato', completed), 2e99)
  near(getCropPerfectionCost('sweetPotato', { ...completed, activeArea: 'main' }), 2e100)
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

let server, CropPerfectionPurchase, SweetPotatoAugmentations
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ CropPerfectionPurchase } = await server.ssrLoadModule('/src/tabs/CropPerfectionPurchase.jsx'))
  ;({ SweetPotatoAugmentations } = await server.ssrLoadModule('/src/tabs/SweetPotatoAugmentations.jsx'))
  const numberFormat = await server.ssrLoadModule('/src/game/numberFormat.js')
  numberFormat.setActiveNumberNotation('suffix', 303)
})
after(async () => { setActiveNumberNotation('suffix', 303); await server?.close() })

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
