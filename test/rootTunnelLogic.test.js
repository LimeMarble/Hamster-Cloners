import assert from 'node:assert/strict'
import test from 'node:test'
import { createBlueprint } from '../src/game/blueprintLogic.js'
import { getAdjacentCropConnections } from '../src/game/adjacencyLogic.js'
import { getMirrorCornTargetCount } from '../src/game/cropEffects.js'
import {
  getRootTunnelConnectionState,
  normalizeRootTunnelConnections,
} from '../src/game/rootTunnelLogic.js'

function createExampleBlueprint(rootTunnelConnections = []) {
  return createBlueprint({
    rows: 6,
    columns: 6,
    cells: [
      'corn', 'turnip', null, null, null, null,
      'turnip', 'rootTunnel', 'turnip', 'corn', null, null,
      null, 'turnip', 'leek', 'turnip', 'corn', null,
      null, 'corn', 'turnip', 'appleTree', 'turnip', null,
      null, null, 'corn', 'turnip', 'rootTunnel', 'turnip',
      null, null, null, null, 'turnip', 'corn',
    ],
    mirrorCornTargets: [14, ...Array(34).fill(null), 21],
    rootTunnelConnections,
  })
}

test('each Root Tunnel carries two ordinary pairs plus free Mirror Corn routes', () => {
  const blueprint = createExampleBlueprint([
    { tunnelIndex: 7, senderIndex: 1, recipientIndex: 14 },
    { tunnelIndex: 7, senderIndex: 6, recipientIndex: 14 },
    { tunnelIndex: 7, senderIndex: 0, recipientIndex: 14 },
    { tunnelIndex: 7, senderIndex: 8, recipientIndex: 14 },
    { tunnelIndex: 28, senderIndex: 29, recipientIndex: 21 },
    { tunnelIndex: 28, senderIndex: 34, recipientIndex: 21 },
    { tunnelIndex: 28, senderIndex: 35, recipientIndex: 21 },
  ])
  const firstTunnel = getRootTunnelConnectionState(blueprint, 7)
  const secondTunnel = getRootTunnelConnectionState(blueprint, 28)

  assert.equal(firstTunnel.ordinaryPairCount, 2)
  assert.equal(firstTunnel.connections.length, 3)
  assert.equal(secondTunnel.ordinaryPairCount, 2)
  assert.equal(secondTunnel.connections.length, 3)
  assert.deepEqual(getAdjacentCropConnections(blueprint, 14), [
    { index: 0, adjacencyDistance: 1 },
    { index: 1, adjacencyDistance: 1 },
    { index: 6, adjacencyDistance: 1 },
    { index: 8, adjacencyDistance: 0 },
    { index: 13, adjacencyDistance: 0 },
    { index: 15, adjacencyDistance: 0 },
    { index: 20, adjacencyDistance: 0 },
  ])
})

test('a crop may only send once and may not participate through two tunnels', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      'turnip', 'rootTunnel', null,
      'rootTunnel', 'leek', null,
      'turnip', null, null,
    ],
  })
  const normalized = normalizeRootTunnelConnections(blueprint, [
    { tunnelIndex: 1, senderIndex: 0, recipientIndex: 4 },
    { tunnelIndex: 1, senderIndex: 0, recipientIndex: 2 },
    { tunnelIndex: 3, senderIndex: 6, recipientIndex: 4 },
  ])

  assert.deepEqual(normalized, [
    { tunnelIndex: 1, senderIndex: 0, recipientIndex: 4 },
  ])
})

test('Mirror Corn targets can persist through a configured Root Tunnel', () => {
  const blueprint = createExampleBlueprint([
    { tunnelIndex: 7, senderIndex: 0, recipientIndex: 14 },
    { tunnelIndex: 28, senderIndex: 35, recipientIndex: 21 },
  ])

  assert.equal(blueprint.mirrorCornTargets[0], 14)
  assert.equal(blueprint.mirrorCornTargets[35], 21)
  assert.equal(getMirrorCornTargetCount(blueprint, 14, ['mirrorCorn']), 1)
  assert.equal(getMirrorCornTargetCount(blueprint, 21, ['mirrorCorn']), 1)
})
