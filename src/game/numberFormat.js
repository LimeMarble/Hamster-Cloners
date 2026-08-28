import Decimal from 'break_infinity.js'

const PRIMARY_SUFFIXES = [
  '',
  'k',
  'M',
  'B',
  'T',
  'Qd',
  'Qn',
  'Sx',
  'Sp',
  'Oc',
  'No',
]

const LAYERED_PRIMARY_SUFFIXES = [
  '',
  'k',
  'U',
  'D',
  'T',
  'Qd',
  'Qn',
  'Sx',
  'Sp',
  'Oc',
  'No',
]

const SECOND_LAYER_SUFFIXES = [
  '',
  'Dc',
  'Vg',
  'Tg',
  'qg',
  'Qg',
  'sg',
  'Sg',
  'Og',
  'Ng',
]

const THIRD_LAYER_SUFFIXES = [
  '',
  'Cent',
  'Dcnt',
  'Tcnt',
  'qcnt',
  'Qcnt',
  'scnt',
  'Scnt',
  'Ocnt',
  'Ncnt',
]

const DECIMAL_PATTERN = /^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:e([+-]?\d+))?$/i
const MAX_FORMAT_CACHE_SIZE = 512
const SUFFIX_SIGNIFICANT_DIGITS = 3
export const NUMBER_NOTATION_SUFFIX = 'suffix'
export const NUMBER_NOTATION_SCIENTIFIC = 'scientific'
export const FORCED_SCIENTIFIC_EXPONENT = 3003
export const DEFAULT_SUFFIX_SCIENTIFIC_EXPONENT = 303
export const SUFFIX_SCIENTIFIC_EXPONENT_OPTIONS = Object.freeze([
  33,
  DEFAULT_SUFFIX_SCIENTIFIC_EXPONENT,
  FORCED_SCIENTIFIC_EXPONENT,
])
const formattedNumberCache = new Map()
let activeNumberNotation = NUMBER_NOTATION_SUFFIX
let activeSuffixScientificExponent = DEFAULT_SUFFIX_SCIENTIFIC_EXPONENT

function normalizeNumberNotation(notation) {
  return notation === NUMBER_NOTATION_SCIENTIFIC
    ? NUMBER_NOTATION_SCIENTIFIC
    : NUMBER_NOTATION_SUFFIX
}

function normalizeSuffixScientificExponent(exponent) {
  const parsed = Math.floor(Number(exponent))

  return SUFFIX_SCIENTIFIC_EXPONENT_OPTIONS.includes(parsed)
    ? parsed
    : DEFAULT_SUFFIX_SCIENTIFIC_EXPONENT
}

export function setActiveNumberNotation(
  notation,
  suffixScientificExponent = DEFAULT_SUFFIX_SCIENTIFIC_EXPONENT,
) {
  activeNumberNotation = normalizeNumberNotation(notation)
  activeSuffixScientificExponent = normalizeSuffixScientificExponent(
    suffixScientificExponent,
  )
}

function normalizeDecimalCoefficient(coefficient) {
  const [integerPart, fractionPart = ''] = coefficient.split('.')
  const normalizedInteger = integerPart.replace(/^0+/, '')
  const significantDigits = `${integerPart}${fractionPart}`.replace(/^0+/, '')

  if (!significantDigits) {
    return { mantissa: 0, exponentOffset: 0 }
  }

  const exponentOffset = normalizedInteger
    ? normalizedInteger.length - 1
    : -fractionPart.search(/[1-9]/) - 1
  const mantissaDigits = significantDigits.slice(0, 17)
  const mantissa = Number(
    mantissaDigits.length === 1
      ? mantissaDigits
      : `${mantissaDigits[0]}.${mantissaDigits.slice(1)}`,
  )

  return { mantissa, exponentOffset }
}

function getScientificParts(value) {
  if (value instanceof Decimal) {
    if (!Number.isFinite(value.mantissa) || !Number.isFinite(value.exponent)) {
      return null
    }
    if (value.mantissa === 0) {
      return { negative: false, mantissa: 0, exponent: 0 }
    }

    return {
      negative: value.mantissa < 0,
      mantissa: Math.abs(value.mantissa),
      exponent: value.exponent,
    }
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null
    }
    if (value === 0) {
      return { negative: false, mantissa: 0, exponent: 0 }
    }

    const [mantissa, exponent] = Math.abs(value).toExponential(15).split('e')
    return {
      negative: value < 0,
      mantissa: Number(mantissa),
      exponent: Number(exponent),
    }
  }

  if (typeof value !== 'string') {
    return null
  }

  const match = value.trim().match(DECIMAL_PATTERN)
  if (!match) {
    return null
  }

  const { mantissa, exponentOffset } = normalizeDecimalCoefficient(match[2])
  return {
    negative: match[1] === '-' && mantissa !== 0,
    mantissa,
    exponent: Number(match[3] ?? 0) + exponentOffset,
  }
}

function getSuffixForGroup(suffixGroup) {
  if (suffixGroup < 1 || suffixGroup > 1000) {
    return ''
  }
  if (suffixGroup <= 10) {
    return PRIMARY_SUFFIXES[suffixGroup]
  }

  const primaryLayerIndex = suffixGroup % 10
  const primarySuffix =
    primaryLayerIndex === 1
      ? ''
      : LAYERED_PRIMARY_SUFFIXES[
          primaryLayerIndex === 0 ? 10 : primaryLayerIndex
        ]
  const secondLayerSuffix =
    SECOND_LAYER_SUFFIXES[Math.floor((suffixGroup - 1) / 10) % 10]
  const thirdLayerSuffix =
    THIRD_LAYER_SUFFIXES[Math.floor((suffixGroup - 1) / 100) % 10]

  return `${primarySuffix}${secondLayerSuffix}${thirdLayerSuffix}`
}

export function getSuffixForExponent(exponent) {
  return getSuffixForGroup(Math.floor(exponent / 3))
}

function formatPlainNumber(value, maximumFractionDigits, minimumFractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value)
}

function getRoundedSuffixParts(mantissa, exponent) {
  let suffixGroup = Math.floor(exponent / 3)
  let scaledValue = mantissa * 10 ** (exponent - suffixGroup * 3)
  let fractionDigits = Math.max(
    0,
    SUFFIX_SIGNIFICANT_DIGITS - 1 - Math.floor(Math.log10(scaledValue)),
  )
  const roundingScale = 10 ** fractionDigits
  scaledValue = Math.round(scaledValue * roundingScale) / roundingScale

  if (scaledValue >= 1000 && getSuffixForGroup(suffixGroup + 1)) {
    suffixGroup += 1
    scaledValue /= 1000
    fractionDigits = SUFFIX_SIGNIFICANT_DIGITS - 1
  }

  return { suffixGroup, scaledValue, fractionDigits }
}

function getRoundedScientificParts(mantissa, exponent) {
  let scientificExponent = exponent
  let scaledValue = Math.round(mantissa * 100) / 100

  if (scaledValue >= 10) {
    scaledValue /= 10
    scientificExponent += 1
  }

  return { scaledValue, scientificExponent }
}

function shouldUseScientificNotation(
  notation,
  exponent,
  suffixScientificExponent,
) {
  return (
    normalizeNumberNotation(notation) === NUMBER_NOTATION_SCIENTIFIC ||
    exponent >= normalizeSuffixScientificExponent(suffixScientificExponent) ||
    exponent >= FORCED_SCIENTIFIC_EXPONENT ||
    !getSuffixForExponent(exponent)
  )
}

export function getFormatCacheKey(
  value,
  maximumFractionDigits = 1,
  notation = NUMBER_NOTATION_SUFFIX,
  suffixScientificExponent = DEFAULT_SUFFIX_SCIENTIFIC_EXPONENT,
) {
  const scientificParts = getScientificParts(value)

  if (!scientificParts) {
    return `raw:${String(value)}`
  }

  const { negative, mantissa, exponent } = scientificParts
  const precision = Math.max(0, Math.floor(Number(maximumFractionDigits) || 0))
  const roundingScale = 10 ** precision
  const prefix = negative ? 'negative' : 'positive'

  if (mantissa === 0) {
    return `zero:${precision}`
  }
  if (exponent < 3) {
    return `${prefix}:plain:${Math.round(mantissa * 10 ** exponent * roundingScale)}:${precision}`
  }

  if (
    shouldUseScientificNotation(
      notation,
      exponent,
      suffixScientificExponent,
    )
  ) {
    const { scaledValue, scientificExponent } = getRoundedScientificParts(
      mantissa,
      exponent,
    )
    return `${prefix}:scientific:${Math.round(scaledValue * 100)}:${scientificExponent}`
  }

  const { suffixGroup, scaledValue, fractionDigits } = getRoundedSuffixParts(
    mantissa,
    exponent,
  )
  const suffixRoundingScale = 10 ** fractionDigits
  return `${prefix}:suffix:${suffixGroup}:${Math.round(scaledValue * suffixRoundingScale)}:${fractionDigits}`
}

export function formatNumber(
  value,
  maximumFractionDigits = 1,
  notation = NUMBER_NOTATION_SUFFIX,
  suffixScientificExponent = DEFAULT_SUFFIX_SCIENTIFIC_EXPONENT,
) {
  const scientificParts = getScientificParts(value)

  if (!scientificParts) {
    return typeof value === 'number' && !Number.isFinite(value) ? '∞' : String(value)
  }

  const { negative, mantissa, exponent } = scientificParts

  if (mantissa === 0) {
    return '0'
  }

  const sign = negative ? '−' : ''

  if (exponent < 3) {
    return `${sign}${formatPlainNumber(mantissa * 10 ** exponent, maximumFractionDigits)}`
  }

  if (
    shouldUseScientificNotation(
      notation,
      exponent,
      suffixScientificExponent,
    )
  ) {
    const { scaledValue, scientificExponent } = getRoundedScientificParts(
      mantissa,
      exponent,
    )
    return `${sign}${formatPlainNumber(scaledValue, 2, 2)}e${scientificExponent}`
  }

  const { suffixGroup, scaledValue, fractionDigits } = getRoundedSuffixParts(
    mantissa,
    exponent,
  )
  return `${sign}${formatPlainNumber(
    scaledValue,
    fractionDigits,
    fractionDigits,
  )}${getSuffixForGroup(suffixGroup)}`
}

export function getCachedFormattedNumber(
  value,
  maximumFractionDigits = 1,
  notation = activeNumberNotation,
  suffixScientificExponent = activeSuffixScientificExponent,
) {
  const cacheKey = getFormatCacheKey(
    value,
    maximumFractionDigits,
    notation,
    suffixScientificExponent,
  )
  const cachedValue = formattedNumberCache.get(cacheKey)

  if (cachedValue !== undefined) {
    return cachedValue
  }

  const formattedValue = formatNumber(
    value,
    maximumFractionDigits,
    notation,
    suffixScientificExponent,
  )

  if (formattedNumberCache.size >= MAX_FORMAT_CACHE_SIZE) {
    formattedNumberCache.delete(formattedNumberCache.keys().next().value)
  }
  formattedNumberCache.set(cacheKey, formattedValue)

  return formattedValue
}
