import assert from 'node:assert/strict'
import test from 'node:test'
import {
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

test('Rabbit contracts exclude apples and crops without a harvest', () => {
  assert.equal(isRabbitContractCropEligible('leek'), true)
  assert.equal(isRabbitContractCropEligible('appleTree'), false)
  assert.equal(isRabbitContractCropEligible('knotweed'), false)
  assert.equal(isRabbitContractCropEligible('leechingGourd'), false)
  assert.equal(isRabbitContractCropEligible('rootTunnel'), false)
})

test('establishing Trade spends Crops without resetting existing progress', () => {
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
  assert.equal(establishedGame.trade.rabbitContract.cropId, 'leek')
})

test('crop-specific production advances and completes Rabbit contracts', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      established: true,
      rabbitRelations: 7,
      rabbitUnlocks: [],
      rabbitContract: {
        cropId: 'leek',
        factor: 1e7,
        fieldsPlanted: 1,
        requiredAmount: 10,
        progress: 4,
        relationsReward: 3,
      },
    },
  }
  const advancedTrade = advanceRabbitContract(game, { leek: 20, corn: 1e9 })
  const completedGame = { ...game, trade: advancedTrade }
  const claimedGame = claimRabbitContract(completedGame, () => 0)

  assert.equal(advancedTrade.rabbitContract.progress, 10)
  assert.equal(claimedGame.trade.rabbitRelations, 10)
  assert.equal(claimedGame.trade.rabbitContract.progress, 0)
})

test('Rabbit unlocks spend relations once and expose their completion', () => {
  const game = {
    ...createInitialGame(),
    trade: {
      established: true,
      rabbitRelations: 2000,
      rabbitContract: null,
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
