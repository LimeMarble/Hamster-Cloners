import assert from 'node:assert/strict'
import test from 'node:test'
import { ACHIEVEMENTS, ACHIEVEMENT_DISPLAY_ORDER, getAchievementsForTier } from '../src/game/achievementDefinitions.js'

test('display order includes every existing achievement exactly once without changing award order', () => {
  assert.equal(new Set(ACHIEVEMENT_DISPLAY_ORDER).size, ACHIEVEMENTS.length)
  assert.deepEqual([...ACHIEVEMENT_DISPLAY_ORDER].sort(), ACHIEVEMENTS.map(({ id }) => id).sort())
  const originalIds = ACHIEVEMENTS.map(({ id }) => id)
  for (const tier of [1, 2, 3]) {
    assert.ok(getAchievementsForTier(tier).every((achievement) => achievement.tier === tier))
  }
  assert.deepEqual(ACHIEVEMENTS.map(({ id }) => id), originalIds)
})

test('crop thresholds follow crop order and later side mechanics appear later', () => {
  const achievements = getAchievementsForTier(1)
  assert.deepEqual(achievements.filter(({ metric }) => metric).map(({ id }) => id), [
    'leek1000', 'potato100', 'turnip3', 'apple10B', 'sunflower400K', 'canola800',
  ])
  const ids = achievements.map(({ id }) => id)
  assert.ok(ids.indexOf('absolutelyNothing') < ids.indexOf('thisIsFine'))
  assert.ok(ids.indexOf('backUnderControl') < ids.indexOf('controlledBurn'))
})

test('milestones follow the current unlock order and phase shifts remain linear', () => {
  assert.deepEqual(getAchievementsForTier(2).map(({ id }) => id), [
    'inventions', 'firstExpansion', 'unionized', 'firstPerfection', 'rowDuplicators', 'seedAugmentation',
    'supportingCast',
  ])
  assert.deepEqual(getAchievementsForTier(3).map(({ id }) => id), ['trade', 'misfortune', 'manatees'])
})

test('perfecting Sweet Potato is listed before forming a Sweet Potato bed', () => {
  const ids = getAchievementsForTier(1).map(({ id }) => id)
  assert.ok(ids.indexOf('challengeContest') >= 0)
  assert.equal(ids.indexOf('sweetDreams'), ids.indexOf('challengeContest') + 1)
  assert.ok(ids.indexOf('cmonDoSomething') > ids.indexOf('sweetDreams'))
})
