import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceFortuneEffectTimer,
  advanceGameByElapsedTime,
  advanceGameByStepCount,
  advanceGameSimulationStep,
  createBlueprint,
  createInitialGame,
  FLOOR_REPLICATOR_MODES,
  FORTUNE_EFFECT_IDS,
  getFortuneModifiers,
  MANATEE_SURVEY_IDS,
  MISFORTUNE_UPGRADE_IDS,
  RABBIT_UNLOCK_IDS,
  startManateeSurvey,
} from '../src/game/gameLogic.js'
import { exportGame, importGame } from '../src/game/storage.js'

function fortuneGame(activeArea = 'main') {
  const initial = createInitialGame()
  const blueprint = createBlueprint({
    rows: 3, columns: 3,
    cells: ['leek', 'potato', 'sunflower', 'carrot', 'soybean', null,
      null, null, 'fourLeafClover'],
  })
  return {
    ...initial,
    activeArea,
    blueprint,
    blueprintSlots: [blueprint],
    hamsters: 3,
    rowDuplicators: 3,
    floorReplicators: 30,
    hasUnlockedRowDuplicators: true,
    hasUnlockedFloorReplicators: true,
    floorReplicatorMode: FLOOR_REPLICATOR_MODES.SUPPORT,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
      MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT],
    completedCropPerfections: ['enrichingLeek'],
    cloverAssembly: { ...initial.cloverAssembly, assembled: true },
    farmland: { rows: 3, columns: 10, floors: 1, farms: 1, otherMultiplier: 1 },
    fortune: {
      ...initial.fortune,
      secondsTowardBundleRoll: 4,
      nextRollSeconds: 5,
      rollSchedule: { firstSeconds: 5, intervalSeconds: 5 },
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 1850 },
        { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 1250 },
        { id: FORTUNE_EFFECT_IDS.OPUS, remainingSeconds: 300 },
        { id: FORTUNE_EFFECT_IDS.LEEK_COOKIE, remainingSeconds: 1250 },
      ],
      notice: { effectId: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 5 },
    },
  }
}

function withoutEffects(game) {
  return { ...game, fortune: { ...game.fortune, activeEffects: [] } }
}

test('offline production ignores timed fortunes in both areas but preserves Wrath and Support', () => {
  for (const area of ['main', 'misfortune']) {
    const game = fortuneGame(area)
    const baseline = withoutEffects(game)
    const normalModifiers = getFortuneModifiers(baseline)
    assert.ok(Math.abs(normalModifiers.passiveEffectMultiplier -
      (area === 'main' ? 1.006 : 0.666)) < 1e-12)
    if (area === 'misfortune') {
      assert.equal(normalModifiers.cropYieldMultiplier, 1 / 1777)
      assert.equal(normalModifiers.cropProductionExponent, 0.5)
    }
    const options = { mode: 'catch-up', random: () => 0.5 }
    const advanced = advanceGameByElapsedTime(game, 20, options)
    const expected = advanceGameByElapsedTime(baseline, 20, options)
    assert.deepEqual(withoutEffects(advanced), expected)
    assert.strictEqual(advanced.fortune, game.fortune)
    assert.ok(advanced.crops > game.crops)
    assert.ok(advanced.farmland.columns > game.farmland.columns)
    assert.ok(advanced.farmland.rows > game.farmland.rows)
    assert.equal(advanced.playtimeSeconds - game.playtimeSeconds, 20)
    assert.equal(advanced.secondsSinceAreaReset - game.secondsSinceAreaReset, 20)
  }
})

test('every catch-up entry point freezes durations, overcharge, notices and spawn progress', () => {
  const game = fortuneGame()
  const simulations = [
    () => advanceGameByElapsedTime(game, 0.01),
    () => advanceGameByElapsedTime(game, 3600),
    () => advanceGameSimulationStep(game, 3600, { mode: 'catch-up' }),
    () => advanceGameByStepCount(game, 3600, 100, { mode: 'catch-up' }),
    () => advanceGameByStepCount(game, 3600, 1, { mode: 'catch-up' }),
    () => advanceGameByElapsedTime(game, 3600, { isEditingBlueprint: true }),
  ]
  for (const simulate of simulations) {
    const advanced = simulate()
    assert.strictEqual(advanced.fortune, game.fortune)
    assert.deepEqual(getFortuneModifiers(advanced), getFortuneModifiers(game))
  }
  for (const elapsed of [0, -1, NaN, Infinity]) {
    assert.strictEqual(advanceGameByElapsedTime(game, elapsed), game)
  }
})

test('neither four-leaf nor five-leaf Clovers roll offline, and pending batches stay intact', () => {
  for (const assembled of [false, true]) {
    for (const bundles of [[], [{ x: 25, y: 30, effectCount: 6 },
      { x: 55, y: 60, splitBlocked: true }]]) {
      const game = fortuneGame()
      game.cloverAssembly.assembled = assembled
      game.fortune = { ...game.fortune, bundles, secondsTowardBundleRoll: 59.9 }
      const advanced = advanceGameSimulationStep(game, 86400, {
        mode: 'catch-up',
        random: () => { throw new Error('Offline Clovers must not roll') },
      })
      assert.strictEqual(advanced.fortune, game.fortune)
    }
  }
})

test('active play resumes the preserved effects and clocks, including during blueprint editing', () => {
  const game = fortuneGame()
  const offline = advanceGameByElapsedTime(game, 100)
  const elapsed = 1 / 60
  const active = advanceGameSimulationStep(offline, elapsed, { random: () => 1 })
  const unbuffed = advanceGameSimulationStep(withoutEffects(offline), elapsed,
    { random: () => 1 })
  assert.ok(active.crops - offline.crops > unbuffed.crops - offline.crops)
  const editing = advanceGameSimulationStep(offline, elapsed,
    { isEditingBlueprint: true, random: () => 1 })
  assert.equal(editing.crops, offline.crops)
  for (const advanced of [active, editing]) {
    assert.equal(advanced.fortune.activeEffects[0].remainingSeconds,
      advanceFortuneEffectTimer(1850, elapsed))
    assert.equal(advanced.fortune.secondsTowardBundleRoll, 4 + elapsed)
    assert.equal(advanced.fortune.notice.remainingSeconds, 5 - elapsed)
  }
})

test('automatic Rabbit rewards and Manatee work use the unbuffed offline view', () => {
  const initial = fortuneGame()
  const game = startManateeSurvey({
    ...initial,
    hamsters: 1875,
    postUnionHamstersHired: 1,
    blueprint: createBlueprint({ rows: 3, columns: 3,
      cells: ['leek', 'potato', 'sunflower', 'carrot', 'mangroveSapling', null,
        null, null, 'fourLeafClover'] }),
    completedCropPerfections: ['enrichingLeek', 'blazingCarrot'],
    trade: {
      ...initial.trade,
      established: true,
      totalRabbitRelationsEarned: 1e20,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR, RABBIT_UNLOCK_IDS.CARROT],
      rabbitContracts: Array.from({ length: 3 }, () => ({
        cropId: 'carrot', factor: 30e6, fieldsPlanted: 30,
        requiredAmount: 100, progress: 100, relationsReward: 100,
      })),
    },
  }, MANATEE_SURVEY_IDS.SEARCH_MARSH)
  assert.ok(game)
  const options = { mode: 'catch-up', random: () => 0.5 }
  const advanced = advanceGameByElapsedTime(game, 120, options)
  const baseline = advanceGameByElapsedTime(withoutEffects(game), 120, options)
  assert.deepEqual(advanced.trade, baseline.trade)
  assert.deepEqual(advanced.manatees, baseline.manatees)
  assert.ok(advanced.trade.rabbitRelations > 0)
  assert.ok(advanced.manatees.pendingFinds.length > 0)
  assert.strictEqual(advanced.fortune, game.fortune)
})

test('a short return cannot reuse a buffed cached Rabbit completion estimate', () => {
  const initial = createInitialGame()
  const game = {
    ...initial,
    farmland: { ...initial.farmland, columns: 1e40 },
    fortune: fortuneGame().fortune,
    trade: { ...initial.trade, established: true,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CONTRACTOR],
      rabbitContractPaceSampleSeconds: 0,
      rabbitContractEstimatedCompletionsPerSecond: 1e9,
      rabbitBulkContractElapsedSeconds: 0.09 },
  }
  const advanced = advanceGameByElapsedTime(game, 0.02)
  assert.equal(advanced.trade.rabbitContractsCompleted, 0)
  assert.equal(advanced.trade.rabbitRelations, 0)
  assert.ok(advanced.trade.rabbitContractEstimatedCompletionsPerSecond < 10)
})

test('save round-trips retain charged fortunes before and after offline catch-up', () => {
  const game = fortuneGame()
  const restored = importGame(exportGame(game))
  const advanced = advanceGameByElapsedTime(restored, 600)
  const savedAgain = importGame(exportGame(advanced))
  assert.deepEqual(savedAgain.fortune, restored.fortune)
  const resumed = advanceGameSimulationStep(savedAgain, 1 / 60)
  assert.ok(resumed.fortune.activeEffects[0].remainingSeconds < 1850)
})
