export const MIN_VISIBLE_PERCENT_GAIN_PER_SECOND = 0.01

export function getPercentageGainPerSecond(current, producedPerSecond) {
  const value = Number(current)
  const rate = Number(producedPerSecond)

  if (!Number.isFinite(value) || value <= 0 ||
      !Number.isFinite(rate) || rate <= 0) return 0

  return rate / value * 100
}

// A product such as Fields Planted grows along every axis at once. This is
// its projected one-second gain at the current production rates.
export function getProductPercentageGainPerSecond(units) {
  if (!Array.isArray(units) || units.length === 0) return 0

  let multiplier = 1
  for (const { current, producedPerSecond } of units) {
    if (!Number.isFinite(current) || current <= 0) return 0
    const gain = getPercentageGainPerSecond(current, producedPerSecond) / 100
    multiplier *= 1 + gain
  }

  const percentage = (multiplier - 1) * 100
  return Number.isFinite(percentage) ? percentage : 0
}

export function shouldShowPercentageGain(percentage) {
  return Number.isFinite(percentage) &&
    percentage > MIN_VISIBLE_PERCENT_GAIN_PER_SECOND
}
