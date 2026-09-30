import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceFortuneState,
  advanceGameSimulationStep,
  CLOVER_ASSEMBLY_PART_REQUIREMENT,
  collectCloverBundle,
  completeCloverAssembly,
  createBlueprint,
  createInitialGame,
  DEFAULT_CLOVER_FORTUNE_PERCENTAGES,
  FORTUNE_EFFECT_IDS,
  getFiveLeafLoadoutCost,
  getFiveLeafPointBudget,
  getFiveLeafSchedule,
  getFortuneModifiers,
  normalizeFiveLeafState,
  RABBIT_UNLOCK_IDS,
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

test('each newly unlocked loadout matches the 4-Leaf fortune mix and starts with one bundle', () => {
  const initial = createInitialGame()
  const customBeforeUnlock = updateFiveLeafLoadout(
    { ...initial, cloverAssembly: { assembled: true } },
    0,
    { batchSize: 5, allocations: { opus: 100, bounty: 0, mirage: 0, fortuneOpus: 0 } },
  )
  const unlocked = completeCloverAssembly({
    ...customBeforeUnlock,
    hasUnlockedGreaterBlueprinting: true,
    cloverAssembly: {
      progress: CLOVER_ASSEMBLY_PART_REQUIREMENT,
      assembled: false,
    },
    trade: {
      ...initial.trade,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.RABBITS_CHARM],
    },
  })

  assert.ok(unlocked)
  for (const loadout of unlocked.fortune.fiveLeaf.loadouts) {
    assert.equal(loadout.batchSize, 1)
    assert.deepEqual(loadout.allocations, DEFAULT_CLOVER_FORTUNE_PERCENTAGES)
  }
})

test('untouched older 5-Leaf loadouts adopt the new default without replacing custom ones', () => {
  const oldLoadout = {
    name: 'Loadout 1',
    chancePercent: 100,
    batchSize: 2,
    allocations: { opus: 50, bounty: 0, fortuneOpus: 50 },
  }
  const migrated = normalizeFiveLeafState({
    activeLoadoutIndex: 1,
    loadouts: [oldLoadout, oldLoadout, oldLoadout],
  })
  const customized = normalizeFiveLeafState({
    activeLoadoutIndex: 1,
    loadouts: [oldLoadout, { ...oldLoadout, chancePercent: 40 }, oldLoadout],
  })

  assert.equal(migrated.activeLoadoutIndex, 1)
  assert.ok(migrated.loadouts.every((loadout) => loadout.batchSize === 1))
  assert.equal(customized.loadouts[1].chancePercent, 40)
  assert.equal(customized.loadouts[0].batchSize, 2)
})

test('5-Leaf Clover starts with one bundle and the 4-Leaf fortune weights', () => {
  const game = createPerfectedCloverGame()
  const loadout = game.fortune.fiveLeaf.loadouts[0]

  assert.equal(getFiveLeafPointBudget(game), 200)
  assert.equal(getFiveLeafLoadoutCost(loadout), 131)
  assert.equal(getFiveLeafSchedule(loadout, 200).firstRollSeconds, 30)
  assert.equal(advanceFortuneState(game, 29, () => 0).fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(game, 30, () => 0).fortune.bundles.length, 1)
  assert.equal(advanceGameSimulationStep(game, 30, { random: () => 0 }).fortune.bundles.length, 1)
})

test('5-Leaf chance attempts have a minimum, a forced maximum, and no 49-to-50 percent cliff', () => {
  const game = createPerfectedCloverGame()
  const slower = updateFiveLeafLoadout(game, 0, { chancePercent: 49 })
  const faster = updateFiveLeafLoadout(game, 0, { chancePercent: 50 })
  const slowSchedule = getFiveLeafSchedule(slower.fortune.fiveLeaf.loadouts[0], 200)
  const fastSchedule = getFiveLeafSchedule(faster.fortune.fiveLeaf.loadouts[0], 200)

  assert.equal(slowSchedule.firstRollSeconds, 15)
  assert.equal(fastSchedule.firstRollSeconds, 15)
  const missed = advanceFortuneState(slower, 59, () => 0.99)
  assert.equal(missed.fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(missed, 1, () => 0.99).fortune.bundles.length, 1)
})

test('overloaded 5-Leaf allocations slow appearances by the square of their point ratio', () => {
  const game = createPerfectedCloverGame()
  const overloaded = updateFiveLeafLoadout(game, 0, {
    allocations: { opus: 0, bounty: 0, mirage: 0, fortuneOpus: 100 },
  })
  const loadout = overloaded.fortune.fiveLeaf.loadouts[0]

  assert.equal(getFiveLeafLoadoutCost(loadout), 200)
  assert.equal(getFiveLeafSchedule(loadout, 50).overloadFactor, 16)
  assert.equal(getFiveLeafSchedule(loadout, 50).baseSeconds, 480)
})

test('5-Leaf Breezes function in Misfortune and keep their stackable timers', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 2 })
  const spawned = advanceFortuneState(game, 60, () => 0)
  const demonstration = collectCloverBundle(spawned, 0, () => 0.1)
  const opus = collectCloverBundle(demonstration, 0, () => 0.95)
  const modifiers = getFortuneModifiers(opus)

  assert.deepEqual(opus.fortune.bundles, [])
  assert.equal(opus.fortune.activeEffects.length, 2)
  assert.ok(Math.abs(modifiers.passiveEffectMultiplier - 0.63 * 1.1 * 1.0777) < 1e-10)
  assert.ok(Math.abs(modifiers.cropYieldMultiplier - 7.77 / 1777) < 1e-10)
})

test('switching 5-Leaf loadouts despawns bundles, clears effects, and restarts the timer', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 2 })
  const spawned = advanceFortuneState(game, 60, () => 0)
  const collected = collectCloverBundle(spawned, 0, () => 0.1)
  const switched = selectFiveLeafLoadout(collected, 1)

  assert.equal(switched.fortune.fiveLeaf.activeLoadoutIndex, 1)
  assert.deepEqual(switched.fortune.bundles, [])
  assert.deepEqual(switched.fortune.activeEffects, [])
  assert.equal(switched.fortune.secondsTowardBundleRoll, 0)
  assert.equal(switched.fortune.nextRollSeconds, 0)
})

test('natural 5-Leaf Split works, but split-created bundles reroll Split as Mirage', () => {
  const spawned = advanceFortuneState(createPerfectedCloverGame(), 30, () => 0)
  const split = collectCloverBundle(spawned, 0, () => 0.75)

  assert.equal(split.fortune.notice.effectId, FORTUNE_EFFECT_IDS.SPLIT)
  assert.equal(split.fortune.bundles.length, 2)
  assert.ok(split.fortune.bundles.every((bundle) => bundle.splitBlocked))

  const rerolled = collectCloverBundle(split, 0, () => 0.75)
  assert.equal(rerolled.fortune.notice.effectId, FORTUNE_EFFECT_IDS.MIRAGE)
  assert.equal(rerolled.fortune.bundles.length, 1)
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
