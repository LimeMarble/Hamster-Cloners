import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FORTUNE_EFFECT_IDS,
  FORTUNE_EFFECTS,
  advanceFortuneState,
  collectCloverBundle,
  createBlueprint,
  createInitialGame,
  getAdjacentCropEffectModifier,
  getCloverBundleChancePerMinute,
  getCropHamsterEfficiencyMultiplier,
  getCropProductionSnapshotPerSecond,
  getFortuneModifiers,
  getMirrorCornEffectMultiplier,
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

  assert.equal(waitingGame.fortune.bundle, null)
  assert.equal(waitingGame.fortune.secondsTowardBundleRoll, 59)
  assert.deepEqual(spawnedGame.fortune.bundle, { x: 30, y: 46 })
  assert.equal(spawnedGame.fortune.secondsTowardBundleRoll, 0)
})

test('Clover Bundle outcome weights and durations match the configured Breezes', () => {
  assert.deepEqual(
    FORTUNE_EFFECTS.map(({ id, weight, durationSeconds }) => ({
      id,
      weight,
      durationSeconds,
    })),
    [
      { id: FORTUNE_EFFECT_IDS.OPUS, weight: 0.17, durationSeconds: 30 },
      { id: FORTUNE_EFFECT_IDS.BOUNTY, weight: 0.52, durationSeconds: 60 },
      { id: FORTUNE_EFFECT_IDS.MIRAGE, weight: 0.2, durationSeconds: 0 },
      { id: FORTUNE_EFFECT_IDS.PRANK, weight: 0.06, durationSeconds: 44 },
      { id: FORTUNE_EFFECT_IDS.BLIGHT, weight: 0.05, durationSeconds: 30 },
    ],
  )

  const bundledGame = {
    ...createInitialGame(),
    fortune: {
      ...createInitialGame().fortune,
      bundle: { x: 50, y: 50 },
    },
  }
  const rolls = [0, 0.2, 0.7, 0.9, 0.96]
  const expectedIds = [
    FORTUNE_EFFECT_IDS.OPUS,
    FORTUNE_EFFECT_IDS.BOUNTY,
    FORTUNE_EFFECT_IDS.MIRAGE,
    FORTUNE_EFFECT_IDS.PRANK,
    FORTUNE_EFFECT_IDS.BLIGHT,
  ]

  rolls.forEach((roll, index) => {
    const result = collectCloverBundle(bundledGame, () => roll)
    assert.equal(result.fortune.notice.effectId, expectedIds[index])
  })
})

test('Bounty multiplies Crop yield while Blight destroys the harvest', () => {
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
    { cropYieldMultiplier: 7.77 },
  )
  const blight = getCropProductionSnapshotPerSecond(
    blueprint,
    farmland,
    [],
    1,
    0,
    { harvestMultiplier: 0 },
  )

  assert.equal(bounty.total, 7.77)
  assert.equal(blight.total, 0)
})

test('Opus and Prank modify protected Turnip and Mirror Corn passives', () => {
  const passiveMultiplier = 1.0777
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
      { id: FORTUNE_EFFECT_IDS.OPUS, remainingSeconds: 10 },
      { id: FORTUNE_EFFECT_IDS.PRANK, remainingSeconds: 10 },
    ],
  })
  assert.ok(
    Math.abs(combinedModifiers.passiveEffectMultiplier - 1.0777 * 0.9334) < 1e-12,
  )
})
