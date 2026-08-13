import { useState } from 'react'
import {
  getBlueprintSlots,
  getDiagonalTileIndexes,
  getLeechingGourdFootprint,
  hasReachedMonocropLimit,
} from '../game/gameLogic.js'
import { CROP_PERFECTIONS, getCropPlacementName } from '../game/crops.js'
import { useBlueprintTransfer } from './useBlueprintTransfer.js'

export function useBlueprintEditor({
  game,
  gameRef,
  updateGame,
  isEditingBlueprintRef,
  unlockedCropIds,
  visibleCropIds,
  unlockedBlueprintSlotCount,
  hasMirrorCorn,
  hasLeechingGourd,
  rowsBuiltPerSecond,
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
    isEditingBlueprintRef.current = nextIsEditing
    setIsEditingBlueprint(nextIsEditing)
  }

  function updateHoveredEditorCrop(index, event) {
    if (!game.blueprint.cells[index]) {
      setHoveredEditorCrop(null)
      return
    }

    setHoveredEditorCrop({ index, x: event.clientX, y: event.clientY })
  }

  function commitBlueprint(nextBlueprint) {
    const currentGame = gameRef.current
    const currentBlueprintSlots = getBlueprintSlots(currentGame)
    const activeBlueprintSlot = Math.min(
      Math.max(0, Math.floor(Number(currentGame.activeBlueprintSlot) || 0)),
      currentBlueprintSlots.length - 1,
    )
    const hasReachedLimit = hasReachedMonocropLimit(nextBlueprint)
    const hasJustReachedLimit =
      !currentGame.hasSeenMonocropLimit &&
      !hasReachedMonocropLimit(currentGame.blueprint) &&
      hasReachedLimit

    updateGame(() => ({
      ...currentGame,
      blueprint: nextBlueprint,
      blueprintSlots: currentBlueprintSlots.map((blueprint, slotIndex) =>
        slotIndex === activeBlueprintSlot ? nextBlueprint : blueprint,
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
    const maximumReflectionsPerTile =
      CROP_PERFECTIONS.mirrorCorn.maximumReflectionsPerTile
    const existingReflections = (
      currentGame.blueprint.mirrorCornTargets ?? []
    ).reduce(
      (count, targetIndex, sourceIndex) =>
        sourceIndex !== index && targetIndex === mirrorCornTargetIndex
          ? count + 1
          : count,
      0,
    )

    if (
      mirrorCornTargetIndex !== null &&
      existingReflections >= maximumReflectionsPerTile
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

    if (crop === 'leechingGourd' || crop === 'leechingGourdPart') {
      removeLeechingGourd()
      return
    }

    if (hasLeechingGourd && selectedCrop === 'pumpkin') {
      placeLeechingGourd(index)
      return
    }

    const nextCrop = crop === selectedCrop ? null : selectedCrop

    if (nextCrop === 'corn' && hasMirrorCorn) {
      const maximumReflectionsPerTile =
        CROP_PERFECTIONS.mirrorCorn.maximumReflectionsPerTile
      const targetIndexes = getDiagonalTileIndexes(game.blueprint, index).filter(
        (targetIndex) =>
          (game.blueprint.mirrorCornTargets ?? []).filter(
            (linkedTargetIndex, sourceIndex) =>
              sourceIndex !== index && linkedTargetIndex === targetIndex,
          ).length < maximumReflectionsPerTile,
      )

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
  })

  function handleEditorPlotContextMenu(index, crop, event) {
    event.preventDefault()
    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
    blueprintTransfer.resetBlueprintTransfer()

    if (!crop) {
      return
    }

    if (crop === 'leechingGourd' || crop === 'leechingGourdPart') {
      removeLeechingGourd()
      return
    }

    setPlot(index, null)
  }

  function closeBlueprintEditor() {
    setBlueprintEditing(false)
    setPendingMirrorCornPlacement(null)
    setHoveredEditorCrop(null)
  }

  function resetBlueprintEditor() {
    closeBlueprintEditor()
    setSelectedCrop('leek')
    blueprintTransfer.resetBlueprintTransfer()
  }

  const getDisplayedCropName = (cropId) =>
    getCropPlacementName(cropId, game.completedCropPerfections)
  const mirrorCornLinks = hasMirrorCorn
    ? (game.blueprint.mirrorCornTargets ?? []).flatMap(
        (targetIndex, sourceIndex) =>
          targetIndex !== null && game.blueprint.cells[sourceIndex] === 'corn'
            ? [{ sourceIndex, targetIndex }]
            : [],
      )
    : []
  const pendingMirrorCornLinks = pendingMirrorCornPlacement
    ? pendingMirrorCornPlacement.targetIndexes.map((targetIndex) => ({
        sourceIndex: pendingMirrorCornPlacement.sourceIndex,
        targetIndex,
      }))
    : []

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
          },
          pendingMirrorCornPlacement,
          hoveredEditorCrop,
          visibleCropIds,
          unlockedCropIds,
          rowsBuiltPerSecond,
          showMonocropLimit,
          monocropLimit,
          monocropPenaltyMultiplier,
          mirrorCornLinks,
          pendingMirrorCornLinks,
          hasMirrorCorn,
          getDisplayedCropName,
          onClose: closeBlueprintEditor,
          onResume: closeBlueprintEditor,
          onEditorPlotClick: handleEditorPlotClick,
          onEditorPlotContextMenu: handleEditorPlotContextMenu,
          blueprintTransfer: {
            ...blueprintTransfer,
            onImportBlueprint: () => {
              const imported = blueprintTransfer.onImportBlueprint()

              if (imported) {
                setPendingMirrorCornPlacement(null)
                setHoveredEditorCrop(null)
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
