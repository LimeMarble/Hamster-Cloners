import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
  createBlueprint,
  createInitialGame,
  getLoosenedBoundariesLevel,
  getNextSeedAugmentationCost,
  getSweeterBondLevel,
  getSweetPotatoBedBaseBonus,
  getSweetPotatoBedCrowdingMultiplier,
  getSweetPotatoBuffDecayDelay,
  getSweetPotatoBedEffects,
  getSweetPotatoCrowdingBase,
  getSweetPotatoGrowthExponentCap,
  hasRestoredConnectionsAugmentation,
  isSeedAugmentationVisible,
  purchaseMisfortuneUpgrade,
  purchaseSeedAugmentation,
} from '../src/game/gameLogic.js'
import {
  CROP_PERFECTIONS,
  getCropEffectDescription,
} from '../src/game/crops.js'

function createEligibleGame(overrides = {}) {
  const game = createInitialGame()

  return {
    ...game,
    completedCropPerfections: ['sweetPotato'],
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
    ],
    capybara: {
      ...game.capybara,
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
    },
    ...overrides,
  }
}

test('Adversity-Grown Tubers costs 7e22 and unlocks only the branch', () => {
  const upgrade =
    MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS]
  const lockedGame = createEligibleGame({
    completedMisfortuneUpgrades: [],
  })

  assert.equal(upgrade.cost, 7e22)
  assert.equal(
    isSeedAugmentationVisible(
      lockedGame,
      SEED_AUGMENTATION_IDS.SWEETER_BOND,
    ),
    false,
  )

  const purchased = purchaseMisfortuneUpgrade(
    {
      ...lockedGame,
      activeArea: GAME_AREA_IDS.MISFORTUNE,
      crops: upgrade.cost,
    },
    upgrade.id,
  )

  assert.ok(purchased)
  assert.equal(purchased.crops, 0)
  assert.equal(
    isSeedAugmentationVisible(
      purchased,
      SEED_AUGMENTATION_IDS.SWEETER_BOND,
    ),
    true,
  )
  assert.deepEqual(purchased.seedAugmentations, lockedGame.seedAugmentations)
})

test('Sweeter Bond has three levels with 1000x costs and +4 cap each', () => {
  const augmentation =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SWEETER_BOND]
  const costs = Array.from(
    { length: augmentation.maximumLevel },
    (_, level) => augmentation.baseCost * augmentation.costGrowth ** level,
  )
  let game = createEligibleGame()

  assert.equal(augmentation.maximumLevel, 3)
  assert.equal(augmentation.costGrowth, 1000)
  assert.equal(augmentation.growthExponentCapBonusPerLevel, 4)

  costs.forEach((cost, level) => {
    assert.ok(Math.abs(
      getNextSeedAugmentationCost(game, augmentation.id) / cost - 1,
    ) < 1e-12)
    game = purchaseSeedAugmentation({ ...game, crops: cost }, augmentation.id)
    assert.ok(game)
    assert.equal(getSweeterBondLevel(game.seedAugmentations), level + 1)
  })

  assert.equal(getNextSeedAugmentationCost(game, augmentation.id), null)
  assert.equal(
    getSweetPotatoGrowthExponentCap(
      CROP_PERFECTIONS.sweetPotato,
      game.seedAugmentations,
    ),
    CROP_PERFECTIONS.sweetPotato.bedGrowthExponentCap + 12,
  )
})

test('Loosened Boundaries has four levels with 500x costs and +0.05 base each', () => {
  const augmentation =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES]
  const costs = [1e105, 5e107, 2.5e110, 1.25e113]
  let game = createEligibleGame()

  assert.equal(augmentation.maximumLevel, 4)
  assert.equal(augmentation.crowdingBaseBonusPerLevel, 0.05)

  costs.forEach((cost, level) => {
    assert.ok(Math.abs(
      getNextSeedAugmentationCost(game, augmentation.id) / cost - 1,
    ) < 1e-12)
    game = purchaseSeedAugmentation({ ...game, crops: cost }, augmentation.id)
    assert.ok(game)
    assert.equal(
      getLoosenedBoundariesLevel(game.seedAugmentations),
      level + 1,
    )
  })

  assert.equal(getNextSeedAugmentationCost(game, augmentation.id), null)
  assert.ok(Math.abs(
    getSweetPotatoCrowdingBase(
      CROP_PERFECTIONS.sweetPotato,
      game.seedAugmentations,
    ) - 0.7,
  ) < 1e-12)
})

test('Sweet Potato bed calculations use both augmentation levels', () => {
  const perfection = CROP_PERFECTIONS.sweetPotato
  const augmentedState = {
    sweeterBondLevel: 1,
    loosenedBoundariesLevel: 1,
  }
  const blueprint = createBlueprint({
    rows: 1,
    columns: 16,
    cells: Array(16).fill('sweetPotato'),
  })
  const [baseEffect] = getSweetPotatoBedEffects(
    blueprint,
    ['sweetPotato'],
  )
  const [augmentedEffect] = getSweetPotatoBedEffects(
    blueprint,
    ['sweetPotato'],
    1,
    augmentedState,
  )

  assert.equal(
    getSweetPotatoBedBaseBonus(perfection, 16, augmentedState),
    perfection.bedHamsterEfficiencyBonusPerCrop *
      16 * perfection.bedGrowthMultiplier ** 15,
  )
  assert.equal(augmentedEffect.baseBonus / baseEffect.baseBonus, 16)
  assert.ok(Math.abs(
    getSweetPotatoBedCrowdingMultiplier(perfection, 4, augmentedState) -
      0.55 ** 6,
  ) < 1e-12)
  const description = getCropEffectDescription(
    'sweetPotato',
    ['sweetPotato'],
    augmentedState,
  )
  assert.match(description, /min\(n − 1, 15\)/)
  assert.match(description, /×0\.55\^\(m × \(m − 1\) \/ 2\)/)
})

test('Restored Connections delays Sweet Potato buff decay by three buffs', () => {
  const augmentation =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS]
  const game = createEligibleGame()

  assert.equal(augmentation.cost, 1e109)
  assert.equal(getNextSeedAugmentationCost(game, augmentation.id), 1e109)

  const purchased = purchaseSeedAugmentation(
    { ...game, crops: augmentation.cost },
    augmentation.id,
  )

  assert.ok(purchased)
  assert.equal(
    hasRestoredConnectionsAugmentation(purchased.seedAugmentations),
    true,
  )
  assert.equal(getSweetPotatoBuffDecayDelay(purchased.seedAugmentations), 3)
  assert.equal(getNextSeedAugmentationCost(purchased, augmentation.id), null)
  assert.equal(
    getSweetPotatoBedCrowdingMultiplier(
      CROP_PERFECTIONS.sweetPotato,
      4,
      purchased.seedAugmentations,
    ),
    1,
  )
  assert.equal(
    getSweetPotatoBedCrowdingMultiplier(
      CROP_PERFECTIONS.sweetPotato,
      5,
      purchased.seedAugmentations,
    ),
    0.5,
  )

  const description = getCropEffectDescription(
    'sweetPotato',
    ['sweetPotato'],
    purchased.seedAugmentations,
  )
  assert.match(description, /m′ = max\(0, m − 3\)/)
})
