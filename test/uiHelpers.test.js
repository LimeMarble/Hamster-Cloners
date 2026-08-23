import assert from 'node:assert/strict'
import test from 'node:test'
import { getBlueprintCropSummary } from '../src/tabs/uiHelpers.js'

test('blueprint crop summaries show each planted type once in crop order', () => {
  assert.deepEqual(
    getBlueprintCropSummary([
      'corn',
      'leek',
      'corn',
      null,
      'sweetPotato',
    ]),
    [
      { cropId: 'leek', count: 1 },
      { cropId: 'corn', count: 2 },
      { cropId: 'sweetPotato', count: 1 },
    ],
  )
})

test('blueprint crop summaries count a Leeching Gourd once', () => {
  assert.deepEqual(
    getBlueprintCropSummary([
      'leechingGourd',
      'leechingGourdPart',
      'leechingGourdPart',
      'leechingGourdPart',
    ]),
    [{ cropId: 'leechingGourd', count: 1 }],
  )
})

test('blueprint crop summaries count a 2x2 Splitweed once', () => {
  assert.deepEqual(
    getBlueprintCropSummary([
      'knotweed',
      'splitweedPart',
      'splitweedPart',
      'splitweedPart',
    ]),
    [{ cropId: 'knotweed', count: 1 }],
  )
})

test('blueprint crop summaries handle empty and unknown plots', () => {
  assert.deepEqual(getBlueprintCropSummary([null, null, 'unknownCrop']), [])
})
