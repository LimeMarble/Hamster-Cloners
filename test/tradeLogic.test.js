import assert from 'node:assert/strict'
import test from 'node:test'
import {
  RABBIT_ACTIVE_CONTRACT_COUNT,
  RABBIT_BLAZING_CONTRACT_RATE,
  RABBIT_BLAZING_PACE_SWITCH_SECONDS,
  RABBIT_BULK_CONTRACT_RATE,
  RABBIT_CONTRACT_AVERAGE_FACTOR,
  RABBIT_UNLOCKS,
  RABBIT_UNLOCK_IDS,
  TRADE_ESTABLISHMENT_COST,
  advanceRabbitContract,
  advanceRabbitContractPaceState,
  claimRabbitContract,
  createBlueprint,
  createInitialGame,
  createRabbitContract,
  establishTradeRelations,
  getCarrotHighHarvestEffect,
  getCropProductionSnapshotPerSecond,
  getRabbitContractCompletionsPerSecond,
  getRabbitContractRelationsReward,
  getRabbitRelationsMultiplier,
  hasRabbitUnlock,
  isRabbitContractCropEligible,
  purchaseRabbitUnlock,
} from '../src/game/gameLogic.js'

test('Rabbit relation rewards match the logarithmic fields formula', () => {
  assert.equal(getRabbitContractRelationsReward(1e40, 30e6), 120)
  assert.equal(getRabbitContractRelationsReward(1e20, 10e6), 20)
  assert.equal(getRabbitContractRelationsReward(1e20, 50e6), 100)
})

test('Rabbit pace uses the slowest grown crop and five-second hysteresis', () => {
  const initialGame = createInitialGame()
  const game = {
    ...initialGame,
    trade: {
      ...initialGame.trade,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR],
    },
  }
  const exactThresholdProduction = { leek: 1.5e8, corn: 1e30 }
  const blazingProduction = { leek: 1.53e8, corn: 1e30 }
  const underThresholdProduction = { leek: 1.47e8, corn: 1e30 }

  assert.equal(RABBIT_CONTRACT_AVERAGE_FACTOR, 3e7)
  assert.equal(RABBIT_BLAZING_PACE_SWITCH_SECONDS, 5)
  assert.equal(
    getRabbitContractCompletionsPerSecond(game, exactThresholdProduction),
    RABBIT_BLAZING_CONTRACT_RATE,
  )

  let paceState = advanceRabbitContractPaceState(game, blazingProduction, 4)
  assert.deepEqual(paceState, {
    rabbitContractsBlazing: false,
    rabbitContractPaceTransitionSeconds: 4,
    rabbitContractPaceSampleSeconds: 0,
    rabbitContractEstimatedCompletionsPerSecond: 5.1,
  })

  paceState = advanceRabbitContractPaceState(
    { ...game, trade: { ...game.trade, ...paceState } },
    blazingProduction,
    1,
  )
  assert.deepEqual(paceState, {
    rabbitContractsBlazing: true,
    rabbitContractPaceTransitionSeconds: 0,
    rabbitContractPaceSampleSeconds: 0,
    rabbitContractEstimatedCompletionsPerSecond: 5.1,
  })

  const exactThresholdState = advanceRabbitContractPaceState(
    { ...game, trade: { ...game.trade, ...paceState } },
    exactThresholdProduction,
    10,
  )
  assert.deepEqual(exactThresholdState, {
    rabbitContractsBlazing: true,
    rabbitContractPaceTransitionSeconds: 0,
    rabbitContractPaceSampleSeconds: 0,
    rabbitContractEstimatedCompletionsPerSecond: 5,
  })

  paceState = advanceRabbitContractPaceState(
    { ...game, trade: { ...game.trade, ...paceState } },
    underThresholdProduction,
    4,
  )
  assert.deepEqual(paceState, {
    rabbitContractsBlazing: true,
    rabbitContractPaceTransitionSeconds: 4,
    rabbitContractPaceSampleSeconds: 0,
    rabbitContractEstimatedCompletionsPerSecond: 4.9,
  })

  paceState = advanceRabbitContractPaceState(
    { ...game, trade: { ...game.trade, ...paceState } },
    underThresholdProduction,
    1,
  )
  assert.deepEqual(paceState, {
    rabbitContractsBlazing: false,
    rabbitContractPaceTransitionSeconds: 0,
    rabbitContractPaceSampleSeconds: 0,
    rabbitContractEstimatedCompletionsPerSecond: 4.9,
  })

  assert.deepEqual(
    advanceRabbitContractPaceState(initialGame, blazingProduction, 10),
    {
      rabbitContractsBlazing: false,
      rabbitContractPaceTransitionSeconds: 0,
      rabbitContractPaceSampleSeconds: 0.1,
      rabbitContractEstimatedCompletionsPerSecond: 0,
    },
  )
})

test('Rabbit pace estimates are sampled at 10 Hz instead of every simulation tick', () => {
  const initialGame = createInitialGame()
  const game = {
    ...initialGame,
    trade: {
      ...initialGame.trade,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR],
      rabbitContractPaceSampleSeconds: 0,
      rabbitContractEstimatedCompletionsPerSecond: 0,
    },
  }
  const production = { leek: 1.53e8 }
  const first = advanceRabbitContractPaceState(game, production, 0.04)
  const second = advanceRabbitContractPaceState(
    { ...game, trade: { ...game.trade, ...first } },
    production,
    0.04,
  )
  const sampled = advanceRabbitContractPaceState(
    { ...game, trade: { ...game.trade, ...second } },
    production,
    0.02,
  )

  assert.equal(first.rabbitContractEstimatedCompletionsPerSecond, 0)
  assert.equal(second.rabbitContractEstimatedCompletionsPerSecond, 0)
  assert.equal(sampled.rabbitContractEstimatedCompletionsPerSecond, 5.1)
  assert.equal(sampled.rabbitContractPaceTransitionSeconds, 0.02)
  assert.equal(sampled.rabbitContractPaceSampleSeconds, 0)
})
test('Rabbit contracts scale from Fields planted and choose a 10M-50M factor', () => {
  const game = {
    ...createInitialGame(),
    farmland: {
      rows: 1,
      columns: 1e40,
      floors: 1,
      farms: 1,
      otherMultiplier: 1,
    },
  }
  const randomValues = [0.5, 0]
  const contract = createRabbitContract(game, () => randomValues.shift())

  assert.equal(contract.cropId, 'leek')
  assert.equal(contract.factor, 30e6)
  assert.equal(contract.fieldsPlanted, 1e40)
  assert.equal(contract.requiredAmount, 3e47)
  assert.equal(contract.relationsReward, 120)
})

test('Rabbit contracts exclude apples, pumpkins, weeds, and crops without a harvest', () => {
  assert.equal(isRabbitContractCropEligible('leek'), true)
  assert.equal(isRabbitContractCropEligible('appleTree'), false)
  assert.equal(isRabbitContractCropEligible('pumpkin'), false)
  assert.equal(isRabbitContractCropEligible('knotweed'), false)
  assert.equal(isRabbitContractCropEligible('leechingGourd'), false)
  assert.equal(isRabbitContractCropEligible('rootTunnel'), false)
  assert.equal(isRabbitContractCropEligible('fourLeafClover'), false)
})

test('establishing Trade spends Crops without resetting existing progress and creates three contracts', () => {
  const game = {
    ...createInitialGame(),
    crops: TRADE_ESTABLISHMENT_COST * 2,
    hamsters: 321,
    rowDuplicators: 45,
  }
  const establishedGame = establishTradeRelations(game, () => 0)

  assert.equal(establishedGame.crops, TRADE_ESTABLISHMENT_COST)
  assert.equal(establishedGame.hamsters, 321)
  assert.equal(establishedGame.rowDuplicators, 45)
  assert.equal(establishedGame.trade.established, true)
  assert.equal(establishedGame.trade.rabbitContracts.length, RABBIT_ACTIVE_CONTRACT_COUNT)
  assert.ok(establishedGame.trade.rabbitContracts.every((contract) => contract.cropId === 'leek'))
})

test('crop-specific production advances and completes one selected Rabbit contract', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      established: true,
      rabbitRelations: 7,
      rabbitContractsCompleted: 0,
      rabbitUnlocks: [],
      rabbitContracts: [
        {
          cropId: 'leek',
          factor: 1e7,
          fieldsPlanted: 1,
          requiredAmount: 10,
          progress: 4,
          relationsReward: 3,
        },
        null,
        null,
      ],
    },
  }
  const advancedTrade = advanceRabbitContract(game, { leek: 20, corn: 1e9 })
  const completedGame = { ...game, trade: advancedTrade }
  const claimedGame = claimRabbitContract(completedGame, 0, () => 0)

  assert.equal(advancedTrade.rabbitContracts[0].progress, 10)
  assert.equal(claimedGame.trade.rabbitRelations, 10)
  assert.equal(claimedGame.trade.rabbitContractsCompleted, 1)
  assert.equal(claimedGame.trade.rabbitContracts[0].progress, 0)
  assert.equal(claimedGame.trade.rabbitContracts.length, RABBIT_ACTIVE_CONTRACT_COUNT)
})

test('Rabbit contracts can consume cached per-second production rates', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      established: true,
      rabbitRelations: 0,
      rabbitContractsCompleted: 0,
      rabbitUnlocks: [],
      rabbitContracts: [
        {
          cropId: 'leek',
          factor: 1e7,
          fieldsPlanted: 1,
          requiredAmount: 20,
          progress: 4,
          relationsReward: 3,
        },
        null,
        null,
      ],
    },
  }
  const advancedTrade = advanceRabbitContract(
    game,
    { leek: 12 },
    Math.random,
    0.5,
    true,
  )

  assert.equal(advancedTrade.rabbitContracts[0].progress, 10)
})

test('Carrot Rabbit relation bonus stays active alongside Apple Saplings', () => {
  const carrotBlueprint = createBlueprint({
    rows: 1,
    columns: 1,
    cells: ['carrot'],
  })
  const appleBlueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['carrot', 'appleTree'],
  })

  assert.equal(getRabbitRelationsMultiplier(carrotBlueprint), 1.04)
  assert.equal(getRabbitRelationsMultiplier(carrotBlueprint), 1.04)
  assert.equal(getRabbitRelationsMultiplier(appleBlueprint), 1.04)
})

test('Carrot boosts claimed relations alongside Apple Saplings', () => {
  const carrotBlueprint = createBlueprint({
    rows: 1,
    columns: 1,
    cells: ['carrot'],
  })
  const carrotGame = {
    ...createInitialGame(),
    blueprint: carrotBlueprint,
    trade: {
      established: true,
      rabbitRelations: 0,
      rabbitContractsCompleted: 0,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CARROT],
      rabbitContracts: [
        {
          cropId: 'leek',
          factor: 1e7,
          fieldsPlanted: 1,
          requiredAmount: 1,
          progress: 1,
          relationsReward: 100,
        },
        null,
        null,
      ],
    },
  }
  const boostedClaim = claimRabbitContract(carrotGame, 0, () => 0)
  const appleClaim = claimRabbitContract(
    {
      ...carrotGame,
      blueprint: createBlueprint({
        rows: 1,
        columns: 2,
        cells: ['carrot', 'appleTree'],
      }),
    },
    0,
    () => 0,
  )

  assert.equal(boostedClaim.trade.rabbitRelations, 104)
  assert.equal(appleClaim.trade.rabbitRelations, 104)
})

test('Carrot high-harvest bounty counts qualifying crop types once each', () => {
  const blueprint = createBlueprint({
    rows: 100,
    columns: 100,
    cells: [
      'leek',
      'corn',
      'pumpkin',
      'sweetPotato',
      'turnip',
      'lentil',
      'sunflower',
      'appleTree',
      ...Array(15).fill('carrot'),
    ],
  })
  const effect = getCarrotHighHarvestEffect(
    blueprint,
    [
      { cropId: 'leek', amount: 10_001 },
      { cropId: 'corn', amount: 10_001 },
      { cropId: 'pumpkin', amount: 10_001 },
      { cropId: 'sweetPotato', amount: 10_001 },
      { cropId: 'turnip', amount: 10_001 },
      { cropId: 'lentil', amount: 10_001 },
      { cropId: 'sunflower', amount: 10_001 },
      { cropId: 'leek', amount: 10_001 },
    ],
  )

  assert.equal(effect.qualifyingCropTypeCount, 7)
  assert.ok(Math.abs(effect.multiplier - 5.2) < 1e-12)
})
test('Carrot harvest stacks multiplicatively and stays active alongside Apple Saplings', () => {
  const farmland = { rows: 1, columns: 1, floors: 1, farms: 1, otherMultiplier: 1 }
  const carrotAndLentil = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['lentil', 'carrot'],
  })
  const carrotAndApple = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['carrot', 'appleTree'],
  })
  const stackedProduction = getCropProductionSnapshotPerSecond(
    carrotAndLentil,
    farmland,
    [],
    1,
    0,
  )
  const appleProduction = getCropProductionSnapshotPerSecond(
    carrotAndApple,
    farmland,
    [],
    1,
    23,
  )

  assert.ok(Math.abs(stackedProduction.total - (25 + 40) * 1.25 * 1.1) < 1e-12)
  assert.ok(Math.abs(appleProduction.total - 10 * 1.192) < 1e-12)
})

test('unlocked Carrot contracts give double Rabbit relations', () => {
  const game = {
    ...createInitialGame(),
    farmland: { rows: 1, columns: 10, floors: 1, farms: 1, otherMultiplier: 1 },
    trade: {
      ...createInitialGame().trade,
      established: true,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CARROT],
    },
  }
  const randomValues = [0, 0.999]
  const contract = createRabbitContract(game, () => randomValues.shift())

  assert.equal(contract.cropId, 'carrot')
  assert.equal(contract.relationsReward, 2)
})

test('the Contractor claims every finished Rabbit contract automatically', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      established: true,
      rabbitRelations: 7,
      rabbitContractsCompleted: 0,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR],
      rabbitContracts: [
        {
          cropId: 'leek',
          factor: 1e7,
          fieldsPlanted: 1,
          requiredAmount: 10,
          progress: 4,
          relationsReward: 3,
        },
        {
          cropId: 'leek',
          factor: 1e7,
          fieldsPlanted: 1,
          requiredAmount: 10,
          progress: 0,
          relationsReward: 5,
        },
        null,
      ],
    },
  }

  const advancedTrade = advanceRabbitContract(game, { leek: 20 }, () => 0)

  assert.equal(advancedTrade.rabbitRelations, 15)
  assert.equal(advancedTrade.rabbitContractsCompleted, 2)
  assert.equal(advancedTrade.rabbitContracts[0].progress, 0)
  assert.equal(advancedTrade.rabbitContracts[1].progress, 0)
})

test('the Contractor batches estimates above 10 per second every 0.1 seconds', () => {
  const initialGame = createInitialGame()
  const fieldsPlanted = 1e40
  const estimatedCompletionsPerSecond = 7140
  const productionPerSecond =
    estimatedCompletionsPerSecond *
    fieldsPlanted *
    RABBIT_CONTRACT_AVERAGE_FACTOR
  const frozenContracts = [
    {
      cropId: 'leek',
      factor: 3e7,
      fieldsPlanted,
      requiredAmount: fieldsPlanted * 3e7,
      progress: 123,
      relationsReward: 120,
    },
    null,
    null,
  ]
  let game = {
    ...initialGame,
    farmland: {
      ...initialGame.farmland,
      columns: fieldsPlanted,
    },
    trade: {
      ...initialGame.trade,
      established: true,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR],
      rabbitContracts: frozenContracts,
      rabbitContractPaceSampleSeconds: 0,
      rabbitContractEstimatedCompletionsPerSecond:
        estimatedCompletionsPerSecond,
    },
  }
  let randomCalls = 0
  const random = () => {
    randomCalls += 1
    return 0
  }

  for (let tick = 0; tick < 5; tick += 1) {
    game = {
      ...game,
      trade: advanceRabbitContract(
        game,
        { leek: productionPerSecond / 60 },
        random,
        1 / 60,
      ),
    }
  }

  assert.equal(game.trade.rabbitContractsCompleted, 0)
  assert.deepEqual(game.trade.rabbitContracts, frozenContracts)

  game = {
    ...game,
    trade: advanceRabbitContract(
      game,
      { leek: productionPerSecond / 60 },
      random,
      1 / 60,
    ),
  }

  assert.equal(RABBIT_BULK_CONTRACT_RATE, 10)
  assert.ok(
    Math.abs(
      game.trade.rabbitContractEstimatedCompletionsPerSecond -
        estimatedCompletionsPerSecond,
    ) < 1e-9,
  )
  assert.equal(game.trade.rabbitContractsCompleted, 714)
  assert.equal(game.trade.rabbitRelations, 714 * 120)
  assert.deepEqual(game.trade.rabbitContracts, frozenContracts)
  assert.equal(randomCalls, 0)
  assert.ok(game.trade.rabbitBulkContractElapsedSeconds < 1e-9)
})

test('bulk Rabbit completion fractions carry between 0.1-second awards', () => {
  const initialGame = createInitialGame()
  const fieldsPlanted = 1e40
  const estimatedCompletionsPerSecond = 10.5
  const productionPerSecond =
    estimatedCompletionsPerSecond *
    fieldsPlanted *
    RABBIT_CONTRACT_AVERAGE_FACTOR
  const frozenContracts = [
    {
      cropId: 'leek',
      factor: 3e7,
      fieldsPlanted,
      requiredAmount: fieldsPlanted * 3e7,
      progress: 0,
      relationsReward: 120,
    },
    null,
    null,
  ]
  let game = {
    ...initialGame,
    farmland: {
      ...initialGame.farmland,
      columns: fieldsPlanted,
    },
    trade: {
      ...initialGame.trade,
      established: true,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR],
      rabbitContracts: frozenContracts,
      rabbitContractPaceSampleSeconds: 0,
      rabbitContractEstimatedCompletionsPerSecond:
        estimatedCompletionsPerSecond,
    },
  }

  for (let interval = 0; interval < 20; interval += 1) {
    game = {
      ...game,
      trade: advanceRabbitContract(
        game,
        { leek: productionPerSecond / 10 },
        () => 0,
        0.1,
      ),
    }
  }

  assert.equal(game.trade.rabbitContractsCompleted, 21)
  assert.equal(game.trade.rabbitRelations, 21 * 120)
  assert.ok(game.trade.rabbitBulkContractFractionalCompletions < 1e-9)
  assert.deepEqual(game.trade.rabbitContracts, frozenContracts)
})

test('exactly 10 Rabbit contracts per second keeps individual processing', () => {
  const initialGame = createInitialGame()
  const contract = {
    cropId: 'leek',
    factor: 1e7,
    fieldsPlanted: 1,
    requiredAmount: 10,
    progress: 0,
    relationsReward: 3,
  }
  const game = {
    ...initialGame,
    trade: {
      ...initialGame.trade,
      established: true,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR],
      rabbitContracts: [contract, null, null],
      rabbitContractPaceSampleSeconds: 0,
      rabbitContractEstimatedCompletionsPerSecond:
        RABBIT_BULK_CONTRACT_RATE,
    },
  }
  const advancedTrade = advanceRabbitContract(
    game,
    { leek: 20 },
    () => 0,
    0.01,
  )

  assert.equal(advancedTrade.rabbitContractsCompleted, 1)
  assert.equal(advancedTrade.rabbitRelations, 3)
  assert.equal(advancedTrade.rabbitBulkContractElapsedSeconds, 0)
})

test('Rabbit relation expansions appear before efficiency upgrades and grant blueprint space without a reset', () => {
  assert.deepEqual(
    RABBIT_UNLOCKS.map((unlock) => unlock.id),
    [
      RABBIT_UNLOCK_IDS.CARROT,
      RABBIT_UNLOCK_IDS.ROW_EXPANSION,
      RABBIT_UNLOCK_IDS.COLUMN_EXPANSION,
      RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY,
      RABBIT_UNLOCK_IDS.ROW_DUPLICATOR_EFFICIENCY,
      RABBIT_UNLOCK_IDS.CONTRACTOR,
      RABBIT_UNLOCK_IDS.FOUR_LEAF_CLOVER,
      RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT,
    ],
  )

  const game = {
    ...createInitialGame(),
    crops: 12345,
    farmland: { rows: 1, columns: 42, floors: 1, farms: 1, otherMultiplier: 1 },
    trade: {
      established: true,
      rabbitRelations: 3000,
      rabbitContractsCompleted: 0,
      rabbitContracts: [],
      rabbitUnlocks: [],
    },
  }
  const rowExpandedGame = purchaseRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.ROW_EXPANSION,
  )
  const columnExpandedGame = purchaseRabbitUnlock(
    rowExpandedGame,
    RABBIT_UNLOCK_IDS.COLUMN_EXPANSION,
  )

  assert.equal(rowExpandedGame.trade.rabbitRelations, 2000)
  assert.equal(rowExpandedGame.blueprint.rows, 2)
  assert.equal(rowExpandedGame.blueprint.columns, 1)
  assert.deepEqual(rowExpandedGame.completedBlueprintExpansions, [])
  assert.deepEqual(rowExpandedGame.rabbitBlueprintExpansions, {
    row: 1,
    column: 0,
  })
  assert.equal(rowExpandedGame.crops, 12345)
  assert.equal(rowExpandedGame.farmland.columns, 42)
  assert.equal(columnExpandedGame.trade.rabbitRelations, 0)
  assert.equal(columnExpandedGame.blueprint.rows, 2)
  assert.equal(columnExpandedGame.blueprint.columns, 2)
  assert.deepEqual(columnExpandedGame.completedBlueprintExpansions, [])
  assert.deepEqual(columnExpandedGame.rabbitBlueprintExpansions, {
    row: 1,
    column: 1,
  })
  assert.equal(columnExpandedGame.crops, 12345)
  assert.equal(columnExpandedGame.farmland.columns, 42)
})
test('Rabbit unlocks spend relations once and expose their completion', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      established: true,
      rabbitRelations: 5000,
      rabbitContractsCompleted: 0,
      rabbitContracts: [],
      rabbitUnlocks: [],
    },
  }
  const unlockedGame = purchaseRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY,
  )

  assert.equal(unlockedGame.trade.rabbitRelations, 556)
  assert.equal(
    hasRabbitUnlock(unlockedGame, RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY),
    true,
  )
  assert.equal(
    purchaseRabbitUnlock(
      unlockedGame,
      RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY,
    ),
    null,
  )
})

test('production snapshots preserve total income while separating crop output', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'corn'],
  })
  const snapshot = getCropProductionSnapshotPerSecond(blueprint, {
    rows: 2,
    columns: 3,
    floors: 1,
    farms: 1,
    otherMultiplier: 1,
  })

  assert.ok(snapshot.byCrop.leek > 0)
  assert.ok(snapshot.byCrop.corn > snapshot.byCrop.leek)
  assert.equal(
    snapshot.total,
    Object.values(snapshot.byCrop).reduce((total, value) => total + value, 0),
  )
})