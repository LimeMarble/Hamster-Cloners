import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACHIEVEMENTS, awardAchievements, createBlueprint, createInitialGame,
  getAchievementHamsterMultiplier, getHamsterTreats, grantAchievement,
  advanceGameSimulationStep, getBlueprintCropStats, getFortuneModifiers,
  getCropHamsterEfficiencyMultiplier, getGlobalRowProductionEffects,
  getBaseFieldIncome,
  MISFORTUNE_UPGRADE_IDS, FLOOR_REPLICATOR_MODES,
  collectCloverBundle, createInitialFiveLeafState, spawnCloverBundle,
  resetForBlueprintExpansion,
} from '../src/game/gameLogic.js'
import { exportGame, importGame, normalizeGame } from '../src/game/storage.js'

function withBlueprint(blueprint, extra = {}) {
  return { ...createInitialGame(), blueprint, blueprintSlots: [blueprint], ...extra }
}

test('the roster keeps the whimsical achievements, Making Peanuts, and six crop thresholds', () => {
  assert.deepEqual(ACHIEVEMENTS.filter((achievement) => achievement.metric)
    .map(({ metric, target }) => [metric, target]), [
    ['potato', 25], ['leek', 1000], ['turnip', 3], ['apple', 1e10],
    ['sunflower', 4000], ['canola', 800],
  ])
  const sideIds = ACHIEVEMENTS.filter((a) => a.tier === 1 && !a.metric).map((a) => a.id)
  assert.deepEqual(sideIds, ['cropRotation', 'backUnderControl', 'agriculturalDiversity',
    'controlledBurn', 'thisIsFine', 'absolutelyNothing', 'youGetNothing', 'makingPeanuts',
    'palmOilPlantation'])
  assert.equal(ACHIEVEMENTS.find((a) => a.id === 'agriculturalDiversity').treats, 10)
  assert.ok(ACHIEVEMENTS.filter((a) => a.tier === 1 && a.id !== 'agriculturalDiversity')
    .every((a) => a.treats === 5))
})

test('Treats sum unique valid awards and cache a stable external multiplier', () => {
  const game = { earnedAchievementIds: ['cropRotation', 'cropRotation', 'agriculturalDiversity', 'unknown'] }
  assert.equal(getHamsterTreats(game), 15)
  assert.equal(getAchievementHamsterMultiplier(game), 1.15)
  assert.equal(getAchievementHamsterMultiplier({}), 1)
  assert.equal(getHamsterTreats(['trade']), 50)
})

test('new games earn nothing and milestone awards are idempotent', () => {
  const initial = createInitialGame()
  assert.equal(awardAchievements(initial), initial)
  const earned = awardAchievements({ ...initial, totalHamstersHired: 50, unionized: true,
    completedCropPerfections: ['enrichingLeek'], trade: { ...initial.trade, established: true } })
  assert.deepEqual(earned.earnedAchievementIds, ['inventions', 'unionized', 'firstPerfection', 'trade'])
  assert.equal(awardAchievements(earned), earned)
})

test('crop rotation and monocrop recovery require the relevant blueprint edits', () => {
  const initial = createInitialGame()
  const changed = withBlueprint(createBlueprint({ cells: ['corn'] }))
  assert.ok(awardAchievements(changed, initial).earnedAchievementIds.includes('cropRotation'))
  assert.ok(!awardAchievements(changed).earnedAchievementIds.includes('cropRotation'))
  const penalized = withBlueprint(createBlueprint({ rows: 2, columns: 2,
    cells: ['leek', 'leek', 'leek', 'leek'] }))
  const repaired = withBlueprint(createBlueprint({ rows: 2, columns: 2,
    cells: ['leek', 'leek', 'corn', null] }))
  assert.ok(awardAchievements(repaired, penalized).earnedAchievementIds.includes('backUnderControl'))
  assert.ok(!awardAchievements(repaired).earnedAchievementIds.includes('backUnderControl'))
})

test('Agricultural Diversity requires six real crop types in one unpenalized blueprint', () => {
  const diverse = createBlueprint({ rows: 4, columns: 4,
    cells: ['leek', 'corn', 'pumpkin', 'sweetPotato', 'turnip', 'appleTree'] })
  assert.ok(awardAchievements(withBlueprint(diverse)).earnedAchievementIds.includes('agriculturalDiversity'))
  const notDiverse = createBlueprint({ rows: 4, columns: 4,
    cells: ['leek', 'corn', 'pumpkin', 'sweetPotato', 'turnip', 'rootTunnel'] })
  assert.ok(!awardAchievements(withBlueprint(notDiverse)).earnedAchievementIds.includes('agriculturalDiversity'))
  const another = createBlueprint({ rows: 4, columns: 4, cells: ['appleTree'] })
  assert.ok(!awardAchievements({ ...withBlueprint(notDiverse), blueprintSlots: [notDiverse, another] })
    .earnedAchievementIds.includes('agriculturalDiversity'))
})

test('Potato and Turnip checks use individual effective passives, not summed bonuses', () => {
  const ordinary = withBlueprint(createBlueprint({ rows: 3, columns: 3,
    cells: ['sweetPotato', 'sweetPotato', 'sweetPotato', 'sweetPotato', 'turnip'] }))
  const stats = getBlueprintCropStats(ordinary.blueprint, 4)
  assert.equal(stats.passiveStats.find((s) => s.id === 'adjacent-crop-effects').value, 2)
  assert.ok(!awardAchievements(ordinary).earnedAchievementIds.includes('turnip3'))
  const strong = withBlueprint(createBlueprint({ rows: 3, columns: 3,
    cells: [null, 'turnip', null, 'turnip', 'sweetPotato', 'turnip', null, 'turnip'] }))
  assert.ok(!awardAchievements(strong).earnedAchievementIds.includes('potato100'))
})

test('Potato Power requires +2500% from one Potato, inclusive of the exact threshold', () => {
  const support = {
    floorReplicators: 495000,
    floorReplicatorMode: FLOOR_REPLICATOR_MODES.SUPPORT,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT],
  }
  const exact = withBlueprint(createBlueprint({ cells: ['sweetPotato'] }), support)
  const fortune = getFortuneModifiers(exact)
  const stats = getBlueprintCropStats(exact.blueprint, 0, [], 0, 0, 0, fortune, exact.seedAugmentations)
  assert.equal(stats.passiveStats.find((stat) => stat.id === 'hamster-efficiency').value, 25)
  assert.ok(awardAchievements(exact).earnedAchievementIds.includes('potato100'))
  const below = withBlueprint(createBlueprint({ rows: 2, columns: 2, cells: ['sweetPotato', 'sweetPotato'] }),
    { ...support, floorReplicators: 494990 })
  assert.ok(!awardAchievements(below).earnedAchievementIds.includes('potato100'))
})

test('Leek, Apple and Sunflower achievements use per-crop strength with relevant modifiers', () => {
  const blueprint = createBlueprint({ rows: 4, columns: 4,
    cells: [null, 'turnip', null, null, 'turnip', 'leek', 'turnip', null,
      null, 'appleTree', null, null, 'turnip', 'sunflower', 'turnip'] })
  const game = withBlueprint(blueprint, {
    completedCropPerfections: ['enrichingLeek'], floorReplicators: 1000000,
    floorReplicatorMode: FLOOR_REPLICATOR_MODES.SUPPORT,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT],
  })
  const earned = awardAchievements(game)
  const fortune = getFortuneModifiers(game)
  for (const [index, metric, id, statId] of [[5, 'leek', 'leek1000', 'adjacent-crop-yield'],
    [1, 'turnip', 'turnip3', 'adjacent-crop-effects'],
    [9, 'apple', 'apple10B', null], [13, 'sunflower', 'sunflower400K', 'row-duplicator-efficiency']]) {
    const stats = getBlueprintCropStats(blueprint, index, game.completedCropPerfections,
      0, 0, 0, fortune, game.seedAugmentations)
    const actual = statId ? stats.passiveStats.find((s) => s.id === statId).value : stats.harvestYield
    const threshold = ACHIEVEMENTS.find((a) => a.metric === metric).target
    assert.equal(earned.earnedAchievementIds.includes(id), actual >= threshold, id)
  }
  assert.ok(earned.earnedAchievementIds.includes('leek1000'))
  assert.ok(earned.earnedAchievementIds.includes('apple10B'))
  assert.ok(earned.earnedAchievementIds.includes('sunflower400K'))
})

test('Canola achievement uses combined Canola boost, not external row multipliers', () => {
  const game = withBlueprint(createBlueprint({ rows: 5, columns: 5, cells: ['canola', 'canola'] }),
    { hamsters: 40000 })
  assert.ok(getGlobalRowProductionEffects(game.blueprint, 40000)[0].multiplier >= 800)
  assert.ok(awardAchievements(game).earnedAchievementIds.includes('canola800'))
  const weak = { ...game, hamsters: 1, trade: { ...game.trade, rabbitUnlocks: ['rowDuplicatorEfficiency'] } }
  assert.ok(!awardAchievements(weak).earnedAchievementIds.includes('canola800'))
})

test('Nothing checks one blueprint, independently of having zero planted fields', () => {
  assert.ok(!awardAchievements(createInitialGame()).earnedAchievementIds.includes('youGetNothing'))
  const game = withBlueprint(createBlueprint({ rows: 4, columns: 4,
    cells: Array(12).fill('waterLettuce') }))
  const awarded = awardAchievements(game)
  assert.ok(awarded.earnedAchievementIds.includes('thisIsFine'))
  assert.ok(!awarded.earnedAchievementIds.includes('youGetNothing'))
  const useless = withBlueprint(createBlueprint({ rows: 4, columns: 4,
    cells: ['corn', 'knotweed'] }), { floorReplicators: 1000000,
    floorReplicatorMode: FLOOR_REPLICATOR_MODES.SUPPORT,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.FINAL_SUPPORT] })
  assert.ok(awardAchievements(useless).earnedAchievementIds.includes('youGetNothing'))
})

test('This is Fine requires only a burnt crop, even when the entire blueprint has no harvest', () => {
  const blueprint = createBlueprint({ rows: 4, columns: 4,
    cells: ['corn', null, 'corn', null, null, 'leek', null, null,
      'corn', null, null, null, null, null, null, 'leek'],
    mirrorCornTargets: [5, null, 5, null, null, null, null, null, 5] })
  const game = withBlueprint(blueprint, { completedCropPerfections: ['mirrorCorn'] })
  assert.ok(awardAchievements(game).earnedAchievementIds.includes('controlledBurn'))
  const noHarvest = createBlueprint({ ...blueprint, cells: blueprint.cells.map((id, index) =>
    index === 15 ? null : index === 1 || index === 4 ? 'knotweed' : id) })
  assert.ok(getBaseFieldIncome(noHarvest, ['mirrorCorn']) <= 0)
  assert.ok(awardAchievements(withBlueprint(noHarvest, { completedCropPerfections: ['mirrorCorn'] }))
    .earnedAchievementIds.includes('controlledBurn'))
  assert.ok(!awardAchievements(withBlueprint(blueprint)).earnedAchievementIds.includes('controlledBurn'))
  const emptyTarget = createBlueprint({ ...blueprint, cells: blueprint.cells.map((id, index) => index === 5 ? null : id) })
  assert.ok(!awardAchievements(withBlueprint(emptyTarget, { completedCropPerfections: ['mirrorCorn'] }))
    .earnedAchievementIds.includes('controlledBurn'))
  assert.ok(!awardAchievements({ ...game, seedAugmentations: { ...game.seedAugmentations, mirrorCornReflectionLimitUnlocked: true } })
    .earnedAchievementIds.includes('controlledBurn'))
})

test('renamed achievements and the increased Potato threshold preserve existing saved awards', () => {
  const ids = ['controlledBurn', 'thisIsFine', 'potato100']
  const restored = importGame(exportGame({ ...createInitialGame(), earnedAchievementIds: ids }))
  assert.deepEqual(restored.earnedAchievementIds, ids)
  assert.equal(getHamsterTreats(restored), 15)
  assert.equal(ACHIEVEMENTS.find(({ id }) => id === 'controlledBurn').name, 'This is Fine')
  assert.equal(ACHIEVEMENTS.find(({ id }) => id === 'thisIsFine').name, 'This is NOT Fine')
})

test('Absolutely Nothing awards on collection, never just on configuring or cheat-granting an effect', () => {
  const game = createInitialGame()
  const fiveLeaf = createInitialFiveLeafState(game)
  fiveLeaf.loadouts[0].allocations = Object.fromEntries(Object.keys(fiveLeaf.loadouts[0].allocations).map((id) => [id, 0]))
  const ready = spawnCloverBundle({ ...game, cloverAssembly: { assembled: true },
    fortune: { ...game.fortune, fiveLeaf } }, () => 0.5)
  assert.ok(!awardAchievements(ready).earnedAchievementIds.includes('absolutelyNothing'))
  const collected = collectCloverBundle(ready, 0, () => 0.5)
  assert.ok(collected.earnedAchievementIds.includes('absolutelyNothing'))
})

test('awards survive saves and resets; old saves receive currently verifiable awards', () => {
  const initial = createInitialGame()
  const game = grantAchievement({ ...initial, totalHamstersHired: 50, crops: 1e8 }, 'cropRotation')
  const imported = importGame(exportGame(game, 123))
  assert.ok(imported.earnedAchievementIds.includes('cropRotation'))
  assert.ok(imported.earnedAchievementIds.includes('inventions'))
  const reset = resetForBlueprintExpansion(imported, 'firstColumn')
  assert.deepEqual(reset.earnedAchievementIds, imported.earnedAchievementIds)
  assert.equal(getHamsterTreats(createInitialGame()), 0)
  const older = normalizeGame({ ...initial, totalHamstersHired: 50,
    earnedAchievementIds: ['cropRotation', 'cropRotation', 'invalid'] })
  assert.deepEqual(older.earnedAchievementIds, ['cropRotation', 'inventions'])
})

test('Treats affect columns only, in both areas, and do not alter crop stats or coordination', () => {
  for (const activeArea of ['main', 'misfortune']) {
    const game = { ...createInitialGame(), activeArea, hamsters: 1,
      hasUnlockedRowDuplicators: true, rowDuplicators: 1,
      hasUnlockedFloorReplicators: true, floorReplicators: 1,
      earnedAchievementIds: ACHIEVEMENTS.map((a) => a.id) }
    const baseline = { ...game, earnedAchievementIds: game.earnedAchievementIds.filter((id) => id !== 'trade') }
    const before = advanceGameSimulationStep(baseline, 1, { random: () => 1 })
    const after = advanceGameSimulationStep(game, 1, { random: () => 1 })
    const ratio = getAchievementHamsterMultiplier(game) / getAchievementHamsterMultiplier(baseline)
    assert.ok(Math.abs((after.farmland.columns - .9) / (before.farmland.columns - .9) - ratio) < 1e-10)
    assert.equal(after.farmland.rows, before.farmland.rows)
    assert.equal(after.farmland.floors, before.farmland.floors)
    assert.equal(after.crops, before.crops)
    assert.equal(getCropHamsterEfficiencyMultiplier(game.blueprint), 1)
  }
})

test('ordinary production ticks reuse cached blueprint metrics and keep the awards array stable', () => {
  const game = awardAchievements({ ...createInitialGame(), totalHamstersHired: 50 })
  const repeated = awardAchievements({ ...game, crops: 1e30,
    playtimeSeconds: 500, farmland: { ...game.farmland, columns: 12345 } })
  assert.equal(repeated.earnedAchievementIds, game.earnedAchievementIds)
})

test('stable blueprint checks do not rescan tiles between ticks', () => {
  let scans = 0
  const blueprint = createBlueprint({ rows: 8, columns: 8, cells: ['leek'] })
  blueprint.cells = new Proxy(blueprint.cells, {
    get(target, key, receiver) {
      if (['includes', 'filter', 'forEach', 'map', 'reduce', 'some'].includes(key)) scans += 1
      return Reflect.get(target, key, receiver)
    },
  })
  let game = awardAchievements(withBlueprint(blueprint))
  const scansAfterFirstCheck = scans
  for (let tick = 0; tick < 120; tick += 1) {
    game = awardAchievements({ ...game, crops: tick, playtimeSeconds: tick / 60 })
  }
  assert.equal(scans, scansAfterFirstCheck)
})
