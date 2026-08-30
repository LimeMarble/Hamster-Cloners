import { createBlueprint } from './blueprintLogic.js'
import { isKnownCrop } from './crops.js'
import { getMuskGrassPlacementLimit } from './cropEffects.js'

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

  return {
    rows: targetRows,
    columns: targetColumns,
    cells,
    mirrorCornTargets,
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
    rawBlueprint.mirrorCornTargets.length !== sourceCellCount
  ) {
    throw new Error('The blueprint has an invalid number of tiles.')
  }

  const normalizedSourceBlueprint = createBlueprint({
    ...rawBlueprint,
    requireSplitweedFootprints: hasSplitweed,
  })

  if (
    JSON.stringify(normalizedSourceBlueprint.cells) !==
      JSON.stringify(rawBlueprint.cells) ||
    JSON.stringify(normalizedSourceBlueprint.mirrorCornTargets) !==
      JSON.stringify(rawBlueprint.mirrorCornTargets)
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

  const muskGrassCount = resizedBlueprint.cells.filter(
    (crop) => crop === 'muskGrass',
  ).length
  if (
    muskGrassCount >
    getMuskGrassPlacementLimit(
      resizedBlueprint,
      completedCropPerfections,
      seedAugmentations,
    )
  ) {
    throw new Error(
      'This blueprint contains more Musk Grass than its placement limit allows.',
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
