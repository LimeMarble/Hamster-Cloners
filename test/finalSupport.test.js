import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FLOOR_REPLICATOR_MODES,
  FORTUNES_WRATH_PASSIVE_MULTIPLIER,
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
  advanceGameSimulationStep,
  canPurchaseFloorReplicatorsInArea,
  createInitialGame,
  getFinalSupportPassiveEffectBonus,
  getFloorReplicatorSupportPassiveEffectBonus,
  getFortuneModifiers,
  isFloorReplicatorSupportModeActive,
  isFloorReplicatorSupportModeAvailable,
  purchaseMisfortuneUpgrade,
  toggleFloorReplicatorMode,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

function approximatelyEqual(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-12)
}

test('Final Support costs 2.5e62 Misfortune Crops and survives saving', () => {
  const initialGame = createInitialGame()
  const upgrade = MISFORTUNE_UPGRADES[MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT]
  const purchased = purchaseMisfortuneUpgrade(
    {
      ...initialGame,
      activeArea: GAME_AREA_IDS.MISFORTUNE,
      crops: upgrade.cost,
    },
    MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
  )

  assert.equal(upgrade.cost, 2.5e62)
  assert.equal(upgrade.passiveEffectBonusPerTier, 0.002)
  assert.ok(purchased)
  assert.equal(purchased.crops, 0)
  assert.ok(
    purchased.completedMisfortuneUpgrades.includes(
      MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    ),
  )
  assert.ok(
    normalizeGame(purchased).completedMisfortuneUpgrades.includes(
      MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    ),
  )
})

test('Final Support unlocks main Support at only 0.2 percent per tier', () => {
  const game = {
    ...createInitialGame(),
    activeArea: GAME_AREA_IDS.MAIN,
    hasUnlockedFloorReplicators: true,
    floorReplicators: 30,
    floorReplicatorMode: FLOOR_REPLICATOR_MODES.CONSTRUCTION,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT],
  }
  const supportMode = toggleFloorReplicatorMode(game)

  assert.equal(isFloorReplicatorSupportModeAvailable(game), true)
  assert.ok(supportMode)
  assert.equal(isFloorReplicatorSupportModeActive(supportMode), true)
  approximatelyEqual(
    getFloorReplicatorSupportPassiveEffectBonus(supportMode),
    0.006,
  )
  approximatelyEqual(getFinalSupportPassiveEffectBonus(supportMode), 0.006)
  approximatelyEqual(
    getFortuneModifiers(supportMode).passiveEffectMultiplier,
    1.006,
  )
  assert.equal(canPurchaseFloorReplicatorsInArea(supportMode), false)

  const supportedTick = advanceGameSimulationStep(supportMode, 1)
  assert.equal(supportedTick.farmland.floors, supportMode.farmland.floors)
})

test('Final Support stacks with Burdened Foundations in Misfortune', () => {
  const supportMode = {
    ...createInitialGame(),
    activeArea: GAME_AREA_IDS.MISFORTUNE,
    floorReplicators: 30,
    floorReplicatorMode: FLOOR_REPLICATOR_MODES.SUPPORT,
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
      MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
    ],
  }

  approximatelyEqual(
    getFloorReplicatorSupportPassiveEffectBonus(supportMode),
    0.036,
  )
  approximatelyEqual(
    getFortuneModifiers(supportMode).passiveEffectMultiplier,
    FORTUNES_WRATH_PASSIVE_MULTIPLIER + 0.036,
  )

  const mainWithoutFinalSupport = {
    ...supportMode,
    activeArea: GAME_AREA_IDS.MAIN,
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
    ],
  }
  assert.equal(
    isFloorReplicatorSupportModeAvailable(mainWithoutFinalSupport),
    false,
  )
  assert.equal(isFloorReplicatorSupportModeActive(mainWithoutFinalSupport), false)
})
