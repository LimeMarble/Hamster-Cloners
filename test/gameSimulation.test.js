import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACTIVE_SIMULATION_STEP_SECONDS,
  advanceGameByElapsedTime,
  advanceGameSimulationStep,
  createInitialGame,
  getSimulationStepCount,
  getSimulationStepSeconds,
  CATCH_UP_COMPRESSION_FACTOR,
  CATCH_UP_SPEED_FACTOR,
  SKIPPED_CATCH_UP_STEPS,
} from '../src/game/gameLogic.js'
import { WHEAT_UNLOCK_CROP_COUNT } from '../src/game/crops.js'

test('active simulation uses no more than one-sixtieth second per step', () => {
  assert.equal(ACTIVE_SIMULATION_STEP_SECONDS, 1 / 60)
  assert.equal(getSimulationStepSeconds(10, 'active'), 1 / 60)
  assert.equal(getSimulationStepCount(1, 'active'), 60)
})

test('catch-up defaults to fifteen-times compressed ticks', () => {
  const oneDayInSeconds = 24 * 60 * 60

  assert.equal(CATCH_UP_COMPRESSION_FACTOR, 150)
  assert.equal(
    getSimulationStepSeconds(oneDayInSeconds, 'catch-up'),
    ACTIVE_SIMULATION_STEP_SECONDS * CATCH_UP_COMPRESSION_FACTOR,
  )
  assert.equal(
    getSimulationStepCount(oneDayInSeconds, 'catch-up'),
    (oneDayInSeconds * 60) / CATCH_UP_COMPRESSION_FACTOR,
  )
})

test('catch-up controls use multiplicative speed and a 1,000-tick skip', () => {
  assert.equal(CATCH_UP_SPEED_FACTOR, 2)
  assert.equal(SKIPPED_CATCH_UP_STEPS, 100)
})

test('elapsed active time matches sixty fixed simulation steps', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 10,
    farmland: {
      ...createInitialGame().farmland,
      rows: 1,
      columns: 1,
    },
  }
  let fixedStepGame = initialGame

  for (let step = 0; step < 60; step += 1) {
    fixedStepGame = advanceGameSimulationStep(
      fixedStepGame,
      ACTIVE_SIMULATION_STEP_SECONDS,
    )
  }

  assert.deepEqual(
    advanceGameByElapsedTime(initialGame, 1, { mode: 'active' }),
    fixedStepGame,
  )
})

test('Wheat unlocks at its Crop threshold only after Row Duplicators', () => {
  const withoutDuplicators = advanceGameSimulationStep(
    {
      ...createInitialGame(),
      crops: WHEAT_UNLOCK_CROP_COUNT,
    },
    ACTIVE_SIMULATION_STEP_SECONDS,
  )
  const withDuplicators = advanceGameSimulationStep(
    {
      ...createInitialGame(),
      crops: WHEAT_UNLOCK_CROP_COUNT,
      hasUnlockedRowDuplicators: true,
    },
    ACTIVE_SIMULATION_STEP_SECONDS,
  )

  assert.equal(withoutDuplicators.hasUnlockedWheat, false)
  assert.equal(withDuplicators.hasUnlockedWheat, true)
})

test('Blueprint editing pauses production but still advances time', () => {
  const initialGame = {
    ...createInitialGame(),
    hamsters: 10,
    farmland: {
      ...createInitialGame().farmland,
      rows: 1,
      columns: 1,
    },
  }
  const advancedGame = advanceGameByElapsedTime(initialGame, 5, {
    mode: 'active',
    isEditingBlueprint: true,
  })

  assert.equal(advancedGame.crops, initialGame.crops)
  assert.deepEqual(advancedGame.farmland, initialGame.farmland)
  assert.ok(Math.abs(advancedGame.playtimeSeconds - 5) < 1e-10)
})

test('simulation preserves blueprint slots until another slot unlocks', () => {
  const game = createInitialGame()
  const advancedGame = advanceGameSimulationStep(
    game,
    ACTIVE_SIMULATION_STEP_SECONDS,
  )

  assert.strictEqual(advancedGame.blueprintSlots, game.blueprintSlots)
})
