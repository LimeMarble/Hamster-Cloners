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
  hasLeechingVineAugmentation,
  hasReachedMonocropLimit,
} from '../game/gameLogic.js'
import { getCropPlacementName } from '../game/crops.js'
import { useBlueprintTransfer } from './useBlueprintTransfer.js'
import { useBlueprintBlocks } from './useBlueprintBlocks.js'
import { useRootTunnelEditor } from './useRootTunnelEditor.js'
import { useLeechingVineEditor } from './useLeechingVineEditor.js'

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
  const [selectedCrop, setSelectedCrop] = useState(null)
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
    if (blueprintBlockEditor.handleTileHover(index)) {
      setHoveredEditorCrop(null)
      return
    }

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
    leechingVineEditor.resetLeechingVineEditor()
    blueprintBlockEditor.resetBlueprintBlockEditor()
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
      crop !== null &&
      crop !== 'rootTunnel' &&
      (currentGame.blueprint.leechingVines?.[0]?.path ?? []).includes(index)
    ) {
      return
    }
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
  const leechingVineEditor = useLeechingVineEditor({
    blueprint: game.blueprint,
    completedCropPerfections: game.completedCropPerfections,
    seedAugmentations: game.seedAugmentations,
    gameRef,
    commitBlueprint,
  })
  const blueprintBlockEditor = useBlueprintBlocks({
    game,
    gameRef,
    updateGame,
    commitBlueprint,
    unlockedCropIds,
    hasSplitweed,
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

  function handleEditorPlotClick(index, crop, event) {
    if (blueprintBlockEditor.handlePlotClick(index)) {
      setSelectedCrop(null)
      setPendingMirrorCornPlacement(null)
      setHoveredEditorCrop(null)
      rootTunnelEditor.resetRootTunnelEditor()
      leechingVineEditor.resetLeechingVineEditor()
      blueprintTransfer.resetBlueprintTransfer()
      return
    }

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

    if (
      selectedCrop === null &&
      leechingVineEditor.handlePlotClick(index, crop)
    ) {
      rootTunnelEditor.resetRootTunnelEditor()
      return
    }

    if (rootTunnelEditor.handlePlotClick(index, crop)) {
      leechingVineEditor.resetLeechingVineEditor()
      return
    }

    if (selectedCrop === null) {
      updateHoveredEditorCrop(index, event)
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

  function resetInteractionsForRapidEdit() {
    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
    rootTunnelEditor.resetRootTunnelEditor()
    leechingVineEditor.resetLeechingVineEditor()
    blueprintTransfer.resetBlueprintTransfer()
  }

  function rapidlyPlaceCrop(index) {
    if (
      selectedCrop === null ||
      blueprintBlockEditor.isSelecting ||
      blueprintBlockEditor.activeBlock
    ) {
      return false
    }

    resetInteractionsForRapidEdit()
    const currentBlueprint = gameRef.current.blueprint
    const currentCrop = currentBlueprint.cells[index]

    if (
      currentCrop === 'leechingGourd' ||
      currentCrop === 'leechingGourdPart' ||
      (hasSplitweed &&
        getSplitweedAnchorIndex(currentBlueprint, index) !== null)
    ) {
      return true
    }
    if (hasLeechingGourd && selectedCrop === 'pumpkin') {
      placeLeechingGourd(index)
      return true
    }
    if (hasSplitweed && selectedCrop === 'knotweed') {
      placeSplitweed(index)
      return true
    }
    if (currentCrop !== selectedCrop) {
      setPlot(index, selectedCrop)
    }
    return true
  }

  function rapidlyEraseCrop(index) {
    if (blueprintBlockEditor.isSelecting || blueprintBlockEditor.activeBlock) {
      return false
    }

    resetInteractionsForRapidEdit()
    const currentBlueprint = gameRef.current.blueprint
    const currentCrop = currentBlueprint.cells[index]

    if (!currentCrop || currentCrop === 'rootTunnel') {
      return true
    }
    if (
      currentCrop === 'leechingGourd' ||
      currentCrop === 'leechingGourdPart'
    ) {
      removeLeechingGourd()
      return true
    }
    if (
      hasSplitweed &&
      getSplitweedAnchorIndex(currentBlueprint, index) !== null
    ) {
      removeSplitweed(index)
      return true
    }

    setPlot(index, null)
    return true
  }

  const blueprintTransfer = useBlueprintTransfer({
    gameRef,
    commitBlueprint,
    unlockedCropIds,
    hasMirrorCorn,
    hasLeechingGourd,
    hasSplitweed,
    hasLeechingVine: hasLeechingVineAugmentation(game.seedAugmentations),
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
    leechingVineEditor.resetLeechingVineEditor()
    blueprintBlockEditor.resetBlueprintBlockEditor()
    blueprintTransfer.resetBlueprintTransfer()
    commitBlueprint(clearBlueprint(currentGame.blueprint))
  }

  function handleEditorPlotContextMenu(index, crop, event) {
    event.preventDefault()
    if (blueprintBlockEditor.isSelecting || blueprintBlockEditor.activeBlock) {
      return
    }
    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
    blueprintTransfer.resetBlueprintTransfer()

    if (crop === 'rootTunnel') {
      leechingVineEditor.resetLeechingVineEditor()
      rootTunnelEditor.handlePlotClick(index, crop)
      return
    }

    rootTunnelEditor.resetRootTunnelEditor()
    leechingVineEditor.resetLeechingVineEditor()
    blueprintBlockEditor.resetBlueprintBlockEditor()

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
    leechingVineEditor.resetLeechingVineEditor()
    blueprintBlockEditor.resetBlueprintBlockEditor()
  }

  function resetBlueprintEditor() {
    closeBlueprintEditor()
    setSelectedCrop(null)
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
      setSelectedCrop(null)
      setPendingMirrorCornPlacement(null)
      rootTunnelEditor.resetRootTunnelEditor()
      leechingVineEditor.resetLeechingVineEditor()
      blueprintBlockEditor.resetBlueprintBlockEditor()
      setBlueprintEditing(true)
    },
    resetBlueprintEditor,
    blueprintEditor: isEditingBlueprint
      ? {
          game,
          selectedCrop,
          onSelectCrop: (cropId) => {
            setSelectedCrop((currentCrop) =>
              currentCrop === cropId ? null : cropId,
            )
            setPendingMirrorCornPlacement(null)
            rootTunnelEditor.resetRootTunnelEditor()
            leechingVineEditor.resetLeechingVineEditor()
            blueprintBlockEditor.resetBlueprintBlockEditor()
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
          leechingVineEditor,
          blueprintBlockEditor: {
            ...blueprintBlockEditor,
            onStartSelection: () => {
              setSelectedCrop(null)
              setPendingMirrorCornPlacement(null)
              setHoveredEditorCrop(null)
              rootTunnelEditor.resetRootTunnelEditor()
              leechingVineEditor.resetLeechingVineEditor()
              return blueprintBlockEditor.onStartSelection()
            },
            onUseBlock: (blockId) => {
              setSelectedCrop(null)
              setPendingMirrorCornPlacement(null)
              setHoveredEditorCrop(null)
              rootTunnelEditor.resetRootTunnelEditor()
              leechingVineEditor.resetLeechingVineEditor()
              return blueprintBlockEditor.onUseBlock(blockId)
            },
            onOverwriteBlock: (blockId) => {
              setSelectedCrop(null)
              setPendingMirrorCornPlacement(null)
              setHoveredEditorCrop(null)
              rootTunnelEditor.resetRootTunnelEditor()
              leechingVineEditor.resetLeechingVineEditor()
              return blueprintBlockEditor.onOverwriteBlock(blockId)
            },
          },
          getDisplayedCropName,
          onClose: closeBlueprintEditor,
          onResume: closeBlueprintEditor,
          onClearBlueprint: clearCurrentBlueprint,
          onEditorPlotClick: handleEditorPlotClick,
          onEditorPlotContextMenu: handleEditorPlotContextMenu,
          onRapidPlaceCrop: rapidlyPlaceCrop,
          onRapidEraseCrop: rapidlyEraseCrop,
          blueprintTransfer: {
            ...blueprintTransfer,
            onImportBlueprint: () => {
              const imported = blueprintTransfer.onImportBlueprint()

              if (imported) {
                setPendingMirrorCornPlacement(null)
                setHoveredEditorCrop(null)
                rootTunnelEditor.resetRootTunnelEditor()
                leechingVineEditor.resetLeechingVineEditor()
                blueprintBlockEditor.resetBlueprintBlockEditor()
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
