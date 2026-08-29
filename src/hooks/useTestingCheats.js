import { useState } from 'react'
import {
  grantNextBlueprintExpansion,
  revokeLastBlueprintExpansion,
  addRandomFortuneEffect,
  wipeActiveFortuneEffects,
} from '../game/gameLogic.js'

const TESTING_CODE = 'limesaysopensesame'

export function useTestingCheats({
  game,
  updateGame,
  blueprintExpansionTracks,
}) {
  const [codeInput, setCodeInput] = useState('')
  const [codeStatus, setCodeStatus] = useState(null)

  function submitCode() {
    if (codeInput.trim().toLowerCase() !== TESTING_CODE) {
      setCodeStatus({ type: 'error', message: 'Invalid code.' })
      return
    }

    updateGame((currentGame) => ({
      ...currentGame,
      testingPanelUnlocked: true,
      testingPanelVisible: true,
    }))
    setCodeInput('')
    setCodeStatus({
      type: 'success',
      message: 'Testing panel unlocked.',
    })
  }

  function toggleTestingPanelVisibility() {
    updateGame((currentGame) => ({
      ...currentGame,
      testingPanelVisible: !currentGame.testingPanelVisible,
    }))
  }

  function toggleCheat(cheatId) {
    updateGame((currentGame) => ({
      ...currentGame,
      testingCheats: {
        ...currentGame.testingCheats,
        [cheatId]: !currentGame.testingCheats?.[cheatId],
      },
    }))
  }

  function multiplyCurrentCrops() {
    updateGame((currentGame) => ({
      ...currentGame,
      crops: Math.min(
        Number.MAX_VALUE,
        Math.max(0, Number(currentGame.crops) || 0) * 1000,
      ),
    }))
  }

  function divideCurrentCrops() {
    updateGame((currentGame) => ({
      ...currentGame,
      crops: Math.max(0, Number(currentGame.crops) || 0) / 1000,
    }))
  }

  function grantExpansion(trackId) {
    updateGame((currentGame) =>
      grantNextBlueprintExpansion(currentGame, trackId) ?? currentGame,
    )
  }

  function revokeExpansion(trackId) {
    updateGame((currentGame) =>
      revokeLastBlueprintExpansion(currentGame, trackId) ?? currentGame,
    )
  }

  function addTestingCloverEffect() {
    updateGame((currentGame) => addRandomFortuneEffect(currentGame))
  }

  function wipeTestingCloverEffects() {
    updateGame((currentGame) => wipeActiveFortuneEffects(currentGame))
  }
  const columnTrack = blueprintExpansionTracks.find(
    (track) => track.id === 'column',
  )
  const rowTrack = blueprintExpansionTracks.find(
    (track) => track.id === 'row',
  )

  return {
    codeEntry: {
      codeInput,
      onCodeInputChange: setCodeInput,
      codeStatus,
      onSubmitCode: submitCode,
    },
    testingPanel: game.testingPanelUnlocked
      ? {
          isVisible: game.testingPanelVisible === true,
          onToggleVisibility: toggleTestingPanelVisibility,
          cropMultiplierEnabled:
            game.testingCheats?.cropMultiplierEnabled === true,
          hamsterEfficiencyEnabled:
            game.testingCheats?.hamsterEfficiencyEnabled === true,
          columnExpansionCount: columnTrack?.completedStageCount ?? 0,
          maximumColumnExpansions: columnTrack?.stages.length ?? 0,
          rowExpansionCount: rowTrack?.completedStageCount ?? 0,
          maximumRowExpansions: rowTrack?.stages.length ?? 0,
          onToggleCropMultiplier: () =>
            toggleCheat('cropMultiplierEnabled'),
          onToggleHamsterEfficiency: () =>
            toggleCheat('hamsterEfficiencyEnabled'),
          onMultiplyCurrentCrops: multiplyCurrentCrops,
          onDivideCurrentCrops: divideCurrentCrops,
          onGrantColumnExpansion: () => grantExpansion('column'),
          onGrantRowExpansion: () => grantExpansion('row'),
          onRevokeColumnExpansion: () => revokeExpansion('column'),
          onRevokeRowExpansion: () => revokeExpansion('row'),
          onAddCloverEffect: addTestingCloverEffect,
          onWipeCloverEffects: wipeTestingCloverEffects,
        }
      : null,
  }
}
