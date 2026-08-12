import { useMemo } from 'react'
import {
  canUnlockCropPerfection,
  canUnlockRowDuplicators,
  getBlueprintExpansionTrackProgress,
  getBlueprintSlots,
  getColumnsProducedPerSecond,
  getCropHamsterEfficiencyMultiplier,
  getCropProductionPerSecond,
  getEffectiveFarmlandMultipliers,
  getHamsterCoordinationMultiplier,
  getHamsterExternalMultiplier,
  getNextHamsterCost,
  getNextRowDuplicatorCost,
  getRowDuplicatorEffectivenessMultiplier,
  getRowsProducedPerSecond,
  getRowDuplicatorCoordinationMultiplier,
  getUnlockedBlueprintSlotCount,
  hasReachedMonocropLimit,
  INVENTIONS_HAMSTER_UNLOCK_COUNT,
  UNIONIZATION_HAMSTER_COUNT,
  UNION_STATUS_RETIRE_HIRE_COUNT,
} from '../game/gameLogic.js'
import { getUnlockedCropIds, getVisibleCropIds } from '../game/crops.js'
import { getMonocropThreshold } from '../game/monocropPenalty.js'
import { getCachedFormattedNumber } from '../game/numberFormat.js'

export function useGameDerivedState(game) {
  const nextHamsterCost = useMemo(
    () => getNextHamsterCost(game.hamsters, game.unionized),
    [game.hamsters, game.unionized],
  )
  const productionPerSecond = useMemo(
    () =>
      getCropProductionPerSecond(
        game.blueprint,
        game.farmland,
        game.completedCropPerfections,
        game.testingCheats?.cropMultiplierEnabled ? 10 : 1,
      ),
    [
      game.blueprint,
      game.farmland,
      game.completedCropPerfections,
      game.testingCheats?.cropMultiplierEnabled,
    ],
  )
  const cropHamsterEfficiencyMultiplier = useMemo(
    () =>
      getCropHamsterEfficiencyMultiplier(
        game.blueprint,
        game.completedCropPerfections,
      ),
    [game.blueprint, game.completedCropPerfections],
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
    game.testingCheats?.hamsterEfficiencyEnabled ? 10 : 1,
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
  const fieldsPlantedPerSecond = useMemo(
    () => {
      const farmland = getEffectiveFarmlandMultipliers(game.farmland)

      return (
        columnsBuiltPerSecond *
        farmland.rows *
        farmland.floors *
        farmland.farms
      )
    },
    [
      columnsBuiltPerSecond,
      game.farmland,
    ],
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
      ),
    [game.blueprint, game.completedCropPerfections],
  )
  const rowDuplicatorCoordinationMultiplier = useMemo(
    () => getRowDuplicatorCoordinationMultiplier(game.rowDuplicators),
    [game.rowDuplicators],
  )
  const rowsBuiltPerSecond = useMemo(
    () =>
      getRowsProducedPerSecond(
        game.hasUnlockedRowDuplicators ? game.rowDuplicators : 0,
        rowDuplicatorEffectivenessMultiplier,
      ),
    [
      game.hasUnlockedRowDuplicators,
      game.rowDuplicators,
      rowDuplicatorEffectivenessMultiplier,
    ],
  )
  const rowDuplicatorFieldsPlantedPerSecond = useMemo(() => {
    const farmland = getEffectiveFarmlandMultipliers(game.farmland)

    return (
      rowsBuiltPerSecond *
      farmland.columns *
      farmland.floors *
      farmland.farms
    )
  }, [game.farmland, rowsBuiltPerSecond])
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
        game.hasUnlockedRowDuplicators,
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
      game.hasUnlockedRowDuplicators,
    ],
  )
  const visibleCropIds = useMemo(
    () => getVisibleCropIds(unlockedCropIds, game.totalHamstersHired),
    [unlockedCropIds, game.totalHamstersHired],
  )
  const visibleUnlockedCropIds = useMemo(
    () =>
      visibleCropIds.filter((cropId) => unlockedCropIds.includes(cropId)),
    [visibleCropIds, unlockedCropIds],
  )
  const blueprintSlots = useMemo(() => getBlueprintSlots(game), [game])
  const unlockedBlueprintSlotCount = getUnlockedBlueprintSlotCount(game)
  const monocropThreshold = getMonocropThreshold(
    game.blueprint.rows * game.blueprint.columns,
  )
  const showMonocropLimit =
    game.hasSeenMonocropLimit || hasReachedMonocropLimit(game.blueprint)
  const formattedTotalHamstersHired = getCachedFormattedNumber(
    game.totalHamstersHired,
    0,
  )
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

  return {
    nextHamsterCost,
    productionPerSecond,
    cropHamsterEfficiencyMultiplier,
    hamsterCoordinationMultiplier,
    hamsterExternalMultiplier,
    fieldsPlantedPerSecond,
    nextRowDuplicatorCost,
    rowDuplicatorEffectivenessMultiplier,
    rowDuplicatorCoordinationMultiplier,
    rowsBuiltPerSecond,
    rowDuplicatorFieldsPlantedPerSecond,
    unlockedCropIds,
    visibleCropIds,
    visibleUnlockedCropIds,
    blueprintSlots,
    unlockedBlueprintSlotCount,
    monocropThreshold,
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
    canUnlockRows: canUnlockRowDuplicators(game),
    hasEnrichingLeek: completedCropPerfections.includes('enrichingLeek'),
    hasMirrorCorn: completedCropPerfections.includes('mirrorCorn'),
    hasLeechingGourd: completedCropPerfections.includes('leechingGourd'),
  }
}
