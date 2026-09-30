import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceFortuneState,
  advanceGameSimulationStep,
  collectCloverBundle,
  createBlueprint,
  createInitialGame,
  getFiveLeafLoadoutCost,
  getFiveLeafPointBudget,
  getFiveLeafSchedule,
  getFortuneModifiers,
  selectFiveLeafLoadout,
  updateFiveLeafLoadout,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'
import { getUnlockedCropIds } from '../src/game/crops.js'

function createPerfectedCloverGame() {
  const initial = createInitialGame()
  return {
    ...initial,
    activeArea: 'misfortune',
    blueprint: createBlueprint({ cells: ['fourLeafClover'] }),
    cloverAssembly: { progress: 7.77e58, assembled: true },
    capybara: {
      ...initial.capybara,
      completedDemonstrations: ['introduction', 'demonstrationOne'],
    },
    fortune: {
      ...initial.fortune,
      discoveredEffects: ['opus', 'bounty', 'mirage', 'fortuneOpus'],
    },
  }
}

test('5-Leaf Clover starts with two bundles and a point-funded Opus/Demonstration loadout', () => {
  const game = createPerfectedCloverGame()
  const loadout = game.fortune.fiveLeaf.loadouts[0]

  assert.equal(getFiveLeafPointBudget(game), 200)
  assert.equal(getFiveLeafLoadoutCost(loadout), 150)
  assert.equal(getFiveLeafSchedule(loadout, 200).firstRollSeconds, 60)
  assert.equal(advanceFortuneState(game, 59, () => 0).fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(game, 60, () => 0).fortune.bundles.length, 2)
  assert.equal(advanceGameSimulationStep(game, 60, { random: () => 0 }).fortune.bundles.length, 2)
})

test('5-Leaf chance attempts have a minimum, a forced maximum, and no 49-to-50 percent cliff', () => {
  const game = createPerfectedCloverGame()
  const slower = updateFiveLeafLoadout(game, 0, { chancePercent: 49 })
  const faster = updateFiveLeafLoadout(game, 0, { chancePercent: 50 })
  const slowSchedule = getFiveLeafSchedule(slower.fortune.fiveLeaf.loadouts[0], 200)
  const fastSchedule = getFiveLeafSchedule(faster.fortune.fiveLeaf.loadouts[0], 200)

  assert.equal(slowSchedule.firstRollSeconds, 30)
  assert.equal(fastSchedule.firstRollSeconds, 30)
  const missed = advanceFortuneState(slower, 119, () => 0.99)
  assert.equal(missed.fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(missed, 1, () => 0.99).fortune.bundles.length, 2)
})

test('overloaded 5-Leaf allocations slow appearances by the square of their point ratio', () => {
  const game = createPerfectedCloverGame()
  const overloaded = updateFiveLeafLoadout(game, 0, {
    allocations: { opus: 0, bounty: 0, fortuneOpus: 100 },
  })
  const loadout = overloaded.fortune.fiveLeaf.loadouts[0]

  assert.equal(getFiveLeafLoadoutCost(loadout), 200)
  assert.equal(getFiveLeafSchedule(loadout, 50).overloadFactor, 16)
  assert.equal(getFiveLeafSchedule(loadout, 50).baseSeconds, 960)
})

test('5-Leaf Breezes function in Misfortune and keep their stackable timers', () => {
  const spawned = advanceFortuneState(createPerfectedCloverGame(), 60, () => 0)
  const demonstration = collectCloverBundle(spawned, 0, () => 0.2)
  const opus = collectCloverBundle(demonstration, 0, () => 0.8)
  const modifiers = getFortuneModifiers(opus)

  assert.deepEqual(opus.fortune.bundles, [])
  assert.equal(opus.fortune.activeEffects.length, 2)
  assert.ok(Math.abs(modifiers.passiveEffectMultiplier - 0.63 * 1.1 * 1.0777) < 1e-10)
  assert.ok(Math.abs(modifiers.cropYieldMultiplier - 7.77 / 1777) < 1e-10)
})

test('switching 5-Leaf loadouts despawns bundles, clears effects, and restarts the timer', () => {
  const game = createPerfectedCloverGame()
  const spawned = advanceFortuneState(game, 60, () => 0)
  const collected = collectCloverBundle(spawned, 0, () => 0.2)
  const switched = selectFiveLeafLoadout(collected, 1)

  assert.equal(switched.fortune.fiveLeaf.activeLoadoutIndex, 1)
  assert.deepEqual(switched.fortune.bundles, [])
  assert.deepEqual(switched.fortune.activeEffects, [])
  assert.equal(switched.fortune.secondsTowardBundleRoll, 0)
  assert.equal(switched.fortune.nextRollSeconds, 0)
})

test('Misfortune can plant clover after perfection and loadouts survive save normalization', () => {
  const game = createPerfectedCloverGame()
  const unlocked = getUnlockedCropIds(
    game.blueprint, true, 125, true, true, true, true,
    false, true, 500, true, true,
  )
  const changed = updateFiveLeafLoadout(game, 0, { chancePercent: 40 })
  const restored = normalizeGame(changed)

  assert.ok(unlocked.includes('fourLeafClover'))
  assert.equal(restored.fortune.fiveLeaf.loadouts[0].chancePercent, 40)
})
