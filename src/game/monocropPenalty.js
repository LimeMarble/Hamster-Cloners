/**
 * The number of plots a single crop may occupy before its field-wide
 * monocrop penalty begins. Future crop balancing can build on this value.
 */
export function getMonocropThreshold(fieldSize, thresholdBonus = 0) {
  const safeFieldSize = Math.max(0, Number(fieldSize) || 0)
  const safeThresholdBonus = Math.max(0, Number(thresholdBonus) || 0)

  return (
    Math.min(safeFieldSize * 0.5, safeFieldSize ** 0.75) +
    1.25 +
    safeThresholdBonus
  )
}

/**
 * Yield drops according to the configured inverse-power monocrop curve once
 * a crop reaches its field-size-adjusted threshold.
 */
export function getMonocropYieldMultiplier(
  cropCount,
  fieldSize,
  thresholdBonus = 0,
) {
  const safeCropCount = Math.max(0, Number(cropCount) || 0)
  const safeFieldSize = Math.max(1, Number(fieldSize) || 1)
  const threshold = getMonocropThreshold(safeFieldSize, thresholdBonus)

  if (safeCropCount < threshold) {
    return 1
  }

  const overage = (safeCropCount - threshold) / safeFieldSize
  return 1 / (2 * (overage + 1) ** 10)
}

export function applyMonocropPenaltyToBonus(
  bonus,
  cropCount,
  fieldSize,
  thresholdBonus = 0,
) {
  const safeBonus = Number(bonus) || 0
  const multiplier = getMonocropYieldMultiplier(
    cropCount,
    fieldSize,
    thresholdBonus,
  )

  return safeBonus >= 0
    ? safeBonus * multiplier
    : safeBonus / multiplier
}

export function applyMonocropPenaltyToEffectMultiplier(
  effectMultiplier,
  cropCount,
  fieldSize,
  thresholdBonus = 0,
) {
  const safeMultiplier = Number(effectMultiplier)

  if (!Number.isFinite(safeMultiplier)) {
    return 1
  }

  return Math.max(
    0,
    1 +
      applyMonocropPenaltyToBonus(
        safeMultiplier - 1,
        cropCount,
        fieldSize,
        thresholdBonus,
      ),
  )
}
