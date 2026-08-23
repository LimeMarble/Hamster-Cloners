import { createBlueprint } from './blueprintLogic.js'
import { isKnownCrop } from './crops.js'

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
  },
) {
  const rawBlueprint = parseBlueprintCode(blueprintCode)
  const expectedRows = Math.max(1, Math.floor(Number(rows) || 1))
  const expectedColumns = Math.max(1, Math.floor(Number(columns) || 1))
  const totalCells = expectedRows * expectedColumns

  if (
    rawBlueprint.rows !== expectedRows ||
    rawBlueprint.columns !== expectedColumns
  ) {
    throw new Error(
      `This blueprint is ${rawBlueprint.rows}×${rawBlueprint.columns}; the active slot is ${expectedRows}×${expectedColumns}.`,
    )
  }

  if (
    !Array.isArray(rawBlueprint.cells) ||
    rawBlueprint.cells.length !== totalCells ||
    !Array.isArray(rawBlueprint.mirrorCornTargets) ||
    rawBlueprint.mirrorCornTargets.length !== totalCells
  ) {
    throw new Error('The blueprint has an invalid number of tiles.')
  }

  const allowedCropIds = new Set(unlockedCropIds)

  if (hasLeechingGourd) {
    allowedCropIds.add('leechingGourd')
    allowedCropIds.add('leechingGourdPart')
  }

  if (hasSplitweed) {
    allowedCropIds.add('splitweedPart')
  }

  const lockedCrop = rawBlueprint.cells.find(
    (crop) => crop !== null && (!isKnownCrop(crop) || !allowedCropIds.has(crop)),
  )

  if (lockedCrop !== undefined) {
    throw new Error('This blueprint contains a crop you have not unlocked.')
  }

  if (
    !hasMirrorCorn &&
    rawBlueprint.mirrorCornTargets.some((targetIndex) => targetIndex !== null)
  ) {
    throw new Error('Unlock Mirror Corn before importing its tile links.')
  }

  const normalizedBlueprint = createBlueprint({
    ...rawBlueprint,
    requireSplitweedFootprints: hasSplitweed,
  })

  if (
    JSON.stringify(normalizedBlueprint.cells) !==
      JSON.stringify(rawBlueprint.cells) ||
    JSON.stringify(normalizedBlueprint.mirrorCornTargets) !==
      JSON.stringify(rawBlueprint.mirrorCornTargets)
  ) {
    throw new Error('The blueprint contains an invalid crop layout or tile link.')
  }

  return normalizedBlueprint
}
