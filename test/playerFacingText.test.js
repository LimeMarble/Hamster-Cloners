import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

test('game source contains no literal or encoded em dashes', () => {
  const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url))
  const forbiddenTokens = [
    String.fromCodePoint(0x2014),
    String.raw`\u2014`,
    String.raw`\u{2014}`,
    '&#8212;',
    '&#x2014;',
    '&mdash;',
  ]
  const offendingFiles = readdirSync(sourceDirectory, { recursive: true })
    .filter((path) => /\.(js|jsx|css|html)$/i.test(path))
    .filter((path) => {
      const source = readFileSync(join(sourceDirectory, path), 'utf8').toLowerCase()
      return forbiddenTokens.some((token) => source.includes(token))
    })

  assert.deepEqual(offendingFiles, [], 'Use sentences, commas, colons, or parentheses instead.')
})
