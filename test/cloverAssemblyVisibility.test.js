import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  canUnlockGreaterBlueprinting,
  createInitialGame,
  GAME_AREA_IDS,
  GREATER_BLUEPRINTING_COST,
  isGreaterBlueprintingVisible,
  MISFORTUNE_UPGRADE_IDS,
  unlockGreaterBlueprinting,
  wipeMisfortuneAreaProgress,
} from '../src/game/gameLogic.js'

let server
let CloverAssembly

before(async () => {
  server = await createServer({
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })
  ;({ CloverAssembly } = await server.ssrLoadModule('/src/tabs/CloverAssembly.jsx'))
})

after(async () => { await server?.close() })

function render(game) {
  return renderToStaticMarkup(createElement(CloverAssembly, {
    game,
    canUnlockGreaterBlueprinting: canUnlockGreaterBlueprinting(game),
    isCloverAssemblyReady: false,
    productionPerSecond: 0,
  }))
}

function fundedGame() {
  return { ...createInitialGame(), crops: GREATER_BLUEPRINTING_COST }
}

test('the Clover precursor and its requirement remain hidden before Hunt, even when affordable', () => {
  const game = fundedGame()

  assert.equal(isGreaterBlueprintingVisible(game), false)
  assert.equal(canUnlockGreaterBlueprinting(game), false)
  assert.equal(unlockGreaterBlueprinting(game), null)
  assert.equal(render(game), '')
})

test('Hunt reveals the precursor in both areas but keeps the existing main-field purchase rule', () => {
  const game = {
    ...fundedGame(),
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER],
  }
  const misfortune = { ...game, activeArea: GAME_AREA_IDS.MISFORTUNE }

  assert.equal(isGreaterBlueprintingVisible(game), true)
  assert.equal(isGreaterBlueprintingVisible(misfortune), true)
  assert.equal(canUnlockGreaterBlueprinting(game), true)
  assert.equal(canUnlockGreaterBlueprinting(misfortune), false)
  assert.ok(render(game).includes('Greater Blueprinting'))
  assert.ok(render(misfortune).includes('Main field only'))
  assert.equal(unlockGreaterBlueprinting(game).crops, 0)
  assert.equal(unlockGreaterBlueprinting(misfortune), null)
})

test('existing research remains visible and its assembly stays accessible after a Misfortune wipe', () => {
  const game = wipeMisfortuneAreaProgress({
    ...fundedGame(),
    hasUnlockedGreaterBlueprinting: true,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER],
  })

  assert.equal(game.completedMisfortuneUpgrades.includes(MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER), false)
  assert.equal(isGreaterBlueprintingVisible(game), true)
  assert.equal(canUnlockGreaterBlueprinting(game), false)
  const html = render(game)
  assert.ok(html.includes('Researched'))
  assert.ok(html.includes('5-Leaf Clover assembly'))
})
