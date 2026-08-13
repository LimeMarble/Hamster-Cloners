import { useRef } from 'react'
import { INVENTIONS_HAMSTER_UNLOCK_COUNT } from '../game/gameLogic.js'
import { useBlueprintEditor } from './useBlueprintEditor.js'
import { useCropUnlockNotifications } from './useCropUnlockNotifications.js'
import { useGameActions } from './useGameActions.js'
import { useGameDerivedState } from './useGameDerivedState.js'
import { useGameState } from './useGameState.js'
import { useTestingCheats } from './useTestingCheats.js'

export function useGameController() {
  const isEditingBlueprintRef = useRef(false)
  const { game, gameRef, setGame, updateGame } = useGameState(
    isEditingBlueprintRef,
  )
  const derived = useGameDerivedState(game)
  const notifications = useCropUnlockNotifications(
    derived.visibleUnlockedCropIds,
  )
  const blueprintEditor = useBlueprintEditor({
    game,
    gameRef,
    updateGame,
    isEditingBlueprintRef,
    unlockedCropIds: derived.unlockedCropIds,
    visibleCropIds: derived.visibleCropIds,
    unlockedBlueprintSlotCount: derived.unlockedBlueprintSlotCount,
    hasMirrorCorn: derived.hasMirrorCorn,
    hasLeechingGourd: derived.hasLeechingGourd,
  })
  const actions = useGameActions({
    gameRef,
    setGame,
    updateGame,
    areInventionsUnlocked: derived.areInventionsUnlocked,
    resetBlueprintEditor: blueprintEditor.resetBlueprintEditor,
    clearCropUnlockNotices: notifications.clearCropUnlockNotices,
  })
  const testing = useTestingCheats({
    game,
    updateGame,
    blueprintExpansionTracks: derived.blueprintExpansionTracks,
  })

  return {
    navigation: {
      activeTab: actions.activeTab,
      areInventionsUnlocked: derived.areInventionsUnlocked,
      showInventionsUnlockPrompt: derived.showInventionsUnlockPrompt,
      inventionsUnlockCount: INVENTIONS_HAMSTER_UNLOCK_COUNT,
      ...actions.navigationActions,
    },
    screen: {
      activeTab: actions.activeTab,
      field: {
        game,
        productionPerSecond: derived.productionPerSecond,
        blueprint: {
          game,
          showMonocropLimit: derived.showMonocropLimit,
          monocropThreshold: derived.monocropThreshold,
          blueprintSlots: derived.blueprintSlots,
          unlockedBlueprintSlotCount: derived.unlockedBlueprintSlotCount,
          onSelectBlueprintSlot: blueprintEditor.onSelectBlueprintSlot,
          onOpenEditor: blueprintEditor.onOpenEditor,
        },
        hamsterPurchase: {
          game,
          nextHamsterCost: derived.nextHamsterCost,
          columnsBuiltPerSecond: derived.columnsBuiltPerSecond,
          hamsterCoordinationMultiplier:
            derived.hamsterCoordinationMultiplier,
          cropHamsterEfficiencyMultiplier:
            derived.cropHamsterEfficiencyMultiplier,
          hamsterExternalMultiplier: derived.hamsterExternalMultiplier,
          unionStatus: derived.unionStatus,
          canHireMax: derived.canHireMax,
          onBuyHamster: actions.purchaseActions.onBuyHamster,
          onBuyMaxHamsters: actions.purchaseActions.onBuyMaxHamsters,
        },
        duplicatorPurchase: game.hasUnlockedRowDuplicators
          ? {
              game,
              nextRowDuplicatorCost: derived.nextRowDuplicatorCost,
              rowDuplicatorEffectivenessMultiplier:
                derived.rowDuplicatorEffectivenessMultiplier,
              rowDuplicatorCoordinationMultiplier:
                derived.rowDuplicatorCoordinationMultiplier,
              rowsBuiltPerSecond: derived.rowsBuiltPerSecond,
              onBuyRowDuplicator:
                actions.purchaseActions.onBuyRowDuplicator,
              onBuyMaxRowDuplicators:
                actions.purchaseActions.onBuyMaxRowDuplicators,
            }
          : null,
      },
      inventions: {
        game,
        activeInventionsTab: actions.activeInventionsTab,
        onActiveInventionsTabChange: actions.setActiveInventionsTab,
        blueprintExpansionTracks: derived.blueprintExpansionTracks,
        canUnlockEnrichingLeek: derived.canUnlockEnrichingLeek,
        canUnlockMirrorCorn: derived.canUnlockMirrorCorn,
        canUnlockLeechingGourd: derived.canUnlockLeechingGourd,
        canUnlockRows: derived.canUnlockRows,
        hasEnrichingLeek: derived.hasEnrichingLeek,
        hasMirrorCorn: derived.hasMirrorCorn,
        hasLeechingGourd: derived.hasLeechingGourd,
        pendingBlueprintExpansion: actions.pendingBlueprintExpansion,
        isRowDuplicatorUnlockPending:
          actions.isRowDuplicatorUnlockPending,
        ...actions.inventionsActions,
      },
      statistics: {
        game,
        unlockedCropIds: derived.unlockedCropIds,
      },
      options: {
        ...actions.options,
        numberNotation: game.numberNotation,
        codeEntry: testing.codeEntry,
      },
    },
    overlays: {
      blueprintEditor: blueprintEditor.blueprintEditor,
      monocropWarning: blueprintEditor.monocropWarning,
      blueprintMastery: {
        isOpen:
          derived.hasCompletedAllBlueprintExpansions &&
          !game.hasSeenBlueprintMastery,
        onClose: actions.onCloseBlueprintMastery,
      },
      unionConfirmation: actions.unionConfirmation,
      cropUnlockNotice: notifications.cropUnlockNotice,
      testingPanel: testing.testingPanel,
    },
  }
}
