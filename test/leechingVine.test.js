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
  getNextSeedAugmentationCost,
  isSeedAugmentationVisible,
  purchaseMisfortuneUpgrade,
  purchaseSeedAugmentation,
} from '../src/game/gameLogic.js'
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

test('Nourishing Misery unlocks the 1e120 Leeching Vine augmentation', () => {
  const initialGame = {
    ...createInitialGame(),
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    crops: MISFORTUNE_UPGRADES[
      MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY
    ].cost,
    completedCropPerfections: ['leechingGourd'],
    capybara: {
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
      completedSecondaryObjectives: [],
    },
  }
  const augmentationId = SEED_AUGMENTATION_IDS.LEECHING_VINE

  assert.equal(
    MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY].cost,
    2e37,
  )
  assert.equal(SEED_AUGMENTATIONS[augmentationId].cost, 1e120)
  assert.equal(isSeedAugmentationVisible(initialGame, augmentationId), false)

  const researchedGame = purchaseMisfortuneUpgrade(
    initialGame,
    MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
  )
  assert.ok(researchedGame)
  assert.equal(isSeedAugmentationVisible(researchedGame, augmentationId), true)
  assert.equal(getNextSeedAugmentationCost(researchedGame, augmentationId), 1e120)

  const augmentedGame = purchaseSeedAugmentation(
    { ...researchedGame, crops: 1e120 },
    augmentationId,
  )
  assert.ok(augmentedGame)
  assert.equal(augmentedGame.crops, 0)
  assert.equal(augmentedGame.seedAugmentations.leechingVineUnlocked, true)
  assert.equal(getNextSeedAugmentationCost(augmentedGame, augmentationId), null)
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
  assert.equal(nourishment.targetCapacity, 3)
  assert.equal(nourishment.bonusExponent, 0.4)
  assert.deepEqual(status.activePath, [31, 38, 39, 40, 47])
  assert.deepEqual(status.eligibleTargetIndexes, [30, 37, 41, 46])
  assert.deepEqual(status.activeTargetIndexes, [30, 37, 41])
})

test('the vine adds an exponent only to its selected Turnips', () => {
  const blueprint = createVineBlueprint()
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
  const blueprint = createVineBlueprint()
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
