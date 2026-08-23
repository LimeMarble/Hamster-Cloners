import assert from 'node:assert/strict'
import test from 'node:test'
import {
  RABBIT_ACTIVE_CONTRACT_COUNT,
  RABBIT_UNLOCKS,
  RABBIT_UNLOCK_IDS,
  TRADE_ESTABLISHMENT_COST,
  advanceRabbitContract,
  claimRabbitContract,
  createBlueprint,
  createInitialGame,
  createRabbitContract,
  establishTradeRelations,
  getCarrotHighHarvestEffect,
  getCropProductionSnapshotPerSecond,
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