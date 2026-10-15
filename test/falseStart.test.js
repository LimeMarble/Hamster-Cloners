import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACHIEVEMENTS, advanceGameByStepCount, advanceGameSimulationStep,
  awardAchievements, createInitialGame, restartFields, switchGameArea,
} from '../src/game/gameLogic.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'

const edit = { isEditingBlueprint: true, random: () => 1 }
const grow = { random: () => 1 }

function restarted(extra = {}) {
  return restartFields({ ...createInitialGame(),
    completedMisfortuneUpgrades: ['rushedStart'], ...extra })
}

function earned(game) {
  return game.earnedAchievementIds.includes('falseStart')
}

test('False Start is Tier 1 and worth five Treats', () => {
  const achievement = ACHIEVEMENTS.find(({ id }) => id === 'falseStart')
  assert.equal(achievement.name, 'False Start')
  assert.equal(achievement.tier, 1)
  assert.equal(achievement.treats, 5)
})

test('editing counts toward sixty seconds, without counting the starting 0.9 Columns', () => {
  for (const activeArea of ['main', 'misfortune']) {
    let game = advanceGameSimulationStep(restarted({ activeArea, hamsters: 10 }), 59, edit)
    assert.equal(earned(game), false)
    assert.equal(game.farmland.columns, 0.9)
    game = advanceGameSimulationStep(game, 1, edit)
    assert.equal(earned(game), true)
    assert.equal(game.secondsSinceAreaReset, 60)
    assert.equal(game.farmland.columns, 0.9)
  }
})

test('any fractional Column production during the minute disqualifies that attempt', () => {
  let game = advanceGameSimulationStep(restarted({ hamsters: 1 }), 0.000001, grow)
  assert.ok(game.farmland.columns > 0.9 && game.farmland.columns < 1)
  assert.equal(game.falseStartEligible, false)
  game = advanceGameSimulationStep(game, 60, edit)
  assert.equal(earned(game), false)
})

test('building Columns just before the minute ends still fails', () => {
  const paused = advanceGameSimulationStep(restarted({ hamsters: 1 }), 59.99, edit)
  const after = advanceGameSimulationStep(paused, 0.02, grow)
  assert.ok(after.secondsSinceAreaReset > 60)
  assert.equal(earned(after), false)
})

test('production after the first minute does not invalidate the award', () => {
  const paused = advanceGameSimulationStep(restarted({ hamsters: 1 }), 60, edit)
  const growing = advanceGameSimulationStep(paused, 1, grow)
  assert.ok(growing.farmland.columns > 0.9)
  assert.equal(earned(growing), true)
  assert.equal(growing.earnedAchievementIds.filter((id) => id === 'falseStart').length, 1)
})

test('zero Column production qualifies without requiring the editor', () => {
  const game = advanceGameSimulationStep(restarted(), 60, grow)
  assert.equal(earned(game), true)
})

test('a compressed catch-up step evaluates the first-minute attempt', () => {
  assert.equal(earned(advanceGameByStepCount(restarted(), 600, 1, grow)), true)
  assert.equal(earned(advanceGameByStepCount(restarted({ hamsters: 1 }), 600, 1, grow)), false)
})

test('a later restart gives another attempt after the previous one fails', () => {
  const failed = advanceGameSimulationStep(restarted({ hamsters: 1 }), 1, grow)
  const retried = restartFields(failed)
  assert.equal(retried.falseStartEligible, true)
  assert.equal(earned(advanceGameSimulationStep(retried, 60, edit)), true)
})

test('buying Rushed Start mid-run does not invent a new False Start attempt', () => {
  const game = { ...createInitialGame(), secondsSinceAreaReset: 120,
    completedMisfortuneUpgrades: ['rushedStart'] }
  assert.equal(earned(awardAchievements(game)), false)
  assert.equal(earned(advanceGameSimulationStep(game, 60, edit)), false)
})

test('mid-attempt saves restore the timer and eligibility', () => {
  const paused = advanceGameSimulationStep(restarted({ hamsters: 1 }), 35, edit)
  const loaded = importGame(exportGame(paused))
  assert.equal(loaded.secondsSinceAreaReset, 35)
  assert.equal(loaded.falseStartEligible, true)
  assert.equal(earned(advanceGameSimulationStep(loaded, 25, edit)), true)
  const failed = advanceGameSimulationStep(restarted({ hamsters: 1 }), 0.000001, grow)
  const restoredFailure = importGame(exportGame(failed))
  assert.equal(restoredFailure.falseStartEligible, false)
  assert.equal(earned(advanceGameSimulationStep(restoredFailure, 60, edit)), false)
})

test('legacy saves do not receive an unverified retrospective award', () => {
  const raw = { ...restarted(), secondsSinceAreaReset: 120 }
  delete raw.falseStartEligible
  const restored = normalizeGame(raw)
  assert.equal(restored.falseStartEligible, false)
  assert.equal(earned(restored), false)
})

test('switching areas keeps independent reset timers and attempts, including across saves', () => {
  const main = advanceGameSimulationStep(restarted(), 20, edit)
  const misfortune = advanceGameSimulationStep(switchGameArea(main, 'misfortune'), 80, edit)
  assert.equal(earned(misfortune), false)
  assert.equal(misfortune.areaProgress.main.secondsSinceAreaReset, 20)
  assert.equal(misfortune.areaProgress.main.falseStartEligible, true)
  const restoredMain = switchGameArea(importGame(exportGame(misfortune)), 'main')
  assert.equal(restoredMain.secondsSinceAreaReset, 20)
  assert.equal(restoredMain.falseStartEligible, true)
  assert.equal(earned(advanceGameSimulationStep(restoredMain, 40, edit)), true)
})

test('removing Rushed Start prevents an armed attempt from awarding', () => {
  const game = { ...restarted(), completedMisfortuneUpgrades: [] }
  const after = advanceGameSimulationStep(game, 60, edit)
  assert.equal(after.falseStartEligible, false)
  assert.equal(earned(after), false)
})

test('earned False Start survives future resets and saves', () => {
  const awarded = advanceGameSimulationStep(restarted(), 60, edit)
  assert.equal(earned(importGame(exportGame(restartFields(awarded)))), true)
})
