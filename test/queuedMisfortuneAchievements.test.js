import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACHIEVEMENTS, awardAchievements, createBlueprint, createInitialGame,
  getHamsterTreats, restartFields,
} from '../src/game/gameLogic.js'
import { exportGame, importGame } from '../src/game/storage.js'

const GOURD = 'cmonDoSomething'
const SUPPORT = 'supportingCast'

function gourdBlueprint(cornIndex = 6) {
  const cells = Array(25).fill(null)
  cells[7] = 'leechingGourd'
  for (const index of [8, 12, 13]) cells[index] = 'leechingGourdPart'
  cells[cornIndex] = 'corn'
  return createBlueprint({ rows: 5, columns: 5, cells })
}

function readyGame(extra = {}) {
  const blueprint = gourdBlueprint()
  return {
    ...createInitialGame(), activeArea: 'misfortune',
    blueprint, blueprintSlots: [blueprint],
    completedCropPerfections: ['mirrorCorn', 'leechingGourd'],
    ...extra,
  }
}

function earns(game, id = GOURD) {
  return awardAchievements(game).earnedAchievementIds.includes(id)
}

test('queued achievements have the agreed names, tiers, and Treat rewards', () => {
  for (const [id, name, tier, treats] of [
    [GOURD, "C'mon do Something...", 1, 5],
    [SUPPORT, 'The Supporting Cast', 2, 25],
  ]) {
    const achievement = ACHIEVEMENTS.find((entry) => entry.id === id)
    assert.equal(achievement.name, name)
    assert.equal(achievement.tier, tier)
    assert.equal(achievement.treats, treats)
  }
  assert.equal(getHamsterTreats([GOURD, SUPPORT]), 30)
})

test('Gourd neutralizing Mirror Corn in Misfortune qualifies at any side of its footprint', () => {
  for (const index of [2, 6, 9, 11, 14, 17]) {
    const blueprint = gourdBlueprint(index)
    assert.ok(earns(readyGame({ blueprint, blueprintSlots: [blueprint] })), `Corn at ${index}`)
  }
  assert.ok(!earns(readyGame({ activeArea: 'main' })))
})

test('both perfections are required, and merely planting nearby or diagonal Corn is insufficient', () => {
  for (const completedCropPerfections of [[], ['mirrorCorn'], ['leechingGourd']]) {
    assert.ok(!earns(readyGame({ completedCropPerfections })))
  }
  for (const index of [1, 4, 24]) {
    const blueprint = gourdBlueprint(index)
    assert.ok(!earns(readyGame({ blueprint, blueprintSlots: [blueprint] })))
  }
  const cells = gourdBlueprint().cells.map((crop) =>
    crop === 'leechingGourd' ? 'pumpkin' : crop === 'leechingGourdPart' ? null : crop)
  const pumpkin = createBlueprint({ rows: 5, columns: 5, cells })
  assert.ok(!earns(readyGame({ blueprint: pumpkin, blueprintSlots: [pumpkin] })))
})

test('debuff removal must be disabled, and toggling it invalidates cached checks', () => {
  const game = readyGame({ seedAugmentations: {
    mirrorCornDebuffRemovalUnlocked: true, mirrorCornDebuffRemovalEnabled: true,
  } })
  assert.ok(!earns(game))
  assert.ok(earns({ ...game, seedAugmentations: {
    ...game.seedAugmentations, mirrorCornDebuffRemovalEnabled: false,
  } }))
})

test('an inactive blueprint can qualify, but separate blueprints cannot combine crops', () => {
  const qualifying = gourdBlueprint()
  const empty = createBlueprint({ rows: 5, columns: 5, cells: [] })
  assert.ok(earns(readyGame({ blueprint: empty, blueprintSlots: [empty, qualifying] })))
  const cornOnly = createBlueprint({ rows: 5, columns: 5, cells: ['corn'] })
  const gourdOnly = createBlueprint({ ...qualifying,
    cells: qualifying.cells.map((crop) => crop === 'corn' ? null : crop) })
  assert.ok(!earns(readyGame({ blueprint: cornOnly, blueprintSlots: [cornOnly, gourdOnly] })))
})

test('burnt Corn, a burnt Gourd, and an infested blueprint do not qualify', () => {
  // Both Corn tiles touching this Gourd receive three reflections; the other
  // reflecting Corn tiles are too far away to have their debuffs neutralized.
  const burntCells = Array(36).fill(null)
  burntCells[14] = 'leechingGourd'
  for (const index of [15, 20, 21]) burntCells[index] = 'leechingGourdPart'
  const burntTargets = Array(36).fill(null)
  for (const [source, target] of [[6, 13], [8, 13], [18, 13], [1, 8], [3, 8], [13, 8]]) {
    burntCells[source] = 'corn'
    burntTargets[source] = target
  }
  const burntCorn = createBlueprint({ rows: 6, columns: 6,
    cells: burntCells, mirrorCornTargets: burntTargets })
  assert.ok(!earns(readyGame({ blueprint: burntCorn, blueprintSlots: [burntCorn] })))

  const burntGourdBase = gourdBlueprint()
  const burntGourdCells = [...burntGourdBase.cells]
  const burntGourdTargets = Array(25).fill(null)
  for (const index of [1, 3, 11]) {
    burntGourdCells[index] = 'corn'
    burntGourdTargets[index] = 7
  }
  const burntGourd = createBlueprint({ ...burntGourdBase,
    cells: burntGourdCells, mirrorCornTargets: burntGourdTargets })
  assert.ok(!earns(readyGame({ blueprint: burntGourd, blueprintSlots: [burntGourd] })))

  const base = gourdBlueprint()
  let planted = 0
  const cells = base.cells.map((crop) => crop || (planted++ < 12 ? 'waterLettuce' : null))
  const infested = createBlueprint({ ...base, cells })
  assert.ok(!earns(readyGame({ blueprint: infested, blueprintSlots: [infested] })))
})

test('The Supporting Cast requires Burdened Foundations, not just support mode or Final Support', () => {
  assert.ok(!earns(createInitialGame(), SUPPORT))
  assert.ok(!earns({ ...createInitialGame(), floorReplicatorMode: 'support',
    completedMisfortuneUpgrades: ['finalSupport'] }, SUPPORT))
  for (const activeArea of ['main', 'misfortune']) {
    for (const floorReplicatorMode of ['construction', 'support']) {
      assert.ok(earns({ ...createInitialGame(), activeArea, floorReplicatorMode,
        floorReplicators: 0, completedMisfortuneUpgrades: ['burdenedFoundations'] }, SUPPORT))
    }
  }
})

test('old saves receive verifiable awards and both achievements survive saves and field restarts', () => {
  const restored = importGame(exportGame({ ...createInitialGame(),
    completedMisfortuneUpgrades: ['burdenedFoundations'] }))
  assert.ok(restored.earnedAchievementIds.includes(SUPPORT))
  const awarded = awardAchievements(readyGame({
    completedMisfortuneUpgrades: ['burdenedFoundations', 'rushedStart'],
  }))
  assert.ok(awarded.earnedAchievementIds.includes(GOURD))
  assert.ok(awarded.earnedAchievementIds.includes(SUPPORT))
  assert.equal(awardAchievements(awarded), awarded)
  const restarted = restartFields(awarded)
  assert.equal(restarted.earnedAchievementIds, awarded.earnedAchievementIds)
  const saved = importGame(exportGame(restarted))
  assert.ok(saved.earnedAchievementIds.includes(GOURD))
  assert.ok(saved.earnedAchievementIds.includes(SUPPORT))
})

test('unfinished Gourd checks are cached across ordinary production ticks', () => {
  let scans = 0
  const blueprint = gourdBlueprint(24)
  blueprint.cells = new Proxy(blueprint.cells, {
    get(target, key, receiver) {
      if (['includes', 'filter', 'forEach', 'map', 'reduce', 'some', 'findIndex'].includes(key)) scans += 1
      return Reflect.get(target, key, receiver)
    },
  })
  let game = awardAchievements(readyGame({ blueprint, blueprintSlots: [blueprint] }))
  game = awardAchievements(game)
  const warmScans = scans
  for (let tick = 0; tick < 120; tick += 1) {
    game = awardAchievements({ ...game, crops: tick, playtimeSeconds: tick / 60 })
  }
  assert.equal(scans, warmScans)
  assert.ok(!game.earnedAchievementIds.includes(GOURD))
})
