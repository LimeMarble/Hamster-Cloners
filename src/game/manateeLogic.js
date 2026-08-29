import {
  DEFAULT_MANATEE_SURVEY_TIME_LENGTH_SCALE,
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_GARDEN_TENDING_DURATION_SECONDS,
  MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
  MANATEE_RESOURCE_IDS,
  MANATEE_RESOURCES,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEY_LENGTHS,
  MANATEE_SURVEYS,
  MANATEE_ZONE_IDS,
  MANATEE_ZONES,
  getManateeSurveyDurationMultiplier,
  getManateeSurveyLength,
  getManateeSurveyRequiredWork,
  getManateeSurveyRewardMultipliers,
  getManateeSurveyTimeLengthScale,
} from './manateeConfig.js'
import {
  createInitialManateeState,
  getManateeBuildingStage,
  getManateeDivingHamsterCapacity,
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  getManateeSurveyAllocatedHamsterCount,
  getManateeSurveyingHamsterCount,
  getUnlockedManateeCropIds,
  normalizeManateeState,
} from './manateeState.js'

export {
  DEFAULT_MANATEE_SURVEY_TIME_LENGTH_SCALE,
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_GARDEN_TENDING_DURATION_SECONDS,
  MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
  MANATEE_RESOURCE_IDS,
  MANATEE_RESOURCES,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEY_LENGTHS,
  MANATEE_SURVEYS,
  MANATEE_ZONE_IDS,
  MANATEE_ZONES,
  getManateeSurveyDurationMultiplier,
  getManateeSurveyLength,
  getManateeSurveyRequiredWork,
  getManateeSurveyRewardMultipliers,
  getManateeSurveyTimeLengthScale,
}

export {
  createInitialManateeState,
  getManateeBuildingStage,
  getManateeDivingHamsterCapacity,
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  getManateeSurveyAllocatedHamsterCount,
  getManateeSurveyingHamsterCount,
  getUnlockedManateeCropIds,
  normalizeManateeState,
}

export function getMarshSurveyWorkPerSecond(
  allocatedHamsters,
  hamsterCoordination,
) {
  const safeHamsters = Math.max(
    0,
    Math.floor(Number(allocatedHamsters) || 0),
  )
  const coordination = Number(hamsterCoordination)
  if (safeHamsters === 0 || !(coordination > 1)) return 0

  const coordinationLog =
    coordination === Infinity ? Infinity : Math.log10(coordination)

  return safeHamsters * coordinationLog ** 10
}

export function getManateeSurveyWorkPerSecond(
  allocatedHamsters,
  hamsterCoordination,
  surveyId,
) {
  const survey = MANATEE_SURVEYS[surveyId]
  const safeHamsters = Math.max(
    0,
    Math.floor(Number(allocatedHamsters) || 0),
  )

  if (survey?.fixedDurationSeconds) {
    return safeHamsters >= survey.fixedHamsterAllocation ? 1 : 0
  }

  return getMarshSurveyWorkPerSecond(safeHamsters, hamsterCoordination)
}

export function getManateeSurveyDurationSeconds(
  allocatedHamsters,
  hamsterCoordination,
  surveyId,
  lengthId = MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  surveyDurationMultiplier = 1,
) {
  const survey = MANATEE_SURVEYS[surveyId]
  const workPerSecond = getManateeSurveyWorkPerSecond(
    allocatedHamsters,
    hamsterCoordination,
    surveyId,
  )
  const safeDurationMultiplier = Math.max(
    Number.EPSILON,
    Number(surveyDurationMultiplier) || 1,
  )

  const appliedDurationMultiplier = survey?.fixedDurationSeconds
    ? 1
    : safeDurationMultiplier

  return workPerSecond > 0
    ? (getManateeSurveyRequiredWork(surveyId, lengthId) / workPerSecond) *
        appliedDurationMultiplier
    : Infinity
}

export function getMarshSurveyDurationSeconds(
  allocatedHamsters,
  hamsterCoordination,
  surveyDurationMultiplier = 1,
) {
  return getManateeSurveyDurationSeconds(
    allocatedHamsters,
    hamsterCoordination,
    MANATEE_SURVEY_IDS.SEARCH_MARSH,
    MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    surveyDurationMultiplier,
  )
}

export function startManateeSurvey(
  game,
  surveyId = MANATEE_SURVEY_IDS.SEARCH_MARSH,
  lengthId = MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  requestedHamsters,
) {
  const state = normalizeManateeState(game?.manatees)
  const survey = MANATEE_SURVEYS[surveyId]
  const surveyIsBusy = state.activeSurveys.some(
    (activeSurvey) => activeSurvey.id === surveyId,
  )
  const surveyHasFinds = state.pendingFinds.some(
    (find) => find.surveyId === surveyId,
  )
  if (!survey || surveyIsBusy || surveyHasFinds) {
    return null
  }
  if (
    survey.requiredBuildingId &&
    (!state.completedBuildings.includes(survey.requiredBuildingId) ||
      getManateeBuildingStage(game, survey.requiredBuildingId) <
        (survey.requiredBuildingStage ?? 0))
  ) {
    return null
  }

  const remainingHamsters = getManateeRemainingHamsterCount(game)
  const remainingDivingCapacity =
    getManateeRemainingDivingHamsterCapacity(game)
  const requestedUnderwaterHamsters =
    requestedHamsters === undefined
      ? remainingDivingCapacity
      : Math.max(0, Math.floor(Number(requestedHamsters) || 0))
  const fixedHamsterAllocation = survey.fixedHamsterAllocation ?? 0
  const hasFixedTeamAvailable =
    remainingHamsters >= fixedHamsterAllocation &&
    (!survey.isUnderwater ||
      remainingDivingCapacity >= fixedHamsterAllocation)
  const allocatedHamsters = fixedHamsterAllocation > 0
    ? hasFixedTeamAvailable
      ? fixedHamsterAllocation
      : 0
    : survey.isUnderwater
      ? Math.min(
          remainingHamsters,
          remainingDivingCapacity,
          requestedUnderwaterHamsters,
        )
      : remainingHamsters
  if (allocatedHamsters === 0) return null

  const normalizedLength = getManateeSurveyLength(survey.id, lengthId)

  return {
    ...game,
    manatees: {
      ...state,
      activeSurveys: [
        ...state.activeSurveys,
        {
          id: survey.id,
          lengthId: normalizedLength.id,
          allocatedHamsters,
          workCompleted: 0,
        },
      ],
    },
  }
}

function getRandomUnit(random) {
  const value = Number(random())
  if (!Number.isFinite(value)) return 0
  return Math.min(1 - Number.EPSILON, Math.max(0, value))
}

function getRandomInteger(random, minimum, maximum) {
  return minimum + Math.floor(getRandomUnit(random) * (maximum - minimum + 1))
}

function createFind(
  reward,
  amount,
  idNumber,
  placementIndex,
  totalFindCount,
  surveyId,
  surveyLengthId,
  random,
) {
  const columnCount = Math.min(
    6,
    Math.max(1, Math.ceil(Math.sqrt(totalFindCount))),
  )
  const rowCount = Math.max(1, Math.ceil(totalFindCount / columnCount))
  const column = placementIndex % columnCount
  const row = Math.floor(placementIndex / columnCount)
  const xJitter = getRandomUnit(random) * 4 - 2
  const yJitter = getRandomUnit(random) * 4 - 2

  return {
    id: `manatee-find-${idNumber}`,
    kind: reward.kind,
    resourceId: reward.resourceId,
    amount,
    surveyId,
    surveyLengthId,
    x: 8 + ((column + 0.5) * 84) / columnCount + xJitter,
    y: 12 + ((row + 0.5) * 76) / rowCount + yJitter,
    rotation: getRandomUnit(random) * 40 - 20,
  }
}

function createSurveyFinds(nextFindId, survey, lengthId, random) {
  const rewardMultipliers = getManateeSurveyRewardMultipliers(
    survey.id,
    lengthId,
  )
  const rewardsWithCounts = survey.rewards.map((reward) => ({
    reward,
    count: getRandomInteger(
      random,
      reward.minimumCount * rewardMultipliers.objectCount,
      reward.maximumCount * rewardMultipliers.objectCount,
    ),
  }))
  const totalFindCount = rewardsWithCounts.reduce(
    (total, entry) => total + entry.count,
    0,
  )
  const finds = []
  let followingFindId = nextFindId

  rewardsWithCounts.forEach(({ reward, count }) => {
    for (let index = 0; index < count; index += 1) {
      const amount = getRandomInteger(
        random,
        reward.minimumAmount * rewardMultipliers.objectValue,
        reward.maximumAmount * rewardMultipliers.objectValue,
      )
      finds.push(
        createFind(
          reward,
          amount,
          followingFindId,
          finds.length,
          totalFindCount,
          survey.id,
          lengthId,
          random,
        ),
      )
      followingFindId += 1
    }
  })

  return { finds, nextFindId: followingFindId }
}

export function advanceManateeSurveyState(
  rawState,
  elapsedSeconds,
  hamsterCoordination,
  random = Math.random,
  surveyDurationMultiplier = 1,
) {
  const state = normalizeManateeState(rawState)
  if (state.activeSurveys.length === 0) return rawState ?? state

  const safeElapsedSeconds = Math.max(0, Number(elapsedSeconds) || 0)
  const safeDurationMultiplier = Math.max(
    Number.EPSILON,
    Number(surveyDurationMultiplier) || 1,
  )
  const activeSurveys = []
  const completedFinds = []
  let nextFindId = state.nextFindId

  state.activeSurveys.forEach((activeSurvey) => {
    const survey = MANATEE_SURVEYS[activeSurvey.id]
    const baseWorkPerSecond = getManateeSurveyWorkPerSecond(
      activeSurvey.allocatedHamsters,
      hamsterCoordination,
      survey.id,
    )
    const appliedDurationMultiplier = survey.fixedDurationSeconds
      ? 1
      : safeDurationMultiplier
    const workCompleted =
      activeSurvey.workCompleted +
      (baseWorkPerSecond / appliedDurationMultiplier) * safeElapsedSeconds
    const requiredWork = getManateeSurveyRequiredWork(
      survey.id,
      activeSurvey.lengthId,
    )

    if (workCompleted < requiredWork) {
      activeSurveys.push({ ...activeSurvey, workCompleted })
      return
    }

    const results = createSurveyFinds(
      nextFindId,
      survey,
      activeSurvey.lengthId,
      random,
    )
    completedFinds.push(...results.finds)
    nextFindId = results.nextFindId
  })

  return {
    ...state,
    activeSurveys,
    pendingFinds: [...state.pendingFinds, ...completedFinds],
    nextFindId,
  }
}

export function collectManateeFind(game, findId) {
  const state = normalizeManateeState(game?.manatees)
  const find = state.pendingFinds.find((candidate) => candidate.id === findId)
  if (!find) return null

  const pendingFinds = state.pendingFinds.filter(
    (candidate) => candidate.id !== findId,
  )

  return {
    ...game,
    manatees: {
      ...state,
      resources: {
        ...state.resources,
        [find.resourceId]: state.resources[find.resourceId] + find.amount,
      },
      pendingFinds,
    },
  }
}

export function canConstructManateeBuilding(game, buildingId) {
  const state = normalizeManateeState(game?.manatees)
  const building = MANATEE_BUILDINGS[buildingId]

  return Boolean(
    building &&
      !state.completedBuildings.includes(buildingId) &&
      Object.entries(building.cost).every(
        ([resourceId, amount]) => state.resources[resourceId] >= amount,
      ),
  )
}

export function constructManateeBuilding(game, buildingId) {
  if (!canConstructManateeBuilding(game, buildingId)) return null

  const state = normalizeManateeState(game?.manatees)
  const building = MANATEE_BUILDINGS[buildingId]
  const nextResources = { ...state.resources }

  Object.entries(building.cost).forEach(([resourceId, amount]) => {
    nextResources[resourceId] -= amount
  })

  return {
    ...game,
    manatees: {
      ...state,
      resources: nextResources,
      completedBuildings: [...state.completedBuildings, buildingId],
      buildingStages: {
        ...state.buildingStages,
        [buildingId]: 0,
      },
    },
  }
}

export function getNextManateeBuildingStage(game, buildingId) {
  const state = normalizeManateeState(game?.manatees)
  if (!state.completedBuildings.includes(buildingId)) return null

  const building = MANATEE_BUILDINGS[buildingId]
  const currentStage = state.buildingStages[buildingId] ?? 0
  return (
    building?.stages?.find((stage) => stage.stage === currentStage + 1) ??
    null
  )
}

export function canUpgradeManateeBuilding(game, buildingId) {
  const state = normalizeManateeState(game?.manatees)
  const nextStage = getNextManateeBuildingStage(game, buildingId)

  return Boolean(
    nextStage?.implemented === true &&
      Object.entries(nextStage.cost ?? {}).every(
        ([resourceId, amount]) => state.resources[resourceId] >= amount,
      ),
  )
}

export function upgradeManateeBuilding(game, buildingId) {
  if (!canUpgradeManateeBuilding(game, buildingId)) return null

  const state = normalizeManateeState(game?.manatees)
  const nextStage = getNextManateeBuildingStage(game, buildingId)
  const nextResources = { ...state.resources }

  Object.entries(nextStage.cost).forEach(([resourceId, amount]) => {
    nextResources[resourceId] -= amount
  })

  return {
    ...game,
    manatees: {
      ...state,
      resources: nextResources,
      buildingStages: {
        ...state.buildingStages,
        [buildingId]: nextStage.stage,
      },
    },
  }
}
