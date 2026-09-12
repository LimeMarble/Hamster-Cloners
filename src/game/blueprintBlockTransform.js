import {
  BLUEPRINT_BLOCK_TRANSFORMS,
  normalizeBlueprintBlock,
} from './blueprintBlockLogic.js'
import {
  getLeechingGourdFootprint,
  getSplitweedFootprint,
} from './cropFootprintLogic.js'
import { remapRootTunnelConnections } from './rootTunnelLogic.js'
import { remapLeechingVines } from './leechingVineLogic.js'

const BLUEPRINT_BLOCK_HOTKEY_TRANSFORMS = Object.freeze({
  e: BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_CLOCKWISE,
  q: BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_COUNTERCLOCKWISE,
  f: BLUEPRINT_BLOCK_TRANSFORMS.FLIP_HORIZONTAL,
  g: BLUEPRINT_BLOCK_TRANSFORMS.FLIP_VERTICAL,
})

export function getBlueprintBlockHotkeyTransform(key) {
  return (
    BLUEPRINT_BLOCK_HOTKEY_TRANSFORMS[String(key ?? '').toLowerCase()] ?? null
  )
}

function getTransformGeometry(block, transform) {
  if (transform === BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_CLOCKWISE) {
    return {
      rows: block.columns,
      columns: block.rows,
      map: (row, column) => [column, block.rows - 1 - row],
    }
  }
  if (transform === BLUEPRINT_BLOCK_TRANSFORMS.ROTATE_COUNTERCLOCKWISE) {
    return {
      rows: block.columns,
      columns: block.rows,
      map: (row, column) => [block.columns - 1 - column, row],
    }
  }
  if (transform === BLUEPRINT_BLOCK_TRANSFORMS.FLIP_HORIZONTAL) {
    return {
      rows: block.rows,
      columns: block.columns,
      map: (row, column) => [row, block.columns - 1 - column],
    }
  }
  if (transform === BLUEPRINT_BLOCK_TRANSFORMS.FLIP_VERTICAL) {
    return {
      rows: block.rows,
      columns: block.columns,
      map: (row, column) => [block.rows - 1 - row, column],
    }
  }
  throw new Error('Unknown block transformation.')
}

export function transformBlueprintBlock(rawBlock, transform) {
  const block = normalizeBlueprintBlock(rawBlock, rawBlock?.id)
  const geometry = getTransformGeometry(block, transform)
  const mapIndex = (index) => {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= block.rows * block.columns
    ) {
      return null
    }
    const [row, column] = geometry.map(
      Math.floor(index / block.columns),
      index % block.columns,
    )
    return row * geometry.columns + column
  }
  const cells = Array(geometry.rows * geometry.columns).fill(null)
  block.cells.forEach((crop, index) => {
    cells[mapIndex(index)] = crop
  })

  const normalizeTransformedFootprint = (
    sourceAnchor,
    footprint,
    anchorCrop,
    partCrop,
  ) => {
    if (sourceAnchor < 0 || footprint.length !== 4) return
    const mappedIndexes = footprint.map(mapIndex)
    mappedIndexes.forEach((index) => {
      cells[index] = partCrop
    })
    const topLeftIndex = mappedIndexes.reduce((currentTopLeft, index) => {
      const row = Math.floor(index / geometry.columns)
      const column = index % geometry.columns
      const topRow = Math.floor(currentTopLeft / geometry.columns)
      const leftColumn = currentTopLeft % geometry.columns
      return row < topRow || (row === topRow && column < leftColumn)
        ? index
        : currentTopLeft
    })
    cells[topLeftIndex] = anchorCrop
  }

  const sourceBlueprint = {
    rows: block.rows,
    columns: block.columns,
    cells: block.cells,
  }
  const gourdAnchor = block.cells.indexOf('leechingGourd')
  if (gourdAnchor >= 0) {
    normalizeTransformedFootprint(
      gourdAnchor,
      getLeechingGourdFootprint(sourceBlueprint, gourdAnchor),
      'leechingGourd',
      'leechingGourdPart',
    )
  }
  block.cells.forEach((crop, index) => {
    if (crop !== 'knotweed') return
    const footprint = getSplitweedFootprint(sourceBlueprint, index)
    if (
      footprint.slice(1).every(
        (partIndex) => block.cells[partIndex] === 'splitweedPart',
      )
    ) {
      normalizeTransformedFootprint(
        index,
        footprint,
        'knotweed',
        'splitweedPart',
      )
    }
  })

  const mirrorCornTargets = Array(cells.length).fill(null)
  block.mirrorCornTargets.forEach((targetIndex, sourceIndex) => {
    if (targetIndex !== null) {
      mirrorCornTargets[mapIndex(sourceIndex)] = mapIndex(targetIndex)
    }
  })

  return normalizeBlueprintBlock({
    ...block,
    rows: geometry.rows,
    columns: geometry.columns,
    cells,
    mirrorCornTargets,
    rootTunnelConnections: remapRootTunnelConnections(
      block.rootTunnelConnections,
      mapIndex,
    ),
    leechingVines: remapLeechingVines(block.leechingVines, mapIndex),
    anchorIndex: mapIndex(block.anchorIndex),
  }, block.id)
}
