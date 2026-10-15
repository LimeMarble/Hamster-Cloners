import { CROP_DEFINITIONS } from './crops.js'

export function isLeechingGourdAnchor(crop) {
  return CROP_DEFINITIONS[crop]?.isLeechingGourdAnchor === true
}

function isLeechingGourdPart(crop) {
  return CROP_DEFINITIONS[crop]?.isLeechingGourdPart === true
}

export function isLeechingGourdCell(crop) {
  return isLeechingGourdAnchor(crop) || isLeechingGourdPart(crop)
}

function getTwoByTwoFootprint(blueprint, anchorIndex) {
  const { rows, columns } = blueprint
  const safeAnchorIndex = Number(anchorIndex)

  if (
    !Number.isInteger(safeAnchorIndex) ||
    safeAnchorIndex < 0 ||
    safeAnchorIndex >= rows * columns
  ) {
    return []
  }

  const row = Math.floor(safeAnchorIndex / columns)
  const column = safeAnchorIndex % columns

  if (row >= rows - 1 || column >= columns - 1) {
    return []
  }

  return [
    safeAnchorIndex,
    safeAnchorIndex + 1,
    safeAnchorIndex + columns,
    safeAnchorIndex + columns + 1,
  ]
}

export function getLeechingGourdFootprint(blueprint, anchorIndex) {
  return getTwoByTwoFootprint(blueprint, anchorIndex)
}

export function getSplitweedFootprint(blueprint, anchorIndex) {
  return getTwoByTwoFootprint(blueprint, anchorIndex)
}

export function getSplitweedAnchorIndex(blueprint, index) {
  const { cells, columns } = blueprint
  const candidates = [index, index - 1, index - columns, index - columns - 1]

  return (
    candidates.find((anchorIndex) => {
      const footprint = getSplitweedFootprint(blueprint, anchorIndex)

      return (
        footprint.includes(index) &&
        footprint.every(
          (footprintIndex, footprintOffset) =>
            cells[footprintIndex] ===
            (footprintOffset === 0 ? 'knotweed' : 'splitweedPart'),
        )
      )
    }) ?? null
  )
}

function normalizeLeechingGourdCells(cells, rows, columns) {
  const blueprint = { rows, columns, cells }
  const anchorIndexes = cells.flatMap((crop, index) =>
    isLeechingGourdAnchor(crop) ? [index] : [],
  )
  const clearGourdCells = () =>
    cells.map((crop) => (isLeechingGourdCell(crop) ? null : crop))

  if (anchorIndexes.length === 0) {
    return cells.some(isLeechingGourdPart) ? clearGourdCells() : cells
  }

  if (anchorIndexes.length !== 1) {
    return clearGourdCells()
  }

  const footprint = getLeechingGourdFootprint(blueprint, anchorIndexes[0])
  const hasValidFootprint =
    footprint.length === 4 &&
    footprint.every(
      (index, footprintOffset) =>
        cells[index] ===
        (footprintOffset === 0 ? 'leechingGourd' : 'leechingGourdPart'),
    )

  return hasValidFootprint ? cells : clearGourdCells()
}

function normalizeSplitweedCells(
  cells,
  rows,
  columns,
  requireSplitweedFootprints,
) {
  const blueprint = { rows, columns, cells }
  const claimedPartIndexes = new Set()
  const normalizedCells = [...cells]

  cells.forEach((crop, anchorIndex) => {
    if (crop !== 'knotweed') return

    const footprint = getSplitweedFootprint(blueprint, anchorIndex)
    const hasValidFootprint =
      footprint.length === 4 &&
      footprint.slice(1).every((index) => cells[index] === 'splitweedPart')

    if (hasValidFootprint) {
      footprint.slice(1).forEach((index) => claimedPartIndexes.add(index))
    } else if (requireSplitweedFootprints) {
      normalizedCells[anchorIndex] = null
    }
  })

  return normalizedCells.map((crop, index) =>
    crop === 'splitweedPart' && !claimedPartIndexes.has(index) ? null : crop,
  )
}

export function normalizeMultiTileCropCells(
  cells,
  rows,
  columns,
  { requireSplitweedFootprints = false } = {},
) {
  return normalizeSplitweedCells(
    normalizeLeechingGourdCells(cells, rows, columns),
    rows,
    columns,
    requireSplitweedFootprints,
  )
}