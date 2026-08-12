import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BLUEPRINT_FORMAT_VERSION,
  exportBlueprint,
  importBlueprint,
} from '../src/game/blueprintTransfer.js'
import { createBlueprint } from '../src/game/blueprintLogic.js'

function encodePayload(blueprint) {
  return btoa(
    JSON.stringify({
      type: 'hamster-cloners-blueprint',
      version: BLUEPRINT_FORMAT_VERSION,
      blueprint,
    }),
  )
}

test('exports and imports a blueprint with persistent Mirror Corn tile links', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'leek', 'sweetPotato', null],
    mirrorCornTargets: [3, null, null, null],
  })
  const blueprintCode = exportBlueprint(blueprint)
  const importedBlueprint = importBlueprint(blueprintCode, {
    rows: 2,
    columns: 2,
    unlockedCropIds: ['leek', 'corn', 'sweetPotato'],
    hasMirrorCorn: true,
  })

  assert.deepEqual(importedBlueprint, blueprint)
  assert.match(
    blueprintCode,
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
  )
})

test('rejects blueprint codes with a different grid size', () => {
  const blueprintCode = exportBlueprint(
    createBlueprint({ rows: 2, columns: 2, cells: ['leek'] }),
  )

  assert.throws(
    () =>
      importBlueprint(blueprintCode, {
        rows: 3,
        columns: 2,
        unlockedCropIds: ['leek'],
      }),
    /2×2.*3×2/,
  )
})

test('rejects locked crops and unavailable Mirror Corn links', () => {
  const lockedCropCode = exportBlueprint(
    createBlueprint({ rows: 1, columns: 2, cells: ['leek', 'lentil'] }),
  )
  const linkedBlueprintCode = exportBlueprint(
    createBlueprint({
      rows: 2,
      columns: 2,
      cells: ['corn', null, null, null],
      mirrorCornTargets: [3, null, null, null],
    }),
  )

  assert.throws(
    () =>
      importBlueprint(lockedCropCode, {
        rows: 1,
        columns: 2,
        unlockedCropIds: ['leek'],
      }),
    /crop you have not unlocked/,
  )
  assert.throws(
    () =>
      importBlueprint(linkedBlueprintCode, {
        rows: 2,
        columns: 2,
        unlockedCropIds: ['leek', 'corn'],
      }),
    /Unlock Mirror Corn/,
  )
})

test('rejects malformed crop layouts and tile links', () => {
  const malformedGourdCode = encodePayload({
    rows: 2,
    columns: 2,
    cells: ['leechingGourd', null, null, null],
    mirrorCornTargets: [null, null, null, null],
  })
  const invalidLinkCode = encodePayload({
    rows: 2,
    columns: 2,
    cells: ['corn', null, null, 'leek'],
    mirrorCornTargets: [1, null, null, null],
  })

  assert.throws(
    () =>
      importBlueprint(malformedGourdCode, {
        rows: 2,
        columns: 2,
        unlockedCropIds: ['leek', 'pumpkin'],
        hasLeechingGourd: true,
      }),
    /invalid crop layout/,
  )
  assert.throws(
    () =>
      importBlueprint(invalidLinkCode, {
        rows: 2,
        columns: 2,
        unlockedCropIds: ['leek', 'corn'],
        hasMirrorCorn: true,
      }),
    /invalid crop layout or tile link/,
  )
})

test('rejects invalid and unsupported blueprint codes', () => {
  assert.throws(() => importBlueprint('not a code', {}), /Base64/)
  assert.throws(
    () =>
      importBlueprint(
        btoa(JSON.stringify({ type: 'wrong', version: 1, blueprint: {} })),
        {},
      ),
    /unsupported format/,
  )
})
