import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACHIEVEMENTS, awardAchievements, createBlueprint, createInitialGame,
  getHamsterTreats,
} from '../src/game/gameLogic.js'
import { exportGame, importGame } from '../src/game/storage.js'

const PERFECTED = 'challengeContest'
const BED = 'sweetDreams'

function withBed(count, extra = {}) {
  const blueprint = createBlueprint({
    rows: 6, columns: 6, cells: Array(count).fill('sweetPotato'),
  })
  return {
    ...createInitialGame(), blueprint, blueprintSlots: [blueprint],
    hasUnlockedSweetPotato: true,
    completedCropPerfections: ['sweetPotato'],
    completedMisfortuneUpgrades: ['oilyTreats'],
    ...extra,
  }
}

test('both Sweet Potato achievements are Tier 1 and award five Treats each', () => {
  for (const id of [PERFECTED, BED]) {
    const achievement = ACHIEVEMENTS.find((entry) => entry.id === id)
    assert.equal(achievement.tier, 1)
    assert.equal(achievement.treats, 5)
  }
  assert.equal(getHamsterTreats([PERFECTED, BED]), 10)
  assert.equal(ACHIEVEMENTS.find(({ id }) => id === PERFECTED).name,
    'I Thought This Was Going to be a Challenge Contest')
})

test('Challenge Contest requires Sweet Potato perfection and a visit to Misfortune', () => {
  const initial = createInitialGame()
  const perfected = { ...initial, completedCropPerfections: ['sweetPotato'] }
  assert.ok(!awardAchievements(perfected).earnedAchievementIds.includes(PERFECTED))
  assert.ok(!awardAchievements({ ...initial, activeArea: 'misfortune',
    completedCropPerfections: ['enrichingLeek'] }).earnedAchievementIds.includes(PERFECTED))
  for (const history of [
    { activeArea: 'misfortune' },
    { areaProgress: { misfortune: {} } },
    { completedMisfortuneUpgrades: ['oilyTreats'] },
    { earnedAchievementIds: ['misfortune'] },
  ]) {
    assert.ok(awardAchievements({ ...perfected, ...history })
      .earnedAchievementIds.includes(PERFECTED))
  }
})

test('Sweet Dreams requires perfection and awards at twelve connected tiles or more', () => {
  assert.ok(!awardAchievements(withBed(11)).earnedAchievementIds.includes(BED))
  assert.ok(!awardAchievements(withBed(12, { completedCropPerfections: [] }))
    .earnedAchievementIds.includes(BED))
  for (const activeArea of ['main', 'misfortune']) {
    for (const count of [12, 13]) {
      const awarded = awardAchievements(withBed(count, { activeArea }))
      assert.ok(awarded.earnedAchievementIds.includes(BED))
      assert.equal(awardAchievements(awarded), awarded)
    }
  }
})

test('separate beds, diagonal contacts, and wrapped rows do not combine', () => {
  const diagonal = createBlueprint({ rows: 12, columns: 12,
    cells: Array.from({ length: 144 }, (_, index) =>
      Math.floor(index / 12) === index % 12 ? 'sweetPotato' : null) })
  const wrapped = createBlueprint({ rows: 2, columns: 12,
    cells: [...Array(6).fill(null), ...Array(12).fill('sweetPotato'), ...Array(6).fill(null)] })
  for (const blueprint of [diagonal, wrapped]) {
    assert.ok(!awardAchievements(withBed(0, { blueprint, blueprintSlots: [blueprint] }))
      .earnedAchievementIds.includes(BED))
  }
  const six = withBed(6).blueprint
  assert.ok(!awardAchievements(withBed(6, { blueprintSlots: [six, six] }))
    .earnedAchievementIds.includes(BED))
})

test('a qualifying inactive blueprint earns Sweet Dreams', () => {
  const game = withBed(1)
  assert.ok(awardAchievements({ ...game,
    blueprintSlots: [game.blueprint, withBed(12).blueprint] })
    .earnedAchievementIds.includes(BED))
})

test('old saves receive qualifying awards and retain them after the bed is removed', () => {
  const restored = importGame(exportGame(withBed(12)))
  assert.ok(restored.earnedAchievementIds.includes(PERFECTED))
  assert.ok(restored.earnedAchievementIds.includes(BED))
  const empty = createBlueprint({ rows: 6, columns: 6, cells: [] })
  const saved = importGame(exportGame({ ...restored,
    blueprint: empty, blueprintSlots: [empty] }))
  assert.ok(saved.earnedAchievementIds.includes(PERFECTED))
  assert.ok(saved.earnedAchievementIds.includes(BED))
})

test('an unfinished bed reuses its cached checks between production ticks', () => {
  let scans = 0
  const game = withBed(11)
  game.blueprint.cells = new Proxy(game.blueprint.cells, {
    get(target, key, receiver) {
      if (['includes', 'filter', 'forEach', 'map', 'reduce', 'some'].includes(key)) scans += 1
      return Reflect.get(target, key, receiver)
    },
  })
  let awarded = awardAchievements(game)
  // The first awards change which achievements still need checking.
  awarded = awardAchievements(awarded)
  const initialScans = scans
  for (let tick = 0; tick < 120; tick += 1) {
    awarded = awardAchievements({ ...awarded, crops: tick, playtimeSeconds: tick / 60 })
  }
  assert.equal(scans, initialScans)
  assert.ok(!awarded.earnedAchievementIds.includes(BED))
})
