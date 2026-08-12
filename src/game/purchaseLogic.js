import {
  HAMSTER_BASE_COST,
  HAMSTER_COST_GROWTH,
  ROW_DUPLICATOR_BASE_COST,
  ROW_DUPLICATOR_COST_GROWTH,
  UNIONIZATION_HAMSTER_COUNT,
  UNIONIZED_HAMSTER_COUNT,
} from './gameConfig.js'

export function getNextHamsterCost(hamsters, unionized = false) {
  const safeHamsters = Math.max(0, Math.floor(Number(hamsters) || 0))

  if (!unionized) {
    return HAMSTER_BASE_COST + safeHamsters
  }

  return Math.ceil(HAMSTER_BASE_COST * HAMSTER_COST_GROWTH ** safeHamsters)
}

export function getNextRowDuplicatorCost(rowDuplicators = 0) {
  const safeRowDuplicators = Math.max(
    0,
    Math.floor(Number(rowDuplicators) || 0),
  )

  return Math.ceil(
    ROW_DUPLICATOR_BASE_COST *
      ROW_DUPLICATOR_COST_GROWTH ** safeRowDuplicators,
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

  while (purchased < 10000) {
    if (
      !nextGame.unionized &&
      nextGame.totalHamstersHired >= UNIONIZATION_HAMSTER_COUNT - 1
    ) {
      break
    }

    const cost = getNextHamsterCost(nextGame.hamsters, nextGame.unionized)
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

  if (game.hasUnlockedRowDuplicators !== true) {
    return { rowDuplicators, crops: remainingCrops, purchased }
  }

  while (purchased < 10000) {
    const cost = getNextRowDuplicatorCost(rowDuplicators)
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
