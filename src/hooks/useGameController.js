import { useRef } from 'react'
import {
  collectCloverBundle,
  INVENTIONS_HAMSTER_UNLOCK_COUNT,
} from '../game/gameLogic.js'
import { useBlueprintEditor } from './useBlueprintEditor.js'
import { useGameActions } from './useGameActions.js'
import { useGameDerivedState } from './useGameDerivedState.js'
import { useGameState } from './useGameState.js'
import { useTestingCheats } from './useTestingCheats.js'

export function useGameController() {
  const isEditingBlueprintRef = useRef(false)
  const {
    game,
    gameRef,
    setGame,
    updateGame,
    setSimulationPaused,
    backgroundCatchUp,
    compressBackgroundCatchUp,
    skipBackgroundCatchUp,
  } = useGameState(isEditingBlueprintRef)
  const derived = useGameDerivedState(game)
  const blueprintEditor = useBlueprintEditor({
    game,
    gameRef,
    updateGame,
    isEditingBlueprintRef,
    onEditingChange: setSimulationPaused,
    unlockedCropIds: derived.unlockedCropIds,
    visibleCropIds: derived.visibleCropIds,
    unlockedBlueprintSlotCount: derived.unlockedBlueprintSlotCount,
    hasMirrorCorn: derived.hasMirrorCorn,
    hasLeechingGourd: derived.hasLeechingGourd,
    rowsBuiltPerSecond: derived.rowsBuiltPerSecond,
    rabbitContractsCompleted: game.trade?.rabbitContractsCompleted ?? 0,
    showMonocropLimit: derived.showMonocropLimit,
    monocropLimit: derived.monocropLimit,
    monocropPenaltyMultiplier: derived.monocropPenaltyMultiplier,
  })
  const actions = useGameActions({
    gameRef,
    setGame,
    updateGame,
    areInventionsUnlocked: derived.areInventionsUnlocked,
    isTradeTabVisible: derived.isTradeTabVisible,
    isAugmentationTabVisible: derived.isAugmentationTabVisible,
    resetBlueprintEditor: blueprintEditor.resetBlueprintEditor,
  })
  const testing = useTestingCheats({
    game,
    updateGame,
    blueprintExpansionTracks: derived.blueprintExpansionTracks,
  })

  return {
    progression: {
      goal: derived.majorProgressionGoal,
    },
    navigation: {
      activeTab: actions.activeTab,
      areInventionsUnlocked: derived.areInventionsUnlocked,
      isTradeTabVisible: derived.isTradeTabVisible,
    isAugmentationTabVisible: derived.isAugmentationTabVisible,
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
          monocropLimit: derived.monocropLimit,
          monocropPenaltyMultiplier: derived.monocropPenaltyMultiplier,
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
              rowDuplicatorExternalMultiplier:
                derived.rowDuplicatorExternalMultiplier,
              rowsBuiltPerSecond: derived.rowsBuiltPerSecond,
              onBuyRowDuplicator:
                actions.purchaseActions.onBuyRowDuplicator,
              onBuyMaxRowDuplicators:
                actions.purchaseActions.onBuyMaxRowDuplicators,
            }
          : null,
      },
      trade: {
        game,
        capybaraBlueprintCropYield:
          derived.capybaraBlueprintCropYield,
        rabbitContractProductionPerSecondByCrop:
          derived.rabbitContractProductionPerSecondByCrop,
        ...actions.tradeActions,
      },
      augmentation: {
        game,
      },
      inventions: {
        game,
        activeInventionsTab: actions.activeInventionsTab,
        onActiveInventionsTabChange: actions.setActiveInventionsTab,
        blueprintExpansionTracks: derived.blueprintExpansionTracks,
        canUnlockEnrichingLeek: derived.canUnlockEnrichingLeek,
        canUnlockMirrorCorn: derived.canUnlockMirrorCorn,
        canUnlockLeechingGourd: derived.canUnlockLeechingGourd,
        canUnlockSweetPotato: derived.canUnlockSweetPotato,
        canUnlockSplitweed: derived.canUnlockSplitweed,
        canUnlockRows: derived.canUnlockRows,
        hasEnrichingLeek: derived.hasEnrichingLeek,
        hasMirrorCorn: derived.hasMirrorCorn,
        hasLeechingGourd: derived.hasLeechingGourd,
        hasSweetPotato: derived.hasSweetPotato,
        hasSplitweed: derived.hasSplitweed,
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
      backgroundCatchUp: backgroundCatchUp
        ? {
            ...backgroundCatchUp,
            onCompress: compressBackgroundCatchUp,
            onSkip: skipBackgroundCatchUp,
          }
        : null,
      blueprintEditor: blueprintEditor.blueprintEditor,
      monocropWarning: blueprintEditor.monocropWarning,
      blueprintMastery: {
        isOpen:
          derived.hasCompletedAllBlueprintExpansions &&
          !game.hasSeenBlueprintMastery,
        onClose: actions.onCloseBlueprintMastery,
      },
      unionConfirmation: actions.unionConfirmation,
      testingPanel: testing.testingPanel,
      fortune: {
        fortune: game.fortune,
        onCollect: () =>
          updateGame((currentGame) => collectCloverBundle(currentGame)),
      },
    },
  }
}
