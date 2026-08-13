import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BLUEPRINT_EXPANSION_TRACKS,
  createBlueprint,
  createFarmlandMultipliers,
  createInitialGame,
  getAdjacentCropConnections,
  getCropProductionPerSecond,
  getCropHamsterEfficiencyMultiplier,
  getBlueprintExpansionCost,
  getBlueprintSlots,
  getBlueprintCropStats,
  getDiagonalTileIndexes,
  getEffectiveFarmlandMultipliers,
  canUnlockCropPerfection,
  getHamsterStateAfterHire,
  getHamsterCoordinationMultiplier,
  getHamsterExternalMultiplier,
  getMaxDuplicatorPurchase,
  getMaxHamsterPurchase,
  getNextHamsterCost,
  getNextRowDuplicatorCost,
  getColumnsProducedPerSecond,
  getColumnsProducedForTick,
  getFieldsPlanted,
  grantNextBlueprintExpansion,
  getLeechingGourdFootprint,
  getLeechingGourdTurnipEffect,
  getProductionForTick,
  getRowDuplicatorEffectivenessMultiplier,
  getRowsProducedForTick,
  getRowsProducedPerSecond,
  getRowDuplicatorCoordinationMultiplier,
  getUnlockedBlueprintSlotCount,
  HAMSTER_BASE_COST,
  HAMSTER_COST_GROWTH,
  POST_UNION_HAMSTER_EFFICIENCY_GROWTH,
  canUnlockRowDuplicators,
  resetForBlueprintExpansion,
  revokeLastBlueprintExpansion,
  resetForRowDuplicators,
  ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  ROW_DUPLICATOR_BASE_COST,
  ROW_DUPLICATOR_COST_GROWTH,
  ROWS_PER_ROW_DUPLICATOR_PER_SECOND,
  ROW_DUPLICATOR_COORDINATION_GROWTH,
  ROOT_TUNNEL_ADJACENCY_DECAY,
  SIMULATION_TICK_INTERVAL_MS,
  unlockCropPerfection,
  VISUAL_UPDATE_INTERVAL_MS,
} from '../src/game/gameLogic.js'
import {
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  getCropName,
  getUnlockedCropIds,
  getVisibleCropIds,
  LENTIL_UNLOCK_CROP_COUNT,
  KNOTWEED_UNLOCK_CROP_COUNT,
  ROOT_TUNNEL_UNLOCK_CROP_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
} from '../src/game/crops.js'
import {
  getMonocropThreshold,
  getMonocropYieldMultiplier,
} from '../src/game/monocropPenalty.js'

test('hamster costs increase additively by one before unionization', () => {
  assert.equal(getNextHamsterCost(0), HAMSTER_BASE_COST)
  assert.equal(getNextHamsterCost(1), HAMSTER_BASE_COST + 1)
  assert.equal(getNextHamsterCost(999), HAMSTER_BASE_COST + 999)
})

test('hamster costs grow by 1.1 after unionization', () => {
  assert.equal(
    getNextHamsterCost(1, true),
    Math.ceil(HAMSTER_BASE_COST * HAMSTER_COST_GROWTH),
  )
  assert.ok(getNextHamsterCost(101, true) > getNextHamsterCost(100, true))
})

test('hamsters build 0.1 hidden Columns of farmland per second each', () => {
  assert.equal(getColumnsProducedPerSecond(0), 0)
  assert.equal(getColumnsProducedPerSecond(1), 0.1)
  assert.equal(getColumnsProducedPerSecond(8), 0.8)
})

test('simulation advances at 60 ticks per second while visuals stay at 10', () => {
  const blueprint = createBlueprint({ cells: ['leek'] })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.equal(SIMULATION_TICK_INTERVAL_MS, 1000 / 60)
  assert.equal(VISUAL_UPDATE_INTERVAL_MS, 100)
  assert.ok(
    Math.abs(
      getProductionForTick(blueprint, farmland) * 60 -
        getCropProductionPerSecond(blueprint, farmland),
    ) < 1e-12,
  )
  assert.ok(
    Math.abs(
      getColumnsProducedForTick(8) * 60 - getColumnsProducedPerSecond(8),
    ) < 1e-12,
  )
})

test('unionized hamsters have no bonus until a post-union hire is made', () => {
  assert.equal(getColumnsProducedPerSecond(100, 0), 10)
})

test('a post-union hire enables exponential 1.03-per-hamster efficiency', () => {
  const expectedRate = 10.1 * POST_UNION_HAMSTER_EFFICIENCY_GROWTH ** 101
  const actualRate = getColumnsProducedPerSecond(101, 1)

  assert.ok(Math.abs(actualRate - expectedRate) < 1e-12)
})

test('field efficiency, hamster coordination, and external multipliers are separate', () => {
  const coordinationMultiplier = getHamsterCoordinationMultiplier(101, 1)
  const expectedCoordinationMultiplier =
    POST_UNION_HAMSTER_EFFICIENCY_GROWTH ** 101

  assert.equal(getHamsterCoordinationMultiplier(101, 0), 1)
  assert.equal(coordinationMultiplier, expectedCoordinationMultiplier)
  assert.equal(getHamsterExternalMultiplier(), 1)
  assert.ok(
    Math.abs(
      getColumnsProducedPerSecond(101, 1, 0.5) -
        10.1 * coordinationMultiplier * 0.5,
    ) < 1e-12,
  )
})

test('testing multipliers apply to Crop production and Hamster external efficiency', () => {
  const blueprint = createBlueprint({ cells: ['leek'] })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.equal(
    getCropProductionPerSecond(blueprint, farmland, [], 10),
    10,
  )
  assert.equal(getHamsterExternalMultiplier(10), 10)
  assert.equal(getColumnsProducedPerSecond(1, 0, 1, 10), 1)
})

test('the 1,000th hamster triggers unionization and leaves 100 active', () => {
  assert.deepEqual(
    getHamsterStateAfterHire({
      hamsters: 999,
      totalHamstersHired: 999,
    }),
    {
      hamsters: 100,
      totalHamstersHired: 1000,
      unionized: true,
      postUnionHamstersHired: 0,
    },
  )
})

test('a post-union hire records eligibility for the exponential efficiency bonus', () => {
  assert.deepEqual(
    getHamsterStateAfterHire({
      hamsters: 100,
      totalHamstersHired: 1000,
      unionized: true,
    }),
    {
      hamsters: 101,
      totalHamstersHired: 1001,
      unionized: true,
      postUnionHamstersHired: 1,
    },
  )
})

test('hire max stops at 999 hamsters before unionization', () => {
  const result = getMaxHamsterPurchase({
    crops: 10000,
    hamsters: 990,
    totalHamstersHired: 990,
    unionized: false,
  })

  assert.equal(result.purchased, 9)
  assert.equal(result.hamsters, 999)
  assert.equal(result.totalHamstersHired, 999)
  assert.equal(result.unionized, false)
})

test('income is zero until the first farmland Columns have been made', () => {
  const blueprint = createBlueprint({ rows: 2, columns: 2, cells: ['leek', 'leek'] })

  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ columns: 0 }),
    ),
    0,
  )
})

test('income multiplies the base field income by rows, columns, floors, farms, and other multipliers', () => {
  const blueprint = createBlueprint({ rows: 2, columns: 2, cells: ['leek', 'leek'] })
  const farmland = createFarmlandMultipliers({
    rows: 2,
    columns: 3,
    floors: 2,
    farms: 4,
    otherMultiplier: 1.5,
  })

  assert.equal(getCropProductionPerSecond(blueprint, farmland), 144)
})

test('Fields Planted is Rows times Columns times Floors times Farms', () => {
  assert.equal(
    getFieldsPlanted(
      createFarmlandMultipliers({ rows: 2, columns: 3, floors: 4, farms: 5 }),
    ),
    120,
  )
})

test('fractional farmland dimensions do not count until they reach a whole unit', () => {
  const blueprint = createBlueprint({ cells: ['leek'] })
  const fractionalFarmland = createFarmlandMultipliers({
    rows: 12.4,
    columns: 182.8,
    floors: 1.9,
    farms: 2.2,
  })
  const effectiveFarmland = getEffectiveFarmlandMultipliers(
    fractionalFarmland,
  )

  assert.deepEqual(effectiveFarmland, {
    rows: 12,
    columns: 182,
    floors: 1,
    farms: 2,
    otherMultiplier: 1,
  })
  assert.equal(getFieldsPlanted(fractionalFarmland), 4368)
  assert.equal(
    getCropProductionPerSecond(blueprint, fractionalFarmland),
    getCropProductionPerSecond(blueprint, effectiveFarmland),
  )
})

test('empty plots do not produce crops', () => {
  const blueprint = createBlueprint({ rows: 2, columns: 2 })

  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 5 }),
    ),
    0,
  )
})

test('corn provides two Crops per slot and applies a 10 percent Hamster Efficiency penalty', () => {
  const blueprint = createBlueprint({ rows: 2, columns: 2, cells: ['corn'] })

  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1 }),
    ),
    2,
  )
  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 0.9)
})

test('crop Hamster Efficiency bonuses stack additively before other multipliers', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'sweetPotato'],
  })

  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 1.15)
})

test('Turnips double adjacent crop bonuses without increasing crop yield', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['sweetPotato', 'turnip'],
  })

  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 1.5)
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1 }),
    ),
    1.5,
  )
})

test('Enriching Leek changes its name and enriches adjacent crop yield', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'corn'],
  })

  assert.equal(getCropName('leek', ['enrichingLeek']), 'Enriching Leek')
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1 }),
      ['enrichingLeek'],
    ),
    8,
  )
})

test('Mirror Corn changes Corn to five yield and −50% Hamster Efficiency', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'leek', 'sweetPotato', 'appleTree'],
    mirrorCornTargets: [3],
  })

  assert.equal(getCropName('corn', ['mirrorCorn']), 'Mirror Corn')
  assert.equal(CROP_PERFECTIONS.mirrorCorn.diagonalTargetEffectMultiplier, 4)
  assert.deepEqual(getDiagonalTileIndexes(blueprint, 0), [3])
  assert.equal(
    getCropHamsterEfficiencyMultiplier(blueprint, ['mirrorCorn']),
    0.75,
  )
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
      ['mirrorCorn', 'enrichingLeek'],
    ),
    56,
  )
})

test('Mirror Corn quadruples selected diagonal crop effects', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'appleTree', null, 'leek'],
    mirrorCornTargets: [3],
  })

  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
      ['mirrorCorn', 'enrichingLeek'],
    ),
    46,
  )
})

test('Mirror Corn limits each target tile to two reflections', () => {
  const overlinkedBlueprint = {
    rows: 3,
    columns: 3,
    cells: ['corn', null, 'corn', null, 'leek', null, 'corn', null, null],
    mirrorCornTargets: [4, null, 4, null, null, null, 4, null, null],
  }
  const normalizedBlueprint = createBlueprint(overlinkedBlueprint)

  assert.equal(CROP_PERFECTIONS.mirrorCorn.maximumReflectionsPerTile, 2)
  assert.match(
    CROP_PERFECTIONS.mirrorCorn.effectDescription,
    /burn any crop to a crisp/,
  )
  assert.deepEqual(normalizedBlueprint.mirrorCornTargets, [
    4,
    null,
    4,
    null,
    null,
    null,
    null,
    null,
    null,
  ])
  assert.deepEqual(
    getBlueprintCropStats(overlinkedBlueprint, 4, ['mirrorCorn'])
      .receivedEffects,
    [{ type: 'mirror-corn', count: 2, multiplier: 16 }],
  )
})

test('Mirror Corn targets tiles but gives Lentil no effect', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'leek', null, 'lentil'],
    mirrorCornTargets: [3],
  })
  const unlinkedBlueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'leek', null, 'lentil'],
  })

  assert.deepEqual(getDiagonalTileIndexes(blueprint, 0), [3])
  assert.deepEqual(blueprint.mirrorCornTargets, [3, null, null, null])
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
      ['mirrorCorn'],
    ),
    getCropProductionPerSecond(
      unlinkedBlueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
      ['mirrorCorn'],
    ),
  )
})

test('Mirror Corn tile targets persist through empty and replacement crops', () => {
  const emptyTargetBlueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', null, null, null],
    mirrorCornTargets: [3],
  })
  const replacementBlueprint = createBlueprint({
    ...emptyTargetBlueprint,
    cells: ['corn', null, null, 'sweetPotato'],
  })

  assert.deepEqual(emptyTargetBlueprint.mirrorCornTargets, [3, null, null, null])
  assert.deepEqual(replacementBlueprint.mirrorCornTargets, [3, null, null, null])
  assert.equal(
    getCropHamsterEfficiencyMultiplier(replacementBlueprint, ['mirrorCorn']),
    1.5,
  )
})

test('Root Tunnels track distance, decay effects, and carry Turnips', () => {
  const transferBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['leek', 'rootTunnel', 'corn'],
  })
  const turnipBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['turnip', 'rootTunnel', 'sweetPotato'],
  })
  const pumpkinBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['pumpkin', 'rootTunnel', 'sweetPotato'],
  })
  const turnipTargetBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['leek', 'rootTunnel', 'turnip'],
  })
  const mirrorBlueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'leek', null, 'rootTunnel'],
    mirrorCornTargets: [3],
  })

  assert.equal(ROOT_TUNNEL_ADJACENCY_DECAY, 0.8)
  assert.deepEqual(getAdjacentCropConnections(transferBlueprint, 2), [
    { index: 0, adjacencyDistance: 1 },
  ])
  assert.equal(
    getCropProductionPerSecond(
      transferBlueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
      ['enrichingLeek'],
    ),
    7,
  )
  assert.ok(
    Math.abs(getCropHamsterEfficiencyMultiplier(turnipBlueprint) - 1.4) <
      1e-12,
  )
  assert.equal(getCropHamsterEfficiencyMultiplier(pumpkinBlueprint), 1.25)
  assert.deepEqual(getAdjacentCropConnections(turnipTargetBlueprint, 2), [
    { index: 0, adjacencyDistance: 1 },
  ])
  assert.deepEqual(
    getBlueprintCropStats(turnipTargetBlueprint, 2, ['enrichingLeek']),
    {
      crop: 'turnip',
      baseYield: 0.5,
      harvestYield: 6.9,
      hamsterEfficiencyBonus: 0,
      harvestDestroyedByAppleTree: false,
      externalCropBuffMultiplier: null,
      receivedEffects: [
        {
          type: 'crop-yield',
          sourceCropId: 'leek',
          count: 1,
          bonus: 6.4,
          adjacencyDistances: [1],
        },
      ],
    },
  )
  assert.deepEqual(
    getBlueprintCropStats(turnipBlueprint, 2).receivedEffects,
    [
      {
        type: 'crop-effect-modifier',
        sourceCropId: 'turnip',
        count: 1,
        multiplier: 1.6,
        adjacencyDistances: [1],
      },
    ],
  )
  assert.deepEqual(mirrorBlueprint.mirrorCornTargets, [3, null, null, null])
})

test('Root Tunnel effects decay by 0.8 for every tunnel tile crossed', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 4,
    cells: ['leek', 'rootTunnel', 'rootTunnel', 'corn'],
  })

  assert.deepEqual(getAdjacentCropConnections(blueprint, 3), [
    { index: 0, adjacencyDistance: 2 },
  ])
  assert.ok(
    Math.abs(
      getCropProductionPerSecond(
        blueprint,
        createFarmlandMultipliers({ rows: 1, columns: 1 }),
        ['enrichingLeek'],
      ) - 6.2,
    ) < 1e-12,
  )
})

test('Turnip becomes a tunnel debuff after adjacency distance 3', () => {
  const distanceThreeBlueprint = createBlueprint({
    rows: 1,
    columns: 5,
    cells: [
      'turnip',
      'rootTunnel',
      'rootTunnel',
      'rootTunnel',
      'sweetPotato',
    ],
  })
  const distanceFourBlueprint = createBlueprint({
    rows: 1,
    columns: 6,
    cells: [
      'turnip',
      'rootTunnel',
      'rootTunnel',
      'rootTunnel',
      'rootTunnel',
      'sweetPotato',
    ],
  })
  const distanceThreeEffect = getBlueprintCropStats(
    distanceThreeBlueprint,
    4,
  ).receivedEffects[0]
  const distanceFourEffect = getBlueprintCropStats(
    distanceFourBlueprint,
    5,
  ).receivedEffects[0]

  assert.ok(
    Math.abs(
      distanceThreeEffect.multiplier -
        2 * ROOT_TUNNEL_ADJACENCY_DECAY ** 3,
    ) < 1e-12,
  )
  assert.ok(distanceThreeEffect.multiplier > 1)
  assert.deepEqual(distanceThreeEffect.adjacencyDistances, [3])
  assert.ok(
    Math.abs(
      distanceFourEffect.multiplier -
        2 * ROOT_TUNNEL_ADJACENCY_DECAY ** 4,
    ) < 1e-12,
  )
  assert.ok(distanceFourEffect.multiplier < 1)
  assert.deepEqual(distanceFourEffect.adjacencyDistances, [4])
})
test('Root Tunnel distance attenuates Apple Tree harvest destruction', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['leek', 'rootTunnel', 'appleTree'],
  })
  const leekStats = getBlueprintCropStats(blueprint, 0, ['enrichingLeek'])

  assert.equal(leekStats.harvestDestroyedByAppleTree, false)
  assert.ok(Math.abs(leekStats.harvestYield - 0.2) < 1e-12)
  assert.deepEqual(leekStats.receivedEffects, [
    {
      type: 'harvest-destruction',
      multiplier: 1 - ROOT_TUNNEL_ADJACENCY_DECAY,
      adjacencyDistances: [1],
    },
  ])
})
test('Mirror Corn passive boosts multiply with adjacent crop-effect modifiers', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'turnip', null, 'sweetPotato'],
    mirrorCornTargets: [3],
  })

  // Potato's +25% is doubled by the Turnip and quadrupled by Mirror Corn.
  // Mirror Corn itself retains its -50% Hamster Efficiency contribution.
  assert.equal(
    getCropHamsterEfficiencyMultiplier(blueprint, ['mirrorCorn']),
    2.5,
  )
})

test('blueprint crop stats expose a crop’s received effects', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'turnip', null, 'sweetPotato'],
    mirrorCornTargets: [3],
  })

  assert.deepEqual(
    getBlueprintCropStats(blueprint, 3, ['mirrorCorn']),
    {
      crop: 'sweetPotato',
      baseYield: 1,
      harvestYield: 1,
      hamsterEfficiencyBonus: 2,
      harvestDestroyedByAppleTree: false,
      externalCropBuffMultiplier: null,
      receivedEffects: [
        {
          type: 'crop-effect-modifier',
          sourceCropId: 'turnip',
          count: 1,
          multiplier: 2,
        },
        {
          type: 'mirror-corn',
          count: 1,
          multiplier: 4,
        },
      ],
    },
  )
})

test('blueprint crop stats combine Turnip and Pumpkin effect stacks', () => {
  const blueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      null,
      'pumpkin',
      null,
      'turnip',
      'sweetPotato',
      'turnip',
      null,
      'pumpkin',
      null,
    ],
  })

  const modifierEffects = getBlueprintCropStats(blueprint, 4).receivedEffects
    .filter((effect) => effect.type === 'crop-effect-modifier')

  assert.deepEqual(modifierEffects, [
    { type: 'crop-effect-modifier', sourceCropId: 'pumpkin', count: 2, multiplier: 0.25 },
    { type: 'crop-effect-modifier', sourceCropId: 'turnip', count: 2, multiplier: 4 },
  ])
})

test('Mirror Corn costs 20T Crops to unlock', () => {
  const game = {
    crops: CROP_PERFECTIONS.mirrorCorn.cost,
    hasUnlockedCropPerfection: true,
    completedCropPerfections: [],
  }

  assert.equal(canUnlockCropPerfection(game, 'mirrorCorn'), true)
  assert.deepEqual(unlockCropPerfection(game, 'mirrorCorn'), {
    ...game,
    crops: 0,
    completedCropPerfections: ['mirrorCorn'],
  })
})

test('Apple Trees erase adjacent harvests but leave their crop effects active', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['appleTree', 'sweetPotato'],
  })

  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 1.25)
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
    ),
    10,
  )
})

test('Apple Trees receive ×1.8 external Crop yield buffs', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'appleTree'],
  })

  assert.equal(CROP_DEFINITIONS.appleTree.externalCropBuffMultiplier, 1.8)
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
      ['enrichingLeek'],
    ),
    19,
  )
})

test('Turnips and Pumpkins modify Apple Tree external Crop buffs', () => {
  const turnipBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['leek', 'appleTree', 'turnip'],
  })
  const pumpkinBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['leek', 'appleTree', 'pumpkin'],
  })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.equal(
    getCropProductionPerSecond(turnipBlueprint, farmland, ['enrichingLeek']),
    28,
  )
  assert.equal(
    getCropProductionPerSecond(pumpkinBlueprint, farmland, ['enrichingLeek']),
    14.5,
  )
})

test('Apple Trees apply their receiver bonus to each external passive effect', () => {
  const baseBlueprint = {
    rows: 3,
    columns: 3,
    cells: [
      'corn',
      'turnip',
      'corn',
      'turnip',
      'appleTree',
      'turnip',
      null,
      'leek',
      null,
    ],
  }
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.equal(
    getCropProductionPerSecond(
      createBlueprint(baseBlueprint),
      farmland,
      ['mirrorCorn', 'enrichingLeek'],
    ),
    253.28000000000003,
  )
  assert.equal(
    getCropProductionPerSecond(
      createBlueprint({ ...baseBlueprint, mirrorCornTargets: [4, null, 4] }),
      farmland,
      ['mirrorCorn', 'enrichingLeek'],
    ),
    12113.235200000003,
  )
  assert.equal(
    getBlueprintCropStats(
      createBlueprint({ ...baseBlueprint, mirrorCornTargets: [4, null, 4] }),
      4,
      ['mirrorCorn', 'enrichingLeek'],
    ).externalCropBuffMultiplier,
    2418.6470400000007,
  )
})

test('Apple Tree unlocks after reaching 1 Qd Crops', () => {
  assert.equal(APPLE_TREE_UNLOCK_CROP_COUNT, 1e15)
  assert.deepEqual(
    getUnlockedCropIds(createBlueprint(), false, 0, false, true),
    ['leek', 'appleTree'],
  )
})

test('ordinary yield bonuses affect and are affected by crop-effect modifiers', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['turnip', 'leek', 'corn'],
  })

  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1 }),
      ['enrichingLeek'],
    ),
    23.5,
  )
})

test('Enriching Leek costs 20 billion Crops to unlock', () => {
  const game = {
    crops: CROP_PERFECTIONS.enrichingLeek.cost,
    hasUnlockedCropPerfection: true,
    completedCropPerfections: [],
  }

  assert.equal(canUnlockCropPerfection(game, 'enrichingLeek'), true)
  assert.deepEqual(unlockCropPerfection(game, 'enrichingLeek'), {
    ...game,
    crops: 0,
    completedCropPerfections: ['enrichingLeek'],
  })
})

test('Pumpkins yield five Crops and halve adjacent crop buffs', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['sweetPotato', 'pumpkin'],
  })

  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 1.125)
  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1 }),
    ),
    6,
  )
})

test('Leeching Gourd uses a single valid 2×2 footprint', () => {
  const validGourd = createBlueprint({
    rows: 2,
    columns: 2,
    cells: [
      'leechingGourd',
      'leechingGourdPart',
      'leechingGourdPart',
      'leechingGourdPart',
    ],
  })
  const malformedGourd = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['leechingGourd', 'leechingGourdPart'],
  })

  assert.deepEqual(getLeechingGourdFootprint(validGourd, 0), [0, 1, 2, 3])
  assert.deepEqual(getLeechingGourdFootprint(validGourd, 1), [])
  assert.deepEqual(validGourd.cells, [
    'leechingGourd',
    'leechingGourdPart',
    'leechingGourdPart',
    'leechingGourdPart',
  ])
  assert.deepEqual(malformedGourd.cells, [null, null, null, null])
})

test('Leeching Gourd boosts all Turnips from adjacent debuffs, with harmful crops doubled', () => {
  const blueprint = createBlueprint({
    rows: 4,
    columns: 4,
    cells: [
      null,
      'corn',
      null,
      null,
      'knotweed',
      'leechingGourd',
      'leechingGourdPart',
      null,
      null,
      'leechingGourdPart',
      'leechingGourdPart',
      null,
      'turnip',
      'sweetPotato',
      null,
      null,
    ],
  })

  // Corn contributes one +5% stack and harmful Knotweed contributes two,
  // raising Turnip's ×2 effect to ×2.3 on the adjacent Potato. Corn's own
  // −10% Hamster Efficiency effect remains additive alongside that bonus.
  assert.ok(
    Math.abs(getCropHamsterEfficiencyMultiplier(blueprint) - 1.475) < 1e-12,
  )
  assert.deepEqual(
    getBlueprintCropStats(blueprint, 12).receivedEffects,
    [{ type: 'leeching-gourd', count: 3, multiplier: 1.15 }],
  )
})

test('Leeching Gourd debuff contributions decay through Root Tunnels', () => {
  const blueprint = createBlueprint({
    rows: 5,
    columns: 5,
    cells: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'corn',
      null,
      null,
      'knotweed',
      'rootTunnel',
      'leechingGourd',
      'leechingGourdPart',
      null,
      null,
      null,
      'leechingGourdPart',
      'leechingGourdPart',
      null,
      'turnip',
      'sweetPotato',
      null,
      null,
      null,
    ],
  })
  const gourdEffect = getLeechingGourdTurnipEffect(blueprint)

  assert.deepEqual(gourdEffect.adjacencyEffects, [
    {
      index: 7,
      crop: 'corn',
      adjacencyDistance: 0,
      strength: 1,
      contribution: 1,
    },
    {
      index: 10,
      crop: 'knotweed',
      adjacencyDistance: 1,
      strength: ROOT_TUNNEL_ADJACENCY_DECAY,
      contribution: 2 * ROOT_TUNNEL_ADJACENCY_DECAY,
    },
  ])
  assert.ok(Math.abs(gourdEffect.debuffContribution - 2.6) < 1e-12)
  assert.ok(Math.abs(gourdEffect.multiplier - 1.13) < 1e-12)
  assert.deepEqual(getBlueprintCropStats(blueprint, 20).receivedEffects, [
    {
      type: 'leeching-gourd',
      count: gourdEffect.debuffContribution,
      multiplier: gourdEffect.multiplier,
      adjacencyDistances: [1],
    },
  ])
  assert.ok(
    Math.abs(getCropHamsterEfficiencyMultiplier(blueprint) - 1.465) < 1e-12,
  )
})
test('Leeching Gourd costs 2 Qn Crops and receives no Mirror Corn effect', () => {
  const game = {
    crops: CROP_PERFECTIONS.leechingGourd.cost,
    hasUnlockedCropPerfection: true,
    completedCropPerfections: [],
  }
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', null, null, 'leechingGourd'],
    mirrorCornTargets: [3],
  })

  assert.equal(CROP_PERFECTIONS.leechingGourd.cost, 2e18)
  assert.equal(canUnlockCropPerfection(game, 'leechingGourd'), true)
  assert.deepEqual(unlockCropPerfection(game, 'leechingGourd'), {
    ...game,
    crops: 0,
    completedCropPerfections: ['leechingGourd'],
  })
  assert.deepEqual(blueprint.mirrorCornTargets, [3, null, null, null])
})

test('Knotweed provides no harvest and subtracts 10 harvest from adjacent crops', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['knotweed', 'leek'],
  })

  assert.equal(
    getCropProductionPerSecond(
      blueprint,
      createFarmlandMultipliers({ rows: 1, columns: 1 }),
    ),
    -9,
  )
})

test('Lentils multiply all harvests and ignore adjacent Turnips', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['turnip', 'lentil', 'leek'],
  })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.ok(
    Math.abs(getCropProductionPerSecond(blueprint, farmland) - 33.125) < 1e-12,
  )
  assert.ok(
    Math.abs(getBlueprintCropStats(blueprint, 2).harvestYield - 1.25) < 1e-12,
  )
  const lentilStats = getBlueprintCropStats(blueprint, 1)
  assert.deepEqual(
    lentilStats.receivedEffects.length,
    1,
  )
  assert.equal(lentilStats.receivedEffects[0].type, 'global-harvest')
  assert.equal(lentilStats.receivedEffects[0].sourceCropId, 'lentil')
  assert.equal(lentilStats.receivedEffects[0].count, 1)
  assert.ok(Math.abs(lentilStats.receivedEffects[0].multiplier - 1.25) < 1e-12)
})

test('Lentil harvest bonuses stack additively in one received-effect entry', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 5,
    cells: ['lentil', 'leek', 'lentil'],
  })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.equal(getCropProductionPerSecond(blueprint, farmland), 76.5)
  assert.deepEqual(getBlueprintCropStats(blueprint, 1).receivedEffects, [
    { type: 'global-harvest', sourceCropId: 'lentil', count: 2, multiplier: 1.5 },
  ])
})

test('Enriching Leek harvest bonuses stack in one received-effect entry', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['leek', 'corn', 'leek'],
  })

  assert.deepEqual(getBlueprintCropStats(blueprint, 1, ['enrichingLeek']).receivedEffects, [
    { type: 'crop-yield', sourceCropId: 'leek', count: 2, bonus: 10 },
  ])
})

test('adjacency modifier crops stack on buffs without modifying each other', () => {
  const blueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['turnip', 'sweetPotato', 'pumpkin'],
  })

  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint), 1.25)
})

test('monocrop penalties weaken crop buffs and strengthen crop debuffs', () => {
  const sweetPotatoMonocrop = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['sweetPotato', 'sweetPotato', 'sweetPotato'],
  })
  const cornMonocrop = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'corn', 'corn'],
  })

  assert.equal(getCropHamsterEfficiencyMultiplier(sweetPotatoMonocrop), 1.375)
  assert.ok(
    Math.abs(getCropHamsterEfficiencyMultiplier(cornMonocrop) - 0.4) < 1e-12,
  )
})

test('crop unlocks follow the Corn, Pumpkin, Sweet Potato, Turnip progression', () => {
  const expandedBlueprint = createBlueprint({ rows: 1, columns: 2 })

  assert.deepEqual(getUnlockedCropIds(expandedBlueprint, false), ['leek', 'corn'])
  assert.deepEqual(getUnlockedCropIds(expandedBlueprint, true, 124), [
    'leek',
    'corn',
    'pumpkin',
  ])
  assert.deepEqual(getUnlockedCropIds(expandedBlueprint, true, 125), [
    'leek',
    'corn',
    'pumpkin',
    'sweetPotato',
  ])
  assert.equal(TURNIP_UNLOCK_CROP_COUNT, 1e8)
  assert.deepEqual(getUnlockedCropIds(expandedBlueprint, true, 125, true), [
    'leek',
    'corn',
    'pumpkin',
    'sweetPotato',
    'turnip',
  ])
  assert.equal(LENTIL_UNLOCK_CROP_COUNT, 8e15)
  assert.equal(KNOTWEED_UNLOCK_CROP_COUNT, 2e18)
  assert.equal(ROOT_TUNNEL_UNLOCK_CROP_COUNT, 216e18)
  assert.deepEqual(
    getUnlockedCropIds(expandedBlueprint, true, 125, true, true, true),
    ['leek', 'corn', 'pumpkin', 'sweetPotato', 'turnip', 'appleTree', 'lentil'],
  )
  assert.deepEqual(
    getUnlockedCropIds(
      expandedBlueprint,
      true,
      125,
      true,
      true,
      true,
      true,
      true,
      true,
    ),
    [
      'leek',
      'corn',
      'pumpkin',
      'sweetPotato',
      'turnip',
      'appleTree',
      'lentil',
      'knotweed',
      'rootTunnel',
      'sunflower',
    ],
  )
  assert.equal(getCropName('sweetPotato'), 'Potato')
})

test('Row Duplicators reset the field before becoming the only Row source', () => {
  const game = {
    crops: ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
    hasUnlockedRowDuplicators: false,
    farmland: createFarmlandMultipliers({ rows: 7, columns: 12 }),
  }

  assert.equal(canUnlockRowDuplicators(game), true)
  assert.deepEqual(resetForRowDuplicators(game), {
    ...game,
    crops: 0,
    hasUnlockedRowDuplicators: true,
    farmland: createFarmlandMultipliers({ rows: 1, columns: 0 }),
  })
})

test('Row Duplicators are purchasable upgrades with 1.2 cost growth and no direct income boost', () => {
  const blueprint = createBlueprint({ cells: ['leek'] })
  const farmland = createFarmlandMultipliers({ rows: 1, columns: 1 })

  assert.equal(ROW_DUPLICATOR_BASE_COST, 1e12)
  assert.equal(ROW_DUPLICATOR_COST_GROWTH, 1.2)
  assert.equal(getNextRowDuplicatorCost(0), 1e12)
  assert.equal(getNextRowDuplicatorCost(1), Math.ceil(1e12 * 1.2))
  assert.equal(
    getCropProductionPerSecond(blueprint, farmland),
    1,
  )
})

test('Row Duplicators generate Rows independently from Hamster-built Columns', () => {
  assert.equal(ROWS_PER_ROW_DUPLICATOR_PER_SECOND, 0.1)
  assert.equal(ROW_DUPLICATOR_COORDINATION_GROWTH, 1.02)
  assert.equal(getRowDuplicatorCoordinationMultiplier(0), 1)
  assert.equal(getRowDuplicatorCoordinationMultiplier(8), 1.02 ** 8)
  assert.equal(getRowsProducedPerSecond(0), 0)
  assert.equal(getRowsProducedPerSecond(1), 0.1 * 1.02)
  assert.equal(getRowsProducedPerSecond(8), 0.8 * 1.02 ** 8)
  assert.ok(
    Math.abs(getRowsProducedForTick(8) * 60 - 0.8 * 1.02 ** 8) < 1e-12,
  )
})

test('Row Duplicator buy max purchases every affordable upgrade after unlock', () => {
  const lockedPurchase = getMaxDuplicatorPurchase({
    crops: 4e12,
    rowDuplicators: 0,
    hasUnlockedRowDuplicators: false,
  })
  const purchase = getMaxDuplicatorPurchase({
    crops: 4e12,
    rowDuplicators: 0,
    hasUnlockedRowDuplicators: true,
  })

  assert.equal(lockedPurchase.purchased, 0)
  assert.equal(purchase.purchased, 3)
  assert.equal(purchase.rowDuplicators, 3)
  assert.ok(Math.abs(purchase.crops - 3.6e11) < 1)
})

test('Sunflowers boost Row Duplicators like Potatoes boost hamster efficiency', () => {
  const sunflowerBlueprint = createBlueprint({
    rows: 3,
    columns: 3,
    cells: [
      null,
      'turnip',
      null,
      null,
      'sunflower',
      null,
      null,
      null,
      null,
    ],
  })

  // The Turnip doubles the Sunflower's additive +20% effectiveness bonus.
  assert.equal(
    getRowDuplicatorEffectivenessMultiplier(sunflowerBlueprint),
    1.4,
  )
  assert.ok(
    Math.abs(
      getRowsProducedPerSecond(
        1,
        getRowDuplicatorEffectivenessMultiplier(sunflowerBlueprint),
      ) - 0.14 * 1.02,
    ) < 1e-12,
  )
})

test('crop visibility reveals each crop only after its discovery milestone', () => {
  assert.deepEqual(getVisibleCropIds(['leek', 'corn'], 49), ['leek'])
  assert.deepEqual(getVisibleCropIds(['leek', 'corn'], 50), ['leek', 'corn'])
  assert.deepEqual(
    getVisibleCropIds(['leek', 'corn', 'pumpkin'], 499),
    ['leek', 'corn'],
  )
  assert.deepEqual(
    getVisibleCropIds(['leek', 'corn', 'pumpkin'], 500),
    ['leek', 'corn', 'pumpkin', 'sweetPotato'],
  )
  assert.deepEqual(
    getVisibleCropIds(['leek', 'corn', 'pumpkin', 'sweetPotato'], 500),
    ['leek', 'corn', 'pumpkin', 'sweetPotato', 'turnip'],
  )
  assert.deepEqual(
    getVisibleCropIds(['leek', 'corn', 'pumpkin', 'turnip'], 500),
    ['leek', 'corn', 'pumpkin', 'sweetPotato'],
  )
})

test('blueprint expansions use the ordered milestone configuration', () => {
  assert.deepEqual(
    BLUEPRINT_EXPANSION_TRACKS.map(({ id, stages }) => ({
      id,
      costs: stages.map((stage) => stage.cost),
    })),
    [
      { id: 'column', costs: [1e4, 1e8, 1e12, 1e16, 1e24, 1e36] },
      {
        id: 'row',
        costs: [1e7, 1e9, 1e11, 1e13, 1e15, 1e19, 1e25, 1e33],
      },
    ],
  )

  const firstColumnGame = {
    crops: 1e4,
    hamsters: 8,
    totalHamstersHired: 8,
    unionized: false,
    postUnionHamstersHired: 0,
    completedBlueprintExpansions: [],
    farmland: createFarmlandMultipliers({ rows: 1, columns: 17 }),
    blueprint: createBlueprint({ cells: ['leek'] }),
  }
  assert.equal(getBlueprintExpansionCost(firstColumnGame, 'firstColumn'), 1e4)
  assert.equal(getBlueprintExpansionCost(firstColumnGame, 'firstRow'), null)

  const firstColumnResult = resetForBlueprintExpansion(
    firstColumnGame,
    'firstColumn',
  )
  assert.equal(firstColumnResult.crops, 0)
  assert.equal(firstColumnResult.farmland.rows, 1)
  assert.equal(firstColumnResult.farmland.columns, 0)
  assert.equal(firstColumnResult.blueprint.columns, 2)
  assert.deepEqual(firstColumnResult.completedBlueprintExpansions, ['firstColumn'])

  const firstRowResult = resetForBlueprintExpansion(
    {
      ...firstColumnResult,
      crops: 1e7,
      farmland: createFarmlandMultipliers({ rows: 1, columns: 17 }),
      blueprint: createBlueprint({
        rows: 1,
        columns: 2,
        cells: ['leek', 'corn'],
      }),
    },
    'firstRow',
  )
  assert.equal(firstRowResult.blueprint.rows, 2)
  assert.deepEqual(firstRowResult.blueprint.cells, ['leek', 'corn', null, null])
  assert.deepEqual(firstRowResult.completedBlueprintExpansions, ['firstColumn', 'firstRow'])

  const secondColumnResult = resetForBlueprintExpansion(
    {
      ...firstRowResult,
      crops: 1e8,
      farmland: createFarmlandMultipliers({ rows: 1, columns: 17 }),
      blueprint: createBlueprint({
        rows: 2,
        columns: 2,
        cells: ['leek', 'corn', 'sweetPotato', 'turnip'],
      }),
    },
    'secondColumn',
  )
  assert.equal(secondColumnResult.crops, 0)
  assert.equal(secondColumnResult.farmland.rows, 1)
  assert.equal(secondColumnResult.farmland.columns, 0)
  assert.equal(secondColumnResult.blueprint.columns, 3)
  assert.deepEqual(secondColumnResult.blueprint.cells, [
    'leek',
    'corn',
    null,
    'sweetPotato',
    'turnip',
    null,
  ])
  assert.deepEqual(secondColumnResult.completedBlueprintExpansions, [
    'firstColumn',
    'firstRow',
    'secondColumn',
  ])
})

test('testing expansion grants follow each configured track and stop at its cap', () => {
  let game = createInitialGame()

  for (let index = 0; index < 6; index += 1) {
    game = grantNextBlueprintExpansion(game, 'column')
  }
  for (let index = 0; index < 8; index += 1) {
    game = grantNextBlueprintExpansion(game, 'row')
  }

  assert.equal(game.blueprint.columns, 7)
  assert.equal(game.blueprint.rows, 9)
  assert.equal(game.completedBlueprintExpansions.length, 14)
  assert.equal(grantNextBlueprintExpansion(game, 'column'), null)
  assert.equal(grantNextBlueprintExpansion(game, 'row'), null)

  game = revokeLastBlueprintExpansion(game, 'column')
  game = revokeLastBlueprintExpansion(game, 'row')

  assert.equal(game.blueprint.columns, 6)
  assert.equal(game.blueprint.rows, 8)
  assert.equal(game.completedBlueprintExpansions.length, 12)

  for (let index = 0; index < 5; index += 1) {
    game = revokeLastBlueprintExpansion(game, 'column')
  }
  for (let index = 0; index < 7; index += 1) {
    game = revokeLastBlueprintExpansion(game, 'row')
  }

  assert.equal(game.blueprint.columns, 1)
  assert.equal(game.blueprint.rows, 1)
  assert.equal(game.completedBlueprintExpansions.length, 0)
  assert.equal(revokeLastBlueprintExpansion(game, 'column'), null)
  assert.equal(revokeLastBlueprintExpansion(game, 'row'), null)
})

test('blueprint slots unlock with Corn and Root Tunnel and retain separate layouts', () => {
  const startingBlueprint = createBlueprint({ cells: ['leek'] })
  const cornBlueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['leek', 'corn'],
  })

  assert.equal(
    getUnlockedBlueprintSlotCount({ blueprint: startingBlueprint }),
    1,
  )
  assert.equal(
    getUnlockedBlueprintSlotCount({ blueprint: cornBlueprint }),
    2,
  )
  assert.equal(
    getUnlockedBlueprintSlotCount({
      blueprint: cornBlueprint,
      hasUnlockedRootTunnel: true,
    }),
    3,
  )

  const firstColumnResult = resetForBlueprintExpansion(
    {
      crops: 1e4,
      blueprint: startingBlueprint,
      blueprintSlots: [startingBlueprint],
      activeBlueprintSlot: 0,
      completedBlueprintExpansions: [],
      farmland: createFarmlandMultipliers({ rows: 1, columns: 1 }),
    },
    'firstColumn',
  )

  assert.equal(firstColumnResult.blueprintSlots.length, 2)
  assert.deepEqual(
    firstColumnResult.blueprintSlots.map((blueprint) => blueprint.cells),
    [
      ['leek', null],
      ['leek', null],
    ],
  )
  assert.equal(getBlueprintSlots(firstColumnResult).length, 2)
})

test('monocrop threshold matches the design formula', () => {
  assert.equal(getMonocropThreshold(1), 1.5)
  assert.equal(getMonocropThreshold(16), 9)
  assert.equal(getMonocropThreshold(256), 65)
})

test('monocrop multiplier uses the inverse-power penalty at the threshold', () => {
  assert.equal(getMonocropYieldMultiplier(2, 16), 1)
  assert.equal(getMonocropYieldMultiplier(9, 16), 0.5)

  const overage = (16 - getMonocropThreshold(16)) / 16
  assert.equal(
    getMonocropYieldMultiplier(16, 16),
    1 / (2 * (overage + 1) ** 10),
  )
})
