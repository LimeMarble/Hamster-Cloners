import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  FLOOR_REPLICATOR_BASE_COST,
  FLOOR_REPLICATOR_COORDINATION_GROWTH,
  FLOOR_REPLICATOR_COST_GROWTH,
  FLOOR_REPLICATOR_COST_TIER_SIZE,
  FORTUNES_WRATH_CROP_DIVISOR,
  FORTUNES_WRATH_CROP_EXPONENT,
  FORTUNES_WRATH_PASSIVE_MULTIPLIER,
  GAME_AREA_IDS,
  MISFORTUNE_AREA_STATE_VERSION,
  MISFORTUNE_UPGRADE_IDS,
  AREA_CROP_UNLOCK_FIELDS,
  advanceFortuneState,
  advanceGameByElapsedTime,
  createBlueprint,
  createInitialGame,
  getCapybaraDemonstrationStatus,
  getCloverBundleChancePerMinute,
  getCropProductionSnapshotPerSecond,
  getFloorReplicatorCoordinationMultiplier,
  getFloorsProducedPerSecond,
  getGameAreaCostMultiplier,
  getFortuneModifiers,
  getMaxFloorReplicatorPurchase,
  getNextFloorReplicatorCost,
  getNextHamsterCost,
  getNextRowDuplicatorCost,
  hasCompletedCapybaraDemonstration,
  purchaseMisfortuneUpgrade,
  switchGameArea,
  resetForBlueprintExpansion,
  resetForRowDuplicators,
  wipeMisfortuneAreaProgress,
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
    ...Object.fromEntries(
      AREA_CROP_UNLOCK_FIELDS.map((field) => [field, true]),
    ),
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

  assert.equal(misfortuneGame.crops, 0)
  assert.equal(misfortuneGame.hamsters, 1)
  assert.equal(misfortuneGame.rowDuplicators, 0)
  AREA_CROP_UNLOCK_FIELDS.forEach((field) => {
    assert.equal(misfortuneGame[field], false)
  })
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
    hasUnlockedTurnip: true,
  }
  const restoredMain = switchGameArea(
    developedMisfortune,
    GAME_AREA_IDS.MAIN,
  )

  assert.equal(restoredMain.crops, 12345)
  assert.equal(restoredMain.hamsters, 250)
  assert.equal(restoredMain.rowDuplicators, 75)
  AREA_CROP_UNLOCK_FIELDS.forEach((field) => {
    assert.equal(restoredMain[field], true)
  })
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
  assert.equal(restoredMisfortune.hasUnlockedTurnip, true)
  AREA_CROP_UNLOCK_FIELDS.filter(
    (field) => field !== 'hasUnlockedTurnip',
  ).forEach((field) => {
    assert.equal(restoredMisfortune[field], false)
  })
})

test('legacy Misfortune saves move shared Crop unlocks back to the main area', () => {
  const legacyMisfortuneSave = {
    ...createInitialGame(),
    areaCropUnlocksSeparated: undefined,
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    crops: 10,
    hasUnlockedTurnip: true,
    hasUnlockedAppleTree: true,
    hasUnlockedLentil: true,
    hasUnlockedKnotweed: true,
    hasUnlockedWheat: true,
    hasUnlockedSunflower: true,
    areaProgress: {
      main: {
        crops: 1e100,
        hamsters: 1800,
        rowDuplicators: 600,
        blueprint: createBlueprint({ cells: ['leek'] }),
      },
      misfortune: null,
    },
  }
  const normalized = normalizeGame(legacyMisfortuneSave)

  AREA_CROP_UNLOCK_FIELDS.forEach((field) => {
    assert.equal(normalized[field], false)
  })

  const restoredMain = switchGameArea(normalized, GAME_AREA_IDS.MAIN)
  AREA_CROP_UNLOCK_FIELDS.forEach((field) => {
    assert.equal(restoredMain[field], true)
  })
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

  assert.equal(FORTUNES_WRATH_CROP_DIVISOR, 1777)
  assert.equal(FORTUNES_WRATH_CROP_EXPONENT, 0.5)
  assert.equal(
    modifiers.passiveEffectMultiplier,
    FORTUNES_WRATH_PASSIVE_MULTIPLIER,
  )
  assert.equal(
    modifiers.cropYieldMultiplier,
    1 / FORTUNES_WRATH_CROP_DIVISOR,
  )
  assert.equal(
    modifiers.cropProductionExponent,
    FORTUNES_WRATH_CROP_EXPONENT,
  )
  assert.equal(getCloverBundleChancePerMinute(game), 0)
  assert.strictEqual(advanceFortuneState(game, 60, () => 0), game)
})

test("Fortune's Wrath applies its division before its exponent", () => {
  const blueprint = createBlueprint({ cells: ['leek'] })
  const farmland = {
    rows: 1,
    columns: 100,
    floors: 1,
    farms: 1,
    otherMultiplier: 1,
  }
  const productionBeforeWrath = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
  )
  const productionUnderWrath = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    [],
    1,
    0,
    getFortuneModifiers({ activeArea: GAME_AREA_IDS.MISFORTUNE }),
  )
  const expected = Math.sqrt(
    productionBeforeWrath.total / FORTUNES_WRATH_CROP_DIVISOR,
  )

  assert.ok(Math.abs(productionUnderWrath.total - expected) < 1e-15)
  assert.ok(
    Math.abs(productionUnderWrath.byCrop.leek - expected) < 1e-15,
  )
})

test('Unfortunate Row resets both areas and grants one blueprint Row', () => {
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
    farmland: {
      rows: 8.5,
      columns: 9.5,
      floors: 3,
      farms: 2,
      otherMultiplier: 1,
    },
    blueprint: mainBlueprint,
    blueprintSlots: [mainBlueprint],
  }
  const baseGame = {
    ...switchGameArea(mainGame, GAME_AREA_IDS.MISFORTUNE),
    crops: 250_000,
    farmland: {
      rows: 4.5,
      columns: 5.5,
      floors: 2,
      farms: 3,
      otherMultiplier: 1,
    },
  }

  assert.equal(
    purchaseMisfortuneUpgrade(
      { ...baseGame, crops: 249_999 },
      MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    ),
    null,
  )
  assert.equal(
    purchaseMisfortuneUpgrade(
      { ...baseGame, activeArea: GAME_AREA_IDS.MAIN },
      MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    ),
    null,
  )

  const upgradedGame = purchaseMisfortuneUpgrade(
    baseGame,
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
  )

  assert.ok(upgradedGame)
  assert.equal(upgradedGame.crops, 0)
  assert.equal(upgradedGame.farmland.rows, 1)
  assert.equal(upgradedGame.farmland.columns, 0.9)
  assert.equal(upgradedGame.farmland.floors, 1)
  assert.equal(upgradedGame.farmland.farms, 1)
  assert.equal(upgradedGame.blueprint.rows, 2)
  assert.equal(upgradedGame.blueprint.columns, 1)
  assert.equal(upgradedGame.areaProgress.main.crops, 0)
  assert.equal(upgradedGame.areaProgress.main.hamsters, 250)
  assert.equal(upgradedGame.areaProgress.main.rowDuplicators, 75)
  assert.equal(upgradedGame.areaProgress.main.farmland.rows, 1)
  assert.equal(upgradedGame.areaProgress.main.farmland.columns, 0.9)
  assert.equal(upgradedGame.areaProgress.main.farmland.floors, 1)
  assert.equal(upgradedGame.areaProgress.main.farmland.farms, 1)
  assert.equal(upgradedGame.areaProgress.main.blueprint.rows, 3)
  assert.equal(upgradedGame.areaProgress.main.blueprint.columns, 2)

  const blueprint = createBlueprint({ cells: ['leek'] })
  const farmland = {
    rows: 1,
    columns: 100,
    floors: 1,
    farms: 1,
    otherMultiplier: 1,
  }
  const baseWrathProduction = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    [],
    1,
    0,
    getFortuneModifiers(baseGame),
  ).total
  const unfortunateProduction = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    [],
    1,
    0,
    getFortuneModifiers(upgradedGame),
  ).total

  assert.ok(
    Math.abs(unfortunateProduction - baseWrathProduction / 4) < 1e-15,
  )

  const giftedRowCount = upgradedGame.blueprint.rows
  const expansionReset = resetForBlueprintExpansion(
    { ...upgradedGame, crops: 1e10 },
    'firstColumn',
  )
  assert.ok(expansionReset)
  assert.equal(expansionReset.blueprint.rows, giftedRowCount)
  assert.equal(expansionReset.farmland.rows, 1)

  const rowDuplicatorReset = resetForRowDuplicators({
    ...upgradedGame,
    crops: 1e30,
    hasUnlockedRowDuplicators: false,
  })
  assert.ok(rowDuplicatorReset)
  assert.equal(rowDuplicatorReset.blueprint.rows, giftedRowCount)
  assert.equal(rowDuplicatorReset.farmland.rows, 1)

  const restoredUpgrade = normalizeGame({
    ...createInitialGame(),
    blueprintExpansionAxesSwapped: true,
    blueprint: createBlueprint({ rows: 2, columns: 1 }),
    blueprintSlots: [createBlueprint({ rows: 2, columns: 1 })],
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
      'notARealUpgrade',
    ],
  })
  assert.deepEqual(restoredUpgrade.completedMisfortuneUpgrades, [
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
  ])
  assert.deepEqual(restoredUpgrade.completedBlueprintExpansions, [])
})

test('the Misfortune wipe resets only the area-specific state', () => {
  const mainGame = {
    ...createInitialGame(),
    crops: 123,
    hamsters: 50,
    floorReplicators: 7,
    areaProgress: {
      main: null,
      misfortune: {
        crops: 1e200,
        hamsters: 800,
        rowDuplicators: 90,
        hasUnlockedTurnip: true,
        blueprint: createBlueprint({
          rows: 2,
          columns: 2,
          cells: ['turnip', 'leek', null, null],
        }),
      },
    },
  }
  const wipedFromMain = wipeMisfortuneAreaProgress(mainGame)

  assert.equal(wipedFromMain.crops, 123)
  assert.equal(wipedFromMain.hamsters, 50)
  assert.equal(wipedFromMain.floorReplicators, 0)
  assert.deepEqual(wipedFromMain.completedMisfortuneUpgrades, [])
  assert.equal(wipedFromMain.areaProgress.misfortune, null)

  const activeMisfortune = {
    ...switchGameArea(mainGame, GAME_AREA_IDS.MISFORTUNE),
    crops: 250_000,
  }
  const upgradedMisfortune = purchaseMisfortuneUpgrade(
    activeMisfortune,
    MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
  )
  const wipedWhileActive = wipeMisfortuneAreaProgress(upgradedMisfortune)

  assert.equal(wipedWhileActive.activeArea, GAME_AREA_IDS.MISFORTUNE)
  assert.equal(wipedWhileActive.crops, 0)
  assert.equal(wipedWhileActive.hamsters, 1)
  assert.equal(wipedWhileActive.rowDuplicators, 0)
  assert.equal(wipedWhileActive.floorReplicators, 0)
  assert.deepEqual(wipedWhileActive.completedMisfortuneUpgrades, [])
  assert.equal(wipedWhileActive.farmland.columns, 0.9)
  assert.deepEqual(wipedWhileActive.blueprint.cells, ['leek'])
  assert.equal(wipedWhileActive.areaProgress.misfortune, null)

  const restoredMain = switchGameArea(
    wipedWhileActive,
    GAME_AREA_IDS.MAIN,
  )
  assert.equal(restoredMain.crops, 0)
  assert.equal(restoredMain.hamsters, 50)
  assert.equal(restoredMain.floorReplicators, 0)
  assert.equal(restoredMain.blueprint.rows, mainGame.blueprint.rows)
})

test('Floor Replicators use ten-purchase cost and effectiveness tiers', () => {
  const misfortuneCostMultiplier = getGameAreaCostMultiplier(
    GAME_AREA_IDS.MISFORTUNE,
  )

  assert.equal(FLOOR_REPLICATOR_BASE_COST, 0.01)
  assert.equal(FLOOR_REPLICATOR_COST_TIER_SIZE, 10)
  assert.equal(FLOOR_REPLICATOR_COST_GROWTH, 10)
  assert.equal(misfortuneCostMultiplier, 100)
  assert.equal(getNextHamsterCost(1, false, misfortuneCostMultiplier), 600)
  assert.equal(
    getNextRowDuplicatorCost(0, misfortuneCostMultiplier),
    1e14,
  )
  assert.equal(
    getNextFloorReplicatorCost(0, misfortuneCostMultiplier),
    1,
  )
  assert.equal(
    getNextFloorReplicatorCost(9, misfortuneCostMultiplier),
    1,
  )
  assert.equal(
    getNextFloorReplicatorCost(10, misfortuneCostMultiplier),
    10,
  )
  assert.equal(FLOOR_REPLICATOR_COORDINATION_GROWTH, 2)
  assert.equal(getFloorReplicatorCoordinationMultiplier(9), 1)
  assert.equal(getFloorReplicatorCoordinationMultiplier(10), 2)
  assert.equal(getFloorReplicatorCoordinationMultiplier(20), 4)
  assert.equal(getFloorsProducedPerSecond(10), 2)

  const game = {
    ...createInitialGame(),
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    crops: 10,
    hasUnlockedFloorReplicators: true,
    floorReplicators: 0,
  }
  const purchase = getMaxFloorReplicatorPurchase(game)
  assert.equal(purchase.purchased, 10)
  assert.equal(purchase.floorReplicators, 10)
  assert.equal(purchase.crops, 0)
  assert.equal(
    getMaxFloorReplicatorPurchase({
      ...game,
      activeArea: GAME_AREA_IDS.MAIN,
    }).purchased,
    0,
  )

  const advanced = advanceGameByElapsedTime(
    {
      ...game,
      floorReplicators: 10,
    },
    1,
    { mode: 'active' },
  )
  assert.ok(
    Math.abs(advanced.farmland.floors - 3) < 1e-10,
  )
})

test('the new Demonstration 2 state replaces pre-existing Misfortune progress', () => {
  const oldSave = {
    ...createInitialGame(),
    misfortuneAreaStateVersion: MISFORTUNE_AREA_STATE_VERSION - 1,
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    crops: 1e250,
    hamsters: 999,
    rowDuplicators: 300,
    floorReplicators: 12,
    blueprint: createBlueprint({
      rows: 2,
      columns: 2,
      cells: ['leek', 'corn', 'turnip', 'sunflower'],
    }),
    areaProgress: {
      main: {
        crops: 123,
        hamsters: 40,
        rowDuplicators: 5,
        blueprint: createBlueprint({ cells: ['leek'] }),
      },
      misfortune: {
        crops: 1e200,
        hamsters: 500,
        rowDuplicators: 100,
        blueprint: createBlueprint({ cells: ['leek'] }),
      },
    },
  }
  const normalized = normalizeGame(oldSave)

  assert.equal(normalized.misfortuneAreaStateVersion, MISFORTUNE_AREA_STATE_VERSION)
  assert.equal(normalized.activeArea, GAME_AREA_IDS.MISFORTUNE)
  assert.equal(normalized.crops, 0)
  assert.equal(normalized.hamsters, 1)
  assert.equal(normalized.rowDuplicators, 0)
  assert.equal(normalized.floorReplicators, 12)
  assert.deepEqual(normalized.blueprint.cells, ['leek'])
  assert.equal(normalized.areaProgress.misfortune, null)

  const restoredMain = switchGameArea(normalized, GAME_AREA_IDS.MAIN)
  assert.equal(restoredMain.crops, 123)
  assert.equal(restoredMain.hamsters, 40)
  assert.equal(restoredMain.rowDuplicators, 5)
  assert.equal(restoredMain.floorReplicators, 12)
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
