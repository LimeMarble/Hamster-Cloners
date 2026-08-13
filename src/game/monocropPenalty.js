/**
 * The number of plots a single crop may occupy before its field-wide
 * monocrop penalty begins. Future crop balancing can build on this value.
 */
export function getMonocropThreshold(fieldSize) {
  const safeFieldSize = Math.max(0, Number(fieldSize) || 0)

  return Math.min(safeFieldSize * 0.5, safeFieldSize ** 0.75) + 1
}

/**
 * Yield drops according to the configured inverse-power monocrop curve once
 * a crop reaches its field-size-adjusted threshold.
 */
export function getMonocropYieldMultiplier(cropCount, fieldSize) {
  const safeCropCount = Math.max(0, Number(cropCount) || 0)
  const safeFieldSize = Math.max(1, Number(fieldSize) || 1)
  const threshold = getMonocropThreshold(safeFieldSize)

  if (safeCropCount < threshold) {
    return 1
  }

  const overage = (safeCropCount - threshold) / safeFieldSize
  return 1 / (2 * (overage + 1) ** 10)
}

export function applyMonocropPenaltyToBonus(bonus, cropCount, fieldSize) {
  const safeBonus = Number(bonus) || 0
  const multiplier = getMonocropYieldMultiplier(cropCount, fieldSize)

  return safeBonus >= 0
    ? safeBonus * multiplier
    : safeBonus / multiplier
}

export function applyMonocropPenaltyToEffectMultiplier(
  effectMultiplier,
  cropCount,
  fieldSize,
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
      ),
  )
}
