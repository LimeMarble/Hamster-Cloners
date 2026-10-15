import assert from 'node:assert/strict'
import test from 'node:test'
import { MANATEES_ENABLED } from '../src/game/contentAvailability.js'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  CAPYBARA_DEMONSTRATIONS,
  MANATEE_BUILDING_IDS,
  advanceGameSimulationStep,
  completeCapybaraDemonstration,
  completeNextCapybaraDemonstrationForTesting,
  createInitialGame,
  getCapybaraDemonstrationStatus,
  isCapybaraDemonstrationVisible,
  startManateeSurvey,
} from '../src/game/gameLogic.js'
import { awardAchievements } from '../src/game/achievementLogic.js'
import { getAvailableAchievements } from '../src/game/achievementDefinitions.js'
import { getHamsterTreats } from '../src/game/achievementState.js'
import { exportGame, importGame } from '../src/game/storage.js'

function legacyGame() {
  const game = startManateeSurvey({ ...createInitialGame(), hamsters: 100, postUnionHamstersHired: 1 })
  return {
    ...game,
    trade: { ...game.trade, established: true, rabbitUnlocks: ['capybaraContact'] },
    capybara: { ...game.capybara, completedDemonstrations:
      CAPYBARA_DEMONSTRATIONS.slice(0, 3).map(({ id }) => id) },
    manatees: {
      ...game.manatees,
      resources: { ...game.manatees.resources, mangroveWood: 500 },
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
      buildingStages: { [MANATEE_BUILDING_IDS.DIVING_CABIN]: 0 },
      wetlandsConnection: {
        obstructions: ['B5'],
        activeConstructions: [{ tileId: 'C6', remainingSeconds: 4 }],
      },
    },
  }
}

test('Manatees are disabled and neither gameplay nor cheats can complete Demo 3', () => {
  assert.equal(MANATEES_ENABLED, false)
  const game = legacyGame()
  const id = CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_THREE
  const status = getCapybaraDemonstrationStatus(game, id, { manateeDevelopmentGoalsCompleted: 3 })
  assert.equal(isCapybaraDemonstrationVisible(game, id), false)
  assert.equal(status.canComplete, false)
  assert.equal(completeCapybaraDemonstration(game, id, { manateeDevelopmentGoalsCompleted: 3 }), null)
  assert.equal(completeNextCapybaraDemonstrationForTesting(game), null)
})

test('active and catch-up ticks freeze all saved Manatee work and release assigned hamsters', () => {
  const game = legacyGame()
  const unassigned = { ...game, manatees: createInitialGame().manatees }
  for (const mode of ['active', 'catch-up']) {
    const options = { mode, random: () => 0.5 }
    const advanced = advanceGameSimulationStep(game, 30, options)
    const baseline = advanceGameSimulationStep(unassigned, 30, options)
    assert.strictEqual(advanced.manatees, game.manatees)
    assert.equal(advanced.farmland.columns, baseline.farmland.columns)
    assert.ok(advanced.farmland.columns > game.farmland.columns)
    assert.ok(advanced.playtimeSeconds > game.playtimeSeconds)
  }
})

test('disabled Manatee achievements are not newly awarded but previous awards and Treats survive', () => {
  const game = legacyGame()
  assert.ok(!awardAchievements(game).earnedAchievementIds.includes('manatees'))
  assert.ok(!getAvailableAchievements().some(({ id }) => id === 'manatees' || id === 'thisIsFine'))
  const earnedAchievementIds = ['manatees', 'thisIsFine']
  const baseline = awardAchievements(game)
  const restored = importGame(exportGame({ ...baseline,
    earnedAchievementIds: [...baseline.earnedAchievementIds, ...earnedAchievementIds] }))
  assert.deepEqual(restored.earnedAchievementIds, [...baseline.earnedAchievementIds, ...earnedAchievementIds])
  assert.equal(getHamsterTreats(restored), getHamsterTreats(baseline) + 55)
  assert.ok(getAvailableAchievements(earnedAchievementIds).some(({ id }) => id === 'manatees'))
})

test('saved Manatee materials, surveys, buildings and obstructions are retained through export/import', () => {
  const game = legacyGame()
  const restored = importGame(exportGame(game))
  assert.deepEqual(restored.manatees, game.manatees)
  assert.deepEqual(restored.capybara, game.capybara)
})
