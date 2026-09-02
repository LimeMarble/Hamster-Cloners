import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FORTUNE_EFFECT_IDS,
  addRandomFortuneEffect,
  FORTUNE_EFFECTS,
  advanceFortuneState,
  collectCloverBundle,
  createBlueprint,
  createInitialGame,
  getAdjacentCropEffectModifier,
  getBlueprintCropStats,
  getCloverBundleChancePerMinute,
  getCropHamsterEfficiencyMultiplier,
  getCropProductionSnapshotPerSecond,
  getFortuneModifiers,
  getMirrorCornEffectMultiplier,
  normalizeFortuneState,
  spawnCloverBundle,
  wipeActiveFortuneEffects,
} from '../src/game/gameLogic.js'
import { getUnlockedCropIds } from '../src/game/crops.js'

function createCloverGame(fieldsPlanted = 1) {
  return {
    ...createInitialGame(),
    blueprint: createBlueprint({
      rows: 10,
      columns: 10,
      cells: ['fourLeafClover'],
    }),
    farmland: {
      rows: 1,
      columns: fieldsPlanted,
      floors: 1,
      farms: 1,
      otherMultiplier: 1,
    },
  }
}

test('4-Leaf Clover unlocks from Trade, cannot harvest, and normalizes to one per blueprint', () => {
  const unlocked = getUnlockedCropIds(
    createBlueprint(),
    false,
    0,
    false,
    false,
    false,
    false,
    false,
    false,
    0,
    false,
    true,
  )
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['fourLeafClover', 'fourLeafClover', 'leek'],
  })
  const production = getCropProductionSnapshotPerSecond(
    blueprint,
    { rows: 1, columns: 1, floors: 1, farms: 1, otherMultiplier: 1 },
  )

  assert.deepEqual(unlocked, ['leek', 'fourLeafClover'])
  assert.deepEqual(blueprint.cells, ['fourLeafClover', null, 'leek'])
  assert.equal(production.byCrop.fourLeafClover, undefined)
})

test('Clover Bundle chance follows the Fields Planted logarithm and 77 percent cap', () => {
  assert.ok(Math.abs(getCloverBundleChancePerMinute(createCloverGame()) - 0.07) < 1e-12)
  assert.ok(
    Math.abs(getCloverBundleChancePerMinute(createCloverGame(1e40)) - 0.35) < 1e-12,
  )
  assert.equal(getCloverBundleChancePerMinute(createCloverGame(1e100)), 0.77)
})

test('a Clover Bundle rolls once per minute and persists at its screen position', () => {
  const waitingGame = advanceFortuneState(createCloverGame(), 59, () => 0)
  const randomValues = [0.01, 0.25, 0.5]
  const spawnedGame = advanceFortuneState(
    waitingGame,
    1,
    () => randomValues.shift(),
  )

  assert.deepEqual(waitingGame.fortune.bundles, [])
  assert.equal(waitingGame.fortune.secondsTowardBundleRoll, 59)
  assert.deepEqual(spawnedGame.fortune.bundles, [{ x: 30, y: 46 }])
  assert.equal(spawnedGame.fortune.secondsTowardBundleRoll, 0)
})

test('the automatic Clover timer pauses while any bundle is waiting', () => {
  const game = {
    ...createCloverGame(),
    fortune: {
      bundles: [
        { x: 20, y: 30 },
        { x: 70, y: 60 },
      ],
      secondsTowardBundleRoll: 23,
      activeEffects: [],
      notice: null,
    },
  }
  const advanced = advanceFortuneState(game, 600, () => {
    throw new Error('A paused Clover timer must not roll')
  })

  assert.deepEqual(advanced.fortune.bundles, game.fortune.bundles)
  assert.equal(advanced.fortune.secondsTowardBundleRoll, 23)
})

test('Clover Bundle outcome weights and durations match the configured Breezes', () => {
  assert.deepEqual(
    FORTUNE_EFFECTS.map(({ id, weight, durationSeconds }) => ({
      id,
      weight,
      durationSeconds,
    })),
    [
      {
        id: FORTUNE_EFFECT_IDS.DEMONSTRATION,
        weight: 0.17,
        durationSeconds: 37,
      },
      { id: FORTUNE_EFFECT_IDS.BOUNTY, weight: 0.52, durationSeconds: 117 },
      { id: FORTUNE_EFFECT_IDS.SPLIT, weight: 0.2, durationSeconds: 0 },
      { id: FORTUNE_EFFECT_IDS.OPUS, weight: 0.11, durationSeconds: 27 },
    ],
  )

  const bundledGame = {
    ...createInitialGame(),
    fortune: {
      ...createInitialGame().fortune,
      bundles: [{ x: 50, y: 50 }],
    },
  }
  const rolls = [0, 0.2, 0.7, 0.9]
  const expectedIds = [
    FORTUNE_EFFECT_IDS.DEMONSTRATION,
    FORTUNE_EFFECT_IDS.BOUNTY,
    FORTUNE_EFFECT_IDS.SPLIT,
    FORTUNE_EFFECT_IDS.OPUS,
  ]

  rolls.forEach((roll, index) => {
    const result = collectCloverBundle(bundledGame, () => roll)
    assert.equal(result.fortune.notice.effectId, expectedIds[index])
  })
})

test("Fortune's Split replaces the collected bundle with two collectable bundles", () => {
  const game = {
    ...createCloverGame(),
    fortune: {
      bundles: [{ x: 50, y: 50 }],
      secondsTowardBundleRoll: 17,
      activeEffects: [],
      notice: null,
    },
  }
  const randomValues = [0.7, 0.1, 0.2, 0.3, 0.4]
  const split = collectCloverBundle(game, 0, () => randomValues.shift())

  assert.deepEqual(split.fortune.bundles, [
    { x: 18, y: 25.6 },
    { x: 34, y: 39.2 },
  ])
  assert.deepEqual(split.fortune.activeEffects, [])
  assert.deepEqual(split.fortune.notice, {
    effectId: FORTUNE_EFFECT_IDS.SPLIT,
    remainingSeconds: 6,
  })
  assert.equal(split.fortune.secondsTowardBundleRoll, 17)
})

test('collecting one of several Clover Bundles leaves the others on screen', () => {
  const game = {
    ...createCloverGame(),
    fortune: {
      bundles: [
        { x: 20, y: 30 },
        { x: 70, y: 60 },
      ],
      secondsTowardBundleRoll: 0,
      activeEffects: [],
      notice: null,
    },
  }
  const collected = collectCloverBundle(game, 1, () => 0)

  assert.deepEqual(collected.fortune.bundles, [{ x: 20, y: 30 }])
  assert.deepEqual(collected.fortune.activeEffects, [
    {
      id: FORTUNE_EFFECT_IDS.DEMONSTRATION,
      remainingSeconds: 37,
    },
  ])
})

test('legacy negative Breezes are removed while old Opus becomes Demonstration', () => {
  const normalized = normalizeFortuneState({
    activeEffects: [
      { id: 'opus', remainingSeconds: 10 },
      { id: 'prank', remainingSeconds: 10 },
      { id: 'blight', remainingSeconds: 10 },
    ],
  })

  assert.deepEqual(normalized.activeEffects, [
    { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 10 },
  ])
})
test('collecting the same timed Breeze adds its duration to the remaining timer', () => {
  const game = {
    ...createCloverGame(),
    fortune: {
      bundles: [{ x: 50, y: 50 }],
      secondsTowardBundleRoll: 0,
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 12 },
      ],
      notice: null,
    },
  }

  const collected = collectCloverBundle(game, () => 0)

  assert.deepEqual(collected.fortune.activeEffects, [
    { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 49 },
  ])
})
test('the Clover-effect cheat simulates collecting a bundle and stacks timers', () => {
  const game = createCloverGame()
  const firstEffect = addRandomFortuneEffect(game, () => 0)
  const stackedEffect = addRandomFortuneEffect(firstEffect, () => 0)
  const duration = FORTUNE_EFFECTS.find(
    (effect) => effect.id === FORTUNE_EFFECT_IDS.DEMONSTRATION,
  ).durationSeconds

  assert.deepEqual(firstEffect.fortune.bundles, [])
  assert.deepEqual(firstEffect.fortune.activeEffects, [
    { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: duration },
  ])
  assert.deepEqual(firstEffect.fortune.notice, {
    effectId: FORTUNE_EFFECT_IDS.DEMONSTRATION,
    remainingSeconds: 6,
  })
  assert.equal(
    stackedEffect.fortune.activeEffects[0].remainingSeconds,
    duration * 2,
  )
})

test('testing helpers spawn a bundle and wipe only active Clover effects', () => {
  const game = {
    ...createCloverGame(),
    fortune: {
      bundles: [],
      secondsTowardBundleRoll: 23,
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 40 },
      ],
      notice: { effectId: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 3 },
    },
  }
  const randomValues = [0.25, 0.75]
  const spawned = spawnCloverBundle(game, () => randomValues.shift())
  const wiped = wipeActiveFortuneEffects(spawned)

  assert.deepEqual(spawned.fortune.bundles, [{ x: 30, y: 63 }])
  assert.deepEqual(wiped.fortune.activeEffects, [])
  assert.deepEqual(wiped.fortune.bundles, [{ x: 30, y: 63 }])
  assert.deepEqual(wiped.fortune.notice, game.fortune.notice)
})
test('crop hover stats include the updated Breeze yield and passive modifiers', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['sweetPotato', null, null, null],
  })
  const demonstratedStats = getBlueprintCropStats(
    blueprint,
    0,
    [],
    0,
    0,
    0,
    getFortuneModifiers({
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 10 },
        { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 10 },
      ],
    }),
  )
  const opusStats = getBlueprintCropStats(
    blueprint,
    0,
    [],
    0,
    0,
    0,
    getFortuneModifiers({
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.OPUS, remainingSeconds: 10 },
      ],
    }),
  )

  assert.equal(demonstratedStats.harvestYield, 17.77)
  assert.equal(demonstratedStats.hamsterEfficiencyBonus, 0.25 * 1.1)
  assert.ok(
    demonstratedStats.receivedEffects.some(
      (effect) => effect.type === 'fortune-passive' && effect.multiplier === 1.1,
    ),
  )
  assert.ok(
    demonstratedStats.receivedEffects.some(
      (effect) => effect.type === 'fortune-crop-yield' && effect.multiplier === 17.77,
    ),
  )
  assert.equal(opusStats.harvestYield, 7.77)
  assert.equal(opusStats.hamsterEfficiencyBonus, 0.25 * 1.0777)
  assert.ok(
    opusStats.receivedEffects.some(
      (effect) => effect.type === 'fortune-passive' && effect.multiplier === 1.0777,
    ),
  )
  assert.ok(
    opusStats.receivedEffects.some(
      (effect) => effect.type === 'fortune-crop-yield' && effect.multiplier === 7.77,
    ),
  )
})
test('Bounty and Opus multiply Crop yield', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['leek'],
  })
  const farmland = {
    rows: 1,
    columns: 1,
    floors: 1,
    farms: 1,
    otherMultiplier: 1,
  }
  const bounty = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    [],
    1,
    0,
    { cropYieldMultiplier: 17.77 },
  )
  const opus = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    [],
    1,
    0,
    { cropYieldMultiplier: 7.77, passiveEffectMultiplier: 1.0777 },
  )

  assert.equal(bounty.total, 17.77)
  assert.equal(opus.total, 7.77)
})
test('Demonstration and Opus modify protected Turnip and Mirror Corn passives', () => {
  const passiveMultiplier = 1.1
  const turnipBlueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['turnip', 'sweetPotato'],
  })
  const mirrorBlueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', null, null, 'leek'],
    mirrorCornTargets: [3, null, null, null],
  })
  const turnipMultiplier = getAdjacentCropEffectModifier(
    turnipBlueprint,
    'turnip',
    'sweetPotato',
    0,
    false,
    [],
    passiveMultiplier,
  )
  const mirrorMultiplier = getMirrorCornEffectMultiplier(
    mirrorBlueprint,
    3,
    ['mirrorCorn'],
    passiveMultiplier,
  )
  const hamsterMultiplier = getCropHamsterEfficiencyMultiplier(
    turnipBlueprint,
    [],
    0,
    passiveMultiplier,
  )

  assert.ok(Math.abs(turnipMultiplier - 2 * passiveMultiplier) < 1e-12)
  assert.ok(Math.abs(mirrorMultiplier - 4 * passiveMultiplier) < 1e-12)
  assert.ok(
    Math.abs(
      hamsterMultiplier -
        (1 + 0.25 * passiveMultiplier * (2 * passiveMultiplier)),
    ) < 1e-12,
  )

  const combinedModifiers = getFortuneModifiers({
    activeEffects: [
      { id: FORTUNE_EFFECT_IDS.DEMONSTRATION, remainingSeconds: 10 },
      { id: FORTUNE_EFFECT_IDS.OPUS, remainingSeconds: 10 },
    ],
  })
  assert.ok(
    Math.abs(combinedModifiers.passiveEffectMultiplier - 1.1 * 1.0777) < 1e-12,
  )
  assert.equal(combinedModifiers.cropYieldMultiplier, 7.77)
})
