import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
  createBlueprint,
  createInitialGame,
  getBaseFieldIncome,
  getBlueprintMonocropMultiplier,
  getBlueprintCropStats,
  getCropHamsterEfficiencyMultiplier,
  getLeekAugmentationYieldBonus,
  getMirrorCornEffectMultiplier,
  getMirrorCornMaximumReflections,
  getNextSeedAugmentationCost,
  getMonocropThresholdBonus,
  getSplitweedMonocropLimitAugmentationEffect,
  purchaseSeedAugmentation,
  toggleSeedAugmentation,
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

test('Mirror Corn augmentations use their prices and change each Corn rule', () => {
  let game = {
    ...createAugmentationGame(),
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn'],
  }
  const purchases = [
    {
      id: SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL,
      stateKey: 'mirrorCornDebuffRemovalUnlocked',
    },
    {
      id: SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT,
      stateKey: 'mirrorCornReflectionLimitUnlocked',
    },
  ]

  purchases.forEach(({ id, stateKey }) => {
    const cost = SEED_AUGMENTATIONS[id].cost
    assert.equal(getNextSeedAugmentationCost(game, id), cost)
    game = purchaseSeedAugmentation({ ...game, crops: cost }, id)
    assert.equal(game.crops, 0)
    assert.equal(game.seedAugmentations[stateKey], true)
    assert.equal(getNextSeedAugmentationCost(game, id), null)
  })

  const brighterReflection =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS]
  Array.from({ length: brighterReflection.maximumLevel }, (_, level) => {
    const cost =
      brighterReflection.baseCost * brighterReflection.costGrowth ** level

    assert.equal(
      getNextSeedAugmentationCost(
        game,
        SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS,
      ),
      cost,
    )
    game = purchaseSeedAugmentation(
      { ...game, crops: cost },
      SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS,
    )
    assert.equal(game.crops, 0)
    assert.equal(
      game.seedAugmentations.mirrorCornEffectivenessLevel,
      level + 1,
    )
  })
  assert.equal(
    getNextSeedAugmentationCost(
      game,
      SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS,
    ),
    null,
  )

  const mirrorBlueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', null, null, 'potato'],
    mirrorCornTargets: [3, null, null, null],
  })
  const cornBlueprint = createBlueprint({
    rows: 1,
    columns: 1,
    cells: ['corn'],
  })

  assert.equal(
    getMirrorCornEffectMultiplier(
      mirrorBlueprint,
      3,
      ['mirrorCorn'],
      1,
      game.seedAugmentations,
    ),
    12,
  )
  assert.equal(getMirrorCornMaximumReflections(game.seedAugmentations), 3)
  assert.equal(
    getCropHamsterEfficiencyMultiplier(
      cornBlueprint,
      ['mirrorCorn'],
      0,
      1,
      game.seedAugmentations,
    ),
    1,
  )

  const disabledGame = toggleSeedAugmentation(
    game,
    SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL,
  )
  assert.equal(
    disabledGame.seedAugmentations.mirrorCornDebuffRemovalEnabled,
    false,
  )
  assert.equal(
    getCropHamsterEfficiencyMultiplier(
      cornBlueprint,
      ['mirrorCorn'],
      0,
      1,
      disabledGame.seedAugmentations,
    ),
    0.5,
  )

  const withoutPerfectCorn = createAugmentationGame()
  assert.equal(
    purchaseSeedAugmentation(
      {
        ...withoutPerfectCorn,
        crops:
          SEED_AUGMENTATIONS[
            SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL
          ].cost,
      },
      SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL,
    ),
    null,
  )
})

test('Seed Augmentations require perfected crops and persist with safe limits', () => {
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
    mirrorCornDebuffRemovalUnlocked: false,
    mirrorCornDebuffRemovalEnabled: false,
    mirrorCornEffectivenessLevel: 0,
    mirrorCornReflectionLimitUnlocked: false,
    splitweedMonocropLimitLevel: 0,
  })
  assert.equal(
    normalizeGame({
      seedAugmentations: { mirrorCornEffectivenessUnlocked: true },
    }).seedAugmentations.mirrorCornEffectivenessLevel,
    1,
  )
  assert.equal(
    normalizeGame({
      seedAugmentations: { splitweedMonocropLimitUnlocked: true },
    }).seedAugmentations.splitweedMonocropLimitLevel,
    2,
  )
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
      mirrorCornDebuffRemovalUnlocked: false,
      mirrorCornDebuffRemovalEnabled: false,
      mirrorCornEffectivenessLevel: 0,
      mirrorCornReflectionLimitUnlocked: false,
      splitweedMonocropLimitLevel: 0,
    },
  )
})

test('Sterile Symbiosis has three levels starting at 3e97 with 50x cost growth', () => {
  const augmentationId =
    SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT
  const baseGame = createAugmentationGame()

  assert.equal(SEED_AUGMENTATIONS[augmentationId].baseCost, 3e97)
  assert.equal(SEED_AUGMENTATIONS[augmentationId].costGrowth, 50)
  assert.equal(SEED_AUGMENTATIONS[augmentationId].maximumLevel, 3)
  assert.equal(
    purchaseSeedAugmentation(
      { ...baseGame, crops: 3e97 },
      augmentationId,
    ),
    null,
  )

  let game = {
    ...baseGame,
    crops: 3e97,
    completedCropPerfections: ['splitweed'],
  }
  const expectedCosts = [3e97, 1.5e99, 7.5e100]

  expectedCosts.forEach((expectedCost, level) => {
    assert.ok(
      Math.abs(
        getNextSeedAugmentationCost(game, augmentationId) / expectedCost - 1,
      ) < 1e-12,
    )
    game = purchaseSeedAugmentation(game, augmentationId)
    assert.equal(
      game.seedAugmentations.splitweedMonocropLimitLevel,
      level + 1,
    )
    if (level < expectedCosts.length - 1) {
      game = { ...game, crops: expectedCosts[level + 1] }
    }
  })

  assert.equal(getNextSeedAugmentationCost(game, augmentationId), null)
})

test('each Sterile Symbiosis level adds one Monocrop limit per adjacent non-harvesting Crop', () => {
  const blueprint = createBlueprint({
    rows: 5,
    columns: 5,
    cells: [
      null,
      'muskGrass',
      'muskGrass',
      null,
      null,
      'rootTunnel',
      'knotweed',
      'splitweedPart',
      'leechingGourd',
      'leechingGourdPart',
      'leek',
      'splitweedPart',
      'splitweedPart',
      'leechingGourdPart',
      'leechingGourdPart',
      null,
      'muskGrass',
      'muskGrass',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    requireSplitweedFootprints: true,
  })
  const seedAugmentations = { splitweedMonocropLimitLevel: 2 }
  const effect = getSplitweedMonocropLimitAugmentationEffect(
    blueprint,
    ['splitweed'],
    seedAugmentations,
  )

  assert.deepEqual(effect, {
    adjacentNonHarvestingCropCount: 6,
    bonus: 12,
  })
  assert.equal(
    getSplitweedMonocropLimitAugmentationEffect(
      blueprint,
      ['splitweed'],
      { splitweedMonocropLimitLevel: 1 },
    ).bonus,
    6,
  )
  assert.equal(
    getSplitweedMonocropLimitAugmentationEffect(
      blueprint,
      ['splitweed'],
      { splitweedMonocropLimitLevel: 3 },
    ).bonus,
    18,
  )
  assert.equal(getMonocropThresholdBonus(blueprint, ['splitweed']), 2)
  assert.equal(
    getMonocropThresholdBonus(
      blueprint,
      ['splitweed'],
      seedAugmentations,
    ),
    14,
  )
})

test('Sterile Symbiosis threshold is used by the actual monocrop penalty', () => {
  const cells = Array(100).fill(null)
  cells.fill('leek', 0, 36)
  cells[44] = 'knotweed'
  cells[45] = 'splitweedPart'
  cells[54] = 'splitweedPart'
  cells[55] = 'splitweedPart'
  cells[34] = 'muskGrass'
  const blueprint = createBlueprint({
    rows: 10,
    columns: 10,
    cells,
    requireSplitweedFootprints: true,
  })

  assert.ok(getBlueprintMonocropMultiplier(blueprint, ['splitweed']) < 1)
  assert.equal(
    getBlueprintMonocropMultiplier(
      blueprint,
      ['splitweed'],
      { splitweedMonocropLimitLevel: 2 },
    ),
    1,
  )
})
