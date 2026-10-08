import assert from 'node:assert/strict'
import test from 'node:test'
import { createInitialGame, getNextMajorProgressionGoal, MAJOR_PROGRESSION_GOALS,
  MISFORTUNE_UPGRADE_IDS, purchaseRabbitUnlock, RABBIT_UNLOCK_IDS,
  isRabbitUnlockAvailable } from '../src/game/gameLogic.js'
import { CROP_IDS, getVisibleCropIds, hasVisitedMisfortune } from '../src/game/crops.js'

test('Rabbit’s Charm cannot be bought before Final Support, even with sufficient relations', () => {
  const game = createInitialGame()
  game.trade = { ...game.trade, established: true, rabbitRelations: 1e20 }
  assert.equal(isRabbitUnlockAvailable(game, RABBIT_UNLOCK_IDS.RABBITS_CHARM), false)
  assert.equal(purchaseRabbitUnlock(game, RABBIT_UNLOCK_IDS.RABBITS_CHARM), null)
  const hunted = { ...game, completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER] }
  assert.equal(isRabbitUnlockAvailable(hunted, RABBIT_UNLOCK_IDS.RABBITS_CHARM), false)
  assert.equal(purchaseRabbitUnlock(hunted, RABBIT_UNLOCK_IDS.RABBITS_CHARM), null)
  const ready = { ...game, completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT] }
  const purchased = purchaseRabbitUnlock(ready, RABBIT_UNLOCK_IDS.RABBITS_CHARM)
  assert.ok(purchased.trade.rabbitUnlocks.includes(RABBIT_UNLOCK_IDS.RABBITS_CHARM))
  assert.equal(purchased.trade.rabbitRelations, 1e20 - 7.77e18)
  assert.equal(isRabbitUnlockAvailable({ ...purchased, completedMisfortuneUpgrades: [] }, RABBIT_UNLOCK_IDS.RABBITS_CHARM), true)
})

test('Soybean is hidden before Misfortune, including when Clover was unlocked first', () => {
  assert.equal(getVisibleCropIds(CROP_IDS, 1000, true, false, false).includes('soybean'), false)
  assert.equal(getVisibleCropIds(CROP_IDS, 1000, true, true, true).includes('soybean'), true)
  const initial = createInitialGame()
  assert.equal(hasVisitedMisfortune(initial), false)
  assert.equal(hasVisitedMisfortune({ ...initial, activeArea: 'misfortune' }), true)
  assert.equal(hasVisitedMisfortune({ ...initial, areaProgress: { misfortune: {} } }), true)
})

test('Soybean and its following Clover goal come after Demos 0 and 1', () => {
  const ids = MAJOR_PROGRESSION_GOALS.map((goal) => goal.id)
  assert.ok(ids.indexOf('crop-soybean') > ids.indexOf('capybara-demonstration-introduction'))
  assert.ok(ids.indexOf('crop-soybean') > ids.indexOf('capybara-demonstration-one'))
  assert.ok(ids.indexOf('perfection-five-leaf-clover') > ids.indexOf('crop-soybean'))
  const soybean = MAJOR_PROGRESSION_GOALS.find((goal) => goal.id === 'crop-soybean')
  assert.equal(soybean.isApplicable(createInitialGame()), false)
  assert.notEqual(getNextMajorProgressionGoal(createInitialGame()).id, 'crop-soybean')
})
