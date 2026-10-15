import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
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
  FIVE_LEAF_BASE_INTERVAL_SECONDS,
  FIVE_LEAF_FREE_BATCH_SIZE,
  FIVE_LEAF_MAX_BATCH_SIZE,
  getAchievementHamsterMultiplier,
  getCloverBundleEffectCount,
  getFiveLeafBatchEffectCount,
  getFiveLeafLoadoutCost,
  getFiveLeafPointBudget,
  getFiveLeafSchedule,
  getFortuneModifiers,
  getHamsterTreats,
  normalizeFortuneState,
  normalizeFiveLeafState,
  RABBIT_UNLOCK_IDS,
  selectFiveLeafLoadout,
  spawnCloverBundle,
  updateFiveLeafLoadout,
} from '../src/game/gameLogic.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'
import { getUnlockedCropIds } from '../src/game/crops.js'
import { useGameDerivedState } from '../src/hooks/useGameDerivedState.js'

let server
let FiveLeafClover
let CloverFortune

before(async () => {
  server = await createServer({
    logLevel: 'silent',
    resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })
  ;({ FiveLeafClover } = await server.ssrLoadModule('/src/tabs/FiveLeafClover.jsx'))
  ;({ CloverFortune } = await server.ssrLoadModule('/src/tabs/CloverFortune.jsx'))
})

after(async () => { await server?.close() })

function createPerfectedCloverGame() {
  const initial = createInitialGame()
  return {
    ...initial,
    activeArea: 'misfortune',
    blueprint: createBlueprint({ cells: ['fourLeafClover'] }),
    cloverAssembly: { progress: 7.77e58, assembled: true },
    earnedAchievementIds: [
      'inventions', 'firstExpansion', 'unionized', 'firstPerfection',
      'rowDuplicators', 'seedAugmentation', 'trade',
    ],
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

test('Fortune points equal earned Hamster Treats, without duplicate awards or production modifiers', () => {
  const initial = createInitialGame()
  assert.equal(getFiveLeafPointBudget(initial), 0)
  assert.equal(getFiveLeafPointBudget(undefined), 0)
  const game = {
    ...initial,
    earnedAchievementIds: [
      'cropRotation', 'agriculturalDiversity', 'inventions', 'trade',
      'cropRotation', 'unknownAchievement',
    ],
  }
  assert.equal(getHamsterTreats(game), 90)
  assert.equal(getFiveLeafPointBudget(game), 90)

  const boosted = {
    ...game,
    blueprint: createBlueprint({ rows: 3, columns: 3, cells: ['peanuts', 'peanuts'] }),
    completedMisfortuneUpgrades: ['oilyTreats'],
    fortune: {
      ...game.fortune,
      activeEffects: [{ id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 37 }],
      discoveredEffects: ['opus', 'bounty', 'mirage', 'fortuneOpus'],
    },
    capybara: {
      ...game.capybara,
      completedDemonstrations: ['introduction', 'demonstrationOne', 'misfortuneTrial'],
    },
  }
  assert.ok(getAchievementHamsterMultiplier(boosted) > getAchievementHamsterMultiplier(game))
  for (const activeArea of ['main', 'misfortune']) {
    assert.equal(getFiveLeafPointBudget({ ...boosted, activeArea }), 90)
  }
  assert.deepEqual(boosted.earnedAchievementIds, game.earnedAchievementIds)
})

test('earned Treats supply Fortune points after save import without resetting Clover loadouts', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 1, {
    chancePercent: 40,
    batchSize: 3,
    allocations: { opus: 50, bounty: 0, mirage: 0, fortuneOpus: 50 },
  })
  const restored = importGame(exportGame(game))
  assert.equal(getFiveLeafPointBudget(restored), getHamsterTreats(restored))
  assert.ok(game.earnedAchievementIds.every((id) => restored.earnedAchievementIds.includes(id)))
  assert.deepEqual(restored.fortune.fiveLeaf, game.fortune.fiveLeaf)
})

test('each newly unlocked loadout keeps the 4-Leaf fortune mix and starts with base size one plus a free effect', () => {
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
    assert.equal(getFiveLeafBatchEffectCount(loadout), 2)
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

test('5-Leaf Clover starts with one two-effect batch and the 4-Leaf fortune weights', () => {
  const game = createPerfectedCloverGame()
  const loadout = game.fortune.fiveLeaf.loadouts[0]

  assert.equal(getFiveLeafPointBudget(game), 200)
  assert.equal(getFiveLeafLoadoutCost(loadout), 131)
  const firstRoll = getFiveLeafSchedule(loadout, 200).firstRollSeconds
  assert.ok(Math.abs(firstRoll - 9.825) < 1e-10)
  assert.equal(advanceFortuneState(game, firstRoll - 0.1, () => 0).fortune.bundles.length, 0)
  const spawned = advanceFortuneState(game, firstRoll, () => 0)
  assert.equal(spawned.fortune.bundles.length, 1)
  assert.equal(getCloverBundleEffectCount(spawned.fortune.bundles[0]), 2)
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
  assert.equal(frequentSchedule.rollIntervalSeconds, 1)
  assert.ok(Math.abs(frequentSchedule.maximumSeconds - 19.65) < 1e-10)
  assert.equal(slowSchedule.firstRollSeconds, 5)
  assert.equal(fastSchedule.firstRollSeconds, 5)
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
  assert.equal(getFiveLeafSchedule(mixed, 300).baseSeconds, 7.5)
  assert.equal(getFiveLeafSchedule(mixed, 150).baseSeconds, 15)
  assert.equal(getFiveLeafSchedule(halfMirage, 200).pointTimeFactor, 0.25)

  const fastest = getFiveLeafSchedule(empty.fortune.fiveLeaf.loadouts[0], 200)
  assert.equal(fastest.baseSeconds, 3.75)
  assert.equal(fastest.rollIntervalSeconds, 1)
  assert.equal(fastest.firstRollSeconds, 5)
  assert.equal(fastest.maximumSeconds, 7.5)
  assert.equal(advanceFortuneState(empty, 4.9, () => 0).fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(empty, 5, () => 0).fortune.bundles.length, 1)
})

test('earning more points reschedules an in-progress 5-Leaf attempt', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, {
    allocations: { opus: 50, bounty: 0, mirage: 0, fortuneOpus: 50 },
  })
  const waiting = advanceFortuneState(game, 5, () => 0)
  assert.equal(waiting.fortune.nextRollSeconds, 11.25)

  const morePoints = {
    ...waiting,
    earnedAchievementIds: [...waiting.earnedAchievementIds, 'misfortune'],
  }
  const rescheduled = advanceFortuneState(morePoints, 0.1, () => 0)
  assert.equal(getFiveLeafPointBudget(rescheduled), 250)
  assert.equal(rescheduled.fortune.nextRollSeconds, 9)
  assert.equal(rescheduled.fortune.bundles.length, 0)
  assert.equal(advanceFortuneState(rescheduled, 3.9, () => 0).fortune.bundles.length, 1)
})

test('overloaded 5-Leaf allocations slow appearances by the square of their point ratio', () => {
  const game = createPerfectedCloverGame()
  const overloaded = updateFiveLeafLoadout(game, 0, {
    allocations: { opus: 0, bounty: 0, mirage: 0, fortuneOpus: 100 },
  })
  const loadout = overloaded.fortune.fiveLeaf.loadouts[0]

  assert.equal(getFiveLeafLoadoutCost(loadout), 200)
  assert.equal(getFiveLeafSchedule(loadout, 50).overloadFactor, 16)
  assert.equal(getFiveLeafSchedule(loadout, 50).baseSeconds, 240)
})

test('5-Leaf Breezes function in Misfortune and keep their stackable timers', () => {
  const game = createPerfectedCloverGame()
  const spawned = advanceFortuneState(game, 60, () => 0)
  const rolls = [0.1, 0.95]
  const opus = collectCloverBundle(spawned, 0, () => rolls.shift())
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

test('switching 5-Leaf loadouts despawns bundles and restarts the timer without clearing effects', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 2 })
  const spawned = advanceFortuneState(game, 60, () => 0)
  const collected = collectCloverBundle(spawned, 0, () => 0.1)
  const waiting = {
    ...collected,
    fortune: { ...collected.fortune,
      bundles: [{ x: 25, y: 30, effectCount: 3 }, { x: 55, y: 60, splitBlocked: true }],
      secondsTowardBundleRoll: 8, nextRollSeconds: 12 },
  }
  const switched = selectFiveLeafLoadout(waiting, 1)

  assert.equal(switched.fortune.fiveLeaf.activeLoadoutIndex, 1)
  assert.deepEqual(switched.fortune.bundles, [])
  assert.strictEqual(switched.fortune.activeEffects, waiting.fortune.activeEffects)
  assert.ok(switched.fortune.activeEffects.length > 0)
  assert.equal(switched.fortune.notice, null)
  assert.equal(switched.fortune.secondsTowardBundleRoll, 0)
  assert.equal(switched.fortune.nextRollSeconds, 0)
  assert.deepEqual(importGame(exportGame(switched)).fortune.activeEffects,
    waiting.fortune.activeEffects)
})

test('editing loadouts preserves accumulated and overcharged effects without restarting their duration', () => {
  const initial = createPerfectedCloverGame()
  const game = {
    ...initial,
    fortune: { ...initial.fortune,
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 1850 },
        { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 1250 },
      ],
      bundles: [{ x: 25, y: 30, effectCount: 3 }],
      secondsTowardBundleRoll: 8, nextRollSeconds: 12 },
  }
  for (const changes of [{ chancePercent: 40 }, { batchSize: 5 },
    { allocations: { opus: 30, bounty: 40, mirage: 0, fortuneOpus: 30 } }]) {
    const activeEdit = updateFiveLeafLoadout(game, 0, changes)
    assert.strictEqual(activeEdit.fortune.activeEffects, game.fortune.activeEffects)
    assert.deepEqual(getFortuneModifiers(activeEdit), getFortuneModifiers(game))
    assert.deepEqual(activeEdit.fortune.bundles, [])
    assert.equal(activeEdit.fortune.secondsTowardBundleRoll, 0)
    assert.equal(activeEdit.fortune.nextRollSeconds, 0)

    const inactiveEdit = updateFiveLeafLoadout(game, 1, changes)
    assert.strictEqual(inactiveEdit.fortune.activeEffects, game.fortune.activeEffects)
    assert.strictEqual(inactiveEdit.fortune.bundles, game.fortune.bundles)
    assert.equal(inactiveEdit.fortune.secondsTowardBundleRoll, 8)
    assert.equal(inactiveEdit.fortune.nextRollSeconds, 12)
  }
  for (const index of [0, -1, 3, 0.5]) {
    assert.strictEqual(selectFiveLeafLoadout(game, index), game)
  }
  const markup = renderToStaticMarkup(createElement(FiveLeafClover, { game,
    onSelectLoadout() {}, onUpdateLoadout() {} }))
  assert.match(markup, /keeps active effects and their remaining durations/)
})

test('natural 5-Leaf Split works, but split-created bundles reroll Split as Mirage', () => {
  const spawned = advanceFortuneState(createPerfectedCloverGame(), 30, () => 0)
  const split = collectCloverBundle(spawned, 0, () => 0.75)

  assert.equal(split.fortune.notice.effectId, FORTUNE_EFFECT_IDS.SPLIT)
  assert.equal(split.fortune.bundles.length, 4)
  assert.ok(split.fortune.bundles.every((bundle) => bundle.splitBlocked))
  assert.ok(split.fortune.bundles.every((bundle) => getCloverBundleEffectCount(bundle) === 1))

  const rerolled = collectCloverBundle(split, 0, () => 0.75)
  assert.equal(rerolled.fortune.notice.effectId, FORTUNE_EFFECT_IDS.MIRAGE)
  assert.equal(rerolled.fortune.bundles.length, 3)
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

test('base sizes one to five scale timing linearly and spawn one batch with one additional free effect', () => {
  assert.equal(FIVE_LEAF_BASE_INTERVAL_SECONDS, 15)
  assert.equal(FIVE_LEAF_MAX_BATCH_SIZE, 5)
  assert.equal(FIVE_LEAF_FREE_BATCH_SIZE, 1)

  for (let batchSize = 1; batchSize <= FIVE_LEAF_MAX_BATCH_SIZE; batchSize++) {
    const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize })
    const loadout = game.fortune.fiveLeaf.loadouts[0]
    const schedule = getFiveLeafSchedule(loadout, 131)
    assert.equal(schedule.baseSeconds, 15 * batchSize)
    assert.equal(getFiveLeafBatchEffectCount(loadout), batchSize + 1)

    const actualSchedule = getFiveLeafSchedule(loadout, getFiveLeafPointBudget(game))
    const spawned = advanceFortuneState(game, actualSchedule.firstRollSeconds, () => 0)
    assert.equal(spawned.fortune.bundles.length, 1)
    assert.equal(getCloverBundleEffectCount(spawned.fortune.bundles[0]), batchSize + 1)

    const lowChance = updateFiveLeafLoadout(game, 0, { chancePercent: 10 })
    const guaranteedSchedule = getFiveLeafSchedule(lowChance.fortune.fiveLeaf.loadouts[0], 200)
    const guaranteed = advanceFortuneState(lowChance, guaranteedSchedule.maximumSeconds, () => 0.99)
    assert.equal(guaranteed.fortune.bundles.length, 1)
    assert.equal(getCloverBundleEffectCount(guaranteed.fortune.bundles[0]), batchSize + 1)
  }
})

test('typed base sizes are clamped without storing the free effect in the loadout or save', () => {
  const game = createPerfectedCloverGame()
  for (const [input, expected] of [['3', 3], [0, 1], [9, 5], [3.9, 3], ['invalid', 1]]) {
    const updated = updateFiveLeafLoadout(game, 0, { batchSize: input })
    const restored = normalizeGame(updated)
    assert.equal(restored.fortune.fiveLeaf.loadouts[0].batchSize, expected)
    assert.equal(getFiveLeafBatchEffectCount(restored.fortune.fiveLeaf.loadouts[0]), expected + 1)
  }
})

test('existing waiting loadouts adopt the shorter linear schedule without losing their settings', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 5 })
  const legacySchedule = {
    ...game,
    fortune: {
      ...game.fortune,
      secondsTowardBundleRoll: 20,
      nextRollSeconds: 314.4,
      rollSchedule: { firstSeconds: 314.4, intervalSeconds: 314.4 },
    },
  }
  const updated = advanceFortuneState(legacySchedule, 0, () => 0)
  assert.equal(updated.fortune.fiveLeaf.loadouts[0].batchSize, 5)
  assert.deepEqual(updated.fortune.fiveLeaf.loadouts[0].allocations, DEFAULT_CLOVER_FORTUNE_PERCENTAGES)
  assert.ok(Math.abs(updated.fortune.nextRollSeconds - 49.125) < 1e-10)
  assert.equal(updated.fortune.secondsTowardBundleRoll, 20)
  assert.equal(updated.fortune.bundles.length, 0)
})

test('Clover appearance settings use a typed base size and show the free total and linear timing', () => {
  for (const batchSize of [1, 5]) {
    const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize })
    const markup = renderToStaticMarkup(createElement(FiveLeafClover, {
      game, onSelectLoadout: () => {}, onUpdateLoadout: () => {},
    }))
    const inputs = markup.match(/<input[^>]*type="number"[^>]*>/g) ?? []
    assert.equal(inputs.length, 1)
    assert.match(inputs[0], /aria-label="Base batch size"/)
    assert.match(inputs[0], /min="1"/)
    assert.match(inputs[0], /max="5"/)
    assert.match(inputs[0], /step="1"/)
    assert.match(inputs[0], new RegExp(`value="${batchSize}"`))
    assert.doesNotMatch(markup, /<select|<option/)
    assert.match(markup, new RegExp(`${batchSize + 1} effects per batch`))
    assert.match(markup, /1 free effect per batch/)
    assert.match(markup, /One collectible batch rolls all its effects at once/)
    assert.match(markup, /Waiting time scales linearly with the base size only/)
    assert.match(markup, /Each earned Hamster Treat grants 1 Fortune point, without spending treats/)
    assert.doesNotMatch(markup, /Unassigned chance/)
    assert.match(markup, /Fortune&#x27;s Mirage/)
    assert.match(markup, /Timed fortunes overcharge/)
    assert.doesNotMatch(markup, /points per completed demonstration|per distinct fortune used/)
  }
})

test('one click rolls all six effects, extending duplicate timers instead of multiplying their strength', () => {
  const configured = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 5 })
  const game = {
    ...configured,
    fortune: { ...configured.fortune, discoveredEffects: [] },
  }
  const spawned = advanceFortuneState(game, 1000, () => 0)
  assert.equal(spawned.fortune.bundles.length, 1)
  assert.equal(getCloverBundleEffectCount(spawned.fortune.bundles[0]), 6)
  let rolls = 0
  const collected = collectCloverBundle(spawned, 0, () => { rolls++; return 0.2 })
  assert.equal(rolls, 6)
  assert.equal(collected.fortune.bundles.length, 0)
  assert.deepEqual(collected.fortune.activeEffects, [{ id: 'bounty', remainingSeconds: 77 * 6 }])
  assert.deepEqual(collected.fortune.discoveredEffects, ['bounty'])
  assert.equal(getFiveLeafPointBudget(collected), getFiveLeafPointBudget(game))
  assert.ok(Math.abs(getFortuneModifiers(collected).cropYieldMultiplier - 17.77 / 1777) < 1e-10)
  assert.deepEqual(collected.fortune.notice.effectIds, Array(6).fill('bounty'))
})

test('a six-effect batch independently rolls and applies a three-effect combo with all results retained', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 5 })
  const spawned = advanceFortuneState(game, 1000, () => 0)
  const rolls = [0.1, 0.2, 0.95, 0.1, 0.2, 0.95]
  const collected = collectCloverBundle(spawned, 0, () => rolls.shift())
  assert.equal(rolls.length, 0)
  assert.deepEqual(collected.fortune.activeEffects, [
    { id: 'opus', remainingSeconds: 74 },
    { id: 'bounty', remainingSeconds: 154 },
    { id: 'fortuneOpus', remainingSeconds: 54 },
  ])
  const modifiers = getFortuneModifiers(collected)
  assert.ok(Math.abs(modifiers.passiveEffectMultiplier - 0.63 * 1.1 * 1.0777) < 1e-10)
  assert.ok(Math.abs(modifiers.cropYieldMultiplier - 17.77 * 7.77 / 1777) < 1e-10)
  assert.deepEqual(collected.fortune.notice.effectIds, ['opus', 'bounty', 'fortuneOpus', 'opus', 'bounty', 'fortuneOpus'])
})

test('a Split roll within a batch creates only single-effect clones and does not swallow the remaining rolls', () => {
  const spawned = advanceFortuneState(createPerfectedCloverGame(), 1000, () => 0)
  const rolls = [0.75, 0, 0, 0, 0, 0.1]
  const collected = collectCloverBundle(spawned, 0, () => rolls.shift())
  assert.equal(rolls.length, 0)
  assert.equal(collected.fortune.bundles.length, 2)
  assert.ok(collected.fortune.bundles.every((bundle) => bundle.splitBlocked && getCloverBundleEffectCount(bundle) === 1))
  assert.deepEqual(collected.fortune.activeEffects, [{ id: 'opus', remainingSeconds: 37 }])
  assert.deepEqual(collected.fortune.notice.effectIds, ['mirage', 'opus'])

  let cloneRolls = 0
  const clonedResult = collectCloverBundle(collected, 0, () => { cloneRolls++; return 0.2 })
  assert.equal(cloneRolls, 1)
  assert.equal(clonedResult.fortune.bundles.length, 1)
  assert.equal(clonedResult.fortune.activeEffects.find(({ id }) => id === 'bounty').remainingSeconds, 77)
})

test('batch sizes and complete multi-effect notices survive save export/import and normalization', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 5 })
  const spawned = advanceFortuneState(game, 1000, () => 0)
  const restored = importGame(exportGame(spawned))
  assert.deepEqual(restored.fortune.bundles, spawned.fortune.bundles)
  assert.equal(getCloverBundleEffectCount(restored.fortune.bundles[0]), 6)
  const collected = collectCloverBundle(restored, 0, () => 0.2)
  const reopened = importGame(exportGame(collected))
  assert.deepEqual(reopened.fortune.notice, collected.fortune.notice)
  assert.deepEqual(reopened.fortune.activeEffects, collected.fortune.activeEffects)
})

test('older multiple-bundle saves remain single-roll and malformed clone sizes cannot gain extra rolls', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 5 })
  const legacy = {
    ...game,
    fortune: { ...game.fortune, bundles: [{ x: 20, y: 30 }, { x: 70, y: 60 }] },
  }
  let rolls = 0
  const collected = collectCloverBundle(legacy, 0, () => { rolls++; return 0.2 })
  assert.equal(rolls, 1)
  assert.equal(collected.fortune.bundles.length, 1)
  assert.equal(collected.fortune.notice.effectIds, undefined)
  const normalized = normalizeFortuneState({
    bundles: [
      { x: 50, y: 50, effectCount: 999 },
      { x: 50, y: 50, effectCount: -5 },
      { x: 50, y: 50, effectCount: 6, splitBlocked: true },
    ],
  })
  assert.deepEqual(normalized.bundles.map(getCloverBundleEffectCount), [6, 1, 1])
})

test('pending batches pause appearances and remember their roll count independently of the current base size', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 5 })
  const spawned = spawnCloverBundle(game, () => 0)
  const paused = advanceFortuneState(spawned, 1000, () => {
    assert.fail('a pending batch must pause appearance rolls')
  })
  assert.deepEqual(paused.fortune.bundles, spawned.fortune.bundles)
  const changed = {
    ...paused,
    fortune: {
      ...paused.fortune,
      fiveLeaf: {
        ...paused.fortune.fiveLeaf,
        loadouts: paused.fortune.fiveLeaf.loadouts.map((loadout) => ({ ...loadout, batchSize: 1 })),
      },
    },
  }
  const collected = collectCloverBundle(changed, 0, () => 0.2)
  assert.equal(collected.fortune.activeEffects[0].remainingSeconds, 77 * 6)
})

test('one collectible displays its roll count and the result toast groups every outcome', () => {
  const game = updateFiveLeafLoadout(createPerfectedCloverGame(), 0, { batchSize: 5 })
  const spawned = advanceFortuneState(game, 1000, () => 0)
  const pendingMarkup = renderToStaticMarkup(createElement(CloverFortune, { fortune: spawned.fortune }))
  assert.equal((pendingMarkup.match(/class="clover-bundle"/g) ?? []).length, 1)
  assert.match(pendingMarkup, /Collect Clover batch \(6 effect rolls\)/)
  assert.match(pendingMarkup, /6 effects/)

  const rolls = [0.1, 0.2, 0.95, 0.1, 0.2, 0.95]
  const collected = collectCloverBundle(spawned, 0, () => rolls.shift())
  const markup = renderToStaticMarkup(createElement(CloverFortune, { fortune: collected.fortune }))
  assert.match(markup, /Clover batch opened/)
  assert.equal((markup.match(/class="fortune-batch-result"/g) ?? []).length, 3)
  assert.equal((markup.match(/×2/g) ?? []).length, 3)
  assert.match(markup, /Repeated timed effects extend their duration/)
})

test('active Fortune tooltips display overcharged effects and timer speed, including the linear Leek bonus', () => {
  const game = createPerfectedCloverGame()
  const fortune = {
    ...game.fortune,
    activeEffects: [
      { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 1200 },
      { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 1800 },
      { id: FORTUNE_EFFECT_IDS.LEEK_COOKIE, remainingSeconds: 1200 },
    ],
  }
  const markup = renderToStaticMarkup(createElement(CloverFortune, { fortune }))
  assert.equal((markup.match(/fortune-effect-overcharged/g) ?? []).length, 3)
  assert.match(markup, /Crop yields ×315/)
  assert.match(markup, /33\.1% Crop passive effects/)
  assert.match(markup, /Leek Enrichment \^1\.4/)
  assert.match(markup, /Overcharged: multipliers \^2/)
  assert.match(markup, /Leek bonus ×2/)
  assert.match(markup, /timer ×4/)
  assert.match(markup, /stored seconds/)
})
