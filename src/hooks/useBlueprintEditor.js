import { useState } from 'react'
import { useMemo } from 'react'
import {
  canPlaceMangroveSapling,
  canPlaceShoalGrass,
  clearBlueprint,
  createBlueprint,
  getBlueprintSlots,
  getDiagonalTileIndexes,
  getLeechingGourdFootprint,
  getSplitweedAnchorIndex,
  getSplitweedFootprint,
  hasReachedMonocropLimit,
} from '../game/gameLogic.js'
import { getCropPlacementName } from '../game/crops.js'
import { useBlueprintTransfer } from './useBlueprintTransfer.js'
import { useRootTunnelEditor } from './useRootTunnelEditor.js'

export function useBlueprintEditor({
  game,
  gameRef,
  updateGame,
  isEditingBlueprintRef,
  onEditingChange,
  unlockedCropIds,
  visibleCropIds,
  unlockedBlueprintSlotCount,
  hasMirrorCorn,
  hasLeechingGourd,
  hasSplitweed,
  rowsBuiltPerSecond,
  rabbitContractsCompleted,
  showMonocropLimit,
  monocropLimit,
  monocropPenaltyMultiplier,
}) {
  const [isEditingBlueprint, setIsEditingBlueprint] = useState(false)
  const [selectedCrop, setSelectedCrop] = useState('leek')
  const [pendingMirrorCornPlacement, setPendingMirrorCornPlacement] =
    useState(null)
  const [hoveredEditorCrop, setHoveredEditorCrop] = useState(null)
  const [isMonocropWarningOpen, setIsMonocropWarningOpen] = useState(false)

  function setBlueprintEditing(nextIsEditing) {
    onEditingChange?.(nextIsEditing)
    isEditingBlueprintRef.current = nextIsEditing
    setIsEditingBlueprint(nextIsEditing)
  }

  function updateHoveredEditorCrop(index, event) {
    if (!game.blueprint.cells[index]) {
      setHoveredEditorCrop(null)
      return
    }

    const splitweedAnchorIndex = hasSplitweed
      ? getSplitweedAnchorIndex(game.blueprint, index)
      : null

    setHoveredEditorCrop({
      index: splitweedAnchorIndex ?? index,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function commitBlueprint(nextBlueprint) {
    const currentGame = gameRef.current
    const normalizedNextBlueprint = createBlueprint({
      ...nextBlueprint,
      requireSplitweedFootprints: hasSplitweed,
    })
    const currentBlueprintSlots = getBlueprintSlots(currentGame)
    const activeBlueprintSlot = Math.min(
      Math.max(0, Math.floor(Number(currentGame.activeBlueprintSlot) || 0)),
      currentBlueprintSlots.length - 1,
    )
    const hasReachedLimit = hasReachedMonocropLimit(
      normalizedNextBlueprint,
      currentGame.completedCropPerfections,
      currentGame.seedAugmentations,
    )
    const hasJustReachedLimit =
      !currentGame.hasSeenMonocropLimit &&
      !hasReachedMonocropLimit(
        currentGame.blueprint,
        currentGame.completedCropPerfections,
        currentGame.seedAugmentations,
      ) &&
      hasReachedLimit

    updateGame(() => ({
      ...currentGame,
      blueprint: normalizedNextBlueprint,
      blueprintSlots: currentBlueprintSlots.map((blueprint, slotIndex) =>
        slotIndex === activeBlueprintSlot ? normalizedNextBlueprint : blueprint,
      ),
      activeBlueprintSlot,
      hasSeenMonocropLimit:
        currentGame.hasSeenMonocropLimit || hasReachedLimit,
    }))

    if (hasJustReachedLimit) {
      setIsMonocropWarningOpen(true)
    }
  }

  function selectBlueprintSlot(slotIndex) {
    const currentGame = gameRef.current
    const currentBlueprintSlots = getBlueprintSlots(currentGame)

    if (
      slotIndex < 0 ||
      slotIndex >= unlockedBlueprintSlotCount ||
      !currentBlueprintSlots[slotIndex]
    ) {
      return
    }

    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
    rootTunnelEditor.resetRootTunnelEditor()
    updateGame(() => ({
      ...currentGame,
      blueprint: currentBlueprintSlots[slotIndex],
      blueprintSlots: currentBlueprintSlots,
      activeBlueprintSlot: slotIndex,
    }))
  }

  function setPlot(index, crop, mirrorCornTargetIndex = null) {
    if (crop !== null && !unlockedCropIds.includes(crop)) {
      return
    }

    const currentGame = gameRef.current
    if (
      crop === 'shoalGrass' &&
      !canPlaceShoalGrass(
        currentGame.blueprint,
        index,
        currentGame.completedCropPerfections,
        currentGame.seedAugmentations,
      )
    ) {
      return
    }

    if (
      crop === 'mangroveSapling' &&
      !canPlaceMangroveSapling(currentGame.blueprint, index)
    ) {
      return
    }

    if (
      crop === 'fourLeafClover' &&
      currentGame.blueprint.cells.some(
        (cell, cellIndex) => cell === 'fourLeafClover' && cellIndex !== index,
      )
    ) {
      return
    }

    const nextBlueprint = {
      ...currentGame.blueprint,
      cells: currentGame.blueprint.cells.map((cell, cellIndex) =>
        cellIndex === index ? crop : cell,
      ),
      mirrorCornTargets: (currentGame.blueprint.mirrorCornTargets ?? []).map(
        (targetIndex, sourceIndex) => {
          if (sourceIndex === index) {
            return crop === 'corn' ? mirrorCornTargetIndex : null
          }
          return targetIndex
        },
      ),
    }

    commitBlueprint(nextBlueprint)
  }

  const rootTunnelEditor = useRootTunnelEditor({
    blueprint: game.blueprint,
    gameRef,
    commitBlueprint,
  })

  function removeLeechingGourd() {
    const currentGame = gameRef.current
    const gourdIndexes = currentGame.blueprint.cells.flatMap((crop, index) =>
      crop === 'leechingGourd' || crop === 'leechingGourdPart' ? [index] : [],
    )

    if (gourdIndexes.length === 0) {
      return
    }

    const gourdIndexSet = new Set(gourdIndexes)
    commitBlueprint({
      ...currentGame.blueprint,
      cells: currentGame.blueprint.cells.map((crop) =>
        crop === 'leechingGourd' || crop === 'leechingGourdPart' ? null : crop,
      ),
      mirrorCornTargets: (currentGame.blueprint.mirrorCornTargets ?? []).map(
        (targetIndex, sourceIndex) =>
          gourdIndexSet.has(sourceIndex) ? null : targetIndex,
      ),
    })
  }

  function placeLeechingGourd(index) {
    const currentGame = gameRef.current

    if (currentGame.blueprint.cells.includes('leechingGourd')) {
      return
    }

    const footprint = getLeechingGourdFootprint(currentGame.blueprint, index)

    if (
      footprint.length !== 4 ||
      footprint.some(
        (footprintIndex) =>
          currentGame.blueprint.cells[footprintIndex] !== null,
      )
    ) {
      return
    }

    const footprintIndexes = new Set(footprint)
    commitBlueprint({
      ...currentGame.blueprint,
      cells: currentGame.blueprint.cells.map((crop, cellIndex) => {
        if (!footprintIndexes.has(cellIndex)) {
          return crop
        }

        return cellIndex === index ? 'leechingGourd' : 'leechingGourdPart'
      }),
      mirrorCornTargets: (currentGame.blueprint.mirrorCornTargets ?? []).map(
        (targetIndex, sourceIndex) =>
          footprintIndexes.has(sourceIndex) ? null : targetIndex,
      ),
    })
  }

  function removeSplitweed(index) {
    const currentGame = gameRef.current
    const anchorIndex = getSplitweedAnchorIndex(currentGame.blueprint, index)

    if (anchorIndex === null) {
      return
    }

    const footprintIndexes = new Set(
      getSplitweedFootprint(currentGame.blueprint, anchorIndex),
    )
    commitBlueprint({
      ...currentGame.blueprint,
      cells: currentGame.blueprint.cells.map((crop, cellIndex) =>
        footprintIndexes.has(cellIndex) ? null : crop,
      ),
      mirrorCornTargets: (currentGame.blueprint.mirrorCornTargets ?? []).map(
        (targetIndex, sourceIndex) =>
          footprintIndexes.has(sourceIndex) ? null : targetIndex,
      ),
    })
  }

  function placeSplitweed(index) {
    const currentGame = gameRef.current
    const footprint = getSplitweedFootprint(currentGame.blueprint, index)

    if (
      footprint.length !== 4 ||
      footprint.some(
        (footprintIndex) =>
          currentGame.blueprint.cells[footprintIndex] !== null,
      )
    ) {
      return
    }

    const footprintIndexes = new Set(footprint)
    commitBlueprint({
      ...currentGame.blueprint,
      cells: currentGame.blueprint.cells.map((crop, cellIndex) => {
        if (!footprintIndexes.has(cellIndex)) {
          return crop
        }

        return cellIndex === index ? 'knotweed' : 'splitweedPart'
      }),
      mirrorCornTargets: (currentGame.blueprint.mirrorCornTargets ?? []).map(
        (targetIndex, sourceIndex) =>
          footprintIndexes.has(sourceIndex) ? null : targetIndex,
      ),
    })
  }

  function handleEditorPlotClick(index, crop) {
    if (pendingMirrorCornPlacement) {
      if (index === pendingMirrorCornPlacement.sourceIndex) {
        setPendingMirrorCornPlacement(null)
        return
      }
      if (pendingMirrorCornPlacement.targetIndexes.includes(index)) {
        setPlot(pendingMirrorCornPlacement.sourceIndex, 'corn', index)
        setPendingMirrorCornPlacement(null)
      }
      return
    }

    if (rootTunnelEditor.handlePlotClick(index, crop)) {
      return
    }

    if (crop === 'leechingGourd' || crop === 'leechingGourdPart') {
      removeLeechingGourd()
      return
    }

    if (hasSplitweed && getSplitweedAnchorIndex(game.blueprint, index) !== null) {
      removeSplitweed(index)
      return
    }

    if (hasLeechingGourd && selectedCrop === 'pumpkin') {
      placeLeechingGourd(index)
      return
    }

    if (hasSplitweed && selectedCrop === 'knotweed') {
      placeSplitweed(index)
      return
    }

    const nextCrop = crop === selectedCrop ? null : selectedCrop

    if (nextCrop === 'corn' && hasMirrorCorn) {
      const targetIndexes = getDiagonalTileIndexes(game.blueprint, index)

      if (targetIndexes.length > 0) {
        setPendingMirrorCornPlacement({ sourceIndex: index, targetIndexes })
        return
      }
    }

    setPlot(index, nextCrop)
  }

  const blueprintTransfer = useBlueprintTransfer({
    gameRef,
    commitBlueprint,
    unlockedCropIds,
    hasMirrorCorn,
    hasLeechingGourd,
    hasSplitweed,
    completedCropPerfections: game.completedCropPerfections,
    seedAugmentations: game.seedAugmentations,
  })

  function clearCurrentBlueprint() {
    const currentGame = gameRef.current

    if (!currentGame.blueprint.cells.some(Boolean)) {
      return
    }

    const confirmed = window.confirm(
      `Clear every crop from Blueprint ${currentGame.activeBlueprintSlot + 1}? This cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
    rootTunnelEditor.resetRootTunnelEditor()
    blueprintTransfer.resetBlueprintTransfer()
    commitBlueprint(clearBlueprint(currentGame.blueprint))
  }

  function handleEditorPlotContextMenu(index, crop, event) {
    event.preventDefault()
    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
    blueprintTransfer.resetBlueprintTransfer()

    if (crop === 'rootTunnel') {
      rootTunnelEditor.handlePlotClick(index, crop)
      return
    }

    rootTunnelEditor.resetRootTunnelEditor()

    if (!crop) {
      return
    }

    if (crop === 'leechingGourd' || crop === 'leechingGourdPart') {
      removeLeechingGourd()
      return
    }

    if (hasSplitweed && getSplitweedAnchorIndex(game.blueprint, index) !== null) {
      removeSplitweed(index)
      return
    }

    setPlot(index, null)
  }

  function closeBlueprintEditor() {
    setBlueprintEditing(false)
    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
    rootTunnelEditor.resetRootTunnelEditor()
  }

  function resetBlueprintEditor() {
    closeBlueprintEditor()
    setSelectedCrop('leek')
    blueprintTransfer.resetBlueprintTransfer()
  }

  const getDisplayedCropName = (cropId) =>
    getCropPlacementName(cropId, game.completedCropPerfections)
  const mirrorCornLinks = useMemo(
    () =>
      hasMirrorCorn
        ? (game.blueprint.mirrorCornTargets ?? []).flatMap(
            (targetIndex, sourceIndex) =>
              targetIndex !== null &&
              game.blueprint.cells[sourceIndex] === 'corn'
                ? [{
                    sourceIndex,
                    targetIndex,
                    tunnelIndex: game.blueprint.rootTunnelConnections?.find(
                      (connection) =>
                        connection.senderIndex === sourceIndex &&
                        connection.recipientIndex === targetIndex,
                    )?.tunnelIndex,
                  }]
                : [],
          )
        : [],
    [game.blueprint, hasMirrorCorn],
  )
  const pendingMirrorCornLinks = useMemo(
    () =>
      pendingMirrorCornPlacement
        ? pendingMirrorCornPlacement.targetIndexes.map((targetIndex) => ({
            sourceIndex: pendingMirrorCornPlacement.sourceIndex,
            targetIndex,
          }))
        : [],
    [pendingMirrorCornPlacement],
  )

  return {
    onSelectBlueprintSlot: selectBlueprintSlot,
    onOpenEditor: () => {
      setHoveredEditorCrop(null)
      setBlueprintEditing(true)
    },
    resetBlueprintEditor,
    blueprintEditor: isEditingBlueprint
      ? {
          game,
          selectedCrop,
          onSelectCrop: (cropId) => {
            setSelectedCrop(cropId)
            setPendingMirrorCornPlacement(null)
            rootTunnelEditor.resetRootTunnelEditor()
          },
          pendingMirrorCornPlacement,
          hoveredEditorCrop,
          visibleCropIds,
          unlockedCropIds,
          rowsBuiltPerSecond,
          rabbitContractsCompleted,
          showMonocropLimit,
          monocropLimit,
          monocropPenaltyMultiplier,
          mirrorCornLinks,
          pendingMirrorCornLinks,
          hasMirrorCorn,
          rootTunnelEditor,
          getDisplayedCropName,
          onClose: closeBlueprintEditor,
          onResume: closeBlueprintEditor,
          onClearBlueprint: clearCurrentBlueprint,
          onEditorPlotClick: handleEditorPlotClick,
          onEditorPlotContextMenu: handleEditorPlotContextMenu,
          blueprintTransfer: {
            ...blueprintTransfer,
            onImportBlueprint: () => {
              const imported = blueprintTransfer.onImportBlueprint()

              if (imported) {
                setPendingMirrorCornPlacement(null)
                setHoveredEditorCrop(null)
                rootTunnelEditor.resetRootTunnelEditor()
              }
            },
          },
          onUpdateHoveredEditorCrop: updateHoveredEditorCrop,
          onClearHoveredEditorCrop: () => setHoveredEditorCrop(null),
        }
      : null,
    monocropWarning: {
      isOpen: isMonocropWarningOpen,
      onClose: () => setIsMonocropWarningOpen(false),
    },
  }
}
