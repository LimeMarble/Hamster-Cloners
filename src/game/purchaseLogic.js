import {
  HAMSTER_ACCELERATED_COST_SCALING_START,
  HAMSTER_BASE_COST,
  HAMSTER_COST_GROWTH,
  HAMSTER_COST_GROWTH_INCREASE_PER_HAMSTER,
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
    FLOOR_REPLICATOR_BASE_COST *
    FLOOR_REPLICATOR_COST_GROWTH ** completedTiers *
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

export function getMaxHamsterPurchase(game) {
  let nextGame = {
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
  let remainingCrops = Math.max(0, Number(game.crops) || 0)
  let purchased = 0
  const costMultiplier = getGameAreaCostMultiplier(game)

  while (purchased < 10000) {
    if (
      !nextGame.unionized &&
      nextGame.totalHamstersHired >= UNIONIZATION_HAMSTER_COUNT - 1
    ) {
      break
    }

    const cost = getNextHamsterCost(
      nextGame.hamsters,
      nextGame.unionized,
      costMultiplier,
    )
    if (!Number.isFinite(cost) || cost > remainingCrops) {
      break
    }

    remainingCrops -= cost
    nextGame = getHamsterStateAfterHire(nextGame)
    purchased += 1
  }

  return {
    ...nextGame,
    crops: remainingCrops,
    purchased,
  }
}


export function getMaxDuplicatorPurchase(game) {
  let rowDuplicators = Math.max(
    0,
    Math.floor(Number(game.rowDuplicators) || 0),
  )
  let remainingCrops = Math.max(0, Number(game.crops) || 0)
  let purchased = 0
  const costMultiplier = getGameAreaCostMultiplier(game)

  if (game.hasUnlockedRowDuplicators !== true) {
    return { rowDuplicators, crops: remainingCrops, purchased }
  }

  while (purchased < 10000) {
    const cost = getNextRowDuplicatorCost(rowDuplicators, costMultiplier)
    if (!Number.isFinite(cost) || cost > remainingCrops) {
      break
    }

    remainingCrops -= cost
    rowDuplicators += 1
    purchased += 1
  }

  return {
    rowDuplicators,
    crops: remainingCrops,
    purchased,
  }
}

export function getMaxFloorReplicatorPurchase(game) {
  let floorReplicators = Math.max(
    0,
    Math.floor(Number(game.floorReplicators) || 0),
  )
  let remainingCrops = Math.max(0, Number(game.crops) || 0)
  let purchased = 0

  if (
    game.hasUnlockedFloorReplicators !== true ||
    !canPurchaseFloorReplicatorsInArea(game)
  ) {
    return { floorReplicators, crops: remainingCrops, purchased }
  }

  const costMultiplier = getGameAreaCostMultiplier(game)
  while (purchased < 10000) {
    const cost = getNextFloorReplicatorCost(
      floorReplicators,
      costMultiplier,
    )
    if (!Number.isFinite(cost) || cost > remainingCrops) break

    remainingCrops -= cost
    floorReplicators += 1
    purchased += 1
  }

  return {
    floorReplicators,
    crops: remainingCrops,
    purchased,
  }
}
