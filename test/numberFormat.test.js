import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatNumber,
  getFormatCacheKey,
  getSuffixForExponent,
} from '../src/game/numberFormat.js'

test('formats the first suffix layer', () => {
  const suffixes = [
    [3, 'k'],
    [6, 'M'],
    [9, 'B'],
    [12, 'T'],
    [15, 'Qd'],
    [18, 'Qn'],
    [21, 'Sx'],
    [24, 'Sp'],
    [27, 'Oc'],
    [30, 'No'],
  ]

  suffixes.forEach(([exponent, suffix]) => {
    assert.equal(getSuffixForExponent(exponent), suffix)
  })
  assert.equal(formatNumber(1250), '1.25k')
  assert.equal(formatNumber(12_500), '12.5k')
  assert.equal(formatNumber(125_000), '125k')
  assert.equal(formatNumber(999_900), '1.00M')
  assert.equal(formatNumber('0e2703'), '0')
})

test('overlays the first suffix layer on the second layer', () => {
  const suffixes = [
    [33, 'Dc'],
    [55, 'SpDc'],
    [63, 'Vg'],
    [93, 'Tg'],
    [123, 'qg'],
    [153, 'Qg'],
    [183, 'sg'],
    [213, 'Sg'],
    [243, 'Og'],
    [273, 'Ng'],
  ]

  suffixes.forEach(([exponent, suffix]) => {
    assert.equal(getSuffixForExponent(exponent), suffix)
  })
  assert.equal(formatNumber(1e55), '10.0SpDc')
})

test('formats the third suffix layer from scientific notation strings', () => {
  const suffixes = [
    [303, 'Cent'],
    [603, 'Dcnt'],
    [903, 'Tcnt'],
    [1203, 'qcnt'],
    [1503, 'Qcnt'],
    [1803, 'scnt'],
    [2103, 'Scnt'],
    [2403, 'Ocnt'],
    [2703, 'Ncnt'],
  ]

  suffixes.forEach(([exponent, suffix]) => {
    assert.equal(getSuffixForExponent(exponent), suffix)
    assert.equal(formatNumber(`1e${exponent}`), `1.00${suffix}`)
  })
})

test('shares a cache key until a rounded display value changes', () => {
  assert.equal(getFormatCacheKey(1_000.01), getFormatCacheKey(1_004.99))
  assert.notEqual(getFormatCacheKey(1_004.99), getFormatCacheKey(1_005.01))
  assert.notEqual(getFormatCacheKey(999_400), getFormatCacheKey(1_000_000))
})
