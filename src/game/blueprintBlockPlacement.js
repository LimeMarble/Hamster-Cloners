import { createBlueprint } from './blueprintLogic.js'
import { CROP_PERFECTIONS } from './crops.js'
import {
  BLUEPRINT_BLOCK_AUGMENTATION_REQUIREMENTS,
  BLUEPRINT_BLOCK_PLACEMENT_MODES,
  createBlueprintBlockFromSelection,
  getBlueprintBlockAugmentationLevel,
  getBlueprintBlockBaseCropId,
  getBlueprintSelectionIndexes,
  normalizeBlueprintBlock,
} from './blueprintBlockLogic.js'
import {
  normalizeSeedAugmentationState,
  SEED_AUGMENTATION_IDS,
} from './augmentationLogic.js'
import { getShoalGrassPlacementLimit } from './cropEffects.js'
import { MANGROVE_SAPLING_PLACEMENT_LIMIT } from './mangroveSaplingLogic.js'
import { remapRootTunnelConnections } from './rootTunnelLogic.js'
import { remapLeechingVines } from './leechingVineLogic.js'

const STRUCTURAL_CROP_PERFECTION_IDS = new Set([
  'leechingGourd',
  'mirrorCorn',
  'splitweed',
])

export function getBlueprintBlockAvailability(
  rawBlock,
  {
    unlockedCropIds = [],
    completedCropPerfections = [],
    seedAugmentations = {},
  } = {},
) {
  const block = normalizeBlueprintBlock(rawBlock, rawBlock?.id)
  const unlockedCropIdSet = new Set(unlockedCropIds)
  const completedPerfectionSet = new Set(completedCropPerfections)
  const normalizedAugmentations = normalizeSeedAugmentationState(seedAugmentations)
  const missingCropIds = block.requiredCropIds.filter(
    (cropId) => !unlockedCropIdSet.has(cropId),
  )
  const missingCropPerfectionIds = block.requiredCropPerfections.filter(
    (id) => !completedPerfectionSet.has(id),
  )
  const missingSeedAugmentations = block.requiredSeedAugmentations.filter(
    ({ id, level }) => {
      const requirement = BLUEPRINT_BLOCK_AUGMENTATION_REQUIREMENTS.find(
        (candidate) => candidate.id === id,
      )
      return !requirement ||
        getBlueprintBlockAugmentationLevel(
          normalizedAugmentations,
          requirement,
        ) < level
    },
  )

  return {
    missingCropIds,
    missingCropPerfectionIds,
    missingSeedAugmentations,
    hasMissingRequirements:
      missingCropIds.length > 0 ||
      missingCropPerfectionIds.length > 0 ||
      missingSeedAugmentations.length > 0,
  }
}

function areEqual(left, right) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? [])
}

function containsConnection(connections, expected) {
  return connections.some(
    (connection) =>
      connection.tunnelIndex === expected.tunnelIndex &&
      connection.senderIndex === expected.senderIndex &&
      connection.recipientIndex === expected.recipientIndex,
  )
}

export function getBlueprintBlockPlacementPreview(
  blueprint,
  rawBlock,
  targetAnchorIndex,
  {
    placementMode = BLUEPRINT_BLOCK_PLACEMENT_MODES.STAMP,
    unlockedCropIds = [],
    completedCropPerfections = [],
    seedAugmentations = {},
    requireSplitweedFootprints = false,
    sourceSelection = null,
  } = {},
) {
  const block = normalizeBlueprintBlock(rawBlock, rawBlock?.id)
  const availability = getBlueprintBlockAvailability(block, {
    unlockedCropIds,
    completedCropPerfections,
    seedAugmentations,
  })
  const targetRow = Math.floor(targetAnchorIndex / blueprint.columns)
  const targetColumn = targetAnchorIndex % blueprint.columns
  const anchorRow = Math.floor(block.anchorIndex / block.columns)
  const anchorColumn = block.anchorIndex % block.columns
  const top = targetRow - anchorRow
  const left = targetColumn - anchorColumn
  const isWithinBounds =
    Number.isInteger(targetAnchorIndex) &&
    targetAnchorIndex >= 0 &&
    targetAnchorIndex < blueprint.rows * blueprint.columns &&
    top >= 0 &&
    left >= 0 &&
    top + block.rows <= blueprint.rows &&
    left + block.columns <= blueprint.columns

  if (!isWithinBounds) {
    return {
      canPlace: false,
      error: 'The complete block must fit inside the blueprint.',
      availability,
      tiles: [],
      blueprint: null,
    }
  }

  let sourceIndexes = new Set()
  if (sourceSelection) {
    try {
      // Validate whole footprints before planning any removal. The original
      // blueprint is never mutated, including when the destination is invalid.
      createBlueprintBlockFromSelection(
        blueprint, sourceSelection.firstIndex, sourceSelection.secondIndex,
      )
      sourceIndexes = new Set(getBlueprintSelectionIndexes(
        blueprint, sourceSelection.firstIndex, sourceSelection.secondIndex,
      ))
    } catch (error) {
      return {
        canPlace: false,
        error: error instanceof Error ? error.message : 'The source selection is invalid.',
        availability, tiles: [], blueprint: null,
      }
    }
  }

  const missingCropSet = new Set(availability.missingCropIds)
  const missingPerfectionCropSet = new Set(
    availability.missingCropPerfectionIds
      .filter((id) => STRUCTURAL_CROP_PERFECTION_IDS.has(id))
      .map((id) => CROP_PERFECTIONS[id]?.cropId),
  )
  const isSourceCropAvailable = (sourceIndex) => {
    const crop = block.cells[sourceIndex]
    if (!crop) return true
    const baseCropId = getBlueprintBlockBaseCropId(crop)
    return !missingCropSet.has(baseCropId) &&
      !missingPerfectionCropSet.has(baseCropId)
  }
  const mapIndex = (sourceIndex) => {
    if (!Number.isInteger(sourceIndex)) return null
    const row = Math.floor(sourceIndex / block.columns)
    const column = sourceIndex % block.columns
    return (top + row) * blueprint.columns + left + column
  }
  const cells = blueprint.cells.map((crop, index) => sourceIndexes.has(index) ? null : crop)
  const tiles = block.cells.map((crop, sourceIndex) => {
    const targetIndex = mapIndex(sourceIndex)
    const available = isSourceCropAvailable(sourceIndex)
    const placedCrop = crop && available ? crop : null
    const shouldWrite =
      placementMode === BLUEPRINT_BLOCK_PLACEMENT_MODES.REPLACE ||
      placedCrop !== null
    if (shouldWrite) cells[targetIndex] = placedCrop

    return {
      sourceIndex,
      targetIndex,
      crop: placedCrop,
      originalCrop: crop,
      available,
      action: shouldWrite
        ? placedCrop === null ? 'clear' : 'place'
        : 'unchanged',
    }
  })
  const writtenTargetIndexes = new Set(
    tiles.filter(({ action }) => action !== 'unchanged')
      .map(({ targetIndex }) => targetIndex),
  )
  const mirrorCornTargets = Array.from(
    { length: cells.length },
    (_, index) => blueprint.mirrorCornTargets[index] ?? null,
  )
  writtenTargetIndexes.forEach((targetIndex) => {
    mirrorCornTargets[targetIndex] = null
  })
  sourceIndexes.forEach((sourceIndex) => {
    mirrorCornTargets[sourceIndex] = null
  })
  const addedMirrorTargets = []
  block.mirrorCornTargets.forEach((targetIndex, sourceIndex) => {
    if (
      targetIndex === null ||
      !isSourceCropAvailable(sourceIndex) ||
      !isSourceCropAvailable(targetIndex)
    ) {
      return
    }
    const mappedSourceIndex = mapIndex(sourceIndex)
    const mappedTargetIndex = mapIndex(targetIndex)
    mirrorCornTargets[mappedSourceIndex] = mappedTargetIndex
    addedMirrorTargets.push([mappedSourceIndex, mappedTargetIndex])
  })
  const addedRootTunnelConnections = remapRootTunnelConnections(
    block.rootTunnelConnections,
    mapIndex,
  ).filter(
    ({ tunnelIndex, senderIndex, recipientIndex }) =>
      cells[tunnelIndex] === 'rootTunnel' &&
      Boolean(cells[senderIndex]) &&
      Boolean(cells[recipientIndex]),
  )
  const hasMissingVineAugmentation = availability.missingSeedAugmentations.some(
    ({ id }) => id === SEED_AUGMENTATION_IDS.LEECHING_VINE,
  )
  const addedLeechingVines = hasMissingVineAugmentation
    ? []
    : remapLeechingVines(block.leechingVines, mapIndex)
  const expectedRootTunnelConnections = [
    ...(blueprint.rootTunnelConnections ?? []).filter(
      ({ tunnelIndex, senderIndex, recipientIndex }) =>
        !writtenTargetIndexes.has(tunnelIndex) &&
        !sourceIndexes.has(tunnelIndex) &&
        !sourceIndexes.has(senderIndex) &&
        !sourceIndexes.has(recipientIndex),
    ),
    ...addedRootTunnelConnections,
  ]
  const sourceGourdIndex = blueprint.cells.indexOf('leechingGourd')
  const retainedLeechingVines = (blueprint.leechingVines ?? []).filter((vine) =>
    !(sourceIndexes.has(sourceGourdIndex) &&
      [...vine.path, ...vine.targetIndexes].every((index) => sourceIndexes.has(index))),
  )
  const expectedLeechingVines = [
    ...retainedLeechingVines,
    ...addedLeechingVines,
  ]
  const nextBlueprint = createBlueprint({
    rows: blueprint.rows,
    columns: blueprint.columns,
    cells,
    mirrorCornTargets,
    rootTunnelConnections: expectedRootTunnelConnections,
    leechingVines: expectedLeechingVines,
    requireSplitweedFootprints,
  })

  let error = null
  if (!areEqual(nextBlueprint.cells, cells)) {
    error = 'The block conflicts with a unique or 2×2 Crop already in the blueprint.'
  } else if (
    nextBlueprint.cells.filter((crop) => crop === 'mangroveSapling').length >
      MANGROVE_SAPLING_PLACEMENT_LIMIT
  ) {
    error = `Only ${MANGROVE_SAPLING_PLACEMENT_LIMIT} Mangrove Saplings can be planted in one blueprint.`
  } else if (
    nextBlueprint.cells.filter((crop) => crop === 'shoalGrass').length >
      getShoalGrassPlacementLimit(
        nextBlueprint,
        completedCropPerfections,
        seedAugmentations,
      )
  ) {
    error = 'This block would exceed the Shoal Grass placement limit.'
  } else if (
    addedMirrorTargets.some(
      ([sourceIndex, targetIndex]) =>
        nextBlueprint.mirrorCornTargets[sourceIndex] !== targetIndex,
    )
  ) {
    error = 'A Mirror Corn target in this block conflicts with the destination.'
  } else if (
    addedRootTunnelConnections.some(
      (connection) =>
        !containsConnection(
          nextBlueprint.rootTunnelConnections ?? [],
          connection,
        ),
    )
  ) {
    error = 'A Root Tunnel connection in this block conflicts with the destination.'
  } else if (
    !areEqual(
      retainedLeechingVines.filter((vine) =>
        (nextBlueprint.leechingVines ?? []).some((nextVine) =>
          areEqual(nextVine.path, vine.path) &&
          areEqual(nextVine.targetIndexes, vine.targetIndexes),
        ),
      ),
      retainedLeechingVines,
    )
  ) {
    error = 'This placement would damage an existing Leeching Vine. Clear that vine first.'
  } else if (
    addedLeechingVines.some(
      (vine) =>
        !(nextBlueprint.leechingVines ?? []).some(
          (nextVine) =>
            areEqual(nextVine.path, vine.path) &&
            areEqual(nextVine.targetIndexes, vine.targetIndexes),
        ),
    )
  ) {
    error = 'The saved Leeching Vine conflicts with the destination.'
  }

  return {
    canPlace: error === null,
    error,
    availability,
    tiles: [
      ...tiles,
      ...[...sourceIndexes]
        .filter((index) => blueprint.cells[index] && !writtenTargetIndexes.has(index))
        .map((targetIndex) => ({ targetIndex, crop: null, originalCrop: blueprint.cells[targetIndex],
          available: true, action: 'clear' })),
    ],
    placedSelection: {
      firstIndex: targetAnchorIndex,
      secondIndex: mapIndex(block.cells.length - 1 - block.anchorIndex),
    },
    blueprint: error === null ? nextBlueprint : null,
  }
}

export function placeBlueprintBlock(blueprint, block, targetAnchorIndex, options) {
  const preview = getBlueprintBlockPlacementPreview(
    blueprint,
    block,
    targetAnchorIndex,
    options,
  )
  if (!preview.canPlace || !preview.blueprint) {
    throw new Error(preview.error ?? 'The block cannot be placed here.')
  }
  return preview.blueprint
}
