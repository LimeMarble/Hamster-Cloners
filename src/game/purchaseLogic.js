import {
  HAMSTER_ACCELERATED_COST_SCALING_START,
  HAMSTER_BASE_COST,
  HAMSTER_COST_GROWTH,
  HAMSTER_COST_GROWTH_INCREASE_PER_HAMSTER,
  FLOOR_REPLICATOR_ACCELERATED_COST_GROWTH_STEP,
  FLOOR_REPLICATOR_ACCELERATED_COST_SCALING_START,
  FLOOR_REPLICATOR_BASE_COST,
  FLOOR_REPLICATOR_COST_GROWTH,
  FLOOR_REPLICATOR_COST_TIER_SIZE,
  canPurchaseFloorReplicatorsInArea,
  getGameAreaCostMultiplier,
  ROW_DUPLICATOR_BASE_COST,
  ROW_DUPLICATOR_COST_GROWTH,
  UNION_STATUS_RETIRE_HIRE_COUNT,
  UNIONIZATION_HAMSTER_COUNT,
  UNIONIZED_HAMSTER_COUNT,
} from './gameConfig.js'

export function getHamsterClonerDescription({
  hamsters = 0,
  unionized = false,
  postUnionHamstersHired = 0,
} = {}) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))

  if (safeHamsters >= HAMSTER_ACCELERATED_COST_SCALING_START) {
    return 'The hamster union is no longer satisfied with your raises and demands further margins while maintaining their rather convenient 3% improvements.'
  }

  if (unionized) {
    if (postUnionHamstersHired >= UNION_STATUS_RETIRE_HIRE_COUNT) {
      return 'The hamster workforce is working at an established pace.'
    }

    return postUnionHamstersHired > 0
      ? 'A post-union hire has enabled a compounded 3% Hamster Efficiency bonus per active hamster.'
      : 'The 100 remaining hamsters are working normally. Hire a post-union hamster to activate their compounded Hamster Efficiency bonus.'
  }

  return 'Every trained hamster tends the field. The hiring cost rises by 1 Crop... for now.'
}

export function getHamsterCostGrowth(hamsters) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))
  const acceleratedHamsters = Math.max(
    0,
    safeHamsters - HAMSTER_ACCELERATED_COST_SCALING_START,
  )

  return (
    HAMSTER_COST_GROWTH +
    acceleratedHamsters * HAMSTER_COST_GROWTH_INCREASE_PER_HAMSTER
  )
}

function normalizeCostMultiplier(value) {
  const multiplier = Number(value)
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
}

const floorReplicatorCostByTier = [FLOOR_REPLICATOR_BASE_COST]

export function getFloorReplicatorCostGrowthForTier(tier) {
  const safeTier = Math.max(0, Math.floor(Number(tier) || 0))
  const acceleratedStartTier =
    FLOOR_REPLICATOR_ACCELERATED_COST_SCALING_START /
    FLOOR_REPLICATOR_COST_TIER_SIZE

  if (safeTier < acceleratedStartTier) {
    return FLOOR_REPLICATOR_COST_GROWTH
  }

  const acceleratedTierIndex = safeTier - acceleratedStartTier + 1

  return FLOOR_REPLICATOR_COST_GROWTH +
    FLOOR_REPLICATOR_ACCELERATED_COST_GROWTH_STEP *
      acceleratedTierIndex * (acceleratedTierIndex + 1) / 2
}

function getFloorReplicatorCostForTier(tier) {
  while (floorReplicatorCostByTier.length <= tier) {
    const nextTier = floorReplicatorCostByTier.length
    const nextCost =
      floorReplicatorCostByTier[nextTier - 1] *
      getFloorReplicatorCostGrowthForTier(nextTier)

    floorReplicatorCostByTier.push(
      Number.isFinite(nextCost) ? nextCost : Infinity,
    )
  }

  return floorReplicatorCostByTier[tier]
}

export function getNextHamsterCost(
  hamsters,
  unionized = false,
  costMultiplier = 1,
) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))
  const safeCostMultiplier = normalizeCostMultiplier(costMultiplier)

  if (!unionized) {
    return (HAMSTER_BASE_COST + safeHamsters) * safeCostMultiplier
  }

  const regularScalingHamsters = Math.min(
    safeHamsters,
    HAMSTER_ACCELERATED_COST_SCALING_START,
  )
  let cost =
    HAMSTER_BASE_COST * HAMSTER_COST_GROWTH ** regularScalingHamsters

  for (
    let hamsterCount = HAMSTER_ACCELERATED_COST_SCALING_START + 1;
    hamsterCount <= safeHamsters;
    hamsterCount += 1
  ) {
    cost *= getHamsterCostGrowth(hamsterCount)
    if (!Number.isFinite(cost)) return Infinity
  }

  return Math.ceil(cost) * safeCostMultiplier
}

export function getNextRowDuplicatorCost(
  rowDuplicators = 0,
  costMultiplier = 1,
) {
  const safeRowDuplicators = Math.max(
    0,
    Math.floor(Number(rowDuplicators) || 0),
  )

  return Math.ceil(
    ROW_DUPLICATOR_BASE_COST *
      ROW_DUPLICATOR_COST_GROWTH ** safeRowDuplicators,
  ) * normalizeCostMultiplier(costMultiplier)
}

export function getNextFloorReplicatorCost(
  floorReplicators = 0,
  costMultiplier = 1,
) {
  const safeFloorReplicators = Math.max(
    0,
    Math.floor(Number(floorReplicators) || 0),
  )
  const completedTiers = Math.floor(
    safeFloorReplicators / FLOOR_REPLICATOR_COST_TIER_SIZE,
  )

  return (
    getFloorReplicatorCostForTier(completedTiers) *
    normalizeCostMultiplier(costMultiplier)
  )
}


export function getHamsterStateAfterHire({
  hamsters = 0,
  totalHamstersHired = 0,
  unionized = false,
  postUnionHamstersHired = 0,
} = {}) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))
  const safeTotalHired = Math.max(
    safeHamsters,
    Math.floor(Number(totalHamstersHired) || 0),
  )
  const nextTotalHired = safeTotalHired + 1
  const safePostUnionHires = Math.max(
    0,
    Math.floor(Number(postUnionHamstersHired) || 0),
  )

  if (!unionized && nextTotalHired >= UNIONIZATION_HAMSTER_COUNT) {
    return {
      hamsters: UNIONIZED_HAMSTER_COUNT,
      totalHamstersHired: nextTotalHired,
      unionized: true,
      postUnionHamstersHired: 0,
    }
  }

  return {
    hamsters: safeHamsters + 1,
    totalHamstersHired: nextTotalHired,
    unionized: Boolean(unionized),
    postUnionHamstersHired: unionized ? safePostUnionHires + 1 : 0,
  }
}

const bulkPurchaseCostCache = new Map()
const MAX_BULK_PURCHASE = 10000

function getBulkPurchaseSetup(game, kind) {
  const costMultiplier = getGameAreaCostMultiplier(game)
  const owned = Math.max(0, Math.floor(Number(game[
    kind === 'hamster' ? 'hamsters' : kind === 'row' ? 'rowDuplicators' : 'floorReplicators'
  ]) || 0))
  let limit = MAX_BULK_PURCHASE
  let blockedReason = null
  let getCost

  if (kind === 'hamster') {
    if (!game.unionized) {
      limit = Math.max(0, UNIONIZATION_HAMSTER_COUNT - 1 -
        Math.max(owned, Math.floor(Number(game.totalHamstersHired) || 0)))
    }
    getCost = (offset) => getNextHamsterCost(owned + offset, game.unionized, costMultiplier)
    if (limit === 0) blockedReason = 'unionization'
  } else if (kind === 'row') {
    getCost = (offset) => getNextRowDuplicatorCost(owned + offset, costMultiplier)
    if (!game.hasUnlockedRowDuplicators) blockedReason = 'locked'
  } else if (kind === 'floor') {
    getCost = (offset) => getNextFloorReplicatorCost(owned + offset, costMultiplier)
    if (!game.hasUnlockedFloorReplicators) blockedReason = 'locked'
    else if (!canPurchaseFloorReplicatorsInArea(game)) blockedReason = 'area'
  } else {
    throw new Error('Unknown machinery purchase type: ' + kind)
  }

  const key = [owned, costMultiplier, Boolean(game.unionized), limit].join(':')
  let cache = bulkPurchaseCostCache.get(kind)
  if (cache?.key !== key) {
    cache = { key, totals: [0], getCost }
    bulkPurchaseCostCache.set(kind, cache)
  }
  return { cache, limit, blockedReason }
}

// Totals are relative to the current owned count, avoiding subtraction of
// huge lifetime totals. Only newly affordable prices are added between ticks.
export function getBulkPurchaseQuote(game, kind, requestedQuantity = Infinity) {
  const { cache, limit, blockedReason: unavailableReason } = getBulkPurchaseSetup(game, kind)
  const crops = Math.max(0, Number(game.crops) || 0)
  const exactBatch = requestedQuantity !== Infinity
  const requested = exactBatch
    ? Math.max(0, Math.min(MAX_BULK_PURCHASE, Math.floor(requestedQuantity)))
    : limit
  const blockedReason = unavailableReason || (requested > limit ? 'unionization' : null)
  const { totals, getCost } = cache
  const extend = () => {
    const cost = getCost(totals.length - 1)
    totals.push(Number.isFinite(cost) ? totals.at(-1) + cost : Infinity)
  }

  if (!blockedReason) {
    if (exactBatch) {
      while (totals.length <= requested && Number.isFinite(totals.at(-1))) extend()
    } else {
      while (totals.length <= limit && totals.at(-1) <= crops &&
        Number.isFinite(totals.at(-1))) extend()
    }
  }

  let quantity = 0
  if (!blockedReason) {
    let low = 0
    let high = Math.min(requested, totals.length - 1)
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (Number.isFinite(totals[middle]) && totals[middle] <= crops) low = middle
      else high = middle - 1
    }
    quantity = exactBatch && low !== requested ? 0 : low
  }
  const cost = exactBatch
    ? blockedReason ? null : totals[requested] ?? Infinity
    : totals[quantity]

  return {
    quantity,
    cost,
    shortfall: cost === null ? 0 : Math.max(0, cost - crops),
    canAfford: quantity > 0,
    blockedReason,
  }
}

export function getMaxHamsterPurchase(game, requestedQuantity = Infinity) {
  const nextGame = {
    hamsters: Math.max(0, Math.floor(Number(game.hamsters) || 0)),
    totalHamstersHired: Math.max(
      0,
      Math.floor(Number(game.totalHamstersHired) || 0),
    ),
    unionized: game.unionized === true,
    postUnionHamstersHired: Math.max(
      0,
      Math.floor(Number(game.postUnionHamstersHired) || 0),
    ),
  }
  const { quantity: purchased, cost } = getBulkPurchaseQuote(game, 'hamster', requestedQuantity)

  return {
    ...nextGame,
    hamsters: nextGame.hamsters + purchased,
    totalHamstersHired: purchased > 0
      ? Math.max(nextGame.hamsters, nextGame.totalHamstersHired) + purchased
      : nextGame.totalHamstersHired,
    postUnionHamstersHired: nextGame.postUnionHamstersHired +
      (nextGame.unionized ? purchased : 0),
    crops: Math.max(0, Number(game.crops) || 0) - (purchased > 0 ? cost : 0),
    purchased,
  }
}


export function getMaxDuplicatorPurchase(game, requestedQuantity = Infinity) {
  const rowDuplicators = Math.max(
    0,
    Math.floor(Number(game.rowDuplicators) || 0),
  )
  const { quantity: purchased, cost } = getBulkPurchaseQuote(game, 'row', requestedQuantity)

  return {
    rowDuplicators: rowDuplicators + purchased,
    crops: Math.max(0, Number(game.crops) || 0) - (purchased > 0 ? cost : 0),
    purchased,
  }
}

export function getMaxFloorReplicatorPurchase(game, requestedQuantity = Infinity) {
  const floorReplicators = Math.max(
    0,
    Math.floor(Number(game.floorReplicators) || 0),
  )
  const { quantity: purchased, cost } = getBulkPurchaseQuote(game, 'floor', requestedQuantity)

  return {
    floorReplicators: floorReplicators + purchased,
    crops: Math.max(0, Number(game.crops) || 0) - (purchased > 0 ? cost : 0),
    purchased,
  }
}
