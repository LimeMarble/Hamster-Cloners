import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInitialGame,
  createBlueprint,
  CAPYBARA_DEMONSTRATIONS,
  FORTUNE_EFFECT_IDS,
  CLOVER_ASSEMBLY_PART_REQUIREMENT,
  getNextMajorProgressionGoal,
  MAJOR_PROGRESSION_GOALS,
  MISFORTUNE_UPGRADE_IDS,
} from '../src/game/gameLogic.js'
import { CROP_PERFECTION_IDS } from '../src/game/crops.js'

test('major progression goals contain crop unlocks, milestones, and perfections in order', () => {
  assert.deepEqual(
    MAJOR_PROGRESSION_GOALS.map((goal) => goal.id),
    [
      'inventions',
      'crop-corn',
      'misfortune-upgrade-unfortunateRow',
      'misfortune-upgrade-rushedStart',
      'crop-pumpkin',
      'crop-potato',
      'crop-turnip',
      'crop-perfection',
      'crop-peanuts',
      'misfortune-upgrade-oilyTreats',
      'perfection-enrichingLeek',
      'perfection-mirrorCorn',
      'crop-apple-tree',
      'crop-lentil',
      'crop-knotweed',
      'misfortune-upgrade-adversityGrownTubers',
      'perfection-leechingGourd',
      'misfortune-upgrade-burdenedFoundations',
      'row-duplicators',
      'crop-wheat',
      'misfortune-upgrade-huntForSomethingGreater',
      'misfortune-upgrade-nourishingMisery',
      'perfection-splitweed',
      'crop-sunflower',
      'misfortune-upgrade-fortunateColumn',
      'crop-canola',
      'trade-relations',
      'crop-carrot',
      'crop-four-leaf-clover',
      'capybara-contact',
      'capybara-demonstration-introduction',
      'capybara-demonstration-one',
      'perfection-sweetPotato',
      'crop-soybean',
      'misfortune-upgrade-finalSupport',
      'augmentation-leek-orthogonal-squared',
      'perfection-five-leaf-clover',
      'misfortune-upgrade-notSoFinalSupport',
      'augmentation-rich-soil',
      'perfection-samplingLentil',
      'perfection-blazingCarrot',
      'capybara-demonstration-two',
      'capybara-demonstration-three',
    ],
  )
})

test('major progression advances to the earliest unfinished goal', () => {
  let game = createInitialGame()

  assert.equal(getNextMajorProgressionGoal(game).id, 'inventions')

  game = {
    ...game,
    totalHamstersHired: 50,
  }
  assert.equal(getNextMajorProgressionGoal(game).id, 'crop-corn')

  game = {
    ...game,
    completedBlueprintExpansions: ['firstColumn'],
    blueprint: {
      ...game.blueprint,
      columns: 2,
      cells: ['leek', null],
      mirrorCornTargets: [null, null],
    },
  }
  assert.equal(getNextMajorProgressionGoal(game).id, 'crop-pumpkin')

  game = {
    ...game,
    unionized: true,
    totalHamstersHired: 1000,
    hamsters: 100,
  }
  const potatoGoal = getNextMajorProgressionGoal(game)
  assert.equal(potatoGoal.id, 'crop-potato')
  assert.equal(potatoGoal.unit, 'Hamsters')
  assert.equal(potatoGoal.progress, 0.8)

  game = {
    ...game,
    hamsters: 125,
    hasUnlockedTurnip: true,
    hasUnlockedCropPerfection: true,
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn'],
    hasUnlockedAppleTree: true,
    hasUnlockedLentil: true,
    hasUnlockedKnotweed: true,
    crops: 2e19,
  }
  const gourdGoal = getNextMajorProgressionGoal(game)
  assert.equal(gourdGoal.id, 'perfection-leechingGourd')
  assert.equal(gourdGoal.isReady, true)

  game = {
    ...game,
    completedCropPerfections: [
      'enrichingLeek',
      'mirrorCorn',
      'leechingGourd',
    ],
    hasUnlockedRowDuplicators: true,
    crops: 1.25e32,
  }
  const wheatGoal = getNextMajorProgressionGoal(game)
  assert.equal(wheatGoal.id, 'crop-wheat')
  assert.equal(wheatGoal.isReady, false)
  assert.equal(wheatGoal.progress, 1)

  game = {
    ...game,
    hasUnlockedWheat: true,
    crops: 6e38,
  }
  const splitweedGoal = getNextMajorProgressionGoal(game)
  assert.equal(splitweedGoal.id, 'perfection-splitweed')
  assert.equal(splitweedGoal.isReady, true)

  game = {
    ...game,
    completedCropPerfections: CROP_PERFECTION_IDS,
    hasUnlockedSunflower: true,
    rowDuplicators: 499,
  }
  const canolaGoal = getNextMajorProgressionGoal(game)
  assert.equal(canolaGoal.id, 'crop-canola')
  assert.equal(canolaGoal.current, 499)
  assert.equal(canolaGoal.target, 500)
  assert.equal(canolaGoal.unit, 'Row Duplicators')

  game = {
    ...game,
    rowDuplicators: 500,
  }
  const tradeGoal = getNextMajorProgressionGoal(game)
  assert.equal(tradeGoal.id, 'trade-relations')
  assert.equal(tradeGoal.target, 1e57)
  assert.equal(tradeGoal.isReady, false)

  game = {
    ...game,
    crops: 1e57,
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: { ...game.trade, established: true },
  }
  const carrotGoal = getNextMajorProgressionGoal(game)
  assert.equal(carrotGoal.id, 'crop-carrot')
  assert.equal(carrotGoal.isReady, false)

  game = {
    ...game,
    trade: { ...game.trade, rabbitRelations: 500 },
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: { ...game.trade, rabbitUnlocks: ['carrot'] },
  }
  const cloverGoal = getNextMajorProgressionGoal(game)
  assert.equal(cloverGoal.id, 'crop-four-leaf-clover')

  game = {
    ...game,
    trade: { ...game.trade, rabbitRelations: 27777 },
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: {
      ...game.trade,
      rabbitUnlocks: ['carrot', 'fourLeafClover', 'capybaraContact'],
    },
    capybara: { completedDemonstrations: ['introduction', 'demonstrationOne'] },
    areaProgress: { ...game.areaProgress, misfortune: { rowDuplicators: 500 } },
  }
  const soybeanGoal = getNextMajorProgressionGoal(game)
  assert.equal(soybeanGoal.id, 'crop-soybean')
  assert.equal(soybeanGoal.target, 555)
  assert.equal(soybeanGoal.unit, 'Floor Replicators')

  game = {
    ...game,
    floorReplicators: 555,
    areaProgress: {
      ...game.areaProgress,
      misfortune: { rowDuplicators: 500 },
    },
  }
  const fiveLeafCloverGoal = getNextMajorProgressionGoal(game)
  assert.equal(fiveLeafCloverGoal.id, 'perfection-five-leaf-clover')
  assert.equal(
    fiveLeafCloverGoal.progressLabel,
    'Unlock prerequisites to reveal...',
  )
  assert.equal(fiveLeafCloverGoal.progress, 0)
  assert.equal(fiveLeafCloverGoal.isReady, false)

  game = {
    ...game,
    hasUnlockedGreaterBlueprinting: true,
    trade: {
      ...game.trade,
      rabbitUnlocks: [
        ...game.trade.rabbitUnlocks,
        'rabbitsCharm',
      ],
    },
    cloverAssembly: { progress: CLOVER_ASSEMBLY_PART_REQUIREMENT / 2, assembled: false },
  }
  const revealedFiveLeafCloverGoal = getNextMajorProgressionGoal(game, {
    cloverAssemblyProductionPerSecond: 1.25e55,
  })
  assert.equal(
    revealedFiveLeafCloverGoal.id,
    'perfection-five-leaf-clover',
  )
  assert.equal(revealedFiveLeafCloverGoal.progressLabel, null)
  assert.equal(revealedFiveLeafCloverGoal.progress, 0.5)
  assert.equal(revealedFiveLeafCloverGoal.progressPerSecond, 1.25e55)

  game = {
    ...game,
    cloverAssembly: { progress: 7.77e58, assembled: true },
    capybara: { completedDemonstrations: [] },
    trade: { ...game.trade, rabbitUnlocks: ['carrot', 'fourLeafClover'] },
  }
  const capybaraGoal = getNextMajorProgressionGoal(game)
  assert.equal(capybaraGoal.id, 'capybara-contact')

  game = {
    ...game,
    trade: { ...game.trade, rabbitRelations: 40000 },
  }
  assert.equal(getNextMajorProgressionGoal(game).isReady, true)

  game = {
    ...game,
    trade: {
      ...game.trade,
      rabbitUnlocks: ['carrot', 'fourLeafClover', 'capybaraContact'],
    },
  }
  const demonstrationGoal = getNextMajorProgressionGoal(game)
  assert.equal(
    demonstrationGoal.id,
    'capybara-demonstration-introduction',
  )
  assert.equal(demonstrationGoal.target, 2e13)

  game = {
    ...game,
    capybara: { completedDemonstrations: ['introduction'] },
  }
  const secondDemonstrationGoal = getNextMajorProgressionGoal(game)
  assert.equal(secondDemonstrationGoal.id, 'capybara-demonstration-one')
  assert.equal(secondDemonstrationGoal.target, 2.5e20)
  assert.equal(secondDemonstrationGoal.displayProgressAsDash, false)
  assert.match(secondDemonstrationGoal.description, /No Breeze of Fortune effects may be active/)
  assert.ok(secondDemonstrationGoal.description.includes(CAPYBARA_DEMONSTRATIONS[1].hint))
  assert.doesNotMatch(secondDemonstrationGoal.description, /without a planted|no planted/i)

  const cloverPlantedGame = {
    ...game,
    blueprint: createBlueprint({ rows: 1, columns: 2, cells: ['leek', 'fourLeafClover'] }),
  }
  const cloverPlantedGoal = getNextMajorProgressionGoal(cloverPlantedGame)
  assert.equal(cloverPlantedGoal.id, 'capybara-demonstration-one')
  assert.ok(cloverPlantedGoal.current > 0)
  assert.ok(cloverPlantedGoal.progress > 0)
  assert.equal(cloverPlantedGoal.displayProgressAsDash, false)

  const breezeActiveGame = {
    ...cloverPlantedGame,
    fortune: { ...game.fortune, activeEffects: [{ id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 10 }] },
  }
  const breezeActiveGoal = getNextMajorProgressionGoal(breezeActiveGame)
  assert.equal(breezeActiveGoal.id, 'capybara-demonstration-one')
  assert.equal(breezeActiveGoal.current, 0)
  assert.equal(breezeActiveGoal.progress, 0)
  assert.equal(breezeActiveGoal.isReady, false)
  assert.equal(breezeActiveGoal.displayProgressAsDash, true)

  const expiredBreezeGoal = getNextMajorProgressionGoal({
    ...breezeActiveGame,
    fortune: { ...game.fortune, activeEffects: [{ id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 0 }] },
  })
  assert.equal(expiredBreezeGoal.displayProgressAsDash, false)
  assert.ok(expiredBreezeGoal.current > 0)

  game = {
    ...game,
    capybara: {
      completedDemonstrations: ['introduction', 'demonstrationOne'],
    },
  }
  const thirdDemonstrationGoal = getNextMajorProgressionGoal(game)
  assert.equal(thirdDemonstrationGoal.id, 'capybara-demonstration-two')
  assert.equal(thirdDemonstrationGoal.current, 0)
  assert.equal(thirdDemonstrationGoal.target, 1e301)

  game = {
    ...game,
    capybara: {
      completedDemonstrations: [
        'introduction',
        'demonstrationOne',
        'misfortuneTrial',
      ],
    },
  }
  const fourthDemonstrationGoal = getNextMajorProgressionGoal(game)
  assert.equal(fourthDemonstrationGoal.id, 'capybara-demonstration-three')
  assert.equal(fourthDemonstrationGoal.current, 0)
  assert.equal(fourthDemonstrationGoal.target, 3)

  game = {
    ...game,
    capybara: {
      completedDemonstrations: [
        'introduction',
        'demonstrationOne',
        'misfortuneTrial',
        'demonstrationTwo',
      ],
    },
  }
  const completedGoal = getNextMajorProgressionGoal(game)
  assert.equal(completedGoal.id, 'all-current-goals-complete')
  assert.equal(completedGoal.progress, 1)
  assert.equal(completedGoal.isComplete, true)
})

test('action goals show ready only after their cost is affordable', () => {
  const cornGame = {
    ...createInitialGame(),
    totalHamstersHired: 50,
    crops: 1e4,
  }
  const baseGame = {
    ...createInitialGame(),
    totalHamstersHired: 1000,
    unionized: true,
    hamsters: 125,
    completedBlueprintExpansions: ['firstColumn'],
    hasUnlockedTurnip: true,
    hasUnlockedCropPerfection: true,
  }
  assert.equal(getNextMajorProgressionGoal(cornGame).isReady, true)

  const waitingGoal = getNextMajorProgressionGoal({
    ...baseGame,
    crops: 2e10 - 1,
  })
  const readyGoal = getNextMajorProgressionGoal({
    ...baseGame,
    crops: 2e10,
  })

  assert.equal(waitingGoal.id, 'perfection-enrichingLeek')
  assert.equal(waitingGoal.isReady, false)
  assert.equal(readyGoal.id, 'perfection-enrichingLeek')
  assert.equal(readyGoal.isReady, true)
})

test('Misfortune progress includes every permanent Misfortune upgrade', () => {
  const upgradeOrder = [
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    MISFORTUNE_UPGRADE_IDS.RUSHED_START,
    MISFORTUNE_UPGRADE_IDS.OILY_TREATS,
    MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
    MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
    MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
    MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT,
  ]
  let game = {
    ...createInitialGame(),
    activeArea: 'misfortune',
    earnedAchievementIds: ['makingPeanuts'],
    crops: 1e200,
    totalHamstersHired: 1000,
    unionized: true,
    hamsters: 125,
    completedBlueprintExpansions: ['firstColumn'],
    hasUnlockedTurnip: true,
    hasUnlockedCropPerfection: true,
    completedCropPerfections: CROP_PERFECTION_IDS,
    hasUnlockedAppleTree: true,
    hasUnlockedLentil: true,
    hasUnlockedKnotweed: true,
    hasUnlockedRowDuplicators: true,
    hasUnlockedWheat: true,
    hasUnlockedSunflower: true,
    rowDuplicators: 500,
    floorReplicators: 555,
    trade: {
      established: true,
      rabbitRelations: 1e30,
      rabbitUnlocks: ['carrot', 'fourLeafClover', 'capybaraContact'],
    },
    capybara: { completedDemonstrations: ['introduction', 'demonstrationOne'] },
  }

  for (const upgradeId of upgradeOrder) {
    if (upgradeId === MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT) {
      assert.equal(getNextMajorProgressionGoal(game).id, 'augmentation-leek-orthogonal-squared')
      game = { ...game, seedAugmentations: { ...game.seedAugmentations, leekOrthogonalSquaredUnlocked: true } }
      assert.equal(getNextMajorProgressionGoal(game).id, 'perfection-five-leaf-clover')
      game = { ...game, cloverAssembly: { progress: 7.77e58, assembled: true } }
    }
    const goal = getNextMajorProgressionGoal(game)
    assert.equal(goal.id, 'misfortune-upgrade-' + upgradeId)
    assert.equal(goal.category, 'Misfortune upgrade')
    assert.equal(goal.unit, 'Misfortune Crops')

    game = {
      ...game,
      completedMisfortuneUpgrades: [
        ...game.completedMisfortuneUpgrades,
        upgradeId,
      ],
    }
  }

  assert.equal(
    getNextMajorProgressionGoal(game).id,
    'augmentation-rich-soil',
  )
})
