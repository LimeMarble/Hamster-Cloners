import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPercentageGainPerSecond,
  getProductPercentageGainPerSecond,
  shouldShowPercentageGain,
} from '../src/game/fieldGrowth.js'

test('unit gain compares the current production rate with the displayed unit count', () => {
  assert.equal(getPercentageGainPerSecond(200, 1), 0.5)
  assert.equal(getPercentageGainPerSecond(0, 1), 0)
  assert.equal(getPercentageGainPerSecond(200, 0), 0)
})

test('Fields Planted projects simultaneous unit growth over one second', () => {
  const gain = getProductPercentageGainPerSecond([
    { current: 100, producedPerSecond: 1 },
    { current: 100, producedPerSecond: 1 },
    { current: 2, producedPerSecond: 0 },
    { current: 1, producedPerSecond: 0 },
  ])

  assert.ok(Math.abs(gain - 2.01) < 1e-10)
  assert.equal(getProductPercentageGainPerSecond([
    { current: 0, producedPerSecond: 1 },
    { current: 1, producedPerSecond: 0 },
  ]), 0)
})

test('gain appears only above 0.01 percent per second', () => {
  assert.equal(shouldShowPercentageGain(0.01), false)
  assert.equal(shouldShowPercentageGain(0.01001), true)
  assert.equal(shouldShowPercentageGain(Infinity), false)
})
