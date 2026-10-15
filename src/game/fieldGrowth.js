export const MIN_VISIBLE_PERCENT_GAIN_PER_SECOND = 0.01

const PERCENTAGE_GAIN_COLOR_STOPS = [
  { percentage: 0.1, hue: 0 }, // Red
  { percentage: 0.5, hue: 30 }, // Orange
  { percentage: 1, hue: 80 }, // Yellow-green
  { percentage: 2, hue: 120 }, // Green
  { percentage: 5, hue: 165 }, // Turquoise
  { percentage: 25, hue: 180 }, // Cyan
].map((stop) => ({ ...stop, logPercentage: Math.log(stop.percentage) }))

function formatGainColor(hue) {
  // Quantize the color so tiny rate changes do not continually change its style.
  return `hsl(${Math.round(hue * 10) / 10} 85% 65%)`
}

export function getPercentageGainColor(percentage) {
  const firstStop = PERCENTAGE_GAIN_COLOR_STOPS[0]
  if (!(percentage > firstStop.percentage)) return formatGainColor(firstStop.hue)

  for (let index = 1; index < PERCENTAGE_GAIN_COLOR_STOPS.length; index += 1) {
    const upper = PERCENTAGE_GAIN_COLOR_STOPS[index]
    if (percentage > upper.percentage) continue

    const lower = PERCENTAGE_GAIN_COLOR_STOPS[index - 1]
    // Equal proportional changes get equal progress between the color anchors.
    const fraction = (Math.log(percentage) - lower.logPercentage) /
      (upper.logPercentage - lower.logPercentage)
    return formatGainColor(lower.hue + (upper.hue - lower.hue) * fraction)
  }

  return formatGainColor(PERCENTAGE_GAIN_COLOR_STOPS.at(-1).hue)
}

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
