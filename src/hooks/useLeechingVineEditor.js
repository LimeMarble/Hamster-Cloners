import { useMemo, useState } from 'react'
import {
  canLeechingVineOccupyTile,
  getLeechingVineStartIndexes,
  getLeechingVineStatus,
} from '../game/gameLogic.js'
import { getOrthogonalIndexes } from '../game/adjacencyLogic.js'

function isGourdCell(crop) {
  return crop === 'leechingGourd' || crop === 'leechingGourdPart'
}

export function useLeechingVineEditor({
  blueprint,
  completedCropPerfections,
  seedAugmentations,
  gameRef,
  commitBlueprint,
}) {
  const [selectedGourdIndex, setSelectedGourdIndex] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const hasSelectedGourd =
    selectedGourdIndex !== null &&
    isGourdCell(blueprint.cells[selectedGourdIndex])
  const activeGourdIndex = hasSelectedGourd ? selectedGourdIndex : null
  const status = useMemo(
    () =>
      getLeechingVineStatus(
        blueprint,
        completedCropPerfections,
        seedAugmentations,
      ),
    [blueprint, completedCropPerfections, seedAugmentations],
  )
  const validPathIndexes = useMemo(() => {
    if (
      activeGourdIndex === null ||
      !isDrawing ||
      status.vine.path.length >= status.nourishment.maximumLength
    ) {
      return []
    }

    if (status.vine.path.length === 0) {
      return getLeechingVineStartIndexes(blueprint)
    }

    const pathIndexes = new Set(status.vine.path)
    return getOrthogonalIndexes(blueprint, status.vine.path.at(-1)).filter(
      (index) =>
        canLeechingVineOccupyTile(blueprint.cells[index]) &&
        !pathIndexes.has(index),
    )
  }, [activeGourdIndex, blueprint, isDrawing, status])

  function commitVine(vine) {
    const currentBlueprint = gameRef.current.blueprint
    commitBlueprint({
      ...currentBlueprint,
      leechingVines: vine?.path?.length > 0 ? [vine] : [],
    })
  }

  function selectGourd(index) {
    if (!status.unlocked || !isGourdCell(blueprint.cells[index])) return false

    setSelectedGourdIndex(index)
    setIsDrawing(false)
    return true
  }

  function resetLeechingVineEditor() {
    setSelectedGourdIndex(null)
    setIsDrawing(false)
  }

  function handlePlotClick(index, crop) {
    if (isGourdCell(crop)) {
      return selectGourd(index)
    }

    if (activeGourdIndex === null) return false

    if (isDrawing) {
      if (validPathIndexes.includes(index)) {
        const nextPath = [...status.vine.path, index]
        commitVine({
          ...status.vine,
          path: nextPath,
        })
        if (nextPath.length >= status.nourishment.maximumLength) {
          setIsDrawing(false)
        }
      }
      return true
    }

    if (
      crop === 'turnip' &&
      status.eligibleTargetIndexes.includes(index)
    ) {
      const isSelected = status.vine.targetIndexes.includes(index)
      const nextTargetIndexes = isSelected
        ? status.vine.targetIndexes.filter((targetIndex) => targetIndex !== index)
        : status.activeTargetIndexes.length < status.nourishment.targetCapacity
          ? [...status.vine.targetIndexes, index]
          : status.vine.targetIndexes

      if (nextTargetIndexes !== status.vine.targetIndexes) {
        commitVine({ ...status.vine, targetIndexes: nextTargetIndexes })
      }
    }

    return true
  }

  function undoLastSegment() {
    if (status.vine.path.length === 0) return
    commitVine({
      ...status.vine,
      path: status.vine.path.slice(0, -1),
    })
  }

  return {
    selectedGourdIndex: activeGourdIndex,
    isDrawing: activeGourdIndex !== null && isDrawing,
    status,
    validPathIndexes,
    onStartDrawing: () => setIsDrawing(true),
    onFinishDrawing: () => setIsDrawing(false),
    onUndoLastSegment: undoLastSegment,
    onClearVine: () => commitVine(null),
    onClose: resetLeechingVineEditor,
    handlePlotClick,
    resetLeechingVineEditor,
  }
}
