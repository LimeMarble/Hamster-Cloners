import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MANATEE_BUILDING_IDS,
  MANATEE_DEVELOPMENT_GOAL_IDS,
  MANATEE_PRIMITIVE_OBSTRUCTION,
  MANATEE_RESOURCE_IDS,
  WETLANDS_CONNECTION_COLUMNS,
  WETLANDS_CONNECTION_ROWS,
  WETLANDS_CONNECTION_TILES,
  advanceWetlandsConnectionState,
  calculateWetlandsConnection,
  createInitialGame,
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  getManateeAssignedHamsterCount,
  hasCompletedManateeDevelopmentGoal,
  normalizeWetlandsObstructions,
  toggleWetlandsConnectionObstruction,
} from '../src/game/gameLogic.js'

const SAFE_LAYOUT = Object.freeze([
  'B5',
  'C5',
  'B6',
  'C6',
  'B7',
  'B8',
  'C8',
  'D8',
  'B9',
  'C9',
  'D9',
  'E9',
  'F9',
  'B10',
  'D10',
  'F10',
])

function createConstructionReadyGame() {
  const game = createInitialGame()

  return {
    ...game,
    hamsters: 1875,
    manatees: {
      ...game.manatees,
      resources: {
        ...game.manatees.resources,
        [MANATEE_RESOURCE_IDS.MANGROVE_WOOD]: 100,
        [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 1000,
      },
      completedBuildings: [MANATEE_BUILDING_IDS.DIVING_CABIN],
      buildingStages: { [MANATEE_BUILDING_IDS.DIVING_CABIN]: 1 },
    },
  }
}

test('the Wetlands Connection uses the configured 12 by 9 layout', () => {
  assert.equal(WETLANDS_CONNECTION_ROWS, 12)
  assert.equal(WETLANDS_CONNECTION_COLUMNS, 9)
  assert.equal(
    WETLANDS_CONNECTION_TILES.length,
    WETLANDS_CONNECTION_ROWS * WETLANDS_CONNECTION_COLUMNS,
  )
})

test('the untouched Wetlands Connection starts with one safe Feeding Ground', () => {
  const result = calculateWetlandsConnection([])

  assert.equal(result.safeFeedingGroundCount, 1)
  assert.equal(result.unsafeFeedingGroundCount, 2)
  assert.deepEqual(
    result.feedingGrounds.map((ground) => ground.isSafe),
    [false, true, false],
  )
  assert.equal(result.tileMeasurementsById.A1.ppm, null)
  assert.equal(result.tileMeasurementsById.C1.ppm, 4000)
  assert.ok(result.tileMeasurementsById.D6.ppm > 0)
  assert.ok(result.tileMeasurementsById.I6.ppm > 0)
})

test('steady-state tile flow preserves the configured source throughput', () => {
  const result = calculateWetlandsConnection([])
  const getTotalFlow = (category) =>
    WETLANDS_CONNECTION_TILES
      .filter((tile) => tile.category === category)
      .reduce(
        (total, tile) =>
          total + result.tileMeasurementsById[tile.id].flow,
        0,
      )
  const sourceFlow = getTotalFlow('source')
  const outletFlow = getTotalFlow('outlet')

  assert.equal(sourceFlow, 168)
  assert.ok(Math.abs(sourceFlow - outletFlow) < 0.0001)
})

test('tile flow reports directional net flow rather than looped gross traffic', () => {
  const result = calculateWetlandsConnection([])
  const centerTile = result.tileMeasurementsById.E6

  assert.ok(centerTile.grossFlow > centerTile.flow)
  assert.equal(
    centerTile.flow,
    Math.hypot(centerTile.horizontalFlow, centerTile.verticalFlow),
  )
})

test('O1 can produce a layout with no vulnerable Feeding Grounds', () => {
  const result = calculateWetlandsConnection(SAFE_LAYOUT)

  assert.equal(result.allFeedingGroundsSafe, true)
  assert.ok(result.feedingGrounds.every((ground) => ground.ppm <= 1000))
})

test('only ordinary water tiles retain O1 placements', () => {
  assert.deepEqual(
    normalizeWetlandsObstructions(['C2', 'A1', 'B5', 'B5', 'D10']),
    ['B5', 'D10'],
  )
})

test('Primitive Obstruction construction consumes materials and reserves its crew', () => {
  const game = createConstructionReadyGame()
  const started = toggleWetlandsConnectionObstruction(game, 'B5')

  assert.equal(
    started.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_WOOD],
    100 - MANATEE_PRIMITIVE_OBSTRUCTION.cost.mangroveWood,
  )
  assert.equal(
    started.manatees.resources[MANATEE_RESOURCE_IDS.MANGROVE_ROOTS],
    1000 - MANATEE_PRIMITIVE_OBSTRUCTION.cost.mangroveRoots,
  )
  assert.equal(started.manatees.wetlandsConnection.obstructions.length, 0)
  assert.equal(
    started.manatees.wetlandsConnection.activeConstructions[0].remainingSeconds,
    10,
  )
  assert.equal(getManateeRemainingHamsterCount(started), 1865)
  assert.equal(getManateeRemainingDivingHamsterCapacity(started), 190)
  assert.equal(getManateeAssignedHamsterCount(started), 10)

  const nearlyCompleteState = advanceWetlandsConnectionState(
    started.manatees,
    9,
  )
  assert.equal(nearlyCompleteState.wetlandsConnection.obstructions.length, 0)
  assert.equal(
    nearlyCompleteState.wetlandsConnection.activeConstructions[0].remainingSeconds,
    1,
  )

  const completed = {
    ...started,
    manatees: advanceWetlandsConnectionState(nearlyCompleteState, 1),
  }
  assert.deepEqual(completed.manatees.wetlandsConnection.obstructions, ['B5'])
  assert.deepEqual(
    completed.manatees.wetlandsConnection.activeConstructions,
    [],
  )
  assert.equal(getManateeRemainingHamsterCount(completed), 1865)
  assert.equal(getManateeRemainingDivingHamsterCapacity(completed), 200)
  assert.equal(getManateeAssignedHamsterCount(completed), 10)
})

test('completed obstructions can satisfy and later break the permanent goal', () => {
  let game = createConstructionReadyGame()

  SAFE_LAYOUT.forEach((tileId) => {
    game = toggleWetlandsConnectionObstruction(game, tileId)
  })

  const completed = {
    ...game,
    manatees: advanceWetlandsConnectionState(game.manatees, 10),
  }

  assert.equal(
    hasCompletedManateeDevelopmentGoal(
      completed,
      MANATEE_DEVELOPMENT_GOAL_IDS.STABILIZE_WETLANDS_CONNECTION,
    ),
    true,
  )
  assert.equal(getManateeRemainingHamsterCount(completed), 1715)
  assert.equal(getManateeRemainingDivingHamsterCapacity(completed), 200)

  const dismantled = toggleWetlandsConnectionObstruction(completed, 'B5')
  const currentFlow = calculateWetlandsConnection(
    dismantled.manatees.wetlandsConnection.obstructions,
  )

  assert.equal(currentFlow.allFeedingGroundsSafe, false)
  assert.equal(
    hasCompletedManateeDevelopmentGoal(
      dismantled,
      MANATEE_DEVELOPMENT_GOAL_IDS.STABILIZE_WETLANDS_CONNECTION,
    ),
    true,
  )
  assert.equal(getManateeRemainingHamsterCount(dismantled), 1725)
  assert.equal(getManateeAssignedHamsterCount(dismantled), 150)
})
