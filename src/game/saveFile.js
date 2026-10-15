import { GAME_AREA_IDS } from './gameConfig.js'
import { exportGame } from './storage.js'

export function createGameSaveFile(game, savedAt = Date.now()) {
  const timestamp = new Date(savedAt).toISOString().replace(/[:.]/g, '-')
  const area = game.activeArea === GAME_AREA_IDS.MISFORTUNE
    ? GAME_AREA_IDS.MISFORTUNE
    : GAME_AREA_IDS.MAIN

  return {
    filename: `hamster-cloners-${area}-${timestamp}.txt`,
    contents: exportGame(game, savedAt),
  }
}

export function downloadSaveFile({ filename, contents }) {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)

  try {
    link.href = objectUrl
    link.download = filename
    link.hidden = true
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    // Give the browser time to start reading the file before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
