import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACHIEVEMENTS, awardAchievements, createBlueprint, createInitialGame,
  getHamsterTreats,
} from '../src/game/gameLogic.js'
import { getMonocropCropCount, getMonocropThresholdBonus } from '../src/game/cropEffects.js'
import { getMonocropThreshold } from '../src/game/monocropPenalty.js'
import { exportGame, importGame } from '../src/game/storage.js'

const id = 'palmOilPlantation'
const otherAwards = ACHIEVEMENTS.filter((achievement) => achievement.id !== id)
  .map((achievement) => achievement.id)

function gameWith(blueprint, extra = {}) {
  return { ...createInitialGame(), blueprint, blueprintSlots: [blueprint],
    earnedAchievementIds: otherAwards, ...extra }
}

function earns(game) {
  return awardAchievements(game).earnedAchievementIds.includes(id)
}

test('Palm Oil Plantation needs at least 148 Peanuts in a completely filled field', () => {
  for (const count of [147, 148]) {
    const blueprint = createBlueprint({ rows: 1, columns: count,
      cells: Array(count).fill('peanuts') })
    assert.equal(getMonocropCropCount(blueprint, 'peanuts'), count ** 2)
    const ratio = count ** 2 / getMonocropThreshold(count)
    assert.equal(ratio >= 500, count === 148)
    assert.equal(earns(gameWith(blueprint)), count === 148)
  }
  const definition = ACHIEVEMENTS.find((achievement) => achievement.id === id)
  assert.equal(definition.tier, 1)
  assert.equal(definition.treats, 5)
  assert.equal(definition.monocropFactor, 500)
})

test('the actual field size and unrounded limit are used, including empty tiles', () => {
  // A 10×15 field has a 44.112... limit, displayed as 45. With 149 Peanuts
  // its ratio is 503.29...; rounding that limit would incorrectly reject it.
  const blueprint = createBlueprint({ rows: 10, columns: 15,
    cells: Array(149).fill('peanuts') })
  assert.equal(earns(gameWith(blueprint)), true)
  assert.equal(earns(gameWith(createBlueprint({ ...blueprint,
    cells: Array(148).fill('peanuts') }))), false)
  assert.equal(earns(gameWith(createBlueprint({ rows: 12, columns: 12,
    cells: Array(144).fill('peanuts') }))), false)
})

test('Monocrop limit bonuses are respected and modifier changes invalidate the check', () => {
  const cells = Array(156).fill('peanuts')
  cells[0] = 'knotweed'
  for (const index of [1, 13, 14]) cells[index] = 'splitweedPart'
  cells[155] = null
  const blueprint = createBlueprint({ rows: 12, columns: 13, cells,
    requireSplitweedFootprints: true })
  assert.equal(getMonocropCropCount(blueprint, 'peanuts'), 151 ** 2)
  assert.equal(earns(gameWith(blueprint)), true)
  const perfections = ['splitweed']
  assert.equal(getMonocropThresholdBonus(blueprint, perfections), 2)
  assert.equal(earns(gameWith(blueprint, { completedCropPerfections: perfections })), false)
})

test('one blueprint must qualify, but a qualifying inactive slot also earns the award', () => {
  const partial = createBlueprint({ rows: 8, columns: 10,
    cells: Array(80).fill('peanuts') })
  const another = createBlueprint({ ...partial })
  assert.equal(earns(gameWith(partial, { blueprintSlots: [partial, another] })), false)
  const qualifying = createBlueprint({ rows: 10, columns: 15,
    cells: Array(150).fill('peanuts') })
  assert.equal(earns(gameWith(partial, { blueprintSlots: [partial, qualifying] })), true)
})

test('the award is permanent, idempotent, and survives save export/import', () => {
  const blueprint = createBlueprint({ rows: 10, columns: 15,
    cells: Array(150).fill('peanuts') })
  const before = gameWith(blueprint)
  const earned = awardAchievements(before)
  assert.equal(getHamsterTreats(earned) - getHamsterTreats(before), 5)
  assert.equal(awardAchievements(earned), earned)
  const empty = createBlueprint({ rows: 10, columns: 15, cells: [] })
  const cleared = awardAchievements({ ...earned, blueprint: empty, blueprintSlots: [empty] })
  assert.equal(cleared.earnedAchievementIds.includes(id), true)
  assert.equal(importGame(exportGame(cleared)).earnedAchievementIds.includes(id), true)
})
