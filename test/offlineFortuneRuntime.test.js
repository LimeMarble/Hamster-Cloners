import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import * as simulation from '../src/game/gameSimulation.js'
import * as config from '../src/game/gameConfig.js'
import { createInitialGame } from '../src/game/gameLogic.js'
import { awardAchievements } from '../src/game/achievementLogic.js'
import { shareUnchangedStructure } from '../src/game/structuralSharing.js'

// Execute the real browser entry points with injected imports and controlled
// clocks, without a browser, React renderer, or real background timers.
async function sourceWithoutImports(relativePath) {
  const url = new URL(relativePath, import.meta.url)
  return (await readFile(url, 'utf8'))
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
    .replaceAll('import.meta.url', JSON.stringify(url.href))
}

function runtimeGame() {
  const initial = createInitialGame()
  return {
    ...initial,
    farmland: { ...initial.farmland, columns: 1 },
    fortune: { ...initial.fortune,
      secondsTowardBundleRoll: 4,
      activeEffects: [{ id: 'bounty', remainingSeconds: 1850 }] },
  }
}

function clock() {
  let now = 10000000
  let nextTimerId = 0
  const timers = new Map()
  return {
    Date: class extends Date { static now() { return now } },
    now: () => now,
    advance: (seconds) => { now += seconds * 1000 },
    setTimeout: (callback, delay) => {
      timers.set(++nextTimerId, { callback, delay })
      return nextTimerId
    },
    clearTimeout: (id) => timers.delete(id),
    runNext: () => {
      const [id, timer] = [...timers].sort((a, b) => a[1].delay - b[1].delay)[0]
      timers.delete(id)
      timer.callback()
    },
    timers,
  }
}

async function workerHarness() {
  const time = clock()
  const messages = []
  let listener
  const self = {
    setTimeout: time.setTimeout,
    clearTimeout: time.clearTimeout,
    addEventListener: (type, handler) => { if (type === 'message') listener = handler },
    postMessage: (message) => messages.push(message),
  }
  runInNewContext(await sourceWithoutImports('../src/workers/gameSimulation.worker.js'), {
    ...simulation, ...config, self, Date: time.Date, performance: { now: () => 0 },
  })
  return {
    ...time,
    messages,
    send: (message) => listener({ data: message }),
    snapshot: () => messages.filter((message) => message.type === 'snapshot').at(-1),
  }
}

test('worker freezes even sub-second reloads and hidden-tab returns, then resumes active buffs', async () => {
  const runtime = await workerHarness()
  const game = runtimeGame()
  runtime.send({ type: 'initialize', game, simulatedAt: runtime.now() - 200,
    now: runtime.now(), visible: true })
  const loaded = runtime.snapshot().game
  assert.strictEqual(loaded.fortune, game.fortune)
  assert.ok(Math.abs(loaded.crops - game.crops - 0.2) < 1e-10)

  runtime.send({ type: 'set-visibility', visible: false, now: runtime.now() })
  assert.equal(runtime.timers.size, 0)
  runtime.advance(0.2)
  runtime.send({ type: 'set-visibility', visible: true, now: runtime.now() })
  const returned = runtime.snapshot().game
  assert.strictEqual(returned.fortune, game.fortune)
  assert.ok(Math.abs(returned.crops - loaded.crops - 0.2) < 1e-10)

  runtime.advance(0.1)
  runtime.runNext()
  const active = runtime.snapshot().game
  assert.ok(active.fortune.activeEffects[0].remainingSeconds < 1850)
  assert.ok(active.crops - returned.crops > 0.1 * 17.77)
})

test('worker compressed, sped-up and skipped catch-up all preserve fortunes, including loading time', async () => {
  for (const control of [null, 'compress-catch-up', 'skip-catch-up']) {
    const runtime = await workerHarness()
    const game = runtimeGame()
    runtime.send({ type: 'initialize', game, simulatedAt: runtime.now() - 3600000,
      now: runtime.now(), visible: true })
    assert.ok(runtime.messages.some((message) => message.type === 'catch-up-progress'))
    if (control) runtime.send({ type: control })
    runtime.advance(2) // Processing the loading screen must not consume buffs.
    for (let guard = 0; guard < 100; guard++) {
      if (runtime.messages.some((message) => message.type === 'catch-up-complete')) break
      runtime.runNext()
    }
    assert.ok(runtime.messages.some((message) => message.type === 'catch-up-complete'))
    const snapshot = runtime.snapshot()
    assert.strictEqual(snapshot.game.fortune, game.fortune)
    assert.ok(Math.abs(snapshot.game.crops - game.crops - 3602) < 1e-8)
    assert.equal(snapshot.simulatedAt, runtime.now())
  }
})

async function fallbackHarness(hidden = false) {
  const time = clock()
  const game = runtimeGame()
  const states = []
  const effects = []
  const listeners = new Map()
  const document = { hidden,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type) }
  const window = { setTimeout: time.setTimeout, clearTimeout: time.clearTimeout,
    addEventListener() {}, removeEventListener() {} }
  const source = await sourceWithoutImports('../src/hooks/useGameState.js')
  const mount = runInNewContext(
    source.replace('export function useGameState', 'function useGameState') + '\nuseGameState',
    {
      ...simulation, ...config, Date: time.Date, document, window, URL,
      Worker: class { constructor() { throw new Error('Workers unavailable') } },
      useState: (initial) => {
        const index = states.length
        states.push(typeof initial === 'function' ? initial() : initial)
        return [states[index], (value) => {
          states[index] = typeof value === 'function' ? value(states[index]) : value
        }]
      },
      useRef: (current) => ({ current }),
      useCallback: (callback) => callback,
      useEffect: (effect) => effects.push(effect),
      loadGameSnapshot: () => ({ game, savedAt: time.now() - 200, lastSavedAt: time.now() - 200 }),
      saveGame: () => true,
      setActiveNumberNotation() {},
      awardAchievements, shareUnchangedStructure,
    },
  )
  const controller = mount({ current: false })
  const cleanup = effects.map((effect) => effect())
  return {
    ...time, game, controller, states,
    hide: () => { document.hidden = true; listeners.get('visibilitychange')() },
    show: () => { document.hidden = false; listeners.get('visibilitychange')() },
    dispose: () => cleanup.forEach((callback) => callback?.()),
  }
}

test('fallback freezes short offline gaps and stops ticking while hidden', async (t) => {
  const runtime = await fallbackHarness()
  t.after(runtime.dispose)
  runtime.runNext()
  assert.strictEqual(runtime.controller.gameRef.current.fortune, runtime.game.fortune)
  assert.equal(runtime.states[4], true)
  runtime.advance(0.1)
  runtime.runNext()
  assert.ok(runtime.controller.gameRef.current.fortune.activeEffects[0].remainingSeconds < 1850)

  runtime.hide()
  const before = runtime.controller.gameRef.current
  assert.ok([...runtime.timers.values()].every(({ delay }) => delay === config.AUTOSAVE_INTERVAL_MS))
  runtime.advance(0.2)
  runtime.show()
  assert.equal(runtime.states[4], false)
  runtime.runNext()
  const returned = runtime.controller.gameRef.current
  assert.strictEqual(returned.fortune, before.fortune)
  assert.ok(Math.abs(returned.crops - before.crops - 0.2) < 1e-10)
  assert.equal(runtime.states[4], true)
  runtime.advance(0.1)
  runtime.runNext()
  assert.ok(runtime.controller.gameRef.current.fortune.activeEffects[0].remainingSeconds <
    before.fortune.activeEffects[0].remainingSeconds)
})

test('fallback initialized in a hidden tab waits for visibility without burning saved fortunes', async (t) => {
  const runtime = await fallbackHarness(true)
  t.after(runtime.dispose)
  assert.ok([...runtime.timers.values()].every(({ delay }) => delay === config.AUTOSAVE_INTERVAL_MS))
  assert.equal(runtime.states[4], false)
  runtime.advance(0.2)
  runtime.show()
  runtime.runNext()
  assert.strictEqual(runtime.controller.gameRef.current.fortune, runtime.game.fortune)
  assert.ok(Math.abs(runtime.controller.gameRef.current.crops - runtime.game.crops - 0.4) < 1e-10)
  assert.equal(runtime.states[4], true)
})
