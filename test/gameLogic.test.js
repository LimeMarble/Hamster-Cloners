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
  getBlueprintMonocropMultiplier,
  getBlueprintSlots,
  getBlueprintCropStats,
  getDiagonalTileIndexes,
  getEffectiveFarmlandMultipliers,
  canUnlockCropPerfection,
  getHamsterStateAfterHire,
  getHamsterCoordinationMultiplier,
  getHamsterClonerDescription,
  getHamsterCostGrowth,
  getHamsterExternalMultiplier,
  getMaxDuplicatorPurchase,
  getMaxHamsterPurchase,
  getNextHamsterCost,
  getNextRowDuplicatorCost,
  getColumnsProducedPerSecond,
  getColumnsProducedForTick,
  getFieldsPlanted,
  getGlobalPassiveEffectMultiplier,
  getGlobalRowProductionMultiplier,
  grantFreeBlueprintExpansion,
  grantNextBlueprintExpansion,
  getLeechingGourdFootprint,
  getLeechingGourdTurnipEffect,
  getMirrorCornEffectMultiplier,
  getSplitweedAnchorIndex,
  getSplitweedFootprint,
  getSplitweedMirrorCornEffectivenessBonus,
  getMonocropCropCount,
  getMonocropThresholdBonus,
  getProductionForTick,
  getRowDuplicatorEffectivenessMultiplier,
  getRowDuplicatorExternalMultiplier,
  getRowsProducedForTick,
  getRowsProducedPerSecond,
  getRowDuplicatorCoordinationMultiplier,
  getUnlockedBlueprintSlotCount,
  HAMSTER_ACCELERATED_COST_SCALING_START,
  HAMSTER_BASE_COST,
  HAMSTER_COST_GROWTH,
  HAMSTER_COST_GROWTH_INCREASE_PER_HAMSTER,
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
  CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT,
  CROP_DEFINITIONS,
  CROP_EFFECT_BYPASS_TIERS,
  CROP_PERFECTIONS,
  getCropName,
  getUnlockedCropIds,
  getVisibleCropIds,
  LENTIL_UNLOCK_CROP_COUNT,
  KNOTWEED_UNLOCK_CROP_COUNT,
  ROOT_TUNNEL_UNLOCK_CROP_COUNT,
  SUNFLOWER_UNLOCK_CROP_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
  WHEAT_UNLOCK_CROP_COUNT,
} from '../src/game/crops.js'
import {
  applyMonocropPenaltyToBonus,
  applyMonocropPenaltyToEffectMultiplier,
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

test('hamster cost scaling progressively accelerates past 1,500', () => {
  assert.equal(HAMSTER_ACCELERATED_COST_SCALING_START, 1500)
  assert.equal(HAMSTER_COST_GROWTH_INCREASE_PER_HAMSTER, 0.0005)
  assert.equal(getHamsterCostGrowth(1500), 1.1)
  assert.equal(getHamsterCostGrowth(1501), 1.1005)
  assert.equal(getHamsterCostGrowth(2000), 1.35)

  const costAt1999 = getNextHamsterCost(1999, true)
  const costAt2000 = getNextHamsterCost(2000, true)
  assert.ok(Math.abs(costAt2000 / costAt1999 - 1.35) < 1e-12)
  assert.equal(
    getHamsterClonerDescription({
      hamsters: 1500,
      unionized: true,
      postUnionHamstersHired: 1400,
    }),
    'The hamster union is no longer satisfied with your raises and demands further margins while maintaining their rather convenient 3% improvements.',
  )
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

test('Mirror Corn keeps excess reflections but overloads the targeted crop', () => {
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
    /excess reflected sunlight destroys/,
  )
  assert.deepEqual(
    normalizedBlueprint.mirrorCornTargets,
    overlinkedBlueprint.mirrorCornTargets,
  )

  const overloadedStats = getBlueprintCropStats(
    normalizedBlueprint,
    4,
    ['mirrorCorn', 'enrichingLeek'],
  )
  assert.equal(overloadedStats.harvestYield, 0)
  assert.deepEqual(overloadedStats.passiveStats, [])
  assert.deepEqual(overloadedStats.receivedEffects, [
    { type: 'mirror-corn-overload', count: 3, safeLimit: 2 },
  ])

  const safelyAugmentedStats = getBlueprintCropStats(
    normalizedBlueprint,
    4,
    ['mirrorCorn', 'enrichingLeek'],
    0,
    0,
    0,
    {},
    { mirrorCornReflectionLimitUnlocked: true },
  )
  assert.equal(safelyAugmentedStats.harvestYield, 1)
  assert.deepEqual(
    safelyAugmentedStats.receivedEffects.find(
      (effect) => effect.type === 'mirror-corn',
    ),
    { type: 'mirror-corn', count: 3, multiplier: 64 },
  )
  assert.equal(
    safelyAugmentedStats.passiveStats.find(
      (passive) => passive.id === 'adjacent-crop-yield',
    ).value,
    320,
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
      passiveStats: [
        {
          id: 'adjacent-crop-effects',
          label: 'Adjacent Crop effects',
          format: 'multiplier',
          value: 2,
        },
      ],
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
      passiveStats: [
        {
          id: 'hamster-efficiency',
          label: 'Hamster efficiency',
          format: 'percentage',
          value: 2,
        },
      ],
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

test('crop hover stats only show numerical passives relevant to that crop', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['leek', 'sweetPotato', 'sunflower', null],
  })

  assert.deepEqual(getBlueprintCropStats(blueprint, 0).passiveStats, [])
  assert.deepEqual(getBlueprintCropStats(blueprint, 1).passiveStats, [
    {
      id: 'hamster-efficiency',
      label: 'Hamster efficiency',
      format: 'percentage',
      value: 0.25,
    },
  ])
  assert.deepEqual(getBlueprintCropStats(blueprint, 2).passiveStats, [
    {
      id: 'row-duplicator-efficiency',
      label: 'Row Duplicator efficiency',
      format: 'percentage',
      value: 0.2,
    },
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
    17.5,
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

test('Wheat replaces the unobtainable Sweet Potato logarithmic perfection', () => {
  const dormantPerfectionGame = {
    crops: CROP_PERFECTIONS.sweetPotato.cost,
    hasUnlockedCropPerfection: true,
    hasUnlockedRowDuplicators: true,
    completedCropPerfections: [],
  }
  const blueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['wheat', 'turnip'],
  })

  assert.equal(WHEAT_UNLOCK_CROP_COUNT, 1.25e32)
  assert.equal(CROP_DEFINITIONS.wheat.baseYield, 100)
  assert.equal(CROP_PERFECTIONS.sweetPotato.temporarilyUnavailable, true)
  assert.equal(getCropName('sweetPotato'), 'Potato')
  assert.equal(getCropName('sweetPotato', ['sweetPotato']), 'Potato')
  assert.equal(
    canUnlockCropPerfection(dormantPerfectionGame, 'sweetPotato'),
    false,
  )
  assert.equal(
    unlockCropPerfection(dormantPerfectionGame, 'sweetPotato'),
    null,
  )

  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint, [], 100), 3)
  assert.equal(getCropHamsterEfficiencyMultiplier(blueprint, [], 0.1), 1)

  const wheatStats = getBlueprintCropStats(blueprint, 0, [], 100)
  const turnipStats = getBlueprintCropStats(blueprint, 1, [], 100)
  const expectedGlobalEffect = {
    type: 'global-hamster-efficiency',
    sourceCropId: 'wheat',
    count: 1,
    bonus: 2,
    multiplier: 3,
  }

  assert.equal(wheatStats.baseYield, 100)
  assert.deepEqual(
    wheatStats.receivedEffects.find(
      (effect) => effect.type === 'global-hamster-efficiency',
    ),
    expectedGlobalEffect,
  )
  assert.deepEqual(
    turnipStats.receivedEffects.find(
      (effect) => effect.type === 'global-hamster-efficiency',
    ),
    expectedGlobalEffect,
  )
})
test('Splitweed costs 3e38 Crops and stays locked before Row Duplicators', () => {
  const lockedGame = {
    crops: CROP_PERFECTIONS.splitweed.cost,
    hasUnlockedCropPerfection: true,
    hasUnlockedRowDuplicators: false,
    completedCropPerfections: [],
  }
  const eligibleGame = {
    ...lockedGame,
    hasUnlockedRowDuplicators: true,
  }

  assert.equal(CROP_PERFECTIONS.splitweed.cost, 3e38)
  assert.equal(CROP_PERFECTIONS.splitweed.requiresRowDuplicators, true)
  assert.equal(getCropName('knotweed'), 'Knotweed')
  assert.equal(getCropName('knotweed', ['splitweed']), 'Splitweed')
  assert.equal(canUnlockCropPerfection(lockedGame, 'splitweed'), false)
  assert.equal(canUnlockCropPerfection(eligibleGame, 'splitweed'), true)
  assert.deepEqual(unlockCropPerfection(eligibleGame, 'splitweed'), {
    ...eligibleGame,
    crops: 0,
    completedCropPerfections: ['splitweed'],
  })
})

test('Splitweed suppresses global Crop passives unless Gourd nullifies it', () => {
  const unprotectedBlueprint = createBlueprint({
    rows: 2,
    columns: 3,
    cells: [
      'knotweed',
      'splitweedPart',
      'lentil',
      'splitweedPart',
      'splitweedPart',
      'leek',
    ],
    requireSplitweedFootprints: true,
  })
  const gourdProtectedBlueprint = createBlueprint({
    rows: 4,
    columns: 4,
    cells: [
      'leechingGourd',
      'leechingGourdPart',
      'knotweed',
      'splitweedPart',
      'leechingGourdPart',
      'leechingGourdPart',
      'splitweedPart',
      'splitweedPart',
      'lentil',
      null,
      null,
      null,
      'leek',
      null,
      null,
      null,
    ],
    requireSplitweedFootprints: true,
  })

  assert.equal(
    getGlobalPassiveEffectMultiplier(unprotectedBlueprint, ['splitweed']),
    0,
  )
  assert.equal(
    getGlobalPassiveEffectMultiplier(gourdProtectedBlueprint, ['splitweed']),
    1,
  )
  assert.equal(
    getLeechingGourdTurnipEffect(gourdProtectedBlueprint, ['splitweed'])
      .debuffContribution,
    8,
  )
})

test('each 2x2 Splitweed raises the monocrop threshold by two', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: [
      'knotweed',
      'splitweedPart',
      'splitweedPart',
      'splitweedPart',
    ],
    requireSplitweedFootprints: true,
  })

  assert.equal(getMonocropThresholdBonus(blueprint), 0)
  assert.equal(getMonocropThresholdBonus(blueprint, ['splitweed']), 2)
})

test('Splitweed uses valid 2x2 footprints and clears malformed layouts', () => {
  const validSplitweed = createBlueprint({
    rows: 2,
    columns: 4,
    cells: [
      'knotweed',
      'splitweedPart',
      'knotweed',
      'splitweedPart',
      'splitweedPart',
      'splitweedPart',
      'splitweedPart',
      'splitweedPart',
    ],
    requireSplitweedFootprints: true,
  })
  const malformedSplitweed = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['knotweed', 'splitweedPart', null, null],
    requireSplitweedFootprints: true,
  })

  assert.deepEqual(getSplitweedFootprint(validSplitweed, 0), [0, 1, 4, 5])
  assert.equal(getSplitweedAnchorIndex(validSplitweed, 5), 0)
  assert.equal(getSplitweedAnchorIndex(validSplitweed, 7), 2)
  assert.deepEqual(malformedSplitweed.cells, [null, null, null, null])
})

test('each Splitweed adds 0.5x Mirror Corn effectiveness', () => {
  const blueprint = createBlueprint({
    rows: 4,
    columns: 4,
    cells: [
      'leechingGourd',
      'leechingGourdPart',
      'knotweed',
      'splitweedPart',
      'leechingGourdPart',
      'leechingGourdPart',
      'splitweedPart',
      'splitweedPart',
      'corn',
      null,
      null,
      null,
      null,
      'leek',
      null,
      null,
    ],
    mirrorCornTargets: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      13,
    ],
    requireSplitweedFootprints: true,
  })

  assert.equal(
    getSplitweedMirrorCornEffectivenessBonus(blueprint, ['splitweed']),
    0.5,
  )
  assert.equal(
    getMirrorCornEffectMultiplier(
      blueprint,
      13,
      ['mirrorCorn', 'splitweed'],
    ),
    4.5,
  )
})
test('Pumpkins yield five Crops and halve adjacent crop buffs and debuffs', () => {
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

test('Pumpkins halve adjacent Hamster, harvest, and destruction debuffs', () => {
  const cornBlueprint = createBlueprint({
    rows: 1,
    columns: 2,
    cells: ['pumpkin', 'corn'],
  })
  const knotweedBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['pumpkin', 'knotweed', 'leek'],
  })
  const appleTreeBlueprint = createBlueprint({
    rows: 1,
    columns: 3,
    cells: ['pumpkin', 'appleTree', 'leek'],
  })

  assert.equal(getCropHamsterEfficiencyMultiplier(cornBlueprint), 0.95)
  assert.equal(getBlueprintCropStats(knotweedBlueprint, 2).harvestYield, -4)
  assert.equal(getBlueprintCropStats(appleTreeBlueprint, 2).harvestYield, 0.5)
})

test('Leeching Gourd nullifies adjacent debuffs without losing their contribution', () => {
  const createGourdBlueprint = (sourceCrop, targetCrop) =>
    createBlueprint({
      rows: 3,
      columns: 3,
      cells: [
        'leechingGourd',
        'leechingGourdPart',
        sourceCrop,
        'leechingGourdPart',
        'leechingGourdPart',
        targetCrop,
        null,
        null,
        null,
      ],
    })
  const cornBlueprint = createGourdBlueprint('corn', 'leek')
  const knotweedBlueprint = createGourdBlueprint('knotweed', 'leek')
  const appleTreeBlueprint = createGourdBlueprint('appleTree', 'leek')

  assert.equal(getCropHamsterEfficiencyMultiplier(cornBlueprint), 1)
  assert.equal(getBlueprintCropStats(knotweedBlueprint, 5).harvestYield, 1)
  assert.equal(getBlueprintCropStats(appleTreeBlueprint, 5).harvestYield, 1)
  assert.equal(getLeechingGourdTurnipEffect(knotweedBlueprint).debuffContribution, 2)
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
  // raising Turnip's ×2 effect to ×2.3 on the adjacent Potato. The Gourd
  // nullifies Corn's adjacent −10% Hamster Efficiency effect.
  assert.ok(
    Math.abs(getCropHamsterEfficiencyMultiplier(blueprint) - 1.575) < 1e-12,
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
      'leek',
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
    Math.abs(getCropHamsterEfficiencyMultiplier(blueprint) - 1.565) < 1e-12,
  )
  assert.ok(Math.abs(getBlueprintCropStats(blueprint, 15).harvestYield + 1) < 1e-12)
})
test('Leeching Gourd costs 20 Qn Crops and receives no Mirror Corn effect', () => {
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

  assert.equal(CROP_PERFECTIONS.leechingGourd.cost, 2e19)
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

test('monocrop penalties weaken every crop passive and strengthen debuffs', () => {
  const wheatMonocrop = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['wheat', 'wheat', 'wheat', 'wheat'],
  })
  const cornMonocrop = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['corn', 'corn', 'corn', 'corn'],
  })
  const turnipMonocrop = createBlueprint({
    rows: 1,
    columns: 5,
    cells: ['turnip', 'turnip', 'sweetPotato', 'turnip', 'turnip'],
  })
  const enrichingLeekMonocrop = createBlueprint({
    rows: 1,
    columns: 5,
    cells: ['leek', 'leek', 'leek', 'leek', 'corn'],
  })
  const knotweedMonocrop = createBlueprint({
    rows: 1,
    columns: 5,
    cells: ['knotweed', 'knotweed', 'knotweed', 'knotweed', 'corn'],
  })
  const fourCropPenalty = getMonocropYieldMultiplier(4, 4)
  const fourOfFivePenalty = getMonocropYieldMultiplier(4, 5)

  assert.equal(getBlueprintMonocropMultiplier(wheatMonocrop), fourCropPenalty)
  assert.equal(
    getCropHamsterEfficiencyMultiplier(wheatMonocrop, [], 100),
    1 + 8 * fourCropPenalty,
  )
  assert.equal(
    getCropHamsterEfficiencyMultiplier(cornMonocrop),
    Math.max(0, 1 - 0.4 / fourCropPenalty),
  )

  // Turnip's hidden tier-2 protection blocks ordinary crop buffs, while the
  // tier-5 monocrop rule weakens each adjacent Turnip multiplier.
  assert.equal(CROP_DEFINITIONS.turnip.passiveProtectionTier, 2)
  assert.equal(CROP_EFFECT_BYPASS_TIERS.MONOCROP, 5)
  assert.equal(
    getCropHamsterEfficiencyMultiplier(turnipMonocrop),
    1 + 0.25 * (1 + fourOfFivePenalty) ** 2,
  )

  assert.equal(
    getBlueprintCropStats(
      enrichingLeekMonocrop,
      4,
      ['enrichingLeek'],
    ).receivedEffects.find((effect) => effect.type === 'crop-yield').bonus,
    5 * fourOfFivePenalty,
  )
  assert.equal(
    getBlueprintCropStats(
      knotweedMonocrop,
      4,
    ).receivedEffects.find((effect) => effect.type === 'crop-yield').bonus,
    -10 / fourOfFivePenalty,
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
  assert.equal(LENTIL_UNLOCK_CROP_COUNT, 8e16)
  assert.equal(KNOTWEED_UNLOCK_CROP_COUNT, 2e19)
  assert.equal(SUNFLOWER_UNLOCK_CROP_COUNT, 1.42e44)
  assert.equal(ROOT_TUNNEL_UNLOCK_CROP_COUNT, Number.POSITIVE_INFINITY)
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
      'sunflower',
    ],
  )
  assert.equal(getCropName('sweetPotato'), 'Potato')
})

test('Row Duplicators reset the field before becoming the only Row source', () => {
  const game = {
    crops: ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
    hasUnlockedRowDuplicators: false,
    farmland: createFarmlandMultipliers({
      rows: 7,
      columns: 12,
      floors: 3,
      farms: 4,
      otherMultiplier: 2,
    }),
  }

  assert.equal(canUnlockRowDuplicators(game), true)
  assert.deepEqual(resetForRowDuplicators(game), {
    ...game,
    crops: 0,
    hasUnlockedRowDuplicators: true,
    farmland: createFarmlandMultipliers({
      rows: 1,
      columns: 0,
      floors: 1,
      farms: 1,
      otherMultiplier: 2,
    }),
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
  assert.equal(getRowDuplicatorExternalMultiplier(), 1)
  assert.equal(getRowDuplicatorCoordinationMultiplier(8), 1.02 ** 8)
  assert.equal(getRowsProducedPerSecond(0), 0)
  assert.equal(getRowsProducedPerSecond(1), 0.1 * 1.02)
  assert.equal(getRowsProducedPerSecond(8), 0.8 * 1.02 ** 8)
  assert.equal(getRowsProducedPerSecond(1, 1, 10), 1.02)
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

test('Canola unlocks at 500 Row Duplicators', () => {
  const expandedBlueprint = createBlueprint({ rows: 1, columns: 2 })
  const unlockedBeforeCanola = getUnlockedCropIds(
    expandedBlueprint,
    true,
    125,
    true,
    true,
    true,
    true,
    true,
    true,
    499,
  )
  const unlockedWithCanola = getUnlockedCropIds(
    expandedBlueprint,
    true,
    125,
    true,
    true,
    true,
    true,
    true,
    true,
    500,
  )

  assert.equal(CANOLA_UNLOCK_ROW_DUPLICATOR_COUNT, 500)
  assert.equal(unlockedBeforeCanola.includes('canola'), false)
  assert.equal(unlockedWithCanola.at(-1), 'canola')
})

test('Canola gives an unboostable global Row multiplier from active Hamsters', () => {
  const canolaBlueprint = createBlueprint({
    rows: 10,
    columns: 10,
    cells: ['canola', 'turnip', 'canola'],
  })
  const sunflowerBlueprint = createBlueprint({
    rows: 10,
    columns: 10,
    cells: ['canola', 'sunflower'],
  })

  // Two Canolas give +1000% each at 100 active Hamsters. The adjacent Turnip
  // cannot boost this global effect, matching Sweet Potato's global passive.
  assert.equal(getGlobalRowProductionMultiplier(canolaBlueprint, 100), 21)
  assert.equal(
    getRowDuplicatorEffectivenessMultiplier(canolaBlueprint, [], 100),
    21,
  )
  assert.equal(getRowDuplicatorExternalMultiplier(), 1)

  // Canola's ×11 multiplier appears inside Duplicator Effectiveness and
  // stacks multiplicatively with Sunflower's ×1.2 effectiveness multiplier.
  assert.ok(
    Math.abs(
      getRowsProducedPerSecond(
        1,
        getRowDuplicatorEffectivenessMultiplier(
          sunflowerBlueprint,
          [],
          100,
        ),
        getRowDuplicatorExternalMultiplier(),
      ) -
        0.1 * 1.02 * 1.2 * 11,
    ) < 1e-12,
  )
  assert.equal(
    getGlobalRowProductionMultiplier(
      createBlueprint({
        rows: 10,
        columns: 10,
        cells: ['canola', 'knotweed'],
      }),
      100,
      ['splitweed'],
    ),
    1,
  )
})

test('each Canola counts as five crops toward its Monocrop limit', () => {
  const blueprint = createBlueprint({
    rows: 2,
    columns: 2,
    cells: ['canola'],
  })

  const monocropMultiplier = getBlueprintMonocropMultiplier(blueprint)

  assert.equal(getMonocropCropCount(blueprint, 'canola'), 5)
  assert.ok(monocropMultiplier < 1)
  assert.deepEqual(
    getBlueprintCropStats(blueprint, 0, [], 0, 100).receivedEffects.find(
      (effect) => effect.type === 'global-row-production',
    ),
    {
      type: 'global-row-production',
      sourceCropId: 'canola',
      count: 1,
      bonus: monocropMultiplier * 10,
      multiplier: 1 + monocropMultiplier * 10,
    },
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
  const columnTrack = BLUEPRINT_EXPANSION_TRACKS.find(
    (track) => track.id === 'column',
  )
  const rowTrack = BLUEPRINT_EXPANSION_TRACKS.find(
    (track) => track.id === 'row',
  )

  assert.equal(columnTrack.stages.length, 16)
  assert.equal(rowTrack.stages.length, 20)
  assert.deepEqual(
    columnTrack.stages.slice(0, 7).map((stage) => stage.cost),
    [1e4, 1e8, 1e12, 1e16, 1e20, 1e27, 1e37],
  )
  assert.deepEqual(
    rowTrack.stages.slice(0, 8).map((stage) => stage.cost),
    [1e7, 1e9, 1e11, 1e13, 1e15, 1e20, 1e28, 1e39],
  )
  assert.equal(columnTrack.stages.at(-1).id, 'sixteenthColumn')
  assert.equal(rowTrack.stages.at(-1).id, 'twentiethRow')

  const firstColumnGame = {
    crops: 1e4,
    hamsters: 8,
    totalHamstersHired: 8,
    unionized: false,
    postUnionHamstersHired: 0,
    completedBlueprintExpansions: [],
    farmland: createFarmlandMultipliers({
      rows: 7,
      columns: 17,
      floors: 3,
      farms: 4,
      otherMultiplier: 1.5,
    }),
    blueprint: createBlueprint({ cells: ['leek'] }),
  }
  assert.equal(getBlueprintExpansionCost(firstColumnGame, 'firstColumn'), 1e4)
  assert.equal(getBlueprintExpansionCost(firstColumnGame, 'firstRow'), null)

  const firstColumnResult = resetForBlueprintExpansion(
    firstColumnGame,
    'firstColumn',
  )
  assert.equal(firstColumnResult.crops, 0)
  assert.deepEqual(
    firstColumnResult.farmland,
    createFarmlandMultipliers({
      rows: 1,
      columns: 0,
      floors: 1,
      farms: 1,
      otherMultiplier: 1.5,
    }),
  )
  assert.equal(firstColumnResult.blueprint.columns, 2)
  assert.deepEqual(firstColumnResult.completedBlueprintExpansions, ['firstColumn'])

  const firstRowResult = resetForBlueprintExpansion(
    {
      ...firstColumnResult,
      crops: 1e7,
      farmland: createFarmlandMultipliers({
        rows: 9,
        columns: 17,
        floors: 5,
        farms: 6,
        otherMultiplier: 1.5,
      }),
      blueprint: createBlueprint({
        rows: 1,
        columns: 2,
        cells: ['leek', 'corn'],
      }),
    },
    'firstRow',
  )
  assert.equal(firstRowResult.blueprint.rows, 2)
  assert.deepEqual(
    firstRowResult.farmland,
    createFarmlandMultipliers({
      rows: 1,
      columns: 0,
      floors: 1,
      farms: 1,
      otherMultiplier: 1.5,
    }),
  )
  assert.deepEqual(firstRowResult.blueprint.cells, ['leek', 'corn', null, null])
  assert.deepEqual(firstRowResult.completedBlueprintExpansions, ['firstColumn', 'firstRow'])

  const secondColumnResult = resetForBlueprintExpansion(
    {
      ...firstRowResult,
      crops: 1e8,
      farmland: createFarmlandMultipliers({
        rows: 11,
        columns: 17,
        floors: 7,
        farms: 8,
        otherMultiplier: 1.5,
      }),
      blueprint: createBlueprint({
        rows: 2,
        columns: 2,
        cells: ['leek', 'corn', 'sweetPotato', 'turnip'],
      }),
    },
    'secondColumn',
  )
  assert.equal(secondColumnResult.crops, 0)
  assert.deepEqual(
    secondColumnResult.farmland,
    createFarmlandMultipliers({
      rows: 1,
      columns: 0,
      floors: 1,
      farms: 1,
      otherMultiplier: 1.5,
    }),
  )
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
  const columnExpansionCount = BLUEPRINT_EXPANSION_TRACKS.find(
    (track) => track.id === 'column',
  ).stages.length
  const rowExpansionCount = BLUEPRINT_EXPANSION_TRACKS.find(
    (track) => track.id === 'row',
  ).stages.length
  let game = createInitialGame()

  for (let index = 0; index < columnExpansionCount; index += 1) {
    game = grantNextBlueprintExpansion(game, 'column')
  }
  for (let index = 0; index < rowExpansionCount; index += 1) {
    game = grantNextBlueprintExpansion(game, 'row')
  }

  assert.equal(game.blueprint.columns, columnExpansionCount + 1)
  assert.equal(game.blueprint.rows, rowExpansionCount + 1)
  assert.equal(
    game.completedBlueprintExpansions.length,
    columnExpansionCount + rowExpansionCount,
  )
  assert.equal(grantNextBlueprintExpansion(game, 'column'), null)
  assert.equal(grantNextBlueprintExpansion(game, 'row'), null)

  game = revokeLastBlueprintExpansion(game, 'column')
  game = revokeLastBlueprintExpansion(game, 'row')

  assert.equal(game.blueprint.columns, columnExpansionCount)
  assert.equal(game.blueprint.rows, rowExpansionCount)
  assert.equal(
    game.completedBlueprintExpansions.length,
    columnExpansionCount + rowExpansionCount - 2,
  )

  for (let index = 1; index < columnExpansionCount; index += 1) {
    game = revokeLastBlueprintExpansion(game, 'column')
  }
  for (let index = 1; index < rowExpansionCount; index += 1) {
    game = revokeLastBlueprintExpansion(game, 'row')
  }

  assert.equal(game.blueprint.columns, 1)
  assert.equal(game.blueprint.rows, 1)
  assert.equal(game.completedBlueprintExpansions.length, 0)
  assert.equal(revokeLastBlueprintExpansion(game, 'column'), null)
  assert.equal(revokeLastBlueprintExpansion(game, 'row'), null)
})

test('free blueprint space does not advance reset expansion progress', () => {
  const rowExpandedGame = grantFreeBlueprintExpansion(createInitialGame(), 'row')
  const expandedGame = grantFreeBlueprintExpansion(rowExpandedGame, 'column')

  assert.equal(expandedGame.blueprint.rows, 2)
  assert.equal(expandedGame.blueprint.columns, 2)
  assert.deepEqual(expandedGame.completedBlueprintExpansions, [])
  assert.deepEqual(expandedGame.rabbitBlueprintExpansions, {
    row: 1,
    column: 1,
  })
  assert.equal(getBlueprintExpansionCost(expandedGame, 'firstColumn'), 1e4)
  assert.equal(getBlueprintExpansionCost(expandedGame, 'firstRow'), null)
})

test('blueprint slots unlock with Potato and Sunflower and retain separate layouts', () => {
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
    getUnlockedBlueprintSlotCount({
      blueprint: cornBlueprint,
      unionized: true,
      hamsters: 124,
    }),
    1,
  )
  assert.equal(
    getUnlockedBlueprintSlotCount({
      blueprint: cornBlueprint,
      unionized: true,
      hamsters: 125,
    }),
    2,
  )
  assert.equal(
    getUnlockedBlueprintSlotCount({
      blueprint: cornBlueprint,
      hasUnlockedRowDuplicators: true,
    }),
    1,
  )
  assert.equal(
    getUnlockedBlueprintSlotCount({
      blueprint: cornBlueprint,
      hasUnlockedSunflower: true,
    }),
    3,
  )

  const firstColumnResult = resetForBlueprintExpansion(
    {
      crops: 1e4,
      unionized: true,
      hamsters: 125,
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

test('monocrop threshold includes the current 1.25 base allowance', () => {
  assert.equal(getMonocropThreshold(1), 1.75)
  assert.equal(getMonocropThreshold(16), 9.25)
  assert.equal(getMonocropThreshold(256), 65.25)
})

test('monocrop multiplier uses the inverse-power penalty once count reaches the threshold', () => {
  assert.equal(getMonocropYieldMultiplier(9, 16), 1)

  const firstPenalizedCount = 10
  const firstOverage =
    (firstPenalizedCount - getMonocropThreshold(16)) / 16
  assert.equal(
    getMonocropYieldMultiplier(firstPenalizedCount, 16),
    1 / (2 * (firstOverage + 1) ** 10),
  )

  const fullOverage = (16 - getMonocropThreshold(16)) / 16
  assert.equal(
    getMonocropYieldMultiplier(16, 16),
    1 / (2 * (fullOverage + 1) ** 10),
  )
})

test('monocrop passive helpers weaken bonuses and inversely strengthen debuffs', () => {
  const multiplier = getMonocropYieldMultiplier(4, 4)

  assert.equal(
    applyMonocropPenaltyToBonus(0.25, 4, 4),
    0.25 * multiplier,
  )
  assert.equal(
    applyMonocropPenaltyToBonus(-0.1, 4, 4),
    -0.1 / multiplier,
  )
  assert.equal(
    applyMonocropPenaltyToEffectMultiplier(2, 4, 4),
    1 + multiplier,
  )
  assert.equal(
    applyMonocropPenaltyToEffectMultiplier(0.5, 4, 4),
    Math.max(0, 1 - 0.5 / multiplier),
  )
})
