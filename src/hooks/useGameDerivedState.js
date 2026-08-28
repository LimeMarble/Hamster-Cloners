import { useMemo } from 'react'
import {
  canUnlockCropPerfection,
  canUnlockRowDuplicators,
  getCapybaraBlueprintCropYield,
  getCapybaraHamsterEfficiencyMultiplier,
  getBlueprintExpansionTrackProgress,
  getBlueprintMonocropMultiplier,
  getBlueprintSlots,
  getColumnsProducedPerSecond,
  getCropHamsterEfficiencyMultiplier,
  getCropProductionSnapshotPerSecond,
  getFortuneModifiers,

  getHamsterCoordinationMultiplier,
  getHamsterExternalMultiplier,
  getNextHamsterCost,
  getNextMajorProgressionGoal,
  getNextRowDuplicatorCost,
  getMonocropThresholdBonus,
  getRowDuplicatorEffectivenessMultiplier,
  getRowDuplicatorExternalMultiplier,
  getRowsProducedPerSecond,
  getRowDuplicatorCoordinationMultiplier,
  getUnlockedBlueprintSlotCount,
  hasReachedMonocropLimit,
  hasRabbitUnlock,
  hasSeedAugmentation,
  INVENTIONS_HAMSTER_UNLOCK_COUNT,
  RABBIT_UNLOCK_IDS,
  UNIONIZATION_HAMSTER_COUNT,
  UNION_STATUS_RETIRE_HIRE_COUNT,
} from '../game/gameLogic.js'
import { getUnlockedCropIds, getVisibleCropIds } from '../game/crops.js'
import { getMonocropThreshold } from '../game/monocropPenalty.js'
import { formatWholeNumber } from '../game/numberFormat.js'

export function useGameDerivedState(game) {
  const fortuneModifiers = useMemo(
    () => getFortuneModifiers(game.fortune),
    [game.fortune],
  )
  const nextHamsterCost = useMemo(
    () => getNextHamsterCost(game.hamsters, game.unionized),
    [game.hamsters, game.unionized],
  )
  const cropProductionSnapshot = useMemo(
    () =>
      getCropProductionSnapshotPerSecond(
        game.blueprint,
        game.farmland,
        game.completedCropPerfections,
        game.testingCheats?.cropMultiplierEnabled ? 10 : 1,
        game.trade?.rabbitContractsCompleted ?? 0,
        fortuneModifiers,
        game.seedAugmentations,
      ),
    [
      game.blueprint,
      game.farmland,
      game.completedCropPerfections,
      game.testingCheats?.cropMultiplierEnabled,
      game.trade?.rabbitContractsCompleted,
      fortuneModifiers,
      game.seedAugmentations,
    ],
  )
  const productionPerSecond = cropProductionSnapshot.total
  const capybaraBlueprintCropYield = useMemo(
    () =>
      getCapybaraBlueprintCropYield({
        blueprint: game.blueprint,
        completedCropPerfections: game.completedCropPerfections,
        fortune: game.fortune,
        seedAugmentations: game.seedAugmentations,
        trade: {
          rabbitContractsCompleted:
            game.trade?.rabbitContractsCompleted ?? 0,
        },
      }),
    [
      game.blueprint,
      game.completedCropPerfections,
      game.fortune,
      game.seedAugmentations,
      game.trade?.rabbitContractsCompleted,
    ],
  )

  const hamsterCoordinationMultiplier = useMemo(
    () =>
      getHamsterCoordinationMultiplier(
        game.hamsters,
        game.postUnionHamstersHired,
      ),
    [game.hamsters, game.postUnionHamstersHired],
  )
  const hamsterExternalMultiplier = getHamsterExternalMultiplier(
    (game.testingCheats?.hamsterEfficiencyEnabled ? 10 : 1) *
      (hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY)
        ? 3
        : 1) *
      getCapybaraHamsterEfficiencyMultiplier(game),
  )
  const nextRowDuplicatorCost = useMemo(
    () => getNextRowDuplicatorCost(game.rowDuplicators),
    [game.rowDuplicators],
  )
  const rowDuplicatorEffectivenessMultiplier = useMemo(
    () =>
      getRowDuplicatorEffectivenessMultiplier(
        game.blueprint,
        game.completedCropPerfections,
        game.hamsters,
        fortuneModifiers.passiveEffectMultiplier,
        game.seedAugmentations,
      ),
    [
      game.blueprint,
      game.completedCropPerfections,
      game.hamsters,
      fortuneModifiers.passiveEffectMultiplier,
      game.seedAugmentations,
    ],
  )
  const rowDuplicatorCoordinationMultiplier = useMemo(
    () => getRowDuplicatorCoordinationMultiplier(game.rowDuplicators),
    [game.rowDuplicators],
  )
  const rowDuplicatorExternalMultiplier =
    getRowDuplicatorExternalMultiplier(
      hasRabbitUnlock(
        game,
        RABBIT_UNLOCK_IDS.ROW_DUPLICATOR_EFFICIENCY,
      )
        ? 2
        : 1,
    )
  const rowsBuiltPerSecond = useMemo(
    () =>
      getRowsProducedPerSecond(
        game.hasUnlockedRowDuplicators ? game.rowDuplicators : 0,
        rowDuplicatorEffectivenessMultiplier,
        rowDuplicatorExternalMultiplier,
      ),
    [
      game.hasUnlockedRowDuplicators,
      game.rowDuplicators,
      rowDuplicatorEffectivenessMultiplier,
      rowDuplicatorExternalMultiplier,
    ],
  )
  const cropHamsterEfficiencyMultiplier = useMemo(
    () =>
      getCropHamsterEfficiencyMultiplier(
        game.blueprint,
        game.completedCropPerfections,
        rowsBuiltPerSecond,
        fortuneModifiers.passiveEffectMultiplier,
        game.seedAugmentations,
      ),
    [
      game.blueprint,
      game.completedCropPerfections,
      rowsBuiltPerSecond,
      fortuneModifiers.passiveEffectMultiplier,
      game.seedAugmentations,
    ],
  )
  const columnsBuiltPerSecond = useMemo(
    () =>
      getColumnsProducedPerSecond(
        game.hamsters,
        game.postUnionHamstersHired,
        cropHamsterEfficiencyMultiplier,
        hamsterExternalMultiplier,
      ),
    [
      game.hamsters,
      game.postUnionHamstersHired,
      cropHamsterEfficiencyMultiplier,
      hamsterExternalMultiplier,
    ],
  )
  const hasUnlockedCarrot = hasRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.CARROT,
  )
  const hasUnlockedFourLeafClover = hasRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.FOUR_LEAF_CLOVER,
  )
  const unlockedCropIds = useMemo(
    () =>
      getUnlockedCropIds(
        game.blueprint,
        game.unionized,
        game.hamsters,
        game.hasUnlockedTurnip,
        game.hasUnlockedAppleTree,
        game.hasUnlockedLentil,
        game.hasUnlockedKnotweed,
        game.hasUnlockedRootTunnel,
        game.hasUnlockedSunflower,
        game.rowDuplicators,
        hasUnlockedCarrot,
        hasUnlockedFourLeafClover,
        game.hasUnlockedWheat,
      ),
    [
      game.blueprint,
      game.unionized,
      game.hamsters,
      game.hasUnlockedTurnip,
      game.hasUnlockedAppleTree,
      game.hasUnlockedLentil,
      game.hasUnlockedKnotweed,
      game.hasUnlockedRootTunnel,
      game.hasUnlockedSunflower,
      game.rowDuplicators,
      hasUnlockedCarrot,
      hasUnlockedFourLeafClover,
      game.hasUnlockedWheat,
    ],
  )
  const visibleCropIds = useMemo(
    () =>
      getVisibleCropIds(
        unlockedCropIds,
        game.totalHamstersHired,
        game.hasUnlockedRowDuplicators,
      ),
    [
      unlockedCropIds,
      game.totalHamstersHired,
      game.hasUnlockedRowDuplicators,
    ],
  )
  const visibleUnlockedCropIds = useMemo(
    () =>
      visibleCropIds.filter((cropId) => unlockedCropIds.includes(cropId)),
    [visibleCropIds, unlockedCropIds],
  )
  const blueprintSlots = useMemo(() => getBlueprintSlots(game), [game])
  const unlockedBlueprintSlotCount = getUnlockedBlueprintSlotCount(game)
  const monocropThresholdBonus = getMonocropThresholdBonus(
    game.blueprint,
    game.completedCropPerfections,
  )
  const monocropLimit = Math.ceil(
    getMonocropThreshold(
      game.blueprint.rows * game.blueprint.columns,
      monocropThresholdBonus,
    ),
  )
  const monocropPenaltyMultiplier = getBlueprintMonocropMultiplier(
    game.blueprint,
    game.completedCropPerfections,
  )
  const showMonocropLimit =
    game.hasSeenMonocropLimit ||
    hasReachedMonocropLimit(
      game.blueprint,
      game.completedCropPerfections,
    )
  const formattedTotalHamstersHired = formatWholeNumber(game.totalHamstersHired)
  const unionStatus =
    game.unionized &&
    game.postUnionHamstersHired >= UNION_STATUS_RETIRE_HIRE_COUNT
      ? null
      : game.unionized
        ? 'Unionized: 900 hamsters left. 100 stayed, and future hiring costs now grow normally.'
        : game.totalHamstersHired >= 500
          ? `Unionization: ${formattedTotalHamstersHired} / ${UNIONIZATION_HAMSTER_COUNT} hamsters. At 1,000, 900 will leave and 100 will remain.`
          : game.totalHamstersHired >= 100
            ? `???: ${formattedTotalHamstersHired} / ${UNIONIZATION_HAMSTER_COUNT}`
            : null
  const blueprintExpansionTracks = getBlueprintExpansionTrackProgress(game)
  const completedCropPerfections = game.completedCropPerfections
  const majorProgressionGoal = useMemo(
    () => getNextMajorProgressionGoal(game),
    [game],
  )

  return {
    nextHamsterCost,
    majorProgressionGoal,
    productionPerSecond,
    rabbitContractProductionPerSecondByCrop: cropProductionSnapshot.byCrop,
    capybaraBlueprintCropYield,
    isTradeTabVisible: game.hasUnlockedSunflower === true,
    isAugmentationTabVisible: hasSeedAugmentation(game),
    cropHamsterEfficiencyMultiplier,
    hamsterCoordinationMultiplier,
    hamsterExternalMultiplier,
    columnsBuiltPerSecond,
    nextRowDuplicatorCost,
    rowDuplicatorEffectivenessMultiplier,
    rowDuplicatorCoordinationMultiplier,
    rowDuplicatorExternalMultiplier,
    rowsBuiltPerSecond,
    unlockedCropIds,
    visibleCropIds,
    visibleUnlockedCropIds,
    blueprintSlots,
    unlockedBlueprintSlotCount,
    monocropLimit,
    monocropPenaltyMultiplier,
    showMonocropLimit,
    unionStatus,
    canHireMax:
      game.crops >= nextHamsterCost &&
      (game.unionized ||
        game.totalHamstersHired < UNIONIZATION_HAMSTER_COUNT - 1),
    blueprintExpansionTracks,
    hasCompletedAllBlueprintExpansions: blueprintExpansionTracks.every(
      (track) => track.nextExpansion === undefined,
    ),
    areInventionsUnlocked:
      game.totalHamstersHired >= INVENTIONS_HAMSTER_UNLOCK_COUNT,
    showInventionsUnlockPrompt:
      game.totalHamstersHired >= INVENTIONS_HAMSTER_UNLOCK_COUNT &&
      !game.hasVisitedInventions,
    canUnlockEnrichingLeek: canUnlockCropPerfection(game, 'enrichingLeek'),
    canUnlockMirrorCorn: canUnlockCropPerfection(game, 'mirrorCorn'),
    canUnlockLeechingGourd: canUnlockCropPerfection(game, 'leechingGourd'),
    canUnlockSamplingLentil: canUnlockCropPerfection(game, 'samplingLentil'),
    canUnlockSplitweed: canUnlockCropPerfection(game, 'splitweed'),
    canUnlockRows: canUnlockRowDuplicators(game),
    hasEnrichingLeek: completedCropPerfections.includes('enrichingLeek'),
    hasMirrorCorn: completedCropPerfections.includes('mirrorCorn'),
    hasLeechingGourd: completedCropPerfections.includes('leechingGourd'),
    hasSamplingLentil: completedCropPerfections.includes('samplingLentil'),
    hasSplitweed: completedCropPerfections.includes('splitweed'),
  }
}
