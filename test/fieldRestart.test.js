import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canRestartFields, createInitialGame, getRushedStartExternalMultiplier,
  purchaseMisfortuneUpgrade, resetForBlueprintExpansion, resetForRowDuplicators,
  resetFarmlandUnits, restartFields, switchGameArea,
} from '../src/game/gameLogic.js'

function readyGame(extra = {}) {
  return {
    ...createInitialGame(), crops: 1e100, hamsters: 100,
    hasUnlockedRowDuplicators: true, rowDuplicators: 50,
    hasUnlockedFloorReplicators: true, floorReplicators: 70,
    secondsSinceAreaReset: 300,
    completedMisfortuneUpgrades: ['rushedStart'],
    farmland: { columns: 500, rows: 200, floors: 100, farms: 10, otherMultiplier: 3 },
    ...extra,
  }
}

test('Restart Fields is unavailable until Rushed Start is purchased', () => {
  const initial = createInitialGame()
  assert.equal(canRestartFields(initial), false)
  assert.equal(restartFields(initial), null)
  assert.equal(canRestartFields(readyGame()), true)
})

test('Restart Fields resets growth in either area without removing permanent progress', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = readyGame({ activeArea, completedCropPerfections: ['enrichingLeek'],
      earnedAchievementIds: ['cropRotation'], totalCropsMade: 1e110,
      playtimeSeconds: 1000, completedBlueprintExpansions: ['firstColumn'] })
    const restarted = restartFields(game)
    assert.equal(restarted.crops, 0)
    assert.equal(restarted.secondsSinceAreaReset, 0)
    assert.equal(restarted.falseStartEligible, true)
    assert.deepEqual(restarted.farmland, resetFarmlandUnits(game.farmland))
    assert.equal(restarted.farmland.columns, 0.9)
    for (const key of ['hamsters', 'rowDuplicators', 'floorReplicators',
      'hasUnlockedRowDuplicators', 'hasUnlockedFloorReplicators', 'blueprint',
      'blueprintSlots', 'blueprintBlocks', 'activeBlueprintSlot', 'completedBlueprintExpansions',
      'completedCropPerfections', 'earnedAchievementIds', 'completedMisfortuneUpgrades',
      'totalCropsMade', 'playtimeSeconds', 'seedAugmentations', 'trade', 'manatees',
      'fortune', 'activeArea', 'areaProgress']) {
      assert.equal(restarted[key], game[key], key)
    }
  }
})

test('Restart Fields can be repeated and restarts the boost rather than the penalty', () => {
  const duringPenalty = readyGame({ secondsSinceAreaReset: 90 })
  assert.equal(getRushedStartExternalMultiplier(duringPenalty), 0.5)
  const first = restartFields(duringPenalty)
  assert.equal(getRushedStartExternalMultiplier(first), 10)
  const second = restartFields({ ...first, falseStartEligible: false,
    secondsSinceAreaReset: 300, crops: 1e50 })
  assert.equal(second.secondsSinceAreaReset, 0)
  assert.equal(second.falseStartEligible, true)
  assert.equal(getRushedStartExternalMultiplier(second), 10)
})

test('Restart Fields leaves the other area untouched', () => {
  const main = readyGame()
  const misfortune = switchGameArea(main, 'misfortune')
  const storedMain = misfortune.areaProgress.main
  const restarted = restartFields(misfortune)
  assert.equal(restarted.areaProgress.main, storedMain)
  assert.equal(storedMain.crops, main.crops)
  assert.equal(storedMain.secondsSinceAreaReset, 300)
})

test('blueprint expansions and the Row Duplicator unlock arm False Start too', () => {
  const game = readyGame()
  for (const reset of [
    resetForBlueprintExpansion(game, 'firstColumn'),
    resetForRowDuplicators({ ...game, hasUnlockedRowDuplicators: false }),
  ]) {
    assert.ok(reset)
    assert.equal(reset.secondsSinceAreaReset, 0)
    assert.equal(reset.falseStartEligible, true)
    assert.equal(reset.farmland.columns, 0.9)
  }
  const earlyExpansion = resetForBlueprintExpansion({ ...game,
    completedMisfortuneUpgrades: [] }, 'firstColumn')
  assert.equal(earlyExpansion.falseStartEligible, false)
})

test('upgrades that reset both areas arm independent False Start attempts', () => {
  const misfortune = switchGameArea(readyGame(), 'misfortune')
  const upgraded = purchaseMisfortuneUpgrade({ ...misfortune, crops: 1e100 }, 'unfortunateRow')
  assert.ok(upgraded)
  assert.equal(upgraded.falseStartEligible, true)
  assert.equal(upgraded.secondsSinceAreaReset, 0)
  assert.equal(upgraded.areaProgress.main.falseStartEligible, true)
  assert.equal(upgraded.areaProgress.main.secondsSinceAreaReset, 0)
})
