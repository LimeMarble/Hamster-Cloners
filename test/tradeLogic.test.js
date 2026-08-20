import assert from 'node:assert/strict'
import test from 'node:test'
import {
  RABBIT_ACTIVE_CONTRACT_COUNT,
  RABBIT_UNLOCK_IDS,
  TRADE_ESTABLISHMENT_COST,
  advanceRabbitContract,
  claimRabbitContract,
  createBlueprint,
  createInitialGame,
  createRabbitContract,
  establishTradeRelations,
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

test('Carrot Rabbit relation bonus stays at ten percent regardless of completed contracts', () => {
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

  assert.equal(getRabbitRelationsMultiplier(carrotBlueprint), 1.1)
  assert.equal(getRabbitRelationsMultiplier(carrotBlueprint), 1.1)
  assert.equal(getRabbitRelationsMultiplier(appleBlueprint), 1)
})

test('Carrot scales claimed relations from completed contracts and Apple Saplings disable it', () => {
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

  assert.equal(boostedClaim.trade.rabbitRelations, 110)
  assert.equal(appleClaim.trade.rabbitRelations, 100)
})

test('Carrot harvest stacks multiplicatively with Lentil and is disabled by Apple Saplings', () => {
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
  assert.equal(appleProduction.total, 10)
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

test('Rabbit unlocks spend relations once and expose their completion', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      established: true,
      rabbitRelations: 2000,
      rabbitContractsCompleted: 0,
      rabbitContracts: [],
      rabbitUnlocks: [],
    },
  }
  const unlockedGame = purchaseRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY,
  )

  assert.equal(unlockedGame.trade.rabbitRelations, 889)
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