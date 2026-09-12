import { createBlueprint } from './blueprintLogic.js'
import {
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  CROP_PERFECTION_IDS,
  isKnownCrop,
} from './crops.js'
import {
  getLeechingGourdFootprint,
  getSplitweedFootprint,
} from './cropFootprintLogic.js'
import {
  normalizeSeedAugmentationState,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from './augmentationLogic.js'
import { remapRootTunnelConnections } from './rootTunnelLogic.js'
import { remapLeechingVines } from './leechingVineLogic.js'

export const BLUEPRINT_BLOCK_FORMAT_VERSION = 1
export const BLUEPRINT_BLOCK_FORMAT_TYPE = 'hamster-cloners-blueprint-block'
export const BLUEPRINT_BLOCK_LIBRARY_FORMAT_TYPE =
  'hamster-cloners-blueprint-block-library'
export const MAX_SAVED_BLUEPRINT_BLOCKS = 50
export const BLUEPRINT_BLOCK_PLACEMENT_MODES = Object.freeze({
  STAMP: 'stamp',
  REPLACE: 'replace',
})
export const BLUEPRINT_BLOCK_TRANSFORMS = Object.freeze({
  ROTATE_CLOCKWISE: 'rotateClockwise',
  ROTATE_COUNTERCLOCKWISE: 'rotateCounterclockwise',
  FLIP_HORIZONTAL: 'flipHorizontal',
  FLIP_VERTICAL: 'flipVertical',
})

const MAX_BLUEPRINT_BLOCK_TILES = 10_000
const BLOCK_NAME_MAX_LENGTH = 50

export const BLUEPRINT_BLOCK_AUGMENTATION_REQUIREMENTS = Object.freeze([
  {
    id: SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT,
    stateKey: 'leekEnrichmentLevel',
    cropIds: ['leek'],
  },
  {
    id: SEED_AUGMENTATION_IDS.LEEK_DIAGONAL,
    stateKey: 'leekDiagonalUnlocked',
    cropIds: ['leek'],
  },
  {
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL,
    stateKey: 'mirrorCornDebuffRemovalUnlocked',
    cropIds: ['corn'],
  },
  {
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS,
    stateKey: 'mirrorCornEffectivenessLevel',
    cropIds: ['corn'],
  },
  {
    id: SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT,
    stateKey: 'mirrorCornReflectionLimitUnlocked',
    cropIds: ['corn'],
  },
  {
    id: SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT,
    stateKey: 'splitweedMonocropLimitLevel',
    cropIds: ['knotweed'],
  },
  {
    id: SEED_AUGMENTATION_IDS.SWEETER_BOND,
    stateKey: 'sweeterBondLevel',
    cropIds: ['sweetPotato'],
  },
  {
    id: SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES,
    stateKey: 'loosenedBoundariesLevel',
    cropIds: ['sweetPotato'],
  },
  {
    id: SEED_AUGMENTATION_IDS.RESTORED_CONNECTIONS,
    stateKey: 'restoredConnectionsUnlocked',
    cropIds: ['sweetPotato'],
  },
  {
    id: SEED_AUGMENTATION_IDS.LEECHING_VINE,
    stateKey: 'leechingVineUnlocked',
    cropIds: ['pumpkin'],
    requiresVine: true,
  },
])

function sanitizeBlockName(value, fallback = 'Saved Block') {
  const name = String(value ?? '').trim().slice(0, BLOCK_NAME_MAX_LENGTH)
  return name || fallback
}

function sanitizeBlockId(value, fallback) {
  const id = String(value ?? '').trim().slice(0, 100)
  return id || fallback
}

export function getBlueprintBlockBaseCropId(cropId) {
  if (cropId === 'leechingGourd' || cropId === 'leechingGourdPart') {
    return 'pumpkin'
  }
  if (cropId === 'splitweedPart') return 'knotweed'
  return cropId
}

function getBlockCropIds(cells) {
  return [...new Set(cells.filter(Boolean).map(getBlueprintBlockBaseCropId))]
}

export function getBlueprintBlockAugmentationLevel(state, requirement) {
  const value = state[requirement.stateKey]
  return typeof value === 'boolean' ? (value ? 1 : 0) : Math.max(0, Number(value) || 0)
}

function normalizeRequiredAugmentations(rawRequirements) {
  if (!Array.isArray(rawRequirements)) return []

  const levels = new Map()
  rawRequirements.forEach((rawRequirement) => {
    const requirement = BLUEPRINT_BLOCK_AUGMENTATION_REQUIREMENTS.find(
      ({ id }) => id === rawRequirement?.id,
    )
    const level = Math.max(0, Math.floor(Number(rawRequirement?.level) || 0))
    if (!requirement || level <= 0) return
    levels.set(requirement.id, Math.max(levels.get(requirement.id) ?? 0, level))
  })

  return [...levels].map(([id, level]) => ({ id, level }))
}

function getStructuralPerfectionRequirements(blueprint) {
  const requirements = []
  if (blueprint.cells.some((crop) => crop === 'leechingGourd' || crop === 'leechingGourdPart')) {
    requirements.push('leechingGourd')
  }
  if (blueprint.cells.includes('splitweedPart')) requirements.push('splitweed')
  if (blueprint.mirrorCornTargets.some((targetIndex) => targetIndex !== null)) {
    requirements.push('mirrorCorn')
  }
  return requirements
}

function normalizeCoreBlock(rawBlock, fallbackId = 'saved-block') {
  const rows = Math.floor(Number(rawBlock?.rows))
  const columns = Math.floor(Number(rawBlock?.columns))
  const tileCount = rows * columns

  if (
    !Number.isInteger(rows) ||
    rows < 1 ||
    !Number.isInteger(columns) ||
    columns < 1 ||
    !Number.isSafeInteger(tileCount) ||
    tileCount > MAX_BLUEPRINT_BLOCK_TILES ||
    !Array.isArray(rawBlock?.cells) ||
    rawBlock.cells.length !== tileCount
  ) {
    throw new Error('The block has an invalid size or number of tiles.')
  }

  const requireSplitweedFootprints = rawBlock.cells.includes('splitweedPart')
  const blueprint = createBlueprint({
    rows,
    columns,
    cells: rawBlock.cells,
    mirrorCornTargets: rawBlock.mirrorCornTargets,
    rootTunnelConnections: rawBlock.rootTunnelConnections,
    leechingVines: rawBlock.leechingVines,
    requireSplitweedFootprints,
  })
  const anchorIndex = Number(rawBlock.anchorIndex)
  const anchorRow = Math.floor(anchorIndex / columns)
  const anchorColumn = anchorIndex % columns
  const isCornerAnchor =
    Number.isInteger(anchorIndex) &&
    anchorIndex >= 0 &&
    anchorIndex < tileCount &&
    (anchorRow === 0 || anchorRow === rows - 1) &&
    (anchorColumn === 0 || anchorColumn === columns - 1)

  if (!isCornerAnchor) {
    throw new Error('The block placement anchor must be one of its corners.')
  }

  const cropIds = getBlockCropIds(blueprint.cells)
  const requiredCropIds = [...new Set([
    ...cropIds,
    ...(Array.isArray(rawBlock.requiredCropIds)
      ? rawBlock.requiredCropIds.filter((cropId) => isKnownCrop(cropId))
      : []),
  ])]
  const requiredCropPerfections = [...new Set([
    ...getStructuralPerfectionRequirements(blueprint),
    ...(Array.isArray(rawBlock.requiredCropPerfections)
      ? rawBlock.requiredCropPerfections.filter((id) =>
          CROP_PERFECTION_IDS.includes(id),
        )
      : []),
  ])]
  const requiredSeedAugmentations = normalizeRequiredAugmentations([
    ...(Array.isArray(rawBlock.requiredSeedAugmentations)
      ? rawBlock.requiredSeedAugmentations
      : []),
    ...((blueprint.leechingVines?.length ?? 0) > 0
      ? [{ id: SEED_AUGMENTATION_IDS.LEECHING_VINE, level: 1 }]
      : []),
  ])

  return {
    id: sanitizeBlockId(rawBlock.id, fallbackId),
    name: sanitizeBlockName(rawBlock.name),
    rows,
    columns,
    cells: blueprint.cells,
    mirrorCornTargets: blueprint.mirrorCornTargets,
    ...(blueprint.rootTunnelConnections?.length > 0
      ? { rootTunnelConnections: blueprint.rootTunnelConnections }
      : {}),
    ...(blueprint.leechingVines?.length > 0
      ? { leechingVines: blueprint.leechingVines }
      : {}),
    anchorIndex,
    requiredCropIds,
    requiredCropPerfections,
    requiredSeedAugmentations,
  }
}

export function normalizeBlueprintBlock(rawBlock, fallbackId = 'saved-block') {
  return normalizeCoreBlock(rawBlock, fallbackId)
}

export function normalizeBlueprintBlocks(rawBlocks) {
  if (!Array.isArray(rawBlocks)) return []

  const usedIds = new Set()
  return rawBlocks.slice(0, MAX_SAVED_BLUEPRINT_BLOCKS).flatMap((rawBlock, index) => {
    try {
      const block = normalizeCoreBlock(rawBlock, `saved-block-${index + 1}`)
      let id = block.id
      let suffix = 2
      while (usedIds.has(id)) {
        id = `${block.id}-${suffix}`
        suffix += 1
      }
      usedIds.add(id)
      return [{ ...block, id }]
    } catch {
      return []
    }
  })
}

function getRectangle(blueprint, firstIndex, secondIndex) {
  const tileCount = blueprint.rows * blueprint.columns
  if (
    !Number.isInteger(firstIndex) ||
    firstIndex < 0 ||
    firstIndex >= tileCount ||
    !Number.isInteger(secondIndex) ||
    secondIndex < 0 ||
    secondIndex >= tileCount
  ) {
    throw new Error('Select two valid blueprint corners.')
  }

  const firstRow = Math.floor(firstIndex / blueprint.columns)
  const firstColumn = firstIndex % blueprint.columns
  const secondRow = Math.floor(secondIndex / blueprint.columns)
  const secondColumn = secondIndex % blueprint.columns
  const top = Math.min(firstRow, secondRow)
  const bottom = Math.max(firstRow, secondRow)
  const left = Math.min(firstColumn, secondColumn)
  const right = Math.max(firstColumn, secondColumn)

  return {
    top,
    bottom,
    left,
    right,
    rows: bottom - top + 1,
    columns: right - left + 1,
  }
}

function createSelectionIndexMapper(blueprint, rectangle) {
  return (sourceIndex) => {
    if (!Number.isInteger(sourceIndex)) return null
    const row = Math.floor(sourceIndex / blueprint.columns)
    const column = sourceIndex % blueprint.columns
    return row >= rectangle.top &&
      row <= rectangle.bottom &&
      column >= rectangle.left &&
      column <= rectangle.right
      ? (row - rectangle.top) * rectangle.columns + column - rectangle.left
      : null
  }
}

function assertSelectionDoesNotCutMultiTileCrop(blueprint, selectedIndexes) {
  const selected = new Set(selectedIndexes)
  const footprints = []
  const gourdAnchorIndex = blueprint.cells.indexOf('leechingGourd')
  if (gourdAnchorIndex >= 0) {
    footprints.push(getLeechingGourdFootprint(blueprint, gourdAnchorIndex))
  }
  blueprint.cells.forEach((crop, index) => {
    if (crop !== 'knotweed') return
    const footprint = getSplitweedFootprint(blueprint, index)
    if (
      footprint.length === 4 &&
      footprint.slice(1).every(
        (footprintIndex) => blueprint.cells[footprintIndex] === 'splitweedPart',
      )
    ) {
      footprints.push(footprint)
    }
  })

  const cutFootprint = footprints.some(
    (footprint) =>
      footprint.some((index) => selected.has(index)) &&
      !footprint.every((index) => selected.has(index)),
  )
  if (cutFootprint) {
    throw new Error('The selection cuts through a 2×2 Crop. Include the whole Crop.')
  }
}

function captureRequirements(
  cells,
  completedCropPerfections,
  seedAugmentations,
  hasVine,
) {
  const cropIds = getBlockCropIds(cells)
  const cropIdSet = new Set(cropIds)
  const perfectionIds = Object.values(CROP_PERFECTIONS)
    .filter(
      (perfection) =>
        cropIdSet.has(perfection.cropId) &&
        completedCropPerfections.includes(perfection.id),
    )
    .map(({ id }) => id)
  const normalizedAugmentations = normalizeSeedAugmentationState(seedAugmentations)
  const augmentationRequirements = BLUEPRINT_BLOCK_AUGMENTATION_REQUIREMENTS.flatMap(
    (requirement) => {
      const isRelevant = requirement.requiresVine
        ? hasVine
        : requirement.cropIds.some((cropId) => cropIdSet.has(cropId))
      const level = isRelevant
        ? getBlueprintBlockAugmentationLevel(normalizedAugmentations, requirement)
        : 0
      return level > 0 ? [{ id: requirement.id, level }] : []
    },
  )

  return {
    requiredCropIds: cropIds,
    requiredCropPerfections: perfectionIds,
    requiredSeedAugmentations: augmentationRequirements,
  }
}

export function getBlueprintSelectionIndexes(blueprint, firstIndex, secondIndex) {
  const rectangle = getRectangle(blueprint, firstIndex, secondIndex)
  const indexes = []
  for (let row = rectangle.top; row <= rectangle.bottom; row += 1) {
    for (let column = rectangle.left; column <= rectangle.right; column += 1) {
      indexes.push(row * blueprint.columns + column)
    }
  }
  return indexes
}

export function createBlueprintBlockFromSelection(
  blueprint,
  firstIndex,
  secondIndex,
  {
    id = 'saved-block',
    name = 'Saved Block',
    completedCropPerfections = [],
    seedAugmentations = {},
  } = {},
) {
  const rectangle = getRectangle(blueprint, firstIndex, secondIndex)
  const selectedIndexes = getBlueprintSelectionIndexes(
    blueprint,
    firstIndex,
    secondIndex,
  )
  assertSelectionDoesNotCutMultiTileCrop(blueprint, selectedIndexes)
  const remapIndex = createSelectionIndexMapper(blueprint, rectangle)
  const cells = selectedIndexes.map((index) => blueprint.cells[index])
  const mirrorCornTargets = selectedIndexes.map((index) => {
    const targetIndex = blueprint.mirrorCornTargets[index]
    return targetIndex === null ? null : remapIndex(targetIndex)
  })
  const rootTunnelConnections = remapRootTunnelConnections(
    blueprint.rootTunnelConnections,
    remapIndex,
  )
  const hasWholeGourd = cells.includes('leechingGourd')
  const completeLeechingVines = hasWholeGourd
    ? (blueprint.leechingVines ?? []).filter((vine) =>
        [...(vine.path ?? []), ...(vine.targetIndexes ?? [])].every(
          (index) => remapIndex(index) !== null,
        ),
      )
    : []
  const leechingVines = remapLeechingVines(
    completeLeechingVines,
    remapIndex,
  )
  const anchorIndex = remapIndex(firstIndex)
  const requirements = captureRequirements(
    cells,
    completedCropPerfections,
    seedAugmentations,
    leechingVines.length > 0,
  )

  return normalizeCoreBlock({
    id,
    name,
    rows: rectangle.rows,
    columns: rectangle.columns,
    cells,
    mirrorCornTargets,
    rootTunnelConnections,
    leechingVines,
    anchorIndex,
    ...requirements,
  }, id)
}

export function getBlueprintBlockAnchorName(block) {
  const row = Math.floor(block.anchorIndex / block.columns)
  const column = block.anchorIndex % block.columns
  const vertical = row === 0 ? 'top' : 'bottom'
  const horizontal = column === 0 ? 'left' : 'right'
  return `${vertical}-${horizontal}`
}

export function getSeedAugmentationName(augmentationId) {
  return SEED_AUGMENTATIONS[augmentationId]?.name ?? augmentationId
}

export function getBlueprintBlockCropName(cropId) {
  return CROP_DEFINITIONS[cropId]?.name ?? cropId
}


