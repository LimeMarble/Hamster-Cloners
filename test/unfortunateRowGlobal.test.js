import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  createInitialGame,
  getFortunateColumnCropProductionMultiplier,
  getFortuneModifiers,
  getMisfortuneUpgradeCropProductionMultiplier,
  getUnfortunateRowCropProductionMultiplier,
} from '../src/game/gameLogic.js'

test('Unfortunate Row applies its Crop penalty in both field areas', () => {
  const upgradedGame = {
    ...createInitialGame(),
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
    ],
  }
  const mainModifiers = getFortuneModifiers(upgradedGame)
  const misfortuneModifiers = getFortuneModifiers({
    ...upgradedGame,
    activeArea: GAME_AREA_IDS.MISFORTUNE,
  })

  assert.equal(getUnfortunateRowCropProductionMultiplier(upgradedGame), 0.8)
  assert.equal(mainModifiers.cropProductionMultiplier, 0.8)
  assert.equal(misfortuneModifiers.cropProductionMultiplier, 0.8)
})

test('Fortunate Column applies its Crop bonus in both field areas', () => {
  const upgradedGame = {
    ...createInitialGame(),
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
    ],
  }
  const mainModifiers = getFortuneModifiers(upgradedGame)
  const misfortuneModifiers = getFortuneModifiers({
    ...upgradedGame,
    activeArea: GAME_AREA_IDS.MISFORTUNE,
  })

  assert.equal(getFortunateColumnCropProductionMultiplier(upgradedGame), 1.25)
  assert.equal(mainModifiers.cropProductionMultiplier, 1.25)
  assert.equal(misfortuneModifiers.cropProductionMultiplier, 1.25)
})

test('Fortunate Column offsets the Unfortunate Row Crop penalty', () => {
  const upgradedGame = {
    ...createInitialGame(),
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
      MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
    ],
  }

  assert.equal(getMisfortuneUpgradeCropProductionMultiplier(upgradedGame), 1)
  assert.equal(getFortuneModifiers(upgradedGame).cropProductionMultiplier, 1)
})
