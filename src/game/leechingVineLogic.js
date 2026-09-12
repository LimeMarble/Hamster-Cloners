import {
  getLeechingGourdAdjacentCropConnections,
  getOrthogonalIndexes,
} from './adjacencyLogic.js'
import {
  hasLeechingVineAugmentation,
  isMirrorCornDebuffRemovalEnabled,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from './augmentationLogic.js'
import { createBlueprintCalculationCache } from './blueprintCalculationCache.js'
import { CROP_DEFINITIONS, getCropPerfection } from './crops.js'
import {
  getLeechingGourdFootprint,
  getSplitweedAnchorIndex,
} from './cropFootprintLogic.js'

const getCachedNourishment = createBlueprintCalculationCache()
const getCachedVineStatus = createBlueprintCalculationCache()

function toTileIndex(value, tileCount) {
  const index = Number(value)

  return Number.isInteger(index) && index >= 0 && index < tileCount
    ? index
    : null
}

function areTilesOrthogonallyAdjacent(blueprint, leftIndex, rightIndex) {
  return getOrthogonalIndexes(blueprint, leftIndex).includes(rightIndex)
}

export function canLeechingVineOccupyTile(crop) {
  return crop === null || crop === 'rootTunnel'
}

export function getLeechingVineStartIndexes(blueprint) {
  const anchorIndex = blueprint.cells.indexOf('leechingGourd')
  if (anchorIndex < 0) return []

  const footprint = getLeechingGourdFootprint(blueprint, anchorIndex)
  const footprintIndexes = new Set(footprint)

  return [...new Set(
    footprint.flatMap((index) => getOrthogonalIndexes(blueprint, index)),
  )]
    .filter(
      (index) =>
        !footprintIndexes.has(index) &&
        canLeechingVineOccupyTile(blueprint.cells[index]),
    )
    .sort((left, right) => left - right)
}

function normalizeVine(blueprint, rawVine) {
  const tileCount = blueprint.rows * blueprint.columns
  const startIndexes = new Set(getLeechingVineStartIndexes(blueprint))
  const path = []
  const claimedIndexes = new Set()

  for (const rawIndex of Array.isArray(rawVine?.path) ? rawVine.path : []) {
    const index = toTileIndex(rawIndex, tileCount)
    const previousIndex = path.at(-1)
    const isValidNextTile =
      index !== null &&
      canLeechingVineOccupyTile(blueprint.cells[index]) &&
      !claimedIndexes.has(index) &&
      (path.length === 0
        ? startIndexes.has(index)
        : areTilesOrthogonallyAdjacent(blueprint, previousIndex, index))

    if (!isValidNextTile) break

    path.push(index)
    claimedIndexes.add(index)
  }

  if (path.length === 0) return null

  const targetIndexes = [...new Set(
    (Array.isArray(rawVine?.targetIndexes) ? rawVine.targetIndexes : [])
      .map((index) => toTileIndex(index, tileCount))
      .filter(
        (index) =>
          index !== null &&
          blueprint.cells[index] === 'turnip' &&
          path.some((pathIndex) =>
            areTilesOrthogonallyAdjacent(blueprint, pathIndex, index),
          ),
      ),
  )]

  return { path, targetIndexes }
}

export function normalizeLeechingVines(
  blueprint,
  rawVines = blueprint.leechingVines,
) {
  if (!Array.isArray(rawVines) || !blueprint.cells.includes('leechingGourd')) {
    return []
  }

  const maximumVines =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEECHING_VINE].maximumVines

  return rawVines
    .slice(0, maximumVines)
    .map((vine) => normalizeVine(blueprint, vine))
    .filter(Boolean)
}

export function remapLeechingVines(rawVines, remapIndex) {
  if (!Array.isArray(rawVines)) return []

  return rawVines.flatMap((vine) => {
    const path = []

    for (const sourceIndex of Array.isArray(vine?.path) ? vine.path : []) {
      const targetIndex = remapIndex(sourceIndex)
      if (!Number.isInteger(targetIndex)) break
      path.push(targetIndex)
    }

    if (path.length === 0) return []

    const targetIndexes = [...new Set(
      (Array.isArray(vine?.targetIndexes) ? vine.targetIndexes : [])
        .map(remapIndex)
        .filter(Number.isInteger),
    )]

    return [{ path, targetIndexes }]
  })
}

function getNourishmentSourceDefinition(
  crop,
  completedCropPerfections,
  seedAugmentations,
) {
  const perfection = getCropPerfection(crop, completedCropPerfections)
  const isDebuffedMirrorCorn =
    crop === 'corn' &&
    perfection?.id === 'mirrorCorn' &&
    !isMirrorCornDebuffRemovalEnabled(seedAugmentations)
  const definition = perfection ?? CROP_DEFINITIONS[crop]

  return definition?.hasDebuff || isDebuffedMirrorCorn
    ? {
        cropType: perfection?.id ?? crop,
        strength: definition?.vineNourishmentStrength ?? 1,
      }
    : null
}

export function getLeechingVineNourishment(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  return getCachedNourishment(
    blueprint,
    [completedCropPerfections, seedAugmentations],
    () => {
      const nearestSources = new Map()

      getLeechingGourdAdjacentCropConnections(blueprint)
        .filter(({ adjacencyDistance }) => adjacencyDistance === 0)
        .forEach(({ index }) => {
          const splitweedAnchorIndex = getSplitweedAnchorIndex(blueprint, index)
          const normalizedIndex = splitweedAnchorIndex ?? index
          if (nearestSources.has(normalizedIndex)) return

          const crop = blueprint.cells[normalizedIndex]
          const definition = getNourishmentSourceDefinition(
            crop,
            completedCropPerfections,
            seedAugmentations,
          )
          if (!definition) return

          nearestSources.set(normalizedIndex, {
            index: normalizedIndex,
            crop,
            ...definition,
          })
        })

      const sources = [...nearestSources.values()]
      const strength = sources.reduce(
        (total, source) => total + source.strength,
        0,
      )
      const variety = new Set(sources.map((source) => source.cropType)).size
      const augmentation =
        SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEECHING_VINE]

      return {
        sources,
        strength,
        variety,
        maximumLength: augmentation.baseVineLength + strength,
        targetCapacity: variety,
        bonusExponent:
          strength * augmentation.nourishmentExponentPerStrength,
      }
    },
  )
}

export function getLeechingVineStatus(
  blueprint,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  return getCachedVineStatus(
    blueprint,
    [completedCropPerfections, seedAugmentations],
    () => {
      const nourishment = getLeechingVineNourishment(
        blueprint,
        completedCropPerfections,
        seedAugmentations,
      )
      const vines = normalizeLeechingVines(blueprint)
      const unlocked = hasLeechingVineAugmentation(seedAugmentations)
      const vine = vines[0] ?? { path: [], targetIndexes: [] }
      const activePath = unlocked
        ? vine.path.slice(0, nourishment.maximumLength)
        : []
      const activePathIndexes = new Set(activePath)
      const eligibleTargetIndexes = blueprint.cells.flatMap((crop, index) =>
        crop === 'turnip' &&
        getOrthogonalIndexes(blueprint, index).some((neighborIndex) =>
          activePathIndexes.has(neighborIndex),
        )
          ? [index]
          : [],
      )
      const eligibleTargetIndexSet = new Set(eligibleTargetIndexes)
      const activeTargetIndexes = unlocked
        ? vine.targetIndexes
            .filter((index) => eligibleTargetIndexSet.has(index))
            .slice(0, nourishment.targetCapacity)
        : []

      return {
        unlocked,
        nourishment,
        vine,
        activePath,
        inactivePath: vine.path.slice(activePath.length),
        eligibleTargetIndexes,
        activeTargetIndexes,
      }
    },
  )
}

export function getLeechingVineTurnipMultiplier(
  blueprint,
  turnipIndex,
  gourdMultiplier,
  completedCropPerfections = [],
  seedAugmentations = {},
) {
  if (
    !Number.isInteger(turnipIndex) ||
    !hasLeechingVineAugmentation(seedAugmentations)
  ) {
    return 1
  }

  const status = getLeechingVineStatus(
    blueprint,
    completedCropPerfections,
    seedAugmentations,
  )

  return status.activeTargetIndexes.includes(turnipIndex)
    ? Math.max(0, Number(gourdMultiplier) || 0) **
        status.nourishment.bonusExponent
    : 1
}
