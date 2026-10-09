import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceFortuneEffectTimer,
  advanceFortuneState,
  advanceGameSimulationStep,
  addRandomFortuneEffect,
  createBlueprint,
  createInitialGame,
  FORTUNE_EFFECT_IDS,
  FORTUNE_OVERCHARGE_DURATION_SECONDS,
  FORTUNE_OVERCHARGE_STRENGTH_STEP,
  getActiveFortuneEffectModifiers,
  getCapybaraBlueprintCropYield,
  getCropProductionSnapshotPerSecond,
  getFortuneEffect,
  getFortuneModifiers,
  getFortuneOvercharge,
} from '../src/game/gameLogic.js'
import { exportGame, importGame } from '../src/game/storage.js'

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} ≠ ${expected}`)
}

function chargedGame(activeArea = 'main', seconds = 1250) {
  const initial = createInitialGame()
  return {
    ...initial,
    activeArea,
    blueprint: createBlueprint({ cells: ['leek'] }),
    farmland: { rows: 1, columns: 1, floors: 1, farms: 1, otherMultiplier: 1 },
    cloverAssembly: { ...initial.cloverAssembly, assembled: true },
    fortune: {
      ...initial.fortune,
      activeEffects: [{ id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: seconds }],
    },
  }
}

test('overcharge has a shared 600-second threshold and stable 0.1 strength steps', () => {
  assert.equal(FORTUNE_OVERCHARGE_DURATION_SECONDS, 600)
  assert.equal(FORTUNE_OVERCHARGE_STRENGTH_STEP, 0.1)
  for (const remaining of [0, 30, 599, 600, 659.9, NaN, Infinity, -1]) {
    assert.deepEqual(getFortuneOvercharge(remaining), { strengthExponent: 1, timerSpeed: 1 })
  }
  close(getFortuneOvercharge(660).strengthExponent, 1.1)
  assert.deepEqual(getFortuneOvercharge(1200), { strengthExponent: 2, timerSpeed: 2 })
  assert.deepEqual(getFortuneOvercharge(1800), { strengthExponent: 3, timerSpeed: 4 })
})

test('timed multipliers exponentiate independently while Leek scales only its bonus above one', () => {
  for (const [remainingSeconds, strength] of [[600, 1], [1200, 2], [1800, 3]]) {
    const modifiers = (id) => getActiveFortuneEffectModifiers({ id, remainingSeconds })
    close(modifiers(FORTUNE_EFFECT_IDS.BOUNTY).cropYieldMultiplier, 17.77 ** strength)
    close(modifiers(FORTUNE_EFFECT_IDS.DEMONSTRATION).passiveEffectMultiplier, 1.1 ** strength)
    close(modifiers(FORTUNE_EFFECT_IDS.OPUS).cropYieldMultiplier, 7.77 ** strength)
    close(modifiers(FORTUNE_EFFECT_IDS.OPUS).passiveEffectMultiplier, 1.0777 ** strength)
    close(modifiers(FORTUNE_EFFECT_IDS.LEEK_COOKIE).leekEnrichmentExponent, 1 + 0.2 * strength)
    for (const id of [FORTUNE_EFFECT_IDS.SPLIT, FORTUNE_EFFECT_IDS.MIRAGE, 'unknown']) {
      assert.deepEqual(modifiers(id), {
        passiveEffectMultiplier: 1, cropYieldMultiplier: 1,
        harvestMultiplier: 1, leekEnrichmentExponent: 1,
      })
    }
  }
})

test('short timers retain normal speed, while charged timers consume two or four seconds per second', () => {
  assert.equal(advanceFortuneEffectTimer(500, 10), 490)
  assert.equal(advanceFortuneEffectTimer(1250, 10), 1230)
  assert.equal(advanceFortuneEffectTimer(1850, 10), 1810)
  assert.equal(advanceFortuneEffectTimer(30, 40), 0)
  assert.equal(advanceFortuneEffectTimer(1250, -10), 1250)
  assert.equal(advanceFortuneEffectTimer(1250, 0), 1250)
})

test('decay crosses strength bands at their lower speeds instead of retaining peak speed', () => {
  const afterFirstBand = advanceFortuneEffectTimer(1210, 10)
  close(afterFirstBand, 1200 - 5 * 2 ** 0.9)
  close(getFortuneOvercharge(afterFirstBand).strengthExponent, 1.9)
  const timeToNormal = 20 / 2 ** 0.1
  close(advanceFortuneEffectTimer(680, timeToNormal + 100), 560)
  assert.deepEqual(getFortuneOvercharge(560), { strengthExponent: 1, timerSpeed: 1 })
})

test('compressed catch-up timer decay agrees with 60-Hz decay across many bands', () => {
  for (const [remaining, elapsed] of [[1250, 400], [1850, 900], [10000, 700]]) {
    let stepped = remaining
    for (let tick = 0; tick < elapsed * 60; tick++) {
      stepped = advanceFortuneEffectTimer(stepped, 1 / 60)
    }
    close(advanceFortuneEffectTimer(remaining, elapsed), stepped, 1e-8)
  }
})

test('even enormous imported timers decay in constant time and eventually expire', () => {
  const remaining = advanceFortuneEffectTimer(Number.MAX_VALUE, 1)
  assert.ok(Number.isFinite(remaining) && remaining > 600 && remaining < 10000)
  assert.equal(advanceFortuneEffectTimer(Number.MAX_VALUE, 3600), 0)
})

test('Bounty adds 77 seconds per roll and excess duration immediately raises its strength', () => {
  assert.equal(getFortuneEffect(FORTUNE_EFFECT_IDS.BOUNTY).durationSeconds, 77)
  const game = chargedGame('main', 590)
  // The default allocation rolls Bounty at 20%.
  const stacked = addRandomFortuneEffect(game, () => 0.2)
  assert.equal(stacked.fortune.activeEffects[0].remainingSeconds, 667)
  close(getFortuneModifiers(stacked).cropYieldMultiplier, 17.77 ** 1.1)
})

test('overcharge applies to Main and perfected Misfortune, but never strengthens Wrath itself', () => {
  const main = chargedGame()
  close(getFortuneModifiers(main).cropYieldMultiplier, 17.77 ** 2)
  const misfortune = chargedGame('misfortune')
  close(getFortuneModifiers(misfortune).cropYieldMultiplier, 17.77 ** 2 / 1777)
  close(getFortuneModifiers(misfortune).passiveEffectMultiplier, 0.63)
  const unperfected = { ...misfortune, cloverAssembly: { assembled: false } }
  close(getFortuneModifiers(unperfected).cropYieldMultiplier, 1 / 1777)
  assert.equal(advanceFortuneState(unperfected, 10), unperfected)
})

test('the timer decays during blueprint editing and production uses the same charge as Demo 0', () => {
  const game = chargedGame()
  const advanced = advanceGameSimulationStep(game, 1 / 60)
  close(advanced.crops - game.crops, 17.77 ** 2 / 60)
  close(getCapybaraBlueprintCropYield(game), 17.77 ** 2)
  close(advanced.fortune.activeEffects[0].remainingSeconds, 1250 - 2 / 60)
  const editing = advanceGameSimulationStep(game, 1 / 60, { isEditingBlueprint: true })
  assert.equal(editing.crops, game.crops)
  close(editing.fortune.activeEffects[0].remainingSeconds, 1250 - 2 / 60)
})

test('cached field snapshots remain stable within charge bands and invalidate at band changes', () => {
  const game = chargedGame()
  const snapshot = (current) => getCropProductionSnapshotPerSecond(
    current.blueprint, current.farmland, current.completedCropPerfections, 1, 0,
    getFortuneModifiers(current), current.seedAugmentations,
  )
  const first = snapshot(game)
  assert.strictEqual(snapshot(advanceFortuneState(game, 1)), first)
  assert.strictEqual(snapshot(advanceFortuneState(game, 10)), first)
  const lowerCharge = snapshot(advanceFortuneState(game, 26))
  assert.notStrictEqual(lowerCharge, first)
  assert.ok(lowerCharge.total < first.total)
})

test('saved durations survive export/import and derive the same overcharge without extra saved fields', () => {
  const game = chargedGame('main', 1850)
  const restored = importGame(exportGame(game))
  assert.deepEqual(restored.fortune.activeEffects, game.fortune.activeEffects)
  assert.deepEqual(getFortuneModifiers(restored), getFortuneModifiers(game))
  close(advanceFortuneState(restored, 10).fortune.activeEffects[0].remainingSeconds, 1810)
})
