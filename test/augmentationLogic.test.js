import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  SEED_AUGMENTATION_IDS,
  createBlueprint,
  createInitialGame,
  getBaseFieldIncome,
  getBlueprintCropStats,
  getLeekAugmentationYieldBonus,
  getNextSeedAugmentationCost,
  purchaseSeedAugmentation,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

function createAugmentationGame() {
  const game = createInitialGame()

  return {
    ...game,
    completedCropPerfections: ['enrichingLeek'],
    capybara: {
      ...game.capybara,
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
    },
  }
}

test('Layered Enrichment has five doubling costs and totals +75 yield', () => {
  const costs = [1e66, 2e66, 4e66, 8e66, 1.6e67]
  let game = createAugmentationGame()

  costs.forEach((cost, level) => {
    assert.equal(
      getNextSeedAugmentationCost(
        game,
        SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
      ),
      cost,
    )

    game = purchaseSeedAugmentation(
      { ...game, crops: cost },
      SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
    )
    assert.equal(game.crops, 0)
    assert.equal(game.seedAugmentations.leekEnrichmentLevel, level + 1)
  })

  assert.equal(
    getNextSeedAugmentationCost(
      game,
      SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
    ),
    null,
  )
  assert.equal(getLeekAugmentationYieldBonus(game.seedAugmentations), 75)
})

test('Diagonal Enrichment costs 1e68 and applies Leek boosts diagonally', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['leek', null, null, 'corn'],
  })
  const baseGame = createAugmentationGame()
  const maxedState = {
    leekEnrichmentLevel: 5,
    leekDiagonalUnlocked: false,
  }

  assert.equal(
    getBaseFieldIncome(
      blueprint,
      ['enrichingLeek'],
      0,
      1,
      maxedState,
    ),
    3,
  )
  assert.equal(
    getNextSeedAugmentationCost(
      baseGame,
      SEED_AUGMENTATION_IDS.LEEK_DIAGONAL,
    ),
    1e68,
  )

  const purchased = purchaseSeedAugmentation(
    {
      ...baseGame,
      crops: 1e68,
      seedAugmentations: maxedState,
    },
    SEED_AUGMENTATION_IDS.LEEK_DIAGONAL,
  )
  assert.equal(purchased.crops, 0)
  assert.equal(purchased.seedAugmentations.leekDiagonalUnlocked, true)
  assert.equal(
    getBaseFieldIncome(
      blueprint,
      ['enrichingLeek'],
      0,
      1,
      purchased.seedAugmentations,
    ),
    83,
  )

  const cornStats = getBlueprintCropStats(
    blueprint,
    3,
    ['enrichingLeek'],
    0,
    0,
    0,
    {},
    purchased.seedAugmentations,
  )
  assert.equal(cornStats.harvestYield, 82)
  assert.deepEqual(
    cornStats.receivedEffects.find((effect) => effect.type === 'crop-yield'),
    {
      type: 'crop-yield',
      sourceCropId: 'leek',
      count: 1,
      bonus: 80,
    },
  )
})

test('Seed Augmentations require perfected Leek and persist with safe limits', () => {
  const lockedGame = createInitialGame()
  assert.equal(
    purchaseSeedAugmentation(
      { ...lockedGame, crops: 1e66 },
      SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
    ),
    null,
  )

  assert.deepEqual(normalizeGame({}).seedAugmentations, {
    leekEnrichmentLevel: 0,
    leekDiagonalUnlocked: false,
  })
  assert.deepEqual(
    normalizeGame({
      seedAugmentations: {
        leekEnrichmentLevel: 99,
        leekDiagonalUnlocked: 'yes',
      },
    }).seedAugmentations,
    {
      leekEnrichmentLevel: 5,
      leekDiagonalUnlocked: false,
    },
  )
})
