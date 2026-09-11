import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  advanceGameSimulationStep,
  createInitialGame,
  getRushedStartExternalMultiplier,
  purchaseMisfortuneUpgrade,
  resetForRowDuplicators,
  switchGameArea,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

function createRushedStartGame(overrides = {}) {
  return {
    ...createInitialGame(),
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.RUSHED_START],
    ...overrides,
  }
}

test('Rushed Start can be purchased in Misfortune for 25M Crops', () => {
  const upgrade = MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.RUSHED_START]
  const baseGame = {
    ...createInitialGame(),
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    crops: upgrade.cost,
    secondsSinceAreaReset: 120,
  }
  const purchased = purchaseMisfortuneUpgrade(
    baseGame,
    MISFORTUNE_UPGRADE_IDS.RUSHED_START,
  )

  assert.ok(purchased)
  assert.equal(upgrade.cost, 25_000_000)
  assert.equal(purchased.crops, 0)
  assert.equal(purchased.secondsSinceAreaReset, 120)
  assert.deepEqual(purchased.completedMisfortuneUpgrades, [
    MISFORTUNE_UPGRADE_IDS.RUSHED_START,
  ])
})

test('Rushed Start follows its 60-second boost and penalty windows', () => {
  assert.equal(
    getRushedStartExternalMultiplier(
      createRushedStartGame({ secondsSinceAreaReset: 0 }),
    ),
    10,
  )
  assert.equal(
    getRushedStartExternalMultiplier(
      createRushedStartGame({ secondsSinceAreaReset: 59.999 }),
    ),
    10,
  )
  assert.equal(
    getRushedStartExternalMultiplier(
      createRushedStartGame({ secondsSinceAreaReset: 60 }),
    ),
    0.5,
  )
  assert.equal(
    getRushedStartExternalMultiplier(
      createRushedStartGame({ secondsSinceAreaReset: 119.999 }),
    ),
    0.5,
  )
  assert.equal(
    getRushedStartExternalMultiplier(
      createRushedStartGame({ secondsSinceAreaReset: 120 }),
    ),
    1,
  )
  assert.equal(
    getRushedStartExternalMultiplier(createInitialGame()),
    1,
  )
})

test('Rushed Start multiplies Column, Row, and Floor production', () => {
  const game = createRushedStartGame({
    hamsters: 1,
    hasUnlockedRowDuplicators: true,
    rowDuplicators: 1,
    hasUnlockedFloorReplicators: true,
    floorReplicators: 1,
    secondsSinceAreaReset: 0,
  })
  const advanced = advanceGameSimulationStep(game, 1, {
    random: () => 1,
  })

  assert.ok(Math.abs(advanced.farmland.columns - 1.9) < 1e-10)
  assert.ok(Math.abs(advanced.farmland.rows - 2.02) < 1e-10)
  assert.ok(Math.abs(advanced.farmland.floors - 2) < 1e-10)
  assert.equal(advanced.secondsSinceAreaReset, 1)
})

test('area reset timing is independent and field resets restart it', () => {
  const mainGame = createRushedStartGame({ secondsSinceAreaReset: 45 })
  const misfortuneGame = switchGameArea(
    mainGame,
    GAME_AREA_IDS.MISFORTUNE,
  )

  assert.equal(misfortuneGame.secondsSinceAreaReset, 0)

  const restoredMain = switchGameArea(
    { ...misfortuneGame, secondsSinceAreaReset: 90 },
    GAME_AREA_IDS.MAIN,
  )
  assert.equal(restoredMain.secondsSinceAreaReset, 45)

  const resetGame = resetForRowDuplicators({
    ...restoredMain,
    crops: 1e100,
    hasUnlockedRowDuplicators: false,
  })
  assert.ok(resetGame)
  assert.equal(resetGame.secondsSinceAreaReset, 0)
})

test('legacy saves do not receive a retroactive Rushed Start window', () => {
  const rawGame = createRushedStartGame()
  delete rawGame.secondsSinceAreaReset

  const normalized = normalizeGame(rawGame)

  assert.equal(normalized.secondsSinceAreaReset, 120)
  assert.equal(getRushedStartExternalMultiplier(normalized), 1)
})
