import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  canUnlockCropPerfection,
  createInitialGame,
  GAME_AREA_IDS,
  isCropPerfectionVisible,
  MAJOR_PROGRESSION_GOALS,
  switchGameArea,
  unlockCropPerfection,
} from '../src/game/gameLogic.js'
import { exportGame, importGame } from '../src/game/storage.js'

const perfectionIds = ['sweetPotato', 'samplingLentil']
let server
let Inventions

before(async () => {
  server = await createServer({
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })
  ;({ Inventions } = await server.ssrLoadModule('/src/tabs/Inventions.jsx'))
})

after(async () => { await server?.close() })

function mainGame() {
  return {
    ...createInitialGame(),
    crops: 1e150,
    hasUnlockedCropPerfection: true,
    hasUnlockedRowDuplicators: true,
    hasUnlockedLentil: true,
    capybara: { completedDemonstrations: ['introduction', 'demonstrationOne'] },
  }
}

function render(game) {
  return renderToStaticMarkup(createElement(Inventions, {
    game,
    activeInventionsTab: 'cropPerfection',
    blueprintExpansionTracks: [],
    canUnlockSweetPotato: canUnlockCropPerfection(game, 'sweetPotato'),
    canUnlockSamplingLentil: canUnlockCropPerfection(game, 'samplingLentil'),
    hasSweetPotato: game.completedCropPerfections.includes('sweetPotato'),
    hasSamplingLentil: game.completedCropPerfections.includes('samplingLentil'),
  }))
}

test('both perfections stay hidden and unpurchasable before entering Misfortune, even after Demo 1', () => {
  const game = mainGame()
  for (const id of perfectionIds) {
    assert.equal(isCropPerfectionVisible(game, id), false)
    assert.equal(canUnlockCropPerfection(game, id), false)
    assert.equal(unlockCropPerfection(game, id), null)
    const goal = MAJOR_PROGRESSION_GOALS.find(({ id: goalId }) => goalId === `perfection-${id}`)
    assert.equal(goal.isApplicable(game), false)
  }
  const html = render(game)
  assert.ok(!html.includes('Sweet Potato'))
  assert.ok(!html.includes('Sampling Lentil'))
  assert.ok(html.includes('Splitweed'))
})

test('entering Misfortune reveals both perfections without changing their other requirements', () => {
  const entered = {
    ...switchGameArea(mainGame(), GAME_AREA_IDS.MISFORTUNE),
    crops: 1e150,
    hasUnlockedLentil: true,
  }
  for (const id of perfectionIds) {
    assert.equal(isCropPerfectionVisible(entered, id), true)
    assert.equal(canUnlockCropPerfection(entered, id), true)
    assert.equal(canUnlockCropPerfection({ ...entered, crops: 0 }, id), false)
    const goal = MAJOR_PROGRESSION_GOALS.find(({ id: goalId }) => goalId === `perfection-${id}`)
    assert.equal(goal.isApplicable(entered), true)
  }
  assert.equal(canUnlockCropPerfection({ ...entered, hasUnlockedRowDuplicators: false }, 'sweetPotato'), false)
  const html = render(entered)
  assert.ok(html.includes('Sweet Potato'))
  assert.ok(html.includes('Sampling Lentil'))
})

test('returning to Main and saving preserves visibility after a Misfortune visit', () => {
  const returned = switchGameArea(
    switchGameArea(mainGame(), GAME_AREA_IDS.MISFORTUNE),
    GAME_AREA_IDS.MAIN,
  )
  const restored = importGame(exportGame(returned))
  for (const game of [returned, restored]) {
    for (const id of perfectionIds) {
      assert.equal(isCropPerfectionVisible(game, id), true)
      assert.equal(canUnlockCropPerfection(game, id), true)
    }
    const html = render(game)
    assert.ok(html.includes('Sweet Potato'))
    assert.ok(html.includes('Sampling Lentil'))
  }
})

test('existing owned perfections stay visible without requiring another Misfortune visit', () => {
  const game = { ...mainGame(), completedCropPerfections: perfectionIds }
  for (const id of perfectionIds) {
    assert.equal(isCropPerfectionVisible(game, id), true)
    assert.equal(canUnlockCropPerfection(game, id), false)
  }
  const html = render(game)
  assert.ok(html.includes('Sweet Potato'))
  assert.ok(html.includes('Sampling Lentil'))
})

test('other perfections and the base Potato and Lentil remain unaffected', () => {
  const game = mainGame()
  assert.equal(isCropPerfectionVisible(game, 'enrichingLeek'), true)
  assert.equal(canUnlockCropPerfection(game, 'enrichingLeek'), true)
  assert.equal(isCropPerfectionVisible(game, 'splitweed'), true)
  assert.equal(isCropPerfectionVisible(game, 'unknown'), false)
  assert.equal(game.hasUnlockedLentil, true)
  assert.equal(game.completedCropPerfections.length, 0)
})
