import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GAME_AREA_IDS,
  MISFORTUNE_UPGRADE_IDS,
  createInitialGame,
  getFortuneModifiers,
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
