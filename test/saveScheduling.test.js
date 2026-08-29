import assert from 'node:assert/strict'
import test from 'node:test'
import { createInitialGame } from '../src/game/blueprintLogic.js'
import { AUTOSAVE_INTERVAL_MS } from '../src/game/gameConfig.js'
import { saveGame } from '../src/game/storage.js'

test('autosaving is scheduled every two minutes', () => {
  assert.equal(AUTOSAVE_INTERVAL_MS, 120_000)
})

test('manual local saving reports success and storage failures', () => {
  const previousWindow = globalThis.window
  let savedValue = null

  try {
    globalThis.window = {
      localStorage: {
        setItem(_key, value) {
          savedValue = value
        },
      },
    }

    assert.equal(saveGame(createInitialGame(), 1234), true)
    assert.equal(typeof savedValue, 'string')
    assert.ok(savedValue.length > 0)

    globalThis.window.localStorage.setItem = () => {
      throw new Error('Storage unavailable')
    }

    assert.equal(saveGame(createInitialGame(), 1234), false)
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
  }
})
