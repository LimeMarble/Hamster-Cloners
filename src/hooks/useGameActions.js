import { useEffect, useState } from 'react'
import {
  createInitialGame,
  getBlueprintExpansion,
  getHamsterStateAfterHire,
  getMaxDuplicatorPurchase,
  getMaxHamsterPurchase,
  getNextHamsterCost,
  getNextRowDuplicatorCost,
  resetForBlueprintExpansion,
  resetForRowDuplicators,
  UNIONIZATION_HAMSTER_COUNT,
  unlockCropPerfection,
} from '../game/gameLogic.js'
import { exportGame, importGame } from '../game/storage.js'

export function useGameActions({
  gameRef,
  setGame,
  updateGame,
  areInventionsUnlocked,
  resetBlueprintEditor,
  clearCropUnlockNotices,
}) {
  const [activeTab, setActiveTab] = useState('field')
  const [activeInventionsTab, setActiveInventionsTab] = useState('blueprint')
  const [isUnionConfirmationOpen, setIsUnionConfirmationOpen] = useState(false)
  const [pendingBlueprintExpansionId, setPendingBlueprintExpansionId] =
    useState(null)
  const [isRowDuplicatorUnlockPending, setIsRowDuplicatorUnlockPending] =
    useState(false)
  const [hardResetClicks, setHardResetClicks] = useState(0)
  const [lastHardResetClickAt, setLastHardResetClickAt] = useState(0)
  const [saveCode, setSaveCode] = useState('')
  const [saveTransferStatus, setSaveTransferStatus] = useState(null)

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

      const cost = getNextRowDuplicatorCost(currentGame.rowDuplicators)

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
      clearCropUnlockNotices()
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
    setActiveTab('options')
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
      onOpenInventions: openInventions,
      onShowStatistics: () => setActiveTab('statistics'),
      onOpenOptions: openOptions,
    },
    purchaseActions: {
      onBuyHamster: buyHamster,
      onBuyMaxHamsters: buyMaxHamsters,
      onBuyRowDuplicator: buyRowDuplicator,
      onBuyMaxRowDuplicators: buyMaxRowDuplicators,
    },
    inventionsActions: {
      onUnlockEnrichingLeek: () => unlockPerfection('enrichingLeek'),
      onUnlockMirrorCorn: () => unlockPerfection('mirrorCorn'),
      onUnlockLeechingGourd: () => unlockPerfection('leechingGourd'),
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
    options: {
      saveCode,
      onSaveCodeChange: setSaveCode,
      saveTransferStatus,
      hardResetClicks,
      onNumberNotationChange: (numberNotation) =>
        updateGame((currentGame) => ({
          ...currentGame,
          numberNotation:
            numberNotation === 'scientific' ? 'scientific' : 'suffix',
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
