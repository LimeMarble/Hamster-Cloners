import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInitialGame, getBulkPurchaseQuote, getGameAreaCostMultiplier,
  getMaxHamsterPurchase, getMaxDuplicatorPurchase, getMaxFloorReplicatorPurchase,
  getNextHamsterCost, getNextRowDuplicatorCost, getNextFloorReplicatorCost,
} from '../src/game/gameLogic.js'

const machinery = [
  { kind: 'hamster', field: 'hamsters', purchase: getMaxHamsterPurchase,
    price: (owned, multiplier, game) => getNextHamsterCost(owned, game.unionized, multiplier) },
  { kind: 'row', field: 'rowDuplicators', purchase: getMaxDuplicatorPurchase,
    price: getNextRowDuplicatorCost },
  { kind: 'floor', field: 'floorReplicators', purchase: getMaxFloorReplicatorPurchase,
    price: getNextFloorReplicatorCost },
]

function sumPrices(game, type, quantity) {
  let total = 0
  for (let index = 0; index < quantity; index += 1) {
    total += type.price(game[type.field] + index, getGameAreaCostMultiplier(game), game)
  }
  return total
}

for (const type of machinery) {
  for (const activeArea of ['main', 'misfortune']) {
    if (type.kind === 'floor' && activeArea === 'main') continue
    test(`${type.kind} Buy 10 quotes and charges the full batch in ${activeArea}`, () => {
      const game = { ...createInitialGame(), activeArea,
        hamsters: 10, totalHamstersHired: 10, rowDuplicators: 3, floorReplicators: 7,
        hasUnlockedRowDuplicators: true, hasUnlockedFloorReplicators: true }
      const cost = sumPrices(game, type, 10)
      game.crops = cost
      const quote = getBulkPurchaseQuote(game, type.kind, 10)
      assert.equal(quote.cost, cost)
      assert.equal(quote.quantity, 10)
      assert.equal(quote.canAfford, true)
      const purchased = type.purchase(game, 10)
      assert.equal(purchased.purchased, 10)
      assert.equal(purchased[type.field], game[type.field] + 10)
      assert.equal(purchased.crops, 0)

      const shortGame = { ...game, crops: cost * 0.99 }
      const shortQuote = getBulkPurchaseQuote(shortGame, type.kind, 10)
      assert.equal(shortQuote.canAfford, false)
      assert.equal(shortQuote.shortfall, cost - shortGame.crops)
      assert.equal(type.purchase(shortGame, 10).purchased, 0)
      assert.equal(type.purchase(shortGame, 10).crops, shortGame.crops)
    })
  }

  test(`${type.kind} Buy Max matches cached quotes as the budget rises and falls`, () => {
    const game = { ...createInitialGame(), activeArea: 'misfortune',
      hamsters: 100, totalHamstersHired: 1000, unionized: true,
      rowDuplicators: 20, floorReplicators: 16,
      hasUnlockedRowDuplicators: true, hasUnlockedFloorReplicators: true }
    for (const quantity of [0, 1, 7, 30, 2, 0]) {
      const cost = sumPrices(game, type, quantity)
      const nextCost = type.price(game[type.field] + quantity, 100, game)
      const budget = quantity === 0 ? nextCost * 0.5 : cost + nextCost * 0.25
      const funded = { ...game, crops: budget }
      const quote = getBulkPurchaseQuote(funded, type.kind)
      assert.equal(quote.quantity, quantity)
      assert.equal(quote.cost, cost)
      const purchased = type.purchase(funded)
      assert.equal(purchased.purchased, quantity)
      assert.equal(purchased.crops, budget - cost)
      assert.equal(quote.shortfall, 0)
    }
  })
}

test('bulk hamster hiring never crosses unionization, including Buy 10', () => {
  const game = { ...createInitialGame(), hamsters: 990, totalHamstersHired: 990, crops: 1e9 }
  assert.equal(getBulkPurchaseQuote(game, 'hamster', 10).blockedReason, 'unionization')
  assert.equal(getMaxHamsterPurchase(game, 10).purchased, 0)
  const max = getMaxHamsterPurchase(game)
  assert.equal(max.purchased, 9)
  assert.equal(max.hamsters, 999)
  assert.equal(max.unionized, false)
  assert.equal(getBulkPurchaseQuote({ ...game, ...max }, 'hamster').blockedReason, 'unionization')
  const fits = { ...game, hamsters: 989, totalHamstersHired: 989 }
  assert.equal(getMaxHamsterPurchase(fits, 10).hamsters, 999)
})

test('bulk hamster pricing includes acceleration and preserves post-union hire tracking', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune', unionized: true,
    hamsters: 1498, totalHamstersHired: 2398, postUnionHamstersHired: 1398 }
  game.crops = sumPrices(game, machinery[0], 10)
  const purchased = getMaxHamsterPurchase(game, 10)
  assert.equal(purchased.purchased, 10)
  assert.equal(purchased.hamsters, 1508)
  assert.equal(purchased.totalHamstersHired, 2408)
  assert.equal(purchased.postUnionHamstersHired, 1408)
  assert.equal(purchased.crops, 0)
})

test('Floor Buy 10 crosses the accelerated tier correctly and stays Misfortune-only', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune',
    floorReplicators: 495, hasUnlockedFloorReplicators: true }
  game.crops = sumPrices(game, machinery[2], 10)
  assert.equal(getMaxFloorReplicatorPurchase(game, 10).floorReplicators, 505)
  const main = { ...game, activeArea: 'main' }
  assert.equal(getBulkPurchaseQuote(main, 'floor', 10).blockedReason, 'area')
  assert.equal(getMaxFloorReplicatorPurchase(main, 10).purchased, 0)
  assert.equal(getMaxFloorReplicatorPurchase(main).purchased, 0)
})

test('locked machinery cannot be bought in bulk and overflow never spends Crops', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune', crops: 1e300 }
  assert.equal(getMaxDuplicatorPurchase(game, 10).purchased, 0)
  assert.equal(getMaxFloorReplicatorPurchase(game, 10).purchased, 0)
  const overflow = { ...game, hasUnlockedRowDuplicators: true, rowDuplicators: 10000 }
  assert.equal(getBulkPurchaseQuote(overflow, 'row', 10).canAfford, false)
  assert.equal(getMaxDuplicatorPurchase(overflow).purchased, 0)
  assert.equal(getMaxDuplicatorPurchase(overflow).crops, game.crops)
})
