import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceGameSimulationStep,
  createBlueprint,
  createInitialGame,
  getBlueprintCropStats,
  getFloorsProducedPerSecond,
  getGlobalRowProductionMultiplier,
  getUnlockedBlueprintSlotCount,
  getSoybeanMachineryEffect,
  getSoybeanPatternCounts,
} from '../src/game/gameLogic.js'
import {
  CROP_IDS,
  SOYBEAN_UNLOCK_FLOOR_REPLICATOR_COUNT,
  getUnlockedCropIds,
  getVisibleCropIds,
  hasUnlockedSoybean,
} from '../src/game/crops.js'

function getUnlockedCrops({
  floorReplicators,
  hasClover = false,
  rowDuplicators = 500,
}) {
  return getUnlockedCropIds(
    createBlueprint({ rows: 1, columns: 2 }),
    true,
    125,
    true,
    true,
    true,
    true,
    false,
    true,
    rowDuplicators,
    true,
    hasClover,
    true,
    [],
    floorReplicators,
  )
}

test('Soybean appears after Clover, reveals with Carrot, and unlocks at 555 Floor Replicators', () => {
  const lockedCropIds = getUnlockedCrops({ floorReplicators: 554 })
  const unlockedCropIds = getUnlockedCrops({ floorReplicators: 555 })
  const visibleCropIds = getVisibleCropIds(
    unlockedCropIds,
    1000,
    true,
    true,
  )
  const beforeMisfortuneCarrotIsVisible = getVisibleCropIds(
    getUnlockedCrops({ floorReplicators: 555, rowDuplicators: 499 }),
    1000,
    true,
    false,
  )

  assert.equal(SOYBEAN_UNLOCK_FLOOR_REPLICATOR_COUNT, 555)
  assert.equal(CROP_IDS.indexOf('soybean') > CROP_IDS.indexOf('fourLeafClover'), true)
  assert.equal(lockedCropIds.includes('soybean'), false)
  assert.equal(unlockedCropIds.includes('fourLeafClover'), false)
  assert.equal(unlockedCropIds.includes('soybean'), true)
  assert.equal(beforeMisfortuneCarrotIsVisible.includes('carrot'), false)
  assert.equal(beforeMisfortuneCarrotIsVisible.includes('soybean'), false)
  assert.equal(visibleCropIds.includes('fourLeafClover'), true)
  assert.equal(visibleCropIds.includes('soybean'), true)
  assert.equal(
    visibleCropIds.indexOf('soybean') > visibleCropIds.indexOf('fourLeafClover'),
    true,
  )
})

test('unlocking Soybean in Misfortune grants the fourth blueprint slot', () => {
  const game = {
    ...createInitialGame(),
    activeArea: 'misfortune',
    hasUnlockedSunflower: true,
    rowDuplicators: 500,
    floorReplicators: 555,
    trade: {
      ...createInitialGame().trade,
      rabbitUnlocks: ['carrot'],
    },
  }

  assert.equal(hasUnlockedSoybean(game), true)
  assert.equal(getUnlockedBlueprintSlotCount(game), 4)
  assert.equal(
    advanceGameSimulationStep(game, 1 / 60, { random: () => 1 })
      .blueprintSlots.length,
    4,
  )
  assert.equal(
    getUnlockedBlueprintSlotCount({ ...game, floorReplicators: 554 }),
    3,
  )
})

test('Soybean counts every horizontal connection and complete 2x2 square once', () => {
  const blueprint = createBlueprint({
    rows: 4,
    columns: 4,
    cells: [
      'soybean', 'soybean', null, null,
      'soybean', 'soybean', null, null,
      null, null, null, null,
      null, null, null, null,
    ],
  })

  assert.deepEqual(getSoybeanPatternCounts(blueprint), {
    horizontalConnectionCount: 2,
    squareCount: 1,
  })
  assert.deepEqual(getSoybeanPatternCounts(
    createBlueprint({
      rows: 8,
      columns: 8,
      cells: Array(64).fill('soybean'),
    }),
  ), {
    horizontalConnectionCount: 56,
    squareCount: 49,
  })
})

test('Soybean patterns add 444 percent apiece to Row and Floor production', () => {
  const blueprint = createBlueprint({
    rows: 4,
    columns: 4,
    cells: [
      'soybean', 'soybean', null, null,
      'soybean', 'soybean', null, null,
      null, null, null, null,
      null, null, null, null,
    ],
  })
  const effect = getSoybeanMachineryEffect(blueprint)
  const stats = getBlueprintCropStats(blueprint, 0)

  assert.equal(effect.bonusPerPattern, 4.44)
  assert.equal(effect.rowProductionBonus, 8.88)
  assert.equal(effect.rowProductionMultiplier, 9.88)
  assert.equal(effect.floorProductionBonus, 4.44)
  assert.equal(effect.floorProductionMultiplier, 5.44)
  assert.equal(getGlobalRowProductionMultiplier(blueprint), 9.88)
  assert.ok(
    Math.abs(getFloorsProducedPerSecond(10, 1, 5.44) - 10.88) < 1e-12,
  )

  const initialGame = createInitialGame()
  const simulatedGame = advanceGameSimulationStep({
    ...initialGame,
    blueprint,
    blueprintSlots: [blueprint],
    hasUnlockedFloorReplicators: true,
    floorReplicators: 10,
  }, 1, { random: () => 1 })
  assert.ok(
    Math.abs(
      simulatedGame.farmland.floors - initialGame.farmland.floors - 10.88,
    ) < 1e-12,
  )

  assert.deepEqual(
    stats.passiveStats.filter((stat) => stat.id.startsWith('soybean-')),
    [
      {
        id: 'soybean-row-production',
        label: 'Row production (2 horizontal connections)',
        format: 'percentage',
        value: 8.88,
      },
      {
        id: 'soybean-floor-production',
        label: 'Floor production (1 complete square)',
        format: 'percentage',
        value: 4.44,
      },
    ],
  )
  assert.equal(
    stats.receivedEffects.some(
      (receivedEffect) => receivedEffect.type === 'global-floor-production',
    ),
    true,
  )
})
