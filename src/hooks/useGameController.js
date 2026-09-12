import { useRef } from 'react'
import {
  canUnlockGreaterBlueprinting,
  canPurchaseFloorReplicatorsInArea,
  canUnlockMisfortuneUpgrade,
  collectCloverBundle,
  getHuntForSomethingGreaterMultiplier,
  getMissingMisfortuneCropTypeIds,
  hasMisfortuneUpgrade,
  isFloorReplicatorSupportModeAvailable,
  isCloverAssemblyReady,
  INVENTIONS_HAMSTER_UNLOCK_COUNT,
  MISFORTUNE_UPGRADE_IDS,
  MISFORTUNE_UPGRADES,
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
    saveCurrentGame,
    lastSavedAt,
    setSimulationPaused,
    backgroundCatchUp,
    isGameReady,
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
    hasSplitweed: derived.hasSplitweed,
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
    saveGameNow: saveCurrentGame,
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
  const canPurchaseFloorReplicators =
    canPurchaseFloorReplicatorsInArea(game)
  const shouldShowFloorReplicators =
    game.hasUnlockedFloorReplicators &&
    (canPurchaseFloorReplicators || game.floorReplicators >= 1)

  return {
    isGameReady,
    progression: {
      goal: derived.majorProgressionGoal,
      numberNotation: game.numberNotation,
      suffixScientificExponent: game.suffixScientificExponent,
    },
    navigation: {
      activeTab: actions.activeTab,
      areInventionsUnlocked: derived.areInventionsUnlocked,
      isTradeTabVisible: derived.isTradeTabVisible,
      isAugmentationTabVisible: derived.isAugmentationTabVisible,
      isMisfortuneTabVisible: derived.isMisfortuneAreaActive,
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
          fieldIncomePerSecond: derived.capybaraBlueprintCropYield,
          showMonocropLimit: derived.showMonocropLimit,
          monocropLimit: derived.monocropLimit,
          monocropPenaltyMultiplier: derived.monocropPenaltyMultiplier,
          blueprintSlots: derived.blueprintSlots,
          unlockedBlueprintSlotCount: derived.unlockedBlueprintSlotCount,
          visibleCropIds: derived.visibleCropIds,
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
        floorReplicatorPurchase: shouldShowFloorReplicators
          ? {
              game,
              canPurchaseFloorReplicators,
              nextFloorReplicatorCost: derived.nextFloorReplicatorCost,
              floorReplicatorCoordinationMultiplier:
                derived.floorReplicatorCoordinationMultiplier,
              floorReplicatorEffectivenessMultiplier:
                derived.floorReplicatorEffectivenessMultiplier,
              floorReplicatorExternalMultiplier:
                derived.floorReplicatorExternalMultiplier,
              isFloorReplicatorSupportMode:
                derived.isFloorReplicatorSupportMode,
              floorReplicatorSupportPassiveEffectBonus:
                derived.floorReplicatorSupportPassiveEffectBonus,
              hasFloorReplicatorSupport:
                isFloorReplicatorSupportModeAvailable(game),
              floorsBuiltPerSecond: derived.floorsBuiltPerSecond,
              onBuyFloorReplicator:
                actions.purchaseActions.onBuyFloorReplicator,
              onBuyMaxFloorReplicators:
                actions.purchaseActions.onBuyMaxFloorReplicators,
              onToggleFloorReplicatorMode:
                actions.purchaseActions.onToggleFloorReplicatorMode,
            }
          : null,
      },
      trade: {
        game,
        capybaraBlueprintCropYield:
          derived.capybaraBlueprintCropYield,
        canUnlockBlazingCarrot: derived.canUnlockBlazingCarrot,
        hasBlazingCarrot: derived.hasBlazingCarrot,
        rabbitContractProductionPerSecondByCrop:
          derived.rabbitContractProductionPerSecondByCrop,
        ...actions.tradeActions,
      },
      augmentation: {
        game,
        ...actions.augmentationActions,
      },
      misfortune: {
        unfortunateRow: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW
        ],
        hasUnfortunateRow: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
        ),
        canUnlockUnfortunateRow: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.UNFORTUNATE_ROW,
        ),
        onUnlockUnfortunateRow: actions.onUnlockUnfortunateRow,
        fortunateColumn: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN
        ],
        hasFortunateColumn: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
        ),
        canUnlockFortunateColumn: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.FORTUNATE_COLUMN,
        ),
        onUnlockFortunateColumn: actions.onUnlockFortunateColumn,
        rushedStart: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.RUSHED_START
        ],
        hasRushedStart: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.RUSHED_START,
        ),
        canUnlockRushedStart: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.RUSHED_START,
        ),
        onUnlockRushedStart: actions.onUnlockRushedStart,
        adversityGrownTubers: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS
        ],
        hasAdversityGrownTubers: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
        ),
        canUnlockAdversityGrownTubers: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
        ),
        onUnlockAdversityGrownTubers:
          actions.onUnlockAdversityGrownTubers,
        burdenedFoundations: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS
        ],
        hasBurdenedFoundations: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
        ),
        canUnlockBurdenedFoundations: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.BURDENED_FOUNDATIONS,
        ),
        onUnlockBurdenedFoundations:
          actions.onUnlockBurdenedFoundations,
        nourishingMisery: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY
        ],
        hasNourishingMisery: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
        ),
        canUnlockNourishingMisery: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
        ),
        onUnlockNourishingMisery:
          actions.onUnlockNourishingMisery,
        huntForSomethingGreater: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER
        ],
        hasHuntForSomethingGreater: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
        ),
        canUnlockHuntForSomethingGreater: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
        ),
        huntForSomethingGreaterMultiplier:
          getHuntForSomethingGreaterMultiplier(game),
        missingMisfortuneCropTypeCount:
          getMissingMisfortuneCropTypeIds(game).length,
        onUnlockHuntForSomethingGreater:
          actions.onUnlockHuntForSomethingGreater,
        finalSupport: MISFORTUNE_UPGRADES[
          MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT
        ],
        hasFinalSupport: hasMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
        ),
        canUnlockFinalSupport: canUnlockMisfortuneUpgrade(
          game,
          MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT,
        ),
        onUnlockFinalSupport: actions.onUnlockFinalSupport,
        onLeave: actions.onLeaveMisfortuneArea,
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
        canUnlockSamplingLentil: derived.canUnlockSamplingLentil,
        canUnlockSplitweed: derived.canUnlockSplitweed,
        canUnlockGreaterBlueprinting: canUnlockGreaterBlueprinting(game),
        isCloverAssemblyReady: isCloverAssemblyReady(game.cloverAssembly),
        canUnlockRows: derived.canUnlockRows,
        hasEnrichingLeek: derived.hasEnrichingLeek,
        hasMirrorCorn: derived.hasMirrorCorn,
        hasLeechingGourd: derived.hasLeechingGourd,
        hasSweetPotato: derived.hasSweetPotato,
        hasSamplingLentil: derived.hasSamplingLentil,
        hasSplitweed: derived.hasSplitweed,
        pendingBlueprintExpansion: actions.pendingBlueprintExpansion,
        isRowDuplicatorUnlockPending:
          actions.isRowDuplicatorUnlockPending,
        ...actions.inventionsActions,
      },
      statistics: {
        game,
        unlockedCropIds: derived.unlockedCropIds,
        cloverBundleChancePerMinute: derived.cloverBundleChancePerMinute,
      },
      options: {
        ...actions.options,
        lastSavedAt,
        numberNotation: game.numberNotation,
        suffixScientificExponent: game.suffixScientificExponent,
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
      blueprintEditor: blueprintEditor.blueprintEditor
        ? {
            ...blueprintEditor.blueprintEditor,
            fieldIncomePerSecond: derived.capybaraBlueprintCropYield,
            hamsterEfficiencyMultiplier:
              derived.cropHamsterEfficiencyMultiplier,
            duplicatorEfficiencyMultiplier:
              derived.rowDuplicatorEffectivenessMultiplier,
            replicatorEfficiencyMultiplier:
              derived.floorReplicatorEffectivenessMultiplier,
          }
        : null,
      monocropWarning: blueprintEditor.monocropWarning,
      blueprintMastery: {
        isOpen:
          derived.hasCompletedAllBlueprintExpansions &&
          !game.hasSeenBlueprintMastery,
        onClose: actions.onCloseBlueprintMastery,
      },
      unionConfirmation: actions.unionConfirmation,
      misfortuneWipeConfirmation: testing.misfortuneWipeConfirmation,
      testingPanel: testing.testingPanel,
      fortune: {
        fortune: game.fortune,
        isDisabled: derived.isMisfortuneAreaActive,
        numberNotation: game.numberNotation,
        suffixScientificExponent: game.suffixScientificExponent,
        onCollect: (bundleIndex) =>
          updateGame((currentGame) =>
            collectCloverBundle(currentGame, bundleIndex),
          ),
      },
    },
  }
}
