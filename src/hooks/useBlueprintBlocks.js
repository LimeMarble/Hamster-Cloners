import { useEffect, useMemo, useState } from 'react'
import {
  BLUEPRINT_BLOCK_PLACEMENT_MODES,
  BLUEPRINT_BLOCK_TRANSFORMS,
  MAX_SAVED_BLUEPRINT_BLOCKS,
  createBlueprintBlockFromSelection,
  exportBlueprintBlock,
  exportBlueprintBlockLibrary,
  getBlueprintBlockAvailability,
  getBlueprintBlockHotkeyTransform,
  getBlueprintBlockPlacementPreview,
  getBlueprintSelectionIndexes,
  importBlueprintBlock,
  importBlueprintBlockLibrary,
  normalizeBlueprintBlock,
  normalizeBlueprintBlocks,
  transformBlueprintBlock,
} from '../game/gameLogic.js'

const EMPTY_BLUEPRINT_BLOCKS = Object.freeze([])

function createBlockId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `block-${globalThis.crypto.randomUUID()}`
  }
  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function getUniqueBlockName(name, blocks, ignoredId = null) {
  const baseName = String(name ?? '').trim() || `Block ${blocks.length + 1}`
  const usedNames = new Set(
    blocks
      .filter(({ id }) => id !== ignoredId)
      .map((block) => block.name.toLocaleLowerCase()),
  )
  if (!usedNames.has(baseName.toLocaleLowerCase())) return baseName

  let suffix = 2
  while (usedNames.has(`${baseName} ${suffix}`.toLocaleLowerCase())) {
    suffix += 1
  }
  return `${baseName} ${suffix}`
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function useBlueprintBlocks({
  game,
  gameRef,
  updateGame,
  commitBlueprint,
  unlockedCropIds,
  hasSplitweed,
}) {
  const [selectionStartIndex, setSelectionStartIndex] = useState(null)
  const [selectionHoverIndex, setSelectionHoverIndex] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionName, setSelectionName] = useState('')
  const [overwriteBlockId, setOverwriteBlockId] = useState(null)
  const [activeBlock, setActiveBlock] = useState(null)
  const [activeBlockSourceId, setActiveBlockSourceId] = useState(null)
  const [placementMode, setPlacementMode] = useState(
    BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP,
  )
  const [hoverAnchorIndex, setHoverAnchorIndex] = useState(null)
  const [pinnedAnchorIndex, setPinnedAnchorIndex] = useState(null)
  const [blockCode, setBlockCode] = useState('')
  const [status, setStatus] = useState(null)
  const isPlacingBlock = activeBlock !== null
  const blocks = Array.isArray(game.blueprintBlocks)
    ? game.blueprintBlocks
    : EMPTY_BLUEPRINT_BLOCKS
  const isAwaitingFirstCorner = isSelecting && selectionStartIndex === null
  const isUnsavedSelection = activeBlock !== null && activeBlockSourceId === null

  const selectionIndexes = useMemo(() => {
    const firstIndex = selectionStartIndex ?? selectedRegion?.firstIndex
    if (firstIndex === undefined || firstIndex === null) return []
    try {
      return getBlueprintSelectionIndexes(
        game.blueprint,
        firstIndex,
        selectionStartIndex !== null
          ? selectionHoverIndex ?? firstIndex
          : selectedRegion.secondIndex,
      )
    } catch {
      return []
    }
  }, [game.blueprint, selectedRegion, selectionHoverIndex, selectionStartIndex])
  const selectionIndexSet = useMemo(
    () => new Set(selectionIndexes),
    [selectionIndexes],
  )
  const placementAnchorIndex = pinnedAnchorIndex ?? hoverAnchorIndex
  const placementPreview = useMemo(
    () =>
      activeBlock && placementAnchorIndex !== null
        ? getBlueprintBlockPlacementPreview(
            game.blueprint,
            activeBlock,
            placementAnchorIndex,
            {
              placementMode,
              unlockedCropIds,
              completedCropPerfections: game.completedCropPerfections,
              seedAugmentations: game.seedAugmentations,
              requireSplitweedFootprints: hasSplitweed,
            },
          )
        : null,
    [
      activeBlock,
      game.blueprint,
      game.completedCropPerfections,
      game.seedAugmentations,
      hasSplitweed,
      placementAnchorIndex,
      placementMode,
      unlockedCropIds,
    ],
  )
  const previewTileMap = useMemo(
    () => new Map(
      (placementPreview?.tiles ?? []).map((tile) => [tile.targetIndex, tile]),
    ),
    [placementPreview],
  )
  const libraryEntries = useMemo(
    () => blocks.map((block) => ({
      block,
      availability: getBlueprintBlockAvailability(block, {
        unlockedCropIds,
        completedCropPerfections: game.completedCropPerfections,
        seedAugmentations: game.seedAugmentations,
      }),
    })),
    [
      blocks,
      game.completedCropPerfections,
      game.seedAugmentations,
      unlockedCropIds,
    ],
  )

  useEffect(() => {
    if (!isPlacingBlock) return undefined

    function handleTransformHotkey(event) {
      const target = event.target
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches('input, textarea, select'))
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTyping
      ) {
        return
      }

      const transform = getBlueprintBlockHotkeyTransform(event.key)
      if (!transform) return

      event.preventDefault()
      setActiveBlock((block) =>
        block ? transformBlueprintBlock(block, transform) : block,
      )
      setPinnedAnchorIndex(null)
      setHoverAnchorIndex(null)
      setStatus({
        type: 'info',
        message: 'Layout transformed. Choose its position.',
      })
    }

    window.addEventListener('keydown', handleTransformHotkey)
    return () => window.removeEventListener('keydown', handleTransformHotkey)
  }, [isPlacingBlock])

  function commitBlockLibrary(updater) {
    updateGame((currentGame) => {
      const currentBlocks = normalizeBlueprintBlocks(currentGame.blueprintBlocks)
      return {
        ...currentGame,
        blueprintBlocks: updater(currentBlocks),
      }
    })
  }

  function clearInteraction() {
    setSelectionStartIndex(null)
    setSelectionHoverIndex(null)
    setSelectedRegion(null)
    setIsSelecting(false)
    setOverwriteBlockId(null)
    setActiveBlock(null)
    setActiveBlockSourceId(null)
    setHoverAnchorIndex(null)
    setPinnedAnchorIndex(null)
  }

  function cancelInteraction() {
    clearInteraction()
    setStatus(null)
  }

  function beginSelection(blockId = null) {
    const block = blockId
      ? blocks.find(({ id }) => id === blockId)
      : null
    if (blockId && !block) {
      setStatus({ type: 'error', message: 'This saved block no longer exists.' })
      return false
    }

    clearInteraction()
    setIsSelecting(true)
    setOverwriteBlockId(block?.id ?? null)
    setSelectionName(block?.name ?? '')
    setStatus({
      type: 'info',
      message: 'Select the first corner of the crop selection.',
    })
    return true
  }

  function finishSelection(secondIndex) {
    const currentGame = gameRef.current

    try {
      const block = createBlueprintBlockFromSelection(
        currentGame.blueprint,
        selectionStartIndex,
        secondIndex,
        {
          id: 'temporary-selection',
          name: 'Selected crops',
          completedCropPerfections: currentGame.completedCropPerfections,
          seedAugmentations: currentGame.seedAugmentations,
        },
      )
      setActiveBlock(block)
      setActiveBlockSourceId(null)
      setSelectedRegion({ firstIndex: selectionStartIndex, secondIndex })
      setIsSelecting(false)
      setStatus({
        type: 'info',
        message: 'Selection ready. Transform or place it, or save it as a block.',
      })
      setSelectionStartIndex(null)
      setSelectionHoverIndex(null)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'The crops could not be selected.',
      })
    }
  }

  function saveSelectionAsBlock() {
    if (!isUnsavedSelection) return false
    const currentBlocks = normalizeBlueprintBlocks(gameRef.current.blueprintBlocks)
    const existingBlock = overwriteBlockId
      ? currentBlocks.find(({ id }) => id === overwriteBlockId)
      : null
    if (!existingBlock && currentBlocks.length >= MAX_SAVED_BLUEPRINT_BLOCKS) {
      setStatus({ type: 'error', message: 'The block library is full. The selection can still be placed.' })
      return false
    }
    const id = existingBlock?.id ?? createBlockId()
    const name = getUniqueBlockName(selectionName || existingBlock?.name, currentBlocks, existingBlock?.id)
    const block = normalizeBlueprintBlock({ ...activeBlock, id, name }, id)
    commitBlockLibrary((storedBlocks) => existingBlock
      ? storedBlocks.map((storedBlock) => storedBlock.id === id ? block : storedBlock)
      : [...storedBlocks, block])
    setActiveBlock(block)
    setActiveBlockSourceId(id)
    setSelectedRegion(null)
    setOverwriteBlockId(null)
    setSelectionName('')
    setStatus({ type: 'success', message: `${name} saved as a ${block.rows}×${block.columns} block.` })
    return true
  }

  function handlePlotClick(index) {
    if (isAwaitingFirstCorner) {
      setSelectionStartIndex(index)
      setSelectionHoverIndex(index)
      setStatus({ type: 'info', message: 'Select the opposite corner.' })
      return true
    }
    if (isSelecting && selectionStartIndex !== null) {
      finishSelection(index)
      return true
    }
    if (activeBlock) {
      setPinnedAnchorIndex(index)
      setHoverAnchorIndex(index)
      setStatus({
        type: 'info',
        message: 'Preview pinned. Confirm placement in the layout panel.',
      })
      return true
    }
    return false
  }

  function handleTileHover(index) {
    if (isSelecting && selectionStartIndex !== null) {
      setSelectionHoverIndex(index)
      return true
    } else if (activeBlock && pinnedAnchorIndex === null) {
      setHoverAnchorIndex(index)
      return true
    }
    return isAwaitingFirstCorner
  }

  function useBlock(blockId) {
    const block = blocks.find(({ id }) => id === blockId)
    if (!block) return false
    clearInteraction()
    setActiveBlock(normalizeBlueprintBlock(block, block.id))
    setActiveBlockSourceId(block.id)
    setStatus({
      type: 'info',
      message: 'Hover or tap a tile to position this block.',
    })
    return true
  }

  function transformActiveBlock(transform) {
    if (!activeBlock) return
    try {
      setActiveBlock((block) => transformBlueprintBlock(block, transform))
      setPinnedAnchorIndex(null)
      setHoverAnchorIndex(null)
      setStatus({ type: 'info', message: 'Layout transformed. Choose its position.' })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'The block could not be transformed.',
      })
    }
  }

  function placePreview() {
    if (!placementPreview?.canPlace || !placementPreview.blueprint) {
      setStatus({
        type: 'error',
        message: placementPreview?.error ?? 'Choose a valid block position first.',
      })
      return false
    }
    commitBlueprint(placementPreview.blueprint)
    setSelectedRegion(null)
    setPinnedAnchorIndex(null)
    setHoverAnchorIndex(null)
    setStatus({
      type: 'success',
      message: `${activeBlock.name} placed. It remains selected for reuse.`,
    })
    return true
  }

  function renameBlock(blockId) {
    const block = blocks.find(({ id }) => id === blockId)
    if (!block) return
    const requestedName = window.prompt('Rename this saved block:', block.name)
    if (requestedName === null) return
    const name = getUniqueBlockName(requestedName, blocks, blockId)
    commitBlockLibrary((storedBlocks) =>
      storedBlocks.map((storedBlock) =>
        storedBlock.id === blockId ? { ...storedBlock, name } : storedBlock,
      ),
    )
    if (activeBlockSourceId === blockId) {
      setActiveBlock((current) => current ? { ...current, name } : current)
    }
    setStatus({ type: 'success', message: `Block renamed to ${name}.` })
  }

  function deleteBlock(blockId) {
    const block = blocks.find(({ id }) => id === blockId)
    if (!block || !window.confirm(`Delete saved block “${block.name}”?`)) return
    commitBlockLibrary((storedBlocks) =>
      storedBlocks.filter(({ id }) => id !== blockId),
    )
    if (activeBlockSourceId === blockId) clearInteraction()
    setStatus({ type: 'success', message: `${block.name} deleted.` })
  }

  async function exportBlock(blockId) {
    const block = blocks.find(({ id }) => id === blockId)
    if (!block) return
    const code = exportBlueprintBlock(block)
    setBlockCode(code)
    const copied = await copyText(code)
    setStatus({
      type: 'success',
      message: copied ? `${block.name} copied to the clipboard.` : `${block.name} code is ready below.`,
    })
  }

  async function exportLibrary() {
    const code = exportBlueprintBlockLibrary(blocks)
    setBlockCode(code)
    const copied = await copyText(code)
    setStatus({
      type: 'success',
      message: copied ? 'Block library copied to the clipboard.' : 'Block-library code is ready below.',
    })
  }

  function addImportedBlocks(importedBlocks) {
    const currentBlocks = normalizeBlueprintBlocks(gameRef.current.blueprintBlocks)
    const capacity = MAX_SAVED_BLUEPRINT_BLOCKS - currentBlocks.length
    if (capacity <= 0) throw new Error('The block library is full.')
    const additions = []
    importedBlocks.slice(0, capacity).forEach((block) => {
      const knownBlocks = [...currentBlocks, ...additions]
      additions.push(normalizeBlueprintBlock({
        ...block,
        id: createBlockId(),
        name: getUniqueBlockName(block.name, knownBlocks),
      }))
    })
    commitBlockLibrary((storedBlocks) => [...storedBlocks, ...additions])
    return additions.length
  }

  function importOneBlock() {
    try {
      const count = addImportedBlocks([importBlueprintBlock(blockCode)])
      setStatus({ type: 'success', message: `${count} block imported.` })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'The block could not be imported.',
      })
    }
  }

  function importLibrary() {
    try {
      const imported = importBlueprintBlockLibrary(blockCode)
      const count = addImportedBlocks(imported)
      setStatus({ type: 'success', message: `${count} blocks imported.` })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'The block library could not be imported.',
      })
    }
  }

  return {
    blocks,
    unlockedCropIds,
    libraryEntries,
    selectionName,
    selectionStartIndex: selectionStartIndex ?? selectedRegion?.firstIndex ?? null,
    selectionIndexSet,
    isSelecting,
    isUnsavedSelection,
    overwriteBlockId,
    canSaveSelection: isUnsavedSelection &&
      (overwriteBlockId !== null || blocks.length < MAX_SAVED_BLUEPRINT_BLOCKS),
    activeBlock,
    activeBlockSourceId,
    placementMode,
    placementPreview,
    placementAnchorIndex,
    previewTileMap,
    blockCode,
    status,
    onSelectionNameChange: setSelectionName,
    onStartSelection: () => beginSelection(),
    onSaveSelectionAsBlock: saveSelectionAsBlock,
    onCancelInteraction: cancelInteraction,
    onUseBlock: useBlock,
    onOverwriteBlock: beginSelection,
    onRenameBlock: renameBlock,
    onDeleteBlock: deleteBlock,
    onPlacementModeChange: (mode) => {
      if (Object.values(BLUEPRINT_BLOCK_PLACEMENT_MODES).includes(mode)) {
        setPlacementMode(mode)
      }
    },
    onRotateClockwise: () =>
      transformActiveBlock(BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_CLOCKWISE),
    onRotateCounterclockwise: () =>
      transformActiveBlock(BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_COUNTERCLOCKWISE),
    onFlipHorizontal: () =>
      transformActiveBlock(BLUEPRINT_BLOCK_TRANSFORMS.FLIP_HORIZONTAL),
    onFlipVertical: () =>
      transformActiveBlock(BLUEPRINT_BLOCK_TRANSFORMS.FLIP_VERTICAL),
    onPlacePreview: placePreview,
    onBlockCodeChange: (value) => {
      setBlockCode(value)
      setStatus(null)
    },
    onExportBlock: exportBlock,
    onExportLibrary: exportLibrary,
    onImportBlock: importOneBlock,
    onImportLibrary: importLibrary,
    handlePlotClick,
    handleTileHover,
    resetBlueprintBlockEditor: () => {
      clearInteraction()
      setStatus(null)
    },
  }
}
