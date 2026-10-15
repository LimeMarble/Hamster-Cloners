import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createInitialGame } from '../src/game/blueprintLogic.js'
import { createGameSaveFile, downloadSaveFile } from '../src/game/saveFile.js'
import { exportGame, importGameSnapshot } from '../src/game/storage.js'
import { useGameActions } from '../src/hooks/useGameActions.js'

const savedAt = Date.parse('2026-10-01T12:34:56.789Z')

test('file exports use the existing Base64 save format and preserve snapshot time', () => {
  const game = { ...createInitialGame(), crops: 12_345, hamsters: 10 }
  const original = JSON.stringify(game)
  const saveFile = createGameSaveFile(game, savedAt)

  assert.equal(saveFile.filename, 'hamster-cloners-main-2026-10-01T12-34-56-789Z.txt')
  assert.equal(saveFile.contents, exportGame(game, savedAt))
  assert.match(saveFile.contents, /^[A-Za-z0-9+/]+={0,2}$/)
  const restored = importGameSnapshot(saveFile.contents, savedAt)
  assert.equal(restored.savedAt, savedAt)
  assert.equal(restored.game.crops, game.crops)
  assert.equal(restored.game.hamsters, game.hamsters)
  assert.equal(JSON.stringify(game), original)
})

test('sample filenames distinguish areas and successive snapshots without unsafe filename characters', () => {
  const game = { ...createInitialGame(), activeArea: 'misfortune' }
  const first = createGameSaveFile(game, savedAt)
  const second = createGameSaveFile(game, savedAt + 1)

  assert.equal(first.filename, 'hamster-cloners-misfortune-2026-10-01T12-34-56-789Z.txt')
  assert.notEqual(first.filename, second.filename)
  assert.doesNotMatch(first.filename, /[<>:"/\\|?*]/)
})

function mockDownloadBrowser(t, shouldFail = false) {
  const previousDocument = globalThis.document
  const calls = []
  const captured = {}
  const link = {
    click() {
      calls.push('click')
      if (shouldFail) throw new Error('Downloads unavailable')
    },
    remove() { calls.push('remove') },
  }
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'a')
      return link
    },
    body: {
      appendChild(element) {
        assert.equal(element, link)
        calls.push('append')
      },
    },
  }
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  })
  t.mock.method(URL, 'createObjectURL', (blob) => {
    captured.blob = blob
    return 'blob:save-file'
  })
  t.mock.method(URL, 'revokeObjectURL', (url) => {
    assert.equal(url, 'blob:save-file')
    calls.push('revoke')
  })
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    captured.cleanup = callback
    assert.equal(delay, 1000)
    return 1
  })
  return { calls, captured, link }
}

test('downloads the exact snapshot and releases browser resources after the download starts', async (t) => {
  const { calls, captured, link } = mockDownloadBrowser(t)
  const saveFile = createGameSaveFile(createInitialGame(), savedAt)

  downloadSaveFile(saveFile)

  assert.equal(link.href, 'blob:save-file')
  assert.equal(link.download, saveFile.filename)
  assert.equal(link.hidden, true)
  assert.equal(captured.blob.type, 'text/plain;charset=utf-8')
  assert.equal(await captured.blob.text(), saveFile.contents)
  assert.deepEqual(calls, ['append', 'click', 'remove'])
  captured.cleanup()
  assert.deepEqual(calls, ['append', 'click', 'remove', 'revoke'])
})

test('failed downloads report failure while still cleaning up the temporary link and URL', (t) => {
  const { calls, captured } = mockDownloadBrowser(t, true)

  assert.throws(
    () => downloadSaveFile(createGameSaveFile(createInitialGame(), savedAt)),
    /Downloads unavailable/,
  )
  assert.deepEqual(calls, ['append', 'click', 'remove'])
  captured.cleanup()
  assert.deepEqual(calls, ['append', 'click', 'remove', 'revoke'])
})

test('the Options export action downloads the latest live game, not the state from its last render', async (t) => {
  const { captured } = mockDownloadBrowser(t)
  const gameRef = { current: createInitialGame() }
  let options
  function ActionsProbe() {
    options = useGameActions({ gameRef }).options
    return null
  }
  renderToStaticMarkup(createElement(ActionsProbe))
  gameRef.current = { ...gameRef.current, crops: 98_765, hamsters: 42 }

  options.onExportSaveToFile()

  const snapshot = importGameSnapshot(await captured.blob.text())
  assert.equal(snapshot.game.crops, 98_765)
  assert.equal(snapshot.game.hamsters, 42)
  captured.cleanup()
})
