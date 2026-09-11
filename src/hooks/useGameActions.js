import { useEffect, useState } from 'react'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  cancelManateeSurvey,
  claimRabbitContract,
  clearWetlandsConnectionObstructions,
  collectManateeFind,
  completeManateeDevelopmentGoal,
  constructManateeBuilding,
  completeCapybaraDemonstration,
  createInitialGame,
  establishTradeRelations,
  getBlueprintExpansion,
  getGameAreaCostMultiplier,
  getHamsterStateAfterHire,
  getMaxDuplicatorPurchase,
  getMaxFloorReplicatorPurchase,
  canPurchaseFloorReplicatorsInArea,
  getMaxHamsterPurchase,
  getNextHamsterCost,
  getNextFloorReplicatorCost,
  getNextRowDuplicatorCost,
  GAME_AREA_IDS,
  hasCompletedCapybaraDemonstration,
  MANATEE_ZONE_IDS,
  MISFORTUNE_UPGRADE_IDS,
  resetForBlueprintExpansion,
  resetForRowDuplicators,
  switchGameArea,
  startManateeSurvey,
  purchaseRabbitUnlock,
  purchaseMisfortuneUpgrade,
  purchaseSeedAugmentation,
  toggleSeedAugmentation,
  toggleWetlandsConnectionObstruction,
  UNIONIZATION_HAMSTER_COUNT,
  unlockCropPerfection,
  upgradeManateeBuilding,
} from '../game/gameLogic.js'
import { exportGame, importGame } from '../game/storage.js'

export function useGameActions({
  gameRef,
  setGame,
  updateGame,
  saveGameNow,
  areInventionsUnlocked,
  isTradeTabVisible,
  isAugmentationTabVisible,
  resetBlueprintEditor,
}) {
  const [activeTab, setActiveTab] = useState('field')
  const [activeInventionsTab, setActiveInventionsTab] = useState('blueprint')
  const [activeTradeRelation, setActiveTradeRelation] = useState('rabbits')
  const [activeManateeZone, setActiveManateeZone] = useState(
    MANATEE_ZONE_IDS.MARSH,
  )
  const [isUnionConfirmationOpen, setIsUnionConfirmationOpen] = useState(false)
  const [pendingBlueprintExpansionId, setPendingBlueprintExpansionId] =
    useState(null)
  const [isRowDuplicatorUnlockPending, setIsRowDuplicatorUnlockPending] =
    useState(false)
  const [hardResetClicks, setHardResetClicks] = useState(0)
  const [lastHardResetClickAt, setLastHardResetClickAt] = useState(0)
  const [saveCode, setSaveCode] = useState('')
  const [saveTransferStatus, setSaveTransferStatus] = useState(null)
  const [manualSaveStatus, setManualSaveStatus] = useState(null)

  useEffect(() => {
    if (hardResetClicks === 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setHardResetClicks(0)
      setLastHardResetClickAt(0)
    }, 4000)
    return () => window.clearTimeout(timeoutId)
  }, [hardResetClicks, lastHardResetClickAt])


  function completeHamsterHire() {
    updateGame((currentGame) => {
      const currentCost = getNextHamsterCost(
        currentGame.hamsters,
        currentGame.unionized,
        getGameAreaCostMultiplier(currentGame),
      )
      if (currentGame.crops < currentCost) {
        return currentGame
      }

      return {
        ...currentGame,
        crops: currentGame.crops - currentCost,
        ...getHamsterStateAfterHire(currentGame),
      }
    })
  }

  function buyHamster() {
    const currentGame = gameRef.current
    const currentHamsterCost = getNextHamsterCost(
      currentGame.hamsters,
      currentGame.unionized,
      getGameAreaCostMultiplier(currentGame),
    )

    if (currentGame.crops < currentHamsterCost) {
      return
    }

    if (
      !currentGame.unionized &&
      currentGame.totalHamstersHired >= UNIONIZATION_HAMSTER_COUNT - 1
    ) {
      setIsUnionConfirmationOpen(true)
      return
    }

    completeHamsterHire()
  }

  function buyMaxHamsters() {
    updateGame((currentGame) => {
      const { purchased, ...nextGame } = getMaxHamsterPurchase(currentGame)
      return purchased > 0 ? { ...currentGame, ...nextGame } : currentGame
    })
  }

  function buyRowDuplicator() {
    updateGame((currentGame) => {
      if (!currentGame.hasUnlockedRowDuplicators) {
        return currentGame
      }

      const cost = getNextRowDuplicatorCost(
        currentGame.rowDuplicators,
        getGameAreaCostMultiplier(currentGame),
      )

      if (currentGame.crops < cost) {
        return currentGame
      }

      return {
        ...currentGame,
        crops: currentGame.crops - cost,
        rowDuplicators:
          Math.max(0, Math.floor(Number(currentGame.rowDuplicators) || 0)) + 1,
      }
    })
  }

  function buyMaxRowDuplicators() {
    updateGame((currentGame) => {
      const { purchased, ...nextGame } = getMaxDuplicatorPurchase(currentGame)
      return purchased > 0 ? { ...currentGame, ...nextGame } : currentGame
    })
  }

  function buyFloorReplicator() {
    updateGame((currentGame) => {
      if (
        !currentGame.hasUnlockedFloorReplicators ||
        !canPurchaseFloorReplicatorsInArea(currentGame)
      ) {
        return currentGame
      }

      const cost = getNextFloorReplicatorCost(
        currentGame.floorReplicators,
        getGameAreaCostMultiplier(currentGame),
      )
      if (currentGame.crops < cost) return currentGame

      return {
        ...currentGame,
        crops: currentGame.crops - cost,
        floorReplicators:
          Math.max(
            0,
            Math.floor(Number(currentGame.floorReplicators) || 0),
          ) + 1,
      }
    })
  }

  function buyMaxFloorReplicators() {
    updateGame((currentGame) => {
      const { purchased, ...nextGame } =
        getMaxFloorReplicatorPurchase(currentGame)
      return purchased > 0 ? { ...currentGame, ...nextGame } : currentGame
    })
  }

  function confirmBlueprintExpansionReset() {
    if (!pendingBlueprintExpansionId) {
      return
    }

    updateGame((currentGame) => {
      const resetGame = resetForBlueprintExpansion(
        currentGame,
        pendingBlueprintExpansionId,
      )
      return resetGame ?? currentGame
    })
    setPendingBlueprintExpansionId(null)
    setActiveTab('field')
  }

  function confirmRowDuplicatorReset() {
    updateGame((currentGame) => {
      const resetGame = resetForRowDuplicators(currentGame)
      return resetGame ?? currentGame
    })
    setIsRowDuplicatorUnlockPending(false)
    setActiveTab('field')
  }

  function unlockPerfection(perfectionId) {
    updateGame((currentGame) => {
      const nextGame = unlockCropPerfection(currentGame, perfectionId)
      return nextGame ?? currentGame
    })
  }

  function handleHardReset(event) {
    const now = event.timeStamp
    const isWithinResetWindow = now - lastHardResetClickAt <= 4000
    const nextClickCount = isWithinResetWindow ? hardResetClicks + 1 : 1

    if (nextClickCount >= 5) {
      updateGame(() => createInitialGame())
      setActiveTab('field')
      setActiveInventionsTab('blueprint')
      resetBlueprintEditor()
      setHardResetClicks(0)
      setLastHardResetClickAt(0)
      return
    }

    setHardResetClicks(nextClickCount)
    setLastHardResetClickAt(now)
  }

  function openOptions() {
    setHardResetClicks(0)
    setLastHardResetClickAt(0)
    setSaveTransferStatus(null)
    setManualSaveStatus(null)
    setActiveTab('options')
  }

  function manuallySaveGame() {
    const didSave = saveGameNow()

    setManualSaveStatus(
      didSave
        ? {
            type: 'success',
            message: 'Game saved locally.',
          }
        : {
            type: 'error',
            message: 'The game could not access local storage.',
          },
    )
  }

  async function exportSave() {
    const nextSaveCode = exportGame(gameRef.current)
    setSaveCode(nextSaveCode)

    try {
      await navigator.clipboard.writeText(nextSaveCode)
      setSaveTransferStatus({
        type: 'success',
        message: 'Save code copied to your clipboard.',
      })
    } catch {
      setSaveTransferStatus({
        type: 'success',
        message: 'Save code is ready below. Copy it somewhere safe.',
      })
    }
  }

  function importSave() {
    try {
      const importedGame = importGame(saveCode)

      gameRef.current = importedGame
      setGame(importedGame)
      resetBlueprintEditor()
      setIsUnionConfirmationOpen(false)
      setPendingBlueprintExpansionId(null)
      setIsRowDuplicatorUnlockPending(false)
      setSaveCode('')
      setSaveTransferStatus({
        type: 'success',
        message: 'Save imported. Your local progress has been replaced.',
      })
    } catch (error) {
      setSaveTransferStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The save code could not be imported.',
      })
    }
  }

  function establishTrade() {
    updateGame((currentGame) =>
      establishTradeRelations(currentGame) ?? currentGame,
    )
  }

  function claimRabbitDelivery(contractIndex) {
    updateGame((currentGame) =>
      claimRabbitContract(currentGame, contractIndex) ?? currentGame,
    )
  }

  function buyRabbitUnlock(unlockId) {
    updateGame((currentGame) =>
      purchaseRabbitUnlock(currentGame, unlockId) ?? currentGame,
    )
  }

  function completeCapybaraDemo(demonstrationId) {
    updateGame((currentGame) => {
      const completedGame = completeCapybaraDemonstration(
        currentGame,
        demonstrationId,
      )

      if (!completedGame) return currentGame

      return demonstrationId ===
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO
        ? switchGameArea(completedGame, GAME_AREA_IDS.MAIN)
        : completedGame
    })
  }

  function enterMisfortuneArea() {
    updateGame((currentGame) => {
      const canEnter =
        hasCompletedCapybaraDemonstration(
          currentGame,
          CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
        )

      return canEnter
        ? switchGameArea(currentGame, GAME_AREA_IDS.MISFORTUNE)
        : currentGame
    })
    resetBlueprintEditor()
    setActiveTab('field')
  }

  function leaveMisfortuneArea() {
    updateGame((currentGame) =>
      switchGameArea(currentGame, GAME_AREA_IDS.MAIN),
    )
    resetBlueprintEditor()
    setActiveTab('field')
  }

  function unlockUnfortunateRow() {
    const didConfirm = window.confirm(
      'Accept Unfortunate Row for 250k Crops? This resets Crops and field growth in both the main and Misfortune areas, then grants the blueprints in both areas one permanent Row.',
    )

    if (!didConfirm) {
      return
    }

    updateGame((currentGame) =>
      purchaseMisfortuneUpgrade(
        currentGame,
        MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
      ) ?? currentGame,
    )
  }

  function startMarshSurvey(surveyId, lengthId, allocatedHamsters) {
    updateGame((currentGame) =>
      startManateeSurvey(
        currentGame,
        surveyId,
        lengthId,
        allocatedHamsters,
      ) ?? currentGame,
    )
  }

  function collectMarshFind(findId) {
    updateGame((currentGame) =>
      collectManateeFind(currentGame, findId) ?? currentGame,
    )
  }

  function cancelMarshSurvey(surveyId) {
    updateGame((currentGame) =>
      cancelManateeSurvey(currentGame, surveyId) ?? currentGame,
    )
  }

  function buildManateeBuilding(buildingId) {
    updateGame((currentGame) =>
      constructManateeBuilding(currentGame, buildingId) ?? currentGame,
    )
  }

  function improveManateeBuilding(buildingId) {
    updateGame((currentGame) =>
      upgradeManateeBuilding(currentGame, buildingId) ?? currentGame,
    )
  }

  function completeManateeGoal(goalId) {
    updateGame((currentGame) =>
      completeManateeDevelopmentGoal(currentGame, goalId) ?? currentGame,
    )
  }

  function toggleWetlandsObstruction(tileId) {
    updateGame((currentGame) =>
      toggleWetlandsConnectionObstruction(currentGame, tileId) ?? currentGame,
    )
  }

  function clearWetlandsObstructions() {
    updateGame((currentGame) =>
      clearWetlandsConnectionObstructions(currentGame) ?? currentGame,
    )
  }

  function buySeedAugmentation(augmentationId) {
    updateGame((currentGame) =>
      purchaseSeedAugmentation(currentGame, augmentationId) ?? currentGame,
    )
  }

  function togglePurchasedSeedAugmentation(augmentationId) {
    updateGame((currentGame) =>
      toggleSeedAugmentation(currentGame, augmentationId) ?? currentGame,
    )
  }

  function openAugmentation() {
    if (isAugmentationTabVisible) {
      setActiveTab('augmentation')
    }
  }
  function openTrade() {
    if (isTradeTabVisible) {
      setActiveTab('trade')
    }
  }
  function openInventions() {
    if (!areInventionsUnlocked) {
      return
    }

    updateGame((currentGame) => ({
      ...currentGame,
      hasVisitedInventions: true,
    }))
    setActiveTab('inventions')
  }

  return {
    activeTab,
    activeInventionsTab,
    setActiveInventionsTab,
    navigationActions: {
      onShowField: () => setActiveTab('field'),
      onShowTrade: openTrade,
      onShowAugmentation: openAugmentation,
      onShowMisfortune: () => setActiveTab('misfortune'),
      onOpenInventions: openInventions,
      onShowStatistics: () => setActiveTab('statistics'),
      onOpenOptions: openOptions,
    },
    purchaseActions: {
      onBuyHamster: buyHamster,
      onBuyMaxHamsters: buyMaxHamsters,
      onBuyRowDuplicator: buyRowDuplicator,
      onBuyMaxRowDuplicators: buyMaxRowDuplicators,
      onBuyFloorReplicator: buyFloorReplicator,
      onBuyMaxFloorReplicators: buyMaxFloorReplicators,
    },
    tradeActions: {
      activeRelation: activeTradeRelation,
      onActiveRelationChange: setActiveTradeRelation,
      activeManateeZone,
      onActiveManateeZoneChange: setActiveManateeZone,
      onEstablishTrade: establishTrade,
      onClaimRabbitContract: claimRabbitDelivery,
      onPurchaseRabbitUnlock: buyRabbitUnlock,
      onUnlockBlazingCarrot: () => unlockPerfection('blazingCarrot'),
      onCompleteCapybaraDemonstration: completeCapybaraDemo,
      onEnterMisfortuneArea: enterMisfortuneArea,
      onLeaveMisfortuneArea: leaveMisfortuneArea,
      onStartManateeSurvey: startMarshSurvey,
      onCancelManateeSurvey: cancelMarshSurvey,
      onCollectManateeFind: collectMarshFind,
      onConstructManateeBuilding: buildManateeBuilding,
      onUpgradeManateeBuilding: improveManateeBuilding,
      onCompleteManateeDevelopmentGoal: completeManateeGoal,
      onToggleWetlandsObstruction: toggleWetlandsObstruction,
      onClearWetlandsObstructions: clearWetlandsObstructions,
    },
    augmentationActions: {
      onPurchaseSeedAugmentation: buySeedAugmentation,
      onToggleSeedAugmentation: togglePurchasedSeedAugmentation,
    },
    inventionsActions: {
      onUnlockEnrichingLeek: () => unlockPerfection('enrichingLeek'),
      onUnlockMirrorCorn: () => unlockPerfection('mirrorCorn'),
      onUnlockLeechingGourd: () => unlockPerfection('leechingGourd'),
      onUnlockSamplingLentil: () => unlockPerfection('samplingLentil'),
      onUnlockSplitweed: () => unlockPerfection('splitweed'),
      onRequestRowDuplicatorUnlock: () =>
        setIsRowDuplicatorUnlockPending(true),
      onRequestBlueprintExpansion: setPendingBlueprintExpansionId,
      onCancelBlueprintExpansion: () =>
        setPendingBlueprintExpansionId(null),
      onConfirmBlueprintExpansion: confirmBlueprintExpansionReset,
      onCancelRowDuplicatorUnlock: () =>
        setIsRowDuplicatorUnlockPending(false),
      onConfirmRowDuplicatorUnlock: confirmRowDuplicatorReset,
    },
    pendingBlueprintExpansion: pendingBlueprintExpansionId
      ? getBlueprintExpansion(pendingBlueprintExpansionId)
      : null,
    isRowDuplicatorUnlockPending,
    onLeaveMisfortuneArea: leaveMisfortuneArea,
    onUnlockUnfortunateRow: unlockUnfortunateRow,
    options: {
      saveCode,
      onSaveCodeChange: setSaveCode,
      saveTransferStatus,
      manualSaveStatus,
      onSaveNow: manuallySaveGame,
      hardResetClicks,
      onNumberNotationChange: (numberNotation) =>
        updateGame((currentGame) => ({
          ...currentGame,
          numberNotation:
            numberNotation === 'scientific' ? 'scientific' : 'suffix',
        })),
      onSuffixScientificExponentChange: (suffixScientificExponent) =>
        updateGame((currentGame) => ({
          ...currentGame,
          suffixScientificExponent: [33, 303, 3003].includes(
            Number(suffixScientificExponent),
          )
            ? Number(suffixScientificExponent)
            : 303,
        })),
      onExportSave: exportSave,
      onImportSave: importSave,
      onHardReset: handleHardReset,
    },
    onCloseBlueprintMastery: () =>
      updateGame((currentGame) => ({
        ...currentGame,
        hasSeenBlueprintMastery: true,
      })),
    unionConfirmation: {
      isOpen: isUnionConfirmationOpen,
      onCancel: () => setIsUnionConfirmationOpen(false),
      onConfirm: () => {
        completeHamsterHire()
        setIsUnionConfirmationOpen(false)
      },
    },
  }
}
