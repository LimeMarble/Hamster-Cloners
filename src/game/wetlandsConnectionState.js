import {
  MANATEE_DEVELOPMENT_GOAL_IDS,
  MANATEE_PRIMITIVE_OBSTRUCTION,
} from './manateeConfig.js'
import {
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  normalizeManateeState,
} from './manateeState.js'
import {
  calculateWetlandsConnection,
  isWetlandsObstructionAllowed,
  normalizeWetlandsObstructions,
} from './wetlandsConnection.js'

function getConstruction(state, tileId) {
  return state.wetlandsConnection.activeConstructions.find(
    (construction) => construction.tileId === tileId,
  )
}

function hasRequiredResources(state) {
  return Object.entries(MANATEE_PRIMITIVE_OBSTRUCTION.cost).every(
    ([resourceId, amount]) => state.resources[resourceId] >= amount,
  )
}

export function getWetlandsObstructionConstructionStatus(game, tileId) {
  const state = normalizeManateeState(game?.manatees)
  const construction = getConstruction(state, tileId)
  const isBuilt = state.wetlandsConnection.obstructions.includes(tileId)
  const hasHamsters =
    getManateeRemainingHamsterCount(game) >=
    MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew
  const hasDivingGear =
    getManateeRemainingDivingHamsterCapacity(game) >=
    MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew
  const hasResources = hasRequiredResources(state)
  const isAllowed = isWetlandsObstructionAllowed(tileId)

  return {
    isAllowed,
    isBuilt,
    isUnderConstruction: Boolean(construction),
    remainingSeconds: construction?.remainingSeconds ?? 0,
    hasResources,
    hasHamsters,
    hasDivingGear,
    canBuild:
      isAllowed &&
      !isBuilt &&
      !construction &&
      hasResources &&
      hasHamsters &&
      hasDivingGear,
  }
}

export function startWetlandsObstructionConstruction(game, tileId) {
  const status = getWetlandsObstructionConstructionStatus(game, tileId)
  if (!status.canBuild) return null

  const state = normalizeManateeState(game?.manatees)
  const resources = { ...state.resources }

  Object.entries(MANATEE_PRIMITIVE_OBSTRUCTION.cost).forEach(
    ([resourceId, amount]) => {
      resources[resourceId] -= amount
    },
  )

  return {
    ...game,
    manatees: {
      ...state,
      resources,
      wetlandsConnection: {
        ...state.wetlandsConnection,
        activeConstructions: [
          ...state.wetlandsConnection.activeConstructions,
          {
            tileId,
            remainingSeconds:
              MANATEE_PRIMITIVE_OBSTRUCTION.constructionSeconds,
          },
        ],
      },
    },
  }
}

export function removeWetlandsConnectionObstruction(game, tileId) {
  const state = normalizeManateeState(game?.manatees)
  if (!state.wetlandsConnection.obstructions.includes(tileId)) return null

  return {
    ...game,
    manatees: {
      ...state,
      wetlandsConnection: {
        ...state.wetlandsConnection,
        obstructions: state.wetlandsConnection.obstructions.filter(
          (currentTileId) => currentTileId !== tileId,
        ),
      },
    },
  }
}

export function toggleWetlandsConnectionObstruction(game, tileId) {
  const state = normalizeManateeState(game?.manatees)

  return state.wetlandsConnection.obstructions.includes(tileId)
    ? removeWetlandsConnectionObstruction(game, tileId)
    : startWetlandsObstructionConstruction(game, tileId)
}

export function clearWetlandsConnectionObstructions(game) {
  const state = normalizeManateeState(game?.manatees)
  if (state.wetlandsConnection.obstructions.length === 0) return null

  return {
    ...game,
    manatees: {
      ...state,
      wetlandsConnection: {
        ...state.wetlandsConnection,
        obstructions: [],
      },
    },
  }
}

export function advanceWetlandsConnectionState(rawState, elapsedSeconds) {
  const state = normalizeManateeState(rawState)
  if (state.wetlandsConnection.activeConstructions.length === 0) {
    return rawState ?? state
  }

  const safeElapsedSeconds = Math.max(0, Number(elapsedSeconds) || 0)
  if (safeElapsedSeconds === 0) return state

  const completedTileIds = []
  const activeConstructions = []

  state.wetlandsConnection.activeConstructions.forEach((construction) => {
    const remainingSeconds =
      construction.remainingSeconds - safeElapsedSeconds

    if (remainingSeconds > 0) {
      activeConstructions.push({ ...construction, remainingSeconds })
    } else {
      completedTileIds.push(construction.tileId)
    }
  })

  const obstructions = normalizeWetlandsObstructions([
    ...state.wetlandsConnection.obstructions,
    ...completedTileIds,
  ])
  const goalId =
    MANATEE_DEVELOPMENT_GOAL_IDS.STABILIZE_WETLANDS_CONNECTION
  const completesGoal =
    completedTileIds.length > 0 &&
    !state.completedDevelopmentGoals.includes(goalId) &&
    calculateWetlandsConnection(obstructions).allFeedingGroundsSafe

  return {
    ...state,
    completedDevelopmentGoals: completesGoal
      ? [...state.completedDevelopmentGoals, goalId]
      : state.completedDevelopmentGoals,
    wetlandsConnection: {
      obstructions,
      activeConstructions,
    },
  }
}
