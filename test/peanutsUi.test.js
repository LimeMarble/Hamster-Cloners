import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  ACHIEVEMENTS, MISFORTUNE_UPGRADES, createBlueprint, createInitialGame,
  getAchievementHamsterMultiplier, getBlueprintCropStats, getFortuneModifiers,
  getOilyTreatsFloorMultiplier,
} from '../src/game/gameLogic.js'

let server, Misfortune, Achievements, useGameDerivedState
before(async () => {
  server = await createServer({ logLevel: 'silent',
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ Misfortune } = await server.ssrLoadModule('/src/tabs/Misfortune.jsx'))
  ;({ Achievements } = await server.ssrLoadModule('/src/tabs/Achievements.jsx'))
  ;({ useGameDerivedState } = await server.ssrLoadModule('/src/hooks/useGameDerivedState.js'))
})
after(async () => { await server?.close() })

function upgradeProps() {
  return Object.fromEntries(Object.entries(MISFORTUNE_UPGRADES))
}

test('Oily Treats advertises floors only and offers the explicit return-to-main detour after purchase', () => {
  const props = { ...upgradeProps(), huntForSomethingGreaterMultiplier: 1,
    missingMisfortuneCropTypeCount: 0 }
  const locked = renderToStaticMarkup(createElement(Misfortune, props))
  assert.match(locked, /Oily Treats/)
  assert.match(locked, /Floor Replicator production gains the square root/)
  assert.match(locked, /Hamsters and Row Duplicators gain no additional bonus/)
  assert.match(locked, /Sweet Potato perfection back in the main/)
  assert.doesNotMatch(locked, /View Sweet Potato in Main/)
  const bought = renderToStaticMarkup(createElement(Misfortune, { ...props, hasOilyTreats: true }))
  assert.match(bought, /View Sweet Potato in Main/)
  const perfected = renderToStaticMarkup(createElement(Misfortune, {
    ...props, hasOilyTreats: true, hasSweetPotato: true }))
  assert.doesNotMatch(perfected, /View Sweet Potato in Main/)
})

test('the achievement summary displays the powered Treat multiplier, without changing permanent points', () => {
  const markup = renderToStaticMarkup(createElement(Achievements, {
    earnedAchievementIds: ACHIEVEMENTS.filter(({ tier }) => tier > 1).map(({ id }) => id),
    hamsterTreatMultiplier: 512, hamsterTreatExponent: 4.5,
  }))
  assert.match(markup, /Hamster Treat exponent/)
  assert.match(markup, /512/)
  assert.match(markup, /4\.5/)
  assert.match(markup, /300/)
})

test('visible production and unlock information agrees with the game formulas in both areas', () => {
  const blueprint = createBlueprint({ rows: 14, columns: 14, cells: Array(7).fill('peanuts') })
  for (const activeArea of ['main', 'misfortune']) {
    const game = { ...createInitialGame(), activeArea, blueprint, blueprintSlots: [blueprint],
      hamsters: 1, rowDuplicators: 1, hasUnlockedRowDuplicators: true,
      hasUnlockedFloorReplicators: true, floorReplicators: 10,
      completedMisfortuneUpgrades: ['oilyTreats'],
      earnedAchievementIds: [...ACHIEVEMENTS.filter(({ tier }) => tier > 1).map(({ id }) => id), 'makingPeanuts'] }
    let derived
    function Probe() {
      derived = useGameDerivedState(game)
      return null
    }
    renderToStaticMarkup(createElement(Probe))
    const fortune = getFortuneModifiers(game)
    assert.equal(derived.hamsterExternalMultiplier,
      getAchievementHamsterMultiplier(game, fortune.passiveEffectMultiplier))
    assert.equal(derived.floorReplicatorExternalMultiplier,
      getOilyTreatsFloorMultiplier(game, fortune.passiveEffectMultiplier))
    assert.equal(derived.rowDuplicatorExternalMultiplier, 1)
    assert.ok(derived.visibleCropIds.includes('peanuts'))
    assert.ok(derived.unlockedCropIds.includes('peanuts'))
    const stats = getBlueprintCropStats(blueprint, 0, [], 0, 1, 0, fortune)
    assert.ok(stats.passiveStats.some(({ id }) => id === 'peanut-treat-exponent'))
  }
})
