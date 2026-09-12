import {
  BLUEPRINT_BLOCK_FORMAT_TYPE,
  BLUEPRINT_BLOCK_FORMAT_VERSION,
  BLUEPRINT_BLOCK_LIBRARY_FORMAT_TYPE,
  normalizeBlueprintBlock,
  normalizeBlueprintBlocks,
} from './blueprintBlockLogic.js'

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return globalThis.btoa(binary)
}

function decodeBase64(value) {
  const code = String(value ?? '').trim()

  if (
    !code ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      code,
    )
  ) {
    throw new Error('The block code is not valid Base64.')
  }

  const binary = globalThis.atob(code)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function areEqual(left, right) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? [])
}

export function exportBlueprintBlock(rawBlock) {
  const block = normalizeBlueprintBlock(rawBlock, rawBlock?.id)
  return encodeBase64(JSON.stringify({
    type: BLUEPRINT_BLOCK_FORMAT_TYPE,
    version: BLUEPRINT_BLOCK_FORMAT_VERSION,
    block,
  }))
}

export function importBlueprintBlock(blockCode) {
  let payload
  try {
    payload = JSON.parse(decodeBase64(blockCode))
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message === 'The block code is not valid Base64.'
        ? error.message
        : 'The block code is invalid or corrupted.',
      { cause: error },
    )
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.type !== BLUEPRINT_BLOCK_FORMAT_TYPE ||
    payload.version !== BLUEPRINT_BLOCK_FORMAT_VERSION ||
    !payload.block ||
    typeof payload.block !== 'object'
  ) {
    throw new Error('This block code uses an unsupported format.')
  }

  const block = normalizeBlueprintBlock(payload.block, 'imported-block')
  if (
    !areEqual(block.cells, payload.block.cells) ||
    !areEqual(block.mirrorCornTargets, payload.block.mirrorCornTargets) ||
    !areEqual(block.rootTunnelConnections, payload.block.rootTunnelConnections) ||
    !areEqual(block.leechingVines, payload.block.leechingVines)
  ) {
    throw new Error('The block contains an invalid Crop layout or tile link.')
  }
  return block
}

export function exportBlueprintBlockLibrary(rawBlocks) {
  const blocks = normalizeBlueprintBlocks(rawBlocks)
  return encodeBase64(JSON.stringify({
    type: BLUEPRINT_BLOCK_LIBRARY_FORMAT_TYPE,
    version: BLUEPRINT_BLOCK_FORMAT_VERSION,
    blocks,
  }))
}

export function importBlueprintBlockLibrary(blockCode) {
  let payload
  try {
    payload = JSON.parse(decodeBase64(blockCode))
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message === 'The block code is not valid Base64.'
        ? error.message
        : 'The block-library code is invalid or corrupted.',
      { cause: error },
    )
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.type !== BLUEPRINT_BLOCK_LIBRARY_FORMAT_TYPE ||
    payload.version !== BLUEPRINT_BLOCK_FORMAT_VERSION ||
    !Array.isArray(payload.blocks)
  ) {
    throw new Error('This block-library code uses an unsupported format.')
  }

  const blocks = normalizeBlueprintBlocks(payload.blocks)
  if (blocks.length !== payload.blocks.length) {
    throw new Error('The block library contains an invalid block.')
  }
  return blocks
}
