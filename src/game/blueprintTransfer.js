import { createBlueprint } from './blueprintLogic.js'
import { isKnownCrop, normalizeCropId } from './crops.js'
import { getShoalGrassPlacementLimit } from './cropEffects.js'
import { MANGROVE_SAPLING_PLACEMENT_LIMIT } from './mangroveSaplingLogic.js'
import { remapRootTunnelConnections } from './rootTunnelLogic.js'

export const BLUEPRINT_FORMAT_VERSION = 1
const BLUEPRINT_FORMAT_TYPE = 'hamster-cloners-blueprint'

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return globalThis.btoa(binary)
}

function decodeBase64(value) {
  const blueprintCode = value.trim()

  if (
    !blueprintCode ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      blueprintCode,
    )
  ) {
    throw new Error('The blueprint code is not valid Base64.')
  }

  const binary = globalThis.atob(blueprintCode)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

function parseBlueprintCode(blueprintCode) {
  let payload

  try {
    payload = JSON.parse(decodeBase64(blueprintCode))
  } catch (error) {
    throw new Error(
      error instanceof Error &&
        error.message === 'The blueprint code is not valid Base64.'
        ? error.message
        : 'The blueprint code is invalid or corrupted.',
      { cause: error },
    )
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.type !== BLUEPRINT_FORMAT_TYPE ||
    payload.version !== BLUEPRINT_FORMAT_VERSION ||
    !payload.blueprint ||
    typeof payload.blueprint !== 'object'
  ) {
    throw new Error('This blueprint code uses an unsupported format.')
  }

  return payload.blueprint
}

function resizeBlueprintFromTopLeft(
  blueprint,
  targetRows,
  targetColumns,
) {
  const cells = Array(targetRows * targetColumns).fill(null)
  const mirrorCornTargets = Array(targetRows * targetColumns).fill(null)
  const retainedRows = Math.min(blueprint.rows, targetRows)
  const retainedColumns = Math.min(blueprint.columns, targetColumns)
  const remapIndex = (sourceIndex) => {
    if (!Number.isInteger(sourceIndex)) return null

    const row = Math.floor(sourceIndex / blueprint.columns)
    const column = sourceIndex % blueprint.columns
    return row < retainedRows && column < retainedColumns
      ? row * targetColumns + column
      : null
  }

  for (let row = 0; row < retainedRows; row += 1) {
    for (let column = 0; column < retainedColumns; column += 1) {
      const sourceIndex = row * blueprint.columns + column
      const targetIndex = row * targetColumns + column
      cells[targetIndex] = blueprint.cells[sourceIndex]

      const sourceMirrorTarget = blueprint.mirrorCornTargets[sourceIndex]
      if (sourceMirrorTarget === null) continue

      const mirrorTargetRow = Math.floor(
        sourceMirrorTarget / blueprint.columns,
      )
      const mirrorTargetColumn = sourceMirrorTarget % blueprint.columns

      if (
        mirrorTargetRow < targetRows &&
        mirrorTargetColumn < targetColumns
      ) {
        mirrorCornTargets[targetIndex] =
          mirrorTargetRow * targetColumns + mirrorTargetColumn
      }
    }
  }

  const rootTunnelConnections = remapRootTunnelConnections(
    blueprint.rootTunnelConnections,
    remapIndex,
  )

  return {
    rows: targetRows,
    columns: targetColumns,
    cells,
    mirrorCornTargets,
    ...(rootTunnelConnections.length > 0 ? { rootTunnelConnections } : {}),
  }
}

export function exportBlueprint(blueprint) {
  return encodeBase64(
    JSON.stringify({
      type: BLUEPRINT_FORMAT_TYPE,
      version: BLUEPRINT_FORMAT_VERSION,
      blueprint: createBlueprint(blueprint),
    }),
  )
}

export function importBlueprint(
  blueprintCode,
  {
    rows,
    columns,
    unlockedCropIds = [],
    hasMirrorCorn = false,
    hasLeechingGourd = false,
    hasSplitweed = false,
    completedCropPerfections = [],
    seedAugmentations = {},
  },
) {
  const rawBlueprint = parseBlueprintCode(blueprintCode)
  const sourceRows = Number(rawBlueprint.rows)
  const sourceColumns = Number(rawBlueprint.columns)
  const hasValidSourceSize =
    Number.isInteger(sourceRows) &&
    sourceRows >= 1 &&
    Number.isInteger(sourceColumns) &&
    sourceColumns >= 1
  const sourceCellCount = hasValidSourceSize
    ? sourceRows * sourceColumns
    : 0
  const expectedRows = Math.max(1, Math.floor(Number(rows) || 1))
  const expectedColumns = Math.max(1, Math.floor(Number(columns) || 1))

  if (
    !hasValidSourceSize ||
    !Array.isArray(rawBlueprint.cells) ||
    rawBlueprint.cells.length !== sourceCellCount ||
    !Array.isArray(rawBlueprint.mirrorCornTargets) ||
    rawBlueprint.mirrorCornTargets.length !== sourceCellCount ||
    (rawBlueprint.rootTunnelConnections !== undefined &&
      !Array.isArray(rawBlueprint.rootTunnelConnections))
  ) {
    throw new Error('The blueprint has an invalid number of tiles.')
  }

  const normalizedSourceBlueprint = createBlueprint({
    ...rawBlueprint,
    requireSplitweedFootprints: hasSplitweed,
  })
  const normalizedRawCells = rawBlueprint.cells.map(normalizeCropId)

  if (
    JSON.stringify(normalizedSourceBlueprint.cells) !==
      JSON.stringify(normalizedRawCells) ||
    JSON.stringify(normalizedSourceBlueprint.mirrorCornTargets) !==
      JSON.stringify(rawBlueprint.mirrorCornTargets) ||
    JSON.stringify(normalizedSourceBlueprint.rootTunnelConnections ?? []) !==
      JSON.stringify(rawBlueprint.rootTunnelConnections ?? [])
  ) {
    throw new Error('The blueprint contains an invalid crop layout or tile link.')
  }

  const resizedBlueprint = resizeBlueprintFromTopLeft(
    normalizedSourceBlueprint,
    expectedRows,
    expectedColumns,
  )
  const allowedCropIds = new Set(unlockedCropIds)

  if (hasLeechingGourd) {
    allowedCropIds.add('leechingGourd')
    allowedCropIds.add('leechingGourdPart')
  }

  if (hasSplitweed) {
    allowedCropIds.add('splitweedPart')
  }

  const lockedCrop = resizedBlueprint.cells.find(
    (crop) => crop !== null && (!isKnownCrop(crop) || !allowedCropIds.has(crop)),
  )

  if (lockedCrop !== undefined) {
    throw new Error('This blueprint contains a crop you have not unlocked.')
  }

  const shoalGrassCount = resizedBlueprint.cells.filter(
    (crop) => crop === 'shoalGrass',
  ).length
  if (
    shoalGrassCount >
    getShoalGrassPlacementLimit(
      resizedBlueprint,
      completedCropPerfections,
      seedAugmentations,
    )
  ) {
    throw new Error(
      'This blueprint contains more Shoal Grass than its placement limit allows.',
    )
  }

  const mangroveSaplingCount = resizedBlueprint.cells.filter(
    (crop) => crop === 'mangroveSapling',
  ).length
  if (mangroveSaplingCount > MANGROVE_SAPLING_PLACEMENT_LIMIT) {
    throw new Error(
      `This blueprint contains more than ${MANGROVE_SAPLING_PLACEMENT_LIMIT} Mangrove Saplings.`,
    )
  }

  if (
    !hasMirrorCorn &&
    resizedBlueprint.mirrorCornTargets.some(
      (targetIndex) => targetIndex !== null,
    )
  ) {
    throw new Error('Unlock Mirror Corn before importing its tile links.')
  }

  return createBlueprint({
    ...resizedBlueprint,
    requireSplitweedFootprints: hasSplitweed,
  })
}
