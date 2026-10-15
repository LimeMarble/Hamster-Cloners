import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceGameSimulationStep,
  createBlueprint,
  createInitialGame,
  getBlueprintSlotUnlockHints,
  getUnlockedBlueprintSlotCount,
  resetForBlueprintExpansion,
  switchGameArea,
} from '../src/game/gameLogic.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'

test('Main unlocks slots with Potato, Sunflower, and Peanuts', () => {
  const game = createInitialGame()
  assert.equal(getUnlockedBlueprintSlotCount(game), 1)
  assert.equal(getUnlockedBlueprintSlotCount({ ...game, unionized: true, hamsters: 125 }), 2)
  assert.equal(getUnlockedBlueprintSlotCount({ ...game, hasUnlockedSunflower: true }), 3)
  assert.equal(getUnlockedBlueprintSlotCount({ ...game, earnedAchievementIds: ['makingPeanuts'] }), 4)
})

test('Soybean no longer grants the fourth Main slot without Peanuts', () => {
  const game = {
    ...createInitialGame(),
    hasUnlockedSunflower: true,
    floorReplicators: 555,
    areaProgress: { main: null, misfortune: { rowDuplicators: 500 } },
  }
  assert.equal(getUnlockedBlueprintSlotCount(game), 3)
})

test('Misfortune ignores Potato and unlocks slots with Peanuts, Sunflower, and Soybean', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune', unionized: true, hamsters: 125 }
  assert.equal(getUnlockedBlueprintSlotCount(game), 1)
  assert.equal(getUnlockedBlueprintSlotCount({ ...game, earnedAchievementIds: ['makingPeanuts'] }), 2)
  assert.equal(getUnlockedBlueprintSlotCount({ ...game, hasUnlockedSunflower: true }), 3)
  assert.equal(getUnlockedBlueprintSlotCount({ ...game, rowDuplicators: 500, floorReplicators: 555 }), 4)
  assert.equal(getUnlockedBlueprintSlotCount({
    ...game, hasUnlockedSunflower: true, rowDuplicators: 499, floorReplicators: 555,
  }), 3)
})

test('Sunflower in the other area does not unlock Misfortune slots', () => {
  const game = {
    ...createInitialGame(), activeArea: 'misfortune',
    areaProgress: { main: { hasUnlockedSunflower: true }, misfortune: null },
  }
  assert.equal(getUnlockedBlueprintSlotCount(game), 1)
})

test('slot lock hints follow the active area', () => {
  const mainHints = getBlueprintSlotUnlockHints(createInitialGame())
  const misfortuneHints = getBlueprintSlotUnlockHints({ activeArea: 'misfortune' })
  assert.deepEqual(mainHints.slice(1, 4), [
    'Unlocks with Potato', 'Unlocks with Sunflower', 'Unlocks with Peanuts',
  ])
  assert.deepEqual(misfortuneHints.slice(1, 4), [
    'Unlocks with Peanuts', 'Unlocks with Sunflower', 'Unlocks with Soybean',
  ])
  assert.equal(mainHints[4], 'Unlocks with Mangrove Sapling')
  assert.equal(misfortuneHints[4], mainHints[4])
})

test('simulation creates the area-specific Peanut slots without changing existing blueprints', () => {
  for (const [activeArea, count] of [['main', 4], ['misfortune', 2]]) {
    const game = { ...createInitialGame(), activeArea, earnedAchievementIds: ['makingPeanuts'] }
    const next = advanceGameSimulationStep(game, 1 / 60, { random: () => 1 })
    assert.equal(next.blueprintSlots.length, count)
    assert.strictEqual(next.blueprintSlots[0], game.blueprint)
  }
})

test('loading a Peanut save immediately creates the slots appropriate to its active area', () => {
  for (const [activeArea, count] of [['main', 4], ['misfortune', 2]]) {
    const loaded = normalizeGame({
      ...createInitialGame(), activeArea, earnedAchievementIds: ['makingPeanuts'],
    })
    assert.equal(loaded.blueprintSlots.length, count)
    assert.equal(getUnlockedBlueprintSlotCount(loaded), count)
  }
})

test('save round trips preserve all stored blueprints while clamping selection to available slots', () => {
  const slots = Array.from({ length: 4 }, (_, cropIndex) => createBlueprint({
    rows: 2, columns: 2,
    cells: Array.from({ length: 4 }, (_, index) => index === cropIndex ? 'leek' : null),
  }))
  for (const [activeArea, activeSlot] of [['main', 3], ['misfortune', 1]]) {
    const loaded = importGame(exportGame({
      ...createInitialGame(), activeArea, earnedAchievementIds: ['makingPeanuts'],
      blueprint: slots[3], blueprintSlots: slots, activeBlueprintSlot: 3,
    }))
    assert.deepEqual(loaded.blueprintSlots, slots)
    assert.equal(loaded.activeBlueprintSlot, activeSlot)
    assert.deepEqual(loaded.blueprint, slots[activeSlot])
  }
})

test('switching areas preserves Main slots without carrying its slot prerequisites into Misfortune', () => {
  const blueprintSlots = Array.from({ length: 4 }, () => createBlueprint({ cells: ['leek'] }))
  const game = {
    ...createInitialGame(), earnedAchievementIds: ['makingPeanuts'],
    hasUnlockedSunflower: true, blueprintSlots, activeBlueprintSlot: 3,
    blueprint: blueprintSlots[3],
  }
  const misfortune = advanceGameSimulationStep(switchGameArea(game, 'misfortune'), 1 / 60)
  assert.equal(getUnlockedBlueprintSlotCount(misfortune), 2)
  assert.equal(misfortune.blueprintSlots.length, 2)
  const main = switchGameArea(misfortune, 'main')
  assert.equal(getUnlockedBlueprintSlotCount(main), 4)
  assert.deepEqual(main.blueprintSlots, blueprintSlots)
  assert.equal(main.activeBlueprintSlot, 3)
})

test('blueprint resets retain the Peanut slot unlock in both areas', () => {
  for (const [activeArea, count] of [['main', 4], ['misfortune', 2]]) {
    const game = advanceGameSimulationStep({
      ...createInitialGame(), activeArea, earnedAchievementIds: ['makingPeanuts'], crops: 1e8,
    }, 1 / 60)
    const reset = resetForBlueprintExpansion(game, 'firstColumn')
    assert.ok(reset)
    assert.equal(getUnlockedBlueprintSlotCount(reset), count)
    assert.equal(reset.blueprintSlots.length, count)
  }
})
