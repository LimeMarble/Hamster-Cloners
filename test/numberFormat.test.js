import assert from 'node:assert/strict'
import test from 'node:test'
import Decimal from 'break_infinity.js'
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
    [36, 'UDc'],
    [39, 'DDc'],
    [55, 'SpDc'],
    [60, 'NoDc'],
    [63, 'Vg'],
    [90, 'NoVg'],
    [93, 'Tg'],
    [120, 'NoTg'],
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
  assert.equal(formatNumber(1e6), '1.00M')
  assert.equal(formatNumber(1e9), '1.00B')
  assert.equal(formatNumber(1e36), '1.00UDc')
  assert.equal(formatNumber(1e39), '1.00DDc')
  assert.equal(formatNumber(1e55), '10.0SpDc')
  assert.equal(formatNumber(1e120), '1.00NoTg')
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
    assert.equal(
      formatNumber(`1e${exponent}`, 1, 'suffix', 3003),
      `1.00${suffix}`,
    )
  })
  assert.equal(getSuffixForExponent(306), 'UCent')
  assert.equal(getSuffixForExponent(309), 'DCent')
})

test('formats scientific notation with three significant figures', () => {
  assert.equal(formatNumber(1250, 1, 'scientific'), '1.25e3')
  assert.equal(formatNumber(12_500, 1, 'scientific'), '1.25e4')
  assert.equal(formatNumber(999_900, 1, 'scientific'), '1.00e6')
  assert.equal(formatNumber('1e55', 1, 'scientific'), '1.00e55')
})

test('suffix notation uses a configurable scientific threshold', () => {
  assert.equal(formatNumber('1e33', 1, 'suffix', 33), '1.00e33')
  assert.equal(formatNumber('1e33', 1, 'suffix', 303), '1.00Dc')
  assert.equal(formatNumber('1e303'), '1.00e303')
  assert.equal(formatNumber('1e303', 1, 'suffix', 3003), '1.00Cent')
  assert.equal(getSuffixForExponent(3000), 'NoNgNcnt')
  assert.equal(
    formatNumber('1e3000', 1, 'suffix', 3003),
    '1.00NoNgNcnt',
  )
  assert.equal(formatNumber('1e3003', 1, 'suffix', 3003), '1.00e3003')
  assert.equal(formatNumber('1e4000', 1, 'suffix', 3003), '1.00e4000')
})

test('formats break_infinity Decimal values beyond native Number limits', () => {
  const suffixValue = new Decimal('1e55')
  const forcedScientificValue = new Decimal('1e3003')

  assert.equal(formatNumber(suffixValue), '10.0SpDc')
  assert.equal(formatNumber(forcedScientificValue), '1.00e3003')
  assert.equal(formatNumber(forcedScientificValue.mul(10)), '1.00e3004')
})

test('shares a cache key until a rounded display value changes', () => {
  assert.equal(getFormatCacheKey(1_000.01), getFormatCacheKey(1_004.99))
  assert.notEqual(getFormatCacheKey(1_004.99), getFormatCacheKey(1_005.01))
  assert.notEqual(getFormatCacheKey(999_400), getFormatCacheKey(1_000_000))
  assert.notEqual(
    getFormatCacheKey(1_000_000),
    getFormatCacheKey(1_000_000, 1, 'scientific'),
  )
  assert.notEqual(
    getFormatCacheKey('1e303', 1, 'suffix', 303),
    getFormatCacheKey('1e303', 1, 'suffix', 3003),
  )
})
