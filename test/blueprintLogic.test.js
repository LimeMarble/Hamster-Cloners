import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearBlueprint,
  createBlueprint,
} from '../src/game/blueprintLogic.js'

test('clearing a blueprint preserves its size and removes crops and links', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 3,
    cells: ['corn', 'leek', null, null, 'turnip', null],
    mirrorCornTargets: [4, null, null, null, null, null],
    rootTunnelConnections: [],
  })

  assert.deepEqual(clearBlueprint(blueprint), {
    rows: 2,
    columns: 3,
    cells: Array(6).fill(null),
    mirrorCornTargets: Array(6).fill(null),
  })
})
