import assert from 'node:assert/strict'
import test from 'node:test'
import { createInitialGame } from '../src/game/blueprintLogic.js'
import { AUTOSAVE_INTERVAL_MS } from '../src/game/gameConfig.js'
import { saveGame } from '../src/game/storage.js'
import { formatTimeSinceSave } from '../src/tabs/uiHelpers.js'

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
test('last-save elapsed time remains readable while updating every second', () => {
  assert.equal(formatTimeSinceSave(null, 5_000), 'Not saved yet')
  assert.equal(formatTimeSinceSave(1_000, 5_000), '4s ago')
  assert.equal(formatTimeSinceSave(1_000, 66_000), '1m 5s ago')
  assert.equal(
    formatTimeSinceSave(1_000, 90_062_000),
    '1d 1h 1m 1s ago',
  )
})
