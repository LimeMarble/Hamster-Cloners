import { useState } from 'react'
import {
  CAPYBARA_DEMONSTRATIONS,
  completeRabbitContractsForTesting,
  completeNextCapybaraDemonstrationForTesting,
  grantNextBlueprintExpansion,
  multiplyManateeResources,
  revokeLastBlueprintExpansion,
  addRandomFortuneEffect,
  wipeMisfortuneAreaProgress,
  wipeActiveFortuneEffects,
} from '../game/gameLogic.js'

const TESTING_CODE = 'limesaysopensesame'
const MISFORTUNE_WIPE_CODE = 'trulyunfortunate'

export function useTestingCheats({
  game,
  updateGame,
  blueprintExpansionTracks,
}) {
  const [codeInput, setCodeInput] = useState('')
  const [codeStatus, setCodeStatus] = useState(null)
  const [isMisfortuneWipeConfirmationOpen, setIsMisfortuneWipeConfirmationOpen] =
    useState(false)

  function submitCode() {
    const submittedCode = codeInput.trim().toLowerCase()

    if (submittedCode === MISFORTUNE_WIPE_CODE) {
      setCodeInput('')
      setCodeStatus(null)
      setIsMisfortuneWipeConfirmationOpen(true)
      return
    }

    if (submittedCode !== TESTING_CODE) {
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

  function cancelMisfortuneWipe() {
    setIsMisfortuneWipeConfirmationOpen(false)
  }

  function confirmMisfortuneWipe() {
    updateGame((currentGame) =>
      wipeMisfortuneAreaProgress(currentGame),
    )
    setIsMisfortuneWipeConfirmationOpen(false)
    setCodeStatus({
      type: 'success',
      message: 'Misfortune progress wiped.',
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

  function completeNextDemonstration() {
    updateGame((currentGame) =>
      completeNextCapybaraDemonstrationForTesting(currentGame) ?? currentGame,
    )
  }

  function multiplyCurrentManateeMaterials() {
    updateGame((currentGame) => ({
      ...currentGame,
      manatees: multiplyManateeResources(currentGame.manatees, 10),
    }))
  }

  function completeTestingRabbitContracts() {
    updateGame((currentGame) =>
      completeRabbitContractsForTesting(currentGame, 100),
    )
  }

  function multiplyCurrentRabbitRelations() {
    updateGame((currentGame) => ({
      ...currentGame,
      trade: {
        ...currentGame.trade,
        rabbitRelations: Math.min(
          Number.MAX_VALUE,
          Math.max(0, Number(currentGame.trade?.rabbitRelations) || 0) * 1000,
        ),
      },
    }))
  }

  const completedDemonstrationCount = CAPYBARA_DEMONSTRATIONS.filter(
    ({ id }) => game.capybara?.completedDemonstrations?.includes(id),
  ).length
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
    misfortuneWipeConfirmation: {
      isOpen: isMisfortuneWipeConfirmationOpen,
      onCancel: cancelMisfortuneWipe,
      onConfirm: confirmMisfortuneWipe,
    },
    testingPanel: game.testingPanelUnlocked
      ? {
          isVisible: game.testingPanelVisible === true,
          onToggleVisibility: toggleTestingPanelVisibility,
          cropMultiplierEnabled:
            game.testingCheats?.cropMultiplierEnabled === true,
          hamsterEfficiencyEnabled:
            game.testingCheats?.hamsterEfficiencyEnabled === true,
          oneSecondManateeSurveysEnabled:
            game.testingCheats?.oneSecondManateeSurveysEnabled === true,
          completedDemonstrationCount,
          maximumDemonstrationCount: CAPYBARA_DEMONSTRATIONS.length,
          columnExpansionCount: columnTrack?.completedStageCount ?? 0,
          maximumColumnExpansions: columnTrack?.stages.length ?? 0,
          rowExpansionCount: rowTrack?.completedStageCount ?? 0,
          maximumRowExpansions: rowTrack?.stages.length ?? 0,
          onToggleCropMultiplier: () =>
            toggleCheat('cropMultiplierEnabled'),
          onToggleHamsterEfficiency: () =>
            toggleCheat('hamsterEfficiencyEnabled'),
          onToggleOneSecondManateeSurveys: () =>
            toggleCheat('oneSecondManateeSurveysEnabled'),
          onCompleteNextDemonstration: completeNextDemonstration,
          onMultiplyCurrentManateeMaterials:
            multiplyCurrentManateeMaterials,
          onCompleteRabbitContracts: completeTestingRabbitContracts,
          onMultiplyCurrentRabbitRelations:
            multiplyCurrentRabbitRelations,
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
