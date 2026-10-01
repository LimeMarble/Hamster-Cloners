import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
import { useGameDerivedState } from '../src/hooks/useGameDerivedState.js'

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
  const firstRoll = getFiveLeafSchedule(loadout, 200).firstRollSeconds
  assert.ok(Math.abs(firstRoll - 19.65) < 1e-10)
  assert.equal(advanceFortuneState(game, firstRoll - 0.1, () => 0).fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(game, firstRoll, () => 0).fortune.bundles.length, 1)
  assert.equal(advanceGameSimulationStep(game, firstRoll, { random: () => 0 }).fortune.bundles.length, 1)
})

test('5-Leaf attempts start no earlier than 0.25× and force a bundle by 2×', () => {
  const game = createPerfectedCloverGame()
  const frequent = updateFiveLeafLoadout(game, 0, { chancePercent: 10 })
  const slower = updateFiveLeafLoadout(game, 0, { chancePercent: 49 })
  const faster = updateFiveLeafLoadout(game, 0, { chancePercent: 50 })
  const frequentSchedule = getFiveLeafSchedule(frequent.fortune.fiveLeaf.loadouts[0], 200)
  const slowSchedule = getFiveLeafSchedule(slower.fortune.fiveLeaf.loadouts[0], 200)
  const fastSchedule = getFiveLeafSchedule(faster.fortune.fiveLeaf.loadouts[0], 200)

  assert.equal(frequentSchedule.minimumSeconds, 5)
  assert.equal(frequentSchedule.firstRollSeconds, 5)
  assert.ok(Math.abs(frequentSchedule.rollIntervalSeconds - 1.965) < 1e-10)
  assert.ok(Math.abs(frequentSchedule.maximumSeconds - 39.3) < 1e-10)
  assert.ok(Math.abs(slowSchedule.firstRollSeconds - 9.6285) < 1e-10)
  assert.ok(Math.abs(fastSchedule.firstRollSeconds - 9.825) < 1e-10)
  assert.ok(fastSchedule.firstRollSeconds - slowSchedule.firstRollSeconds < 1)
  const missed = advanceFortuneState(
    slower, slowSchedule.maximumSeconds - 1, () => 0.99,
  )
  assert.equal(missed.fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(missed, 1, () => 0.99).fortune.bundles.length, 1)
})

test('used point fraction speeds under-budget loadouts without normalizing Mirage', () => {
  const game = createPerfectedCloverGame()
  const mixed = updateFiveLeafLoadout(game, 0, {
    allocations: { opus: 50, bounty: 0, mirage: 0, fortuneOpus: 50 },
  }).fortune.fiveLeaf.loadouts[0]
  const halfMirage = updateFiveLeafLoadout(game, 0, {
    allocations: { opus: 50, bounty: 0, mirage: 0, fortuneOpus: 0 },
  }).fortune.fiveLeaf.loadouts[0]
  const empty = updateFiveLeafLoadout(game, 0, {
    chancePercent: 10,
    allocations: { opus: 0, bounty: 0, mirage: 0, fortuneOpus: 0 },
  })

  assert.equal(getFiveLeafSchedule(mixed, 300).pointTimeFactor, 0.5)
  assert.equal(getFiveLeafSchedule(mixed, 300).baseSeconds, 15)
  assert.equal(getFiveLeafSchedule(mixed, 150).baseSeconds, 30)
  assert.equal(getFiveLeafSchedule(halfMirage, 200).pointTimeFactor, 0.25)

  const fastest = getFiveLeafSchedule(empty.fortune.fiveLeaf.loadouts[0], 200)
  assert.equal(fastest.baseSeconds, 7.5)
  assert.equal(fastest.rollIntervalSeconds, 1)
  assert.equal(fastest.firstRollSeconds, 5)
  assert.equal(fastest.maximumSeconds, 15)
  assert.equal(advanceFortuneState(empty, 4.9, () => 0).fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(empty, 5, () => 0).fortune.bundles.length, 1)
})

test('earning more points reschedules an in-progress 5-Leaf attempt', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, {
    allocations: { opus: 50, bounty: 0, mirage: 0, fortuneOpus: 50 },
  })
  const waiting = advanceFortuneState(game, 10, () => 0)
  assert.equal(waiting.fortune.nextRollSeconds, 22.5)

  const morePoints = {
    ...waiting,
    capybara: {
      ...waiting.capybara,
      completedDemonstrations: [
        ...waiting.capybara.completedDemonstrations,
        'misfortuneTrial',
      ],
    },
  }
  const rescheduled = advanceFortuneState(morePoints, 0.1, () => 0)
  assert.equal(getFiveLeafPointBudget(rescheduled), 250)
  assert.equal(rescheduled.fortune.nextRollSeconds, 18)
  assert.equal(rescheduled.fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(rescheduled, 7.9, () => 0).fortune.bundles.length, 1)
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

test('Misfortune crops per second display includes active 5-Leaf effects', () => {
  const initial = createPerfectedCloverGame()
  const baseGame = {
    ...initial,
    blueprint: createBlueprint({
      rows: 1,
      columns: 2,
      cells: ['leek', 'fourLeafClover'],
    }),
    farmland: { rows: 1, columns: 1, floors: 1, farms: 1, otherMultiplier: 1 },
  }
  const boostedGame = {
    ...baseGame,
    fortune: {
      ...baseGame.fortune,
      activeEffects: [{ id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 60 }],
    },
  }
  function displayedRate(game) {
    let productionPerSecond = 0
    function RateProbe() {
      productionPerSecond = useGameDerivedState(game).productionPerSecond
      return null
    }
    renderToStaticMarkup(createElement(RateProbe))
    return productionPerSecond
  }

  const baseRate = displayedRate(baseGame)
  const boostedRate = displayedRate(boostedGame)
  const actualProduction =
    advanceGameSimulationStep(boostedGame, 1).crops - boostedGame.crops

  assert.ok(baseRate > 0)
  assert.ok(boostedRate > baseRate)
  assert.ok(Math.abs(boostedRate - actualProduction) < 1e-10)
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
  const waiting = advanceFortuneState(changed, 5, () => 0.99)
  const restored = normalizeGame(waiting)

  assert.ok(unlocked.includes('fourLeafClover'))
  assert.equal(restored.fortune.fiveLeaf.loadouts[0].chancePercent, 40)
  assert.equal(restored.fortune.nextRollSeconds, waiting.fortune.nextRollSeconds)
  assert.deepEqual(restored.fortune.rollSchedule, waiting.fortune.rollSchedule)
})
