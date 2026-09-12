import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  advanceGameSimulationStep,
  createBlueprint,
  createInitialGame,
  getHuntForSomethingGreaterMultiplier,
  getMissingMisfortuneCropTypeIds,
  getRushedStartExternalMultiplier,
  purchaseMisfortuneUpgrade,
  switchGameArea,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

function createMisfortuneGame(overrides = {}) {
  const mainBlueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'corn'],
  })
  const mainGame = {
    ...createInitialGame(),
    hasUnlockedTurnip: true,
    blueprint: mainBlueprint,
    blueprintSlots: [mainBlueprint],
  }

  return {
    ...switchGameArea(mainGame, GAME_AREA_IDS.MISFORTUNE),
    ...overrides,
  }
}

test('Hunt for Something Greater costs 7.77e40 Misfortune Crops', () => {
  const upgrade = MISFORTUNE_UPGRADES[
    MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER
  ]
  const game = createMisfortuneGame({ crops: upgrade.cost })
  const purchased = purchaseMisfortuneUpgrade(
    game,
    MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
  )

  assert.ok(purchased)
  assert.equal(upgrade.cost, 7.77e40)
  assert.equal(purchased.crops, 0)
  assert.ok(
    purchased.completedMisfortuneUpgrades.includes(
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    ),
  )
})

test('Hunt counts Crop types present in Main but missing from Misfortune', () => {
  const game = createMisfortuneGame({
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    ],
    secondsSinceAreaReset: 90,
  })

  assert.deepEqual(
    getMissingMisfortuneCropTypeIds(game),
    ['corn', 'turnip'],
  )
  assert.equal(getHuntForSomethingGreaterMultiplier(game), 4.5)
  assert.equal(
    getHuntForSomethingGreaterMultiplier({
      ...game,
      secondsSinceAreaReset: 600,
    }),
    30,
  )
  assert.equal(
    getHuntForSomethingGreaterMultiplier(
      switchGameArea(game, GAME_AREA_IDS.MAIN),
    ),
    1,
  )
})

test('Hunt extends Rushed Start so only its second minute is negative', () => {
  const game = {
    ...createMisfortuneGame(),
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.RUSHED_START,
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    ],
  }
  const withoutMissingCrops = {
    ...game,
    areaProgress: {
      ...game.areaProgress,
      main: {
        ...game.areaProgress.main,
        blueprint: game.blueprint,
        blueprintSlots: [game.blueprint],
        hasUnlockedTurnip: false,
      },
    },
  }
  const getCombinedMultiplier = (secondsSinceAreaReset) => {
    const timedGame = { ...withoutMissingCrops, secondsSinceAreaReset }
    return getRushedStartExternalMultiplier(timedGame) *
      getHuntForSomethingGreaterMultiplier(timedGame)
  }

  assert.equal(getCombinedMultiplier(30), 10)
  assert.equal(getCombinedMultiplier(90), 0.75)
  assert.equal(getCombinedMultiplier(120), 2)
  assert.equal(getCombinedMultiplier(600), 10)
  assert.equal(getCombinedMultiplier(1_200), 10)
})

test('Hunt multiplies Column, Row, and Floor production', () => {
  const game = createMisfortuneGame({
    hamsters: 1,
    hasUnlockedRowDuplicators: true,
    rowDuplicators: 1,
    hasUnlockedFloorReplicators: true,
    floorReplicators: 1,
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
    ],
    secondsSinceAreaReset: 180,
  })
  const advanced = advanceGameSimulationStep(game, 1, {
    random: () => 1,
  })

  assert.ok(Math.abs(advanced.farmland.columns - 1.8) < 1e-10)
  assert.ok(Math.abs(advanced.farmland.rows - 1.918) < 1e-10)
  assert.ok(Math.abs(advanced.farmland.floors - 1.9) < 1e-10)
})

test('the reset timer keeps advancing and preserves values beyond ten minutes', () => {
  const advanced = advanceGameSimulationStep(createInitialGame(), 725, {
    random: () => 1,
  })
  const normalized = normalizeGame({
    ...createInitialGame(),
    secondsSinceAreaReset: 987,
  })

  assert.equal(advanced.secondsSinceAreaReset, 725)
  assert.equal(normalized.secondsSinceAreaReset, 987)
})
