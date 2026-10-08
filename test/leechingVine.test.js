import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  SEED_AUGMENTATION_IDS,
  SEED_AUGMENTATIONS,
  createBlueprint,
  createInitialGame,
  getAdjacentCropEffectModifier,
  getBlueprintCropStats,
  getLeechingGourdTurnipEffect,
  getLeechingVineNourishment,
  getLeechingVineStatus,
  getLeechingVineTargetsPerType,
  getLeechingVineTurnipMultiplier,
  getNextSeedAugmentationCost,
  isSeedAugmentationVisible,
  purchaseMisfortuneUpgrade,
  purchaseSeedAugmentation,
} from '../src/game/gameLogic.js'
import {
  getCropEffectDescription,
  getCropPlacementEffectDescription,
} from '../src/game/crops.js'
import {
  exportBlueprint,
  importBlueprint,
} from '../src/game/blueprintTransfer.js'
import { exportGame, importGame } from '../src/game/storage.js'

const COMPLETED_PERFECTIONS = [
  'leechingGourd',
  'splitweed',
  'mirrorCorn',
]
const ACTIVE_AUGMENTATION = { leechingVineUnlocked: true }

function createVineBlueprint() {
  const cells = Array(49).fill(null)
  const crops = [
    [2, 'knotweed'],
    [3, 'splitweedPart'],
    [9, 'splitweedPart'],
    [10, 'splitweedPart'],
    [15, 'appleTree'],
    [16, 'leechingGourd'],
    [17, 'leechingGourdPart'],
    [18, 'corn'],
    [23, 'leechingGourdPart'],
    [24, 'leechingGourdPart'],
    [30, 'turnip'],
    [37, 'turnip'],
    [41, 'turnip'],
    [46, 'turnip'],
  ]
  crops.forEach(([index, crop]) => {
    cells[index] = crop
  })

  return createBlueprint({
    rows: 7,
    columns: 7,
    cells,
    leechingVines: [{
      path: [31, 38, 39, 40, 47],
      targetIndexes: [30, 37, 41, 46],
    }],
    requireSplitweedFootprints: true,
  })
}

function createCrowdedVineBlueprint() {
  const blueprint = createVineBlueprint()
  const cells = [...blueprint.cells]
  const extraTargets = [32, 33, 45, 48]
  extraTargets.forEach((index) => { cells[index] = 'turnip' })
  return createBlueprint({
    ...blueprint,
    cells,
    leechingVines: [{
      ...blueprint.leechingVines[0],
      targetIndexes: [...blueprint.leechingVines[0].targetIndexes, ...extraTargets],
    }],
  })
}

test('after Hunt, Nourishing Misery unlocks the Leeching Vine augmentation at its configured price', () => {
  const initialGame = {
    ...createInitialGame(),
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    crops: MISFORTUNE_UPGRADES[
      MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY
    ].cost,
    completedCropPerfections: ['leechingGourd'],
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER],
    capybara: {
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
      completedSecondaryObjectives: [],
    },
  }
  const augmentationId = SEED_AUGMENTATION_IDS.LEECHING_VINE

  assert.equal(
    MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY].cost,
    2e38,
  )
  assert.equal(SEED_AUGMENTATIONS[augmentationId].cost, 1e120)
  assert.equal(isSeedAugmentationVisible(initialGame, augmentationId), false)

  const researchedGame = purchaseMisfortuneUpgrade(
    initialGame,
    MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
  )
  assert.ok(researchedGame)
  assert.equal(isSeedAugmentationVisible(researchedGame, augmentationId), true)
  const vineCost = getNextSeedAugmentationCost(researchedGame, augmentationId)
  assert.equal(vineCost, 5e123)

  const augmentedGame = purchaseSeedAugmentation(
    { ...researchedGame, crops: vineCost },
    augmentationId,
  )
  assert.ok(augmentedGame)
  assert.equal(augmentedGame.crops, 0)
  assert.equal(augmentedGame.seedAugmentations.leechingVineUnlocked, true)
  assert.equal(getNextSeedAugmentationCost(augmentedGame, augmentationId), null)
})

test('Hunt and Nourishing Misery are both required to reveal Branchier Branches', () => {
  const augmentationId = SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER
  const augmentation = SEED_AUGMENTATIONS[augmentationId]
  const hiddenGame = {
    ...createInitialGame(),
    crops: augmentation.cost,
    completedCropPerfections: ['leechingGourd'],
    capybara: {
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
      completedSecondaryObjectives: [],
    },
  }

  assert.equal(augmentation.cost, 3e136)
  assert.equal(augmentation.name, 'Branchier Branches')
  assert.equal(augmentation.id, 'sneakyCrawler')
  assert.equal(isSeedAugmentationVisible(hiddenGame, augmentationId), false)

  const huntOnlyGame = {
    ...hiddenGame,
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    ],
  }
  assert.equal(isSeedAugmentationVisible(huntOnlyGame, augmentationId), false)
  assert.equal(purchaseSeedAugmentation(huntOnlyGame, augmentationId), null)
  const revealedGame = {
    ...huntOnlyGame,
    completedMisfortuneUpgrades: [
      ...huntOnlyGame.completedMisfortuneUpgrades,
      MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
    ],
  }
  assert.equal(isSeedAugmentationVisible(revealedGame, augmentationId), true)

  const purchased = purchaseSeedAugmentation({ ...revealedGame,
    crops: getNextSeedAugmentationCost(revealedGame, augmentationId) }, augmentationId)
  assert.ok(purchased)
  assert.equal(purchased.crops, 0)
  assert.equal(purchased.seedAugmentations.sneakyCrawlerUnlocked, true)

  const restored = importGame(exportGame(purchased))
  assert.equal(restored.seedAugmentations.sneakyCrawlerUnlocked, true)
  assert.equal(getLeechingVineTargetsPerType(restored.seedAugmentations), 3)
})

test('Branchier Branches raises targets from two to three per actual nourishment type', () => {
  const blueprint = createCrowdedVineBlueprint()
  const baseAugmentations = { leechingVineUnlocked: true }
  const crawlerAugmentations = {
    ...baseAugmentations,
    sneakyCrawlerUnlocked: true,
  }
  const baseNourishment = getLeechingVineNourishment(
    blueprint,
    COMPLETED_PERFECTIONS,
    baseAugmentations,
  )
  const crawlerNourishment = getLeechingVineNourishment(
    blueprint,
    COMPLETED_PERFECTIONS,
    crawlerAugmentations,
  )
  const baseStatus = getLeechingVineStatus(
    blueprint,
    COMPLETED_PERFECTIONS,
    baseAugmentations,
  )
  const crawlerStatus = getLeechingVineStatus(
    blueprint,
    COMPLETED_PERFECTIONS,
    crawlerAugmentations,
  )

  assert.equal(baseNourishment.variety, 3)
  assert.equal(crawlerNourishment.variety, baseNourishment.variety)
  assert.equal(baseNourishment.targetsPerType, 2)
  assert.equal(crawlerNourishment.targetsPerType, 3)
  assert.equal(baseNourishment.targetCapacity, 6)
  assert.equal(crawlerNourishment.targetCapacity, 9)
  assert.equal(crawlerNourishment.strength, baseNourishment.strength)
  assert.equal(crawlerNourishment.maximumLength, baseNourishment.maximumLength)
  assert.equal(crawlerNourishment.bonusExponent, baseNourishment.bonusExponent)
  assert.deepEqual(baseStatus.activeTargetIndexes, [30, 37, 41, 46, 32, 33])
  assert.deepEqual(crawlerStatus.activeTargetIndexes, [30, 37, 41, 46, 32, 33, 45, 48])
  assert.equal(getLeechingVineTurnipMultiplier(
    blueprint, 45, 1.5, COMPLETED_PERFECTIONS, baseAugmentations,
  ), 1)
  assert.equal(getLeechingVineTurnipMultiplier(
    blueprint, 45, 1.5, COMPLETED_PERFECTIONS, crawlerAugmentations,
  ), 1.5 ** 0.4)
})

test('repeated nourishment types do not grant extra target capacity', () => {
  const original = createCrowdedVineBlueprint()
  const cells = [...original.cells]
  cells[15] = null
  cells[18] = 'knotweed'
  const blueprint = createBlueprint({ ...original, cells })
  // Two debuff crops, but only one type after Splitweed is no longer perfected.
  const perfections = ['leechingGourd']
  for (const [owned, targetsPerType] of [[false, 2], [true, 3]]) {
    const augmentations = { ...ACTIVE_AUGMENTATION, sneakyCrawlerUnlocked: owned }
    const status = getLeechingVineStatus(blueprint, perfections, augmentations)
    assert.equal(status.nourishment.sources.length, 2)
    assert.equal(status.nourishment.variety, 1)
    assert.equal(status.nourishment.targetCapacity, targetsPerType)
    assert.equal(status.activeTargetIndexes.length, targetsPerType)
  }
})

test('Branchier Branches grants no phantom nourishment types or targets', () => {
  const original = createVineBlueprint()
  const cells = [...original.cells]
  for (const index of [2, 3, 9, 10, 15, 18]) cells[index] = null
  const blueprint = createBlueprint({ ...original, cells })
  const status = getLeechingVineStatus(blueprint, COMPLETED_PERFECTIONS, {
    ...ACTIVE_AUGMENTATION, sneakyCrawlerUnlocked: true,
  })
  assert.equal(status.nourishment.variety, 0)
  assert.equal(status.nourishment.targetCapacity, 0)
  assert.deepEqual(status.activeTargetIndexes, [])
})

test('Gourd descriptions use the current two or three targets per type', () => {
  for (const [owned, targetsPerType] of [[false, 2], [true, 3]]) {
    const augmentations = { ...ACTIVE_AUGMENTATION, sneakyCrawlerUnlocked: owned }
    const descriptions = [
      getCropEffectDescription('leechingGourd', COMPLETED_PERFECTIONS, augmentations),
      getCropPlacementEffectDescription('pumpkin', COMPLETED_PERFECTIONS, augmentations),
    ]
    for (const description of descriptions) {
      assert.match(description, new RegExp(`adds ${targetsPerType} Turnip targets`))
    }
  }
})

test('Greater Absorption raises each Splitweed from 2 to 3 nourishment strength', () => {
  const augmentationId = SEED_AUGMENTATION_IDS.GREATER_ABSORPTION
  const augmentation = SEED_AUGMENTATIONS[augmentationId]
  const blueprint = createVineBlueprint()
  const baseNourishment = getLeechingVineNourishment(
    blueprint,
    COMPLETED_PERFECTIONS,
    ACTIVE_AUGMENTATION,
  )
  const eligibleGame = {
    ...createInitialGame(),
    crops: augmentation.cost,
    completedCropPerfections: ['leechingGourd'],
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
      MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
    ],
    capybara: {
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
      completedSecondaryObjectives: [],
    },
    seedAugmentations: ACTIVE_AUGMENTATION,
  }

  assert.equal(augmentation.cost, 6e137)
  assert.equal(isSeedAugmentationVisible(eligibleGame, augmentationId), true)
  const absorptionCost = getNextSeedAugmentationCost(eligibleGame, augmentationId)
  assert.equal(absorptionCost, 3e140)
  for (const missing of [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY]) {
    const locked = { ...eligibleGame, crops: absorptionCost,
      completedMisfortuneUpgrades: eligibleGame.completedMisfortuneUpgrades.filter((id) => id !== missing) }
    assert.equal(isSeedAugmentationVisible(locked, augmentationId), false)
    assert.equal(purchaseSeedAugmentation(locked, augmentationId), null)
  }

  const purchased = purchaseSeedAugmentation({ ...eligibleGame, crops: absorptionCost }, augmentationId)
  assert.ok(purchased)
  assert.equal(purchased.crops, 0)
  assert.equal(purchased.seedAugmentations.greaterAbsorptionUnlocked, true)

  const improvedNourishment = getLeechingVineNourishment(
    blueprint,
    COMPLETED_PERFECTIONS,
    purchased.seedAugmentations,
  )
  const splitweedSource = improvedNourishment.sources.find(
    ({ cropType }) => cropType === 'splitweed',
  )

  assert.equal(splitweedSource.strength, 3)
  assert.equal(improvedNourishment.strength, baseNourishment.strength + 1)
  assert.equal(
    improvedNourishment.maximumLength,
    baseNourishment.maximumLength + 1,
  )
  assert.equal(
    improvedNourishment.bonusExponent,
    baseNourishment.bonusExponent + 0.1,
  )
  assert.equal(improvedNourishment.variety, baseNourishment.variety)

  const restored = importGame(exportGame(purchased))
  assert.equal(restored.seedAugmentations.greaterAbsorptionUnlocked, true)
})

test('vine nourishment independently controls range, targets, and exponent', () => {
  const blueprint = createVineBlueprint()
  const nourishment = getLeechingVineNourishment(
    blueprint,
    COMPLETED_PERFECTIONS,
    ACTIVE_AUGMENTATION,
  )
  const status = getLeechingVineStatus(
    blueprint,
    COMPLETED_PERFECTIONS,
    ACTIVE_AUGMENTATION,
  )

  assert.equal(nourishment.strength, 4)
  assert.equal(nourishment.variety, 3)
  assert.equal(nourishment.maximumLength, 5)
  assert.equal(nourishment.targetsPerType, 2)
  assert.equal(nourishment.targetCapacity, 6)
  assert.equal(nourishment.bonusExponent, 0.4)
  assert.deepEqual(status.activePath, [31, 38, 39, 40, 47])
  assert.deepEqual(status.eligibleTargetIndexes, [30, 37, 41, 46])
  assert.deepEqual(status.activeTargetIndexes, [30, 37, 41, 46])
})

test('the vine adds an exponent only to its selected Turnips', () => {
  const original = createVineBlueprint()
  const blueprint = createBlueprint({
    ...original,
    leechingVines: [{
      ...original.leechingVines[0],
      targetIndexes: [30, 37, 41],
    }],
  })
  const gourdMultiplier = getLeechingGourdTurnipEffect(
    blueprint,
    COMPLETED_PERFECTIONS,
    1,
    ACTIVE_AUGMENTATION,
  ).multiplier
  const selectedTurnipMultiplier = getAdjacentCropEffectModifier(
    blueprint,
    'turnip',
    'leek',
    0,
    false,
    COMPLETED_PERFECTIONS,
    1,
    ACTIVE_AUGMENTATION,
    30,
  )
  const unselectedTurnipMultiplier = getAdjacentCropEffectModifier(
    blueprint,
    'turnip',
    'leek',
    0,
    false,
    COMPLETED_PERFECTIONS,
    1,
    ACTIVE_AUGMENTATION,
    46,
  )

  assert.equal(gourdMultiplier, 1.5)
  assert.ok(
    Math.abs(selectedTurnipMultiplier - 2 * gourdMultiplier ** 1.4) < 1e-12,
  )
  assert.ok(
    Math.abs(unselectedTurnipMultiplier - 2 * gourdMultiplier) < 1e-12,
  )

  const stats = getBlueprintCropStats(
    blueprint,
    30,
    COMPLETED_PERFECTIONS,
    0,
    0,
    0,
    {},
    ACTIVE_AUGMENTATION,
  )
  assert.ok(stats.receivedEffects.some(({ type }) => type === 'leeching-vine'))
})

test('blueprint transfer preserves unlocked vines and rejects them while locked', () => {
  const blueprint = createVineBlueprint()
  const code = exportBlueprint(blueprint)
  const importOptions = {
    rows: 7,
    columns: 7,
    unlockedCropIds: ['knotweed', 'appleTree', 'corn', 'turnip'],
    hasMirrorCorn: true,
    hasLeechingGourd: true,
    hasSplitweed: true,
    completedCropPerfections: COMPLETED_PERFECTIONS,
    seedAugmentations: ACTIVE_AUGMENTATION,
  }

  assert.throws(
    () => importBlueprint(code, importOptions),
    /Unlock Leeching Vine/,
  )

  const imported = importBlueprint(code, {
    ...importOptions,
    hasLeechingVine: true,
  })
  assert.deepEqual(imported.leechingVines, blueprint.leechingVines)

  const cropped = importBlueprint(code, {
    ...importOptions,
    rows: 6,
    columns: 6,
    hasLeechingVine: true,
  })
  assert.deepEqual(cropped.leechingVines, [{
    path: [27, 33, 34, 35],
    targetIndexes: [26, 32],
  }])
})

test('game saves preserve vines in every blueprint slot', () => {
  const blueprint = createCrowdedVineBlueprint()
  const game = {
    ...createInitialGame(),
    blueprintExpansionAxesSwapped: true,
    unionized: true,
    hamsters: 125,
    hasUnlockedTurnip: true,
    hasUnlockedAppleTree: true,
    hasUnlockedKnotweed: true,
    completedCropPerfections: COMPLETED_PERFECTIONS,
    seedAugmentations: ACTIVE_AUGMENTATION,
    blueprint,
    blueprintSlots: [blueprint, blueprint],
    activeBlueprintSlot: 1,
  }
  const restored = importGame(exportGame(game, 1234))

  assert.equal(restored.activeBlueprintSlot, 1)
  assert.deepEqual(restored.blueprint.leechingVines, blueprint.leechingVines)
  assert.deepEqual(
    restored.blueprintSlots.map((slot) => slot.leechingVines),
    [blueprint.leechingVines, blueprint.leechingVines],
  )
  assert.equal(getLeechingVineStatus(
    restored.blueprint, COMPLETED_PERFECTIONS, restored.seedAugmentations,
  ).activeTargetIndexes.length, 6)
  const upgraded = importGame(exportGame({ ...game, seedAugmentations: {
    ...ACTIVE_AUGMENTATION, sneakyCrawlerUnlocked: true,
  } }))
  assert.deepEqual(upgraded.blueprint.leechingVines, blueprint.leechingVines)
  assert.equal(getLeechingVineStatus(
    upgraded.blueprint, COMPLETED_PERFECTIONS, upgraded.seedAugmentations,
  ).activeTargetIndexes.length, 8)
})

test('Root Tunnels can share tiles with a Leeching Vine path', () => {
  const blueprint = createVineBlueprint()
  const cells = [...blueprint.cells]
  cells[31] = 'rootTunnel'
  const tunnelOnVine = createBlueprint({
    ...blueprint,
    cells,
  })

  assert.equal(tunnelOnVine.cells[31], 'rootTunnel')
  assert.deepEqual(tunnelOnVine.leechingVines, blueprint.leechingVines)
  assert.deepEqual(
    getLeechingVineStatus(
      tunnelOnVine,
      COMPLETED_PERFECTIONS,
      ACTIVE_AUGMENTATION,
    ).activePath,
    blueprint.leechingVines[0].path,
  )
})
