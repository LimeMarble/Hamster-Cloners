import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  FLOOR_REPLICATOR_BASE_COST,
  FLOOR_REPLICATOR_COORDINATION_GROWTH,
  FLOOR_REPLICATOR_COST_GROWTH,
  FORTUNES_WRATH_CROP_DIVISOR,
  FORTUNES_WRATH_PASSIVE_MULTIPLIER,
  GAME_AREA_IDS,
  advanceFortuneState,
  advanceGameByElapsedTime,
  createBlueprint,
  createInitialGame,
  getCapybaraDemonstrationStatus,
  getCloverBundleChancePerMinute,
  getFloorReplicatorCoordinationMultiplier,
  getFloorsProducedPerSecond,
  getFortuneModifiers,
  getMaxFloorReplicatorPurchase,
  getNextFloorReplicatorCost,
  hasCompletedCapybaraDemonstration,
  switchGameArea,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

test('Misfortune preserves separate area machinery, fields, and expansions', () => {
  const mainBlueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['leek', 'corn', null, null],
  })
  const mainGame = {
    ...createInitialGame(),
    crops: 12345,
    hamsters: 250,
    rowDuplicators: 75,
    floorReplicators: 4,
    completedBlueprintExpansions: ['firstColumn', 'firstRow'],
    rabbitBlueprintExpansions: { row: 1, column: 1 },
    blueprint: mainBlueprint,
    blueprintSlots: [mainBlueprint],
    farmland: {
      rows: 7.2,
      columns: 9.4,
      floors: 3.5,
      farms: 1,
      otherMultiplier: 1,
    },
  }
  const misfortuneGame = switchGameArea(
    mainGame,
    GAME_AREA_IDS.MISFORTUNE,
  )

  assert.equal(misfortuneGame.crops, 10)
  assert.equal(misfortuneGame.hamsters, 0)
  assert.equal(misfortuneGame.rowDuplicators, 0)
  assert.equal(misfortuneGame.floorReplicators, 4)
  assert.equal(misfortuneGame.blueprint.rows, 1)
  assert.equal(misfortuneGame.blueprint.columns, 1)
  assert.deepEqual(misfortuneGame.completedBlueprintExpansions, [])
  assert.equal(misfortuneGame.farmland.columns, 0.9)

  const developedMisfortune = {
    ...misfortuneGame,
    crops: 999,
    hamsters: 12,
    rowDuplicators: 3,
  }
  const restoredMain = switchGameArea(
    developedMisfortune,
    GAME_AREA_IDS.MAIN,
  )

  assert.equal(restoredMain.crops, 12345)
  assert.equal(restoredMain.hamsters, 250)
  assert.equal(restoredMain.rowDuplicators, 75)
  assert.equal(restoredMain.floorReplicators, 4)
  assert.equal(restoredMain.blueprint.rows, 2)
  assert.equal(restoredMain.blueprint.columns, 2)
  assert.deepEqual(restoredMain.completedBlueprintExpansions, [
    'firstColumn',
    'firstRow',
  ])

  const restoredMisfortune = switchGameArea(
    restoredMain,
    GAME_AREA_IDS.MISFORTUNE,
  )
  assert.equal(restoredMisfortune.crops, 999)
  assert.equal(restoredMisfortune.hamsters, 12)
  assert.equal(restoredMisfortune.rowDuplicators, 3)
})

test("Fortune's Wrath replaces Breezes throughout Misfortune", () => {
  const game = {
    ...createInitialGame(),
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    fortune: {
      bundles: [{ x: 50, y: 50 }],
      secondsTowardBundleRoll: 40,
      activeEffects: [{ id: 'bounty', remainingSeconds: 30 }],
      notice: null,
    },
  }
  const modifiers = getFortuneModifiers(game)

  assert.equal(
    modifiers.passiveEffectMultiplier,
    FORTUNES_WRATH_PASSIVE_MULTIPLIER,
  )
  assert.equal(
    modifiers.cropYieldMultiplier,
    1 / FORTUNES_WRATH_CROP_DIVISOR,
  )
  assert.equal(getCloverBundleChancePerMinute(game), 0)
  assert.strictEqual(advanceFortuneState(game, 60, () => 0), game)
})

test('Floor Replicators use 30% costs and shared 1.5% coordination', () => {
  assert.equal(getNextFloorReplicatorCost(0), FLOOR_REPLICATOR_BASE_COST)
  assert.equal(
    getNextFloorReplicatorCost(1),
    Math.ceil(FLOOR_REPLICATOR_BASE_COST * FLOOR_REPLICATOR_COST_GROWTH),
  )
  assert.equal(getFloorReplicatorCoordinationMultiplier(2), 1.015 ** 2)
  assert.equal(FLOOR_REPLICATOR_COORDINATION_GROWTH, 1.015)
  assert.equal(getFloorsProducedPerSecond(2), 0.2 * 1.015 ** 2)

  const game = {
    ...createInitialGame(),
    crops: FLOOR_REPLICATOR_BASE_COST * 3,
    hasUnlockedFloorReplicators: true,
    floorReplicators: 0,
  }
  const purchase = getMaxFloorReplicatorPurchase(game)
  assert.ok(purchase.purchased >= 2)

  const advanced = advanceGameByElapsedTime(
    {
      ...game,
      floorReplicators: 2,
    },
    1,
    { mode: 'active' },
  )
  assert.ok(
    Math.abs(advanced.farmland.floors - (1 + 0.2 * 1.015 ** 2)) < 1e-10,
  )
})

test('Demonstration 2 progress is saved but can only pass in Misfortune', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      ...createInitialGame().trade,
      rabbitUnlocks: ['capybaraContact'],
    },
    capybara: {
      completedDemonstrations: [
        CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
      ],
      completedSecondaryObjectives: [],
    },
    areaProgress: {
      main: null,
      misfortune: {
        crops: 1e300,
      },
    },
  }
  const status = getCapybaraDemonstrationStatus(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
  )

  assert.equal(status.hasReachedGoal, true)
  assert.equal(status.isRequiredAreaActive, false)
  assert.equal(status.canComplete, false)
})

test('save normalization preserves shared Floor Replicators and both areas', () => {
  const mainGame = {
    ...createInitialGame(),
    crops: 500,
    hamsters: 20,
    hasUnlockedFloorReplicators: true,
    floorReplicators: 6,
  }
  const misfortuneGame = {
    ...switchGameArea(mainGame, GAME_AREA_IDS.MISFORTUNE),
    crops: 700,
    hamsters: 30,
  }
  const normalized = normalizeGame(misfortuneGame)
  const restoredMain = switchGameArea(normalized, GAME_AREA_IDS.MAIN)

  assert.equal(normalized.activeArea, GAME_AREA_IDS.MISFORTUNE)
  assert.equal(normalized.crops, 700)
  assert.equal(normalized.hamsters, 30)
  assert.equal(normalized.floorReplicators, 6)
  assert.equal(restoredMain.crops, 500)
  assert.equal(restoredMain.hamsters, 20)
  assert.equal(restoredMain.floorReplicators, 6)
})

test('a completed Demonstration 2 keeps its Misfortune area progress', () => {
  const game = {
    ...createInitialGame(),
    capybara: {
      completedDemonstrations: [
        CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
      ],
      completedSecondaryObjectives: [],
    },
    areaProgress: {
      main: null,
      misfortune: {
        ...createInitialGame(),
        crops: 1e300,
        hamsters: 500,
      },
    },
  }
  const revisited = switchGameArea(game, GAME_AREA_IDS.MISFORTUNE)

  assert.equal(
    hasCompletedCapybaraDemonstration(
      revisited,
      CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
    ),
    true,
  )
  assert.equal(revisited.crops, 1e300)
  assert.equal(revisited.hamsters, 500)
})
