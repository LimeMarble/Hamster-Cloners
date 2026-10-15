import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPercentageGainColor,
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

test('growth colors match each configured percentage anchor', () => {
  for (const [percentage, hue] of [
    [0.1, 0], [0.5, 30], [1, 80], [2, 120], [5, 165], [25, 180],
  ]) {
    assert.equal(getPercentageGainColor(percentage), `hsl(${hue} 85% 65%)`)
  }
})

test('growth colors interpolate logarithmically between anchors', () => {
  for (const [percentage, hue] of [
    [Math.sqrt(0.1 * 0.5), 15],
    [Math.sqrt(0.5 * 1), 55],
    [Math.sqrt(1 * 2), 100],
    [Math.sqrt(2 * 5), 142.5],
    [Math.sqrt(5 * 25), 172.5],
  ]) {
    assert.equal(getPercentageGainColor(percentage), `hsl(${hue} 85% 65%)`)
  }
})

test('growth colors clamp slow rates to red and rates above 25 percent to cyan', () => {
  for (const rate of [NaN, -1, 0, 0.01, 0.05]) {
    assert.equal(getPercentageGainColor(rate), 'hsl(0 85% 65%)')
  }
  for (const rate of [25.01, 100, Number.MAX_VALUE, Infinity]) {
    assert.equal(getPercentageGainColor(rate), 'hsl(180 85% 65%)')
  }
})

test('growth color stays continuous across anchor boundaries', () => {
  for (const rate of [0.1, 0.5, 1, 2, 5, 25]) {
    const anchor = getPercentageGainColor(rate)
    assert.equal(getPercentageGainColor(rate * (1 - 1e-6)), anchor)
    assert.equal(getPercentageGainColor(rate * (1 + 1e-6)), anchor)
  }
})
