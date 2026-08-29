import {
  DEFAULT_MANATEE_SURVEY_TIME_LENGTH_SCALE,
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_RESOURCE_IDS,
  MANATEE_RESOURCES,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEY_LENGTHS,
  MANATEE_SURVEYS,
  getManateeSurveyDurationMultiplier,
  getManateeSurveyLength,
  getManateeSurveyRequiredWork,
  getManateeSurveyRewardMultipliers,
  getManateeSurveyTimeLengthScale,
} from './manateeConfig.js'

export {
  DEFAULT_MANATEE_SURVEY_TIME_LENGTH_SCALE,
  MANATEE_BUILDING_IDS,
  MANATEE_BUILDINGS,
  MANATEE_RESOURCE_IDS,
  MANATEE_RESOURCES,
  MANATEE_SURVEY_IDS,
  MANATEE_SURVEY_LENGTH_IDS,
  MANATEE_SURVEY_LENGTHS,
  MANATEE_SURVEYS,
  getManateeSurveyDurationMultiplier,
  getManateeSurveyLength,
  getManateeSurveyRequiredWork,
  getManateeSurveyRewardMultipliers,
  getManateeSurveyTimeLengthScale,
}

const FIND_RESOURCE_BY_KIND = new Map(
  Object.values(MANATEE_SURVEYS).flatMap((survey) =>
    survey.rewards.map((reward) => [reward.kind, reward.resourceId]),
  ),
)
const LEGACY_RESOURCE_IDS = Object.freeze({
  [MANATEE_RESOURCE_IDS.MANGROVE_WOOD]: 'wood',
  [MANATEE_RESOURCE_IDS.LIMESTONE]: 'stone',
})

export function createInitialManateeState() {
  return {
    resources: Object.fromEntries(
      Object.keys(MANATEE_RESOURCES).map((resourceId) => [resourceId, 0]),
    ),
    activeSurvey: null,
    pendingFinds: [],
    pendingSurveyId: null,
    pendingSurveyLengthId: null,
    completedBuildings: [],
    nextFindId: 1,
  }
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function toNonNegativeInteger(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function getNormalizedResourceId(resourceId) {
  if (Object.hasOwn(MANATEE_RESOURCES, resourceId)) return resourceId
  if (resourceId === 'wood') return MANATEE_RESOURCE_IDS.MANGROVE_WOOD
  if (resourceId === 'stone') return MANATEE_RESOURCE_IDS.LIMESTONE
  return null
}

function normalizeFind(rawFind, index) {
  if (!rawFind || typeof rawFind !== 'object') return null

  const kind = typeof rawFind.kind === 'string' ? rawFind.kind : ''
  const resourceId =
    FIND_RESOURCE_BY_KIND.get(kind) ??
    getNormalizedResourceId(rawFind.resourceId)
  const amount = toNonNegativeInteger(rawFind.amount, 0)
  if (!kind || !resourceId || amount <= 0) return null

  return {
    id:
      typeof rawFind.id === 'string' && rawFind.id.length > 0
        ? rawFind.id
        : `recovered-find-${index + 1}`,
    kind,
    resourceId,
    amount,
    x: Math.min(92, Math.max(8, toNonNegativeNumber(rawFind.x, 50))),
    y: Math.min(88, Math.max(12, toNonNegativeNumber(rawFind.y, 50))),
    rotation: Math.min(
      40,
      Math.max(
        -40,
        Number.isFinite(Number(rawFind.rotation))
          ? Number(rawFind.rotation)
          : 0,
      ),
    ),
  }
}

export function normalizeManateeState(rawState) {
  const initialState = createInitialManateeState()
  if (!rawState || typeof rawState !== 'object') return initialState

  const pendingFinds = Array.isArray(rawState.pendingFinds)
    ? rawState.pendingFinds.map(normalizeFind).filter(Boolean)
    : []
  const rawSurvey = rawState.activeSurvey
  const activeSurveyDefinition = MANATEE_SURVEYS[rawSurvey?.id]
  const activeSurveyLength = getManateeSurveyLength(
    activeSurveyDefinition?.id,
    rawSurvey?.lengthId,
  )
  const activeSurvey =
    activeSurveyDefinition &&
    toNonNegativeInteger(rawSurvey.allocatedHamsters, 0) > 0
      ? {
          id: activeSurveyDefinition.id,
          lengthId: activeSurveyLength.id,
          allocatedHamsters: toNonNegativeInteger(
            rawSurvey.allocatedHamsters,
            0,
          ),
          workCompleted: Math.min(
            getManateeSurveyRequiredWork(
              activeSurveyDefinition.id,
              activeSurveyLength.id,
            ),
            toNonNegativeNumber(rawSurvey.workCompleted, 0),
          ),
        }
      : null
  const completedBuildings = Array.isArray(rawState.completedBuildings)
    ? [...new Set(rawState.completedBuildings)].filter((buildingId) =>
        Object.hasOwn(MANATEE_BUILDINGS, buildingId),
      )
    : []
  const pendingSurvey = MANATEE_SURVEYS[rawState.pendingSurveyId]
  const pendingSurveyId =
    pendingFinds.length > 0
      ? pendingSurvey?.id ?? MANATEE_SURVEY_IDS.SEARCH_MARSH
      : null
  const pendingSurveyLengthId = pendingSurveyId
    ? getManateeSurveyLength(
        pendingSurveyId,
        rawState.pendingSurveyLengthId,
      ).id
    : null

  return {
    resources: Object.fromEntries(
      Object.keys(MANATEE_RESOURCES).map((resourceId) => {
        const legacyResourceId = LEGACY_RESOURCE_IDS[resourceId]
        const savedAmount = rawState.resources?.[resourceId]
        const legacyAmount = legacyResourceId
          ? rawState.resources?.[legacyResourceId]
          : undefined

        return [
          resourceId,
          toNonNegativeInteger(savedAmount ?? legacyAmount, 0),
        ]
      }),
    ),
    activeSurvey,
    pendingFinds,
    pendingSurveyId,
    pendingSurveyLengthId,
    completedBuildings,
    nextFindId: Math.max(
      pendingFinds.length + 1,
      toNonNegativeInteger(rawState.nextFindId, initialState.nextFindId),
    ),
  }
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

export function getManateeSurveyDurationSeconds(
  allocatedHamsters,
  hamsterCoordination,
  surveyId,
  lengthId = MANATEE_SURVEY_LENGTH_IDS.STANDARD,
  surveyDurationMultiplier = 1,
) {
  const workPerSecond = getMarshSurveyWorkPerSecond(
    allocatedHamsters,
    hamsterCoordination,
  )
  const safeDurationMultiplier = Math.max(
    Number.EPSILON,
    Number(surveyDurationMultiplier) || 1,
  )

  return workPerSecond > 0
    ? (getManateeSurveyRequiredWork(surveyId, lengthId) / workPerSecond) *
        safeDurationMultiplier
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

export function getManateeSurveyingHamsterCount(game) {
  const state = normalizeManateeState(game?.manatees)
  if (!state.activeSurvey) return 0

  return Math.min(
    Math.max(0, Math.floor(Number(game?.hamsters) || 0)),
    state.activeSurvey.allocatedHamsters,
  )
}

export function getManateeDivingHamsterCapacity(game) {
  const state = normalizeManateeState(game?.manatees)

  return state.completedBuildings.reduce(
    (total, buildingId) =>
      total + (MANATEE_BUILDINGS[buildingId]?.divingHamsterCapacity ?? 0),
    0,
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
  if (!survey || state.activeSurvey || state.pendingFinds.length > 0) {
    return null
  }

  const ownedHamsters = Math.max(0, Math.floor(Number(game?.hamsters) || 0))
  const divingCapacity = getManateeDivingHamsterCapacity(game)
  const requestedUnderwaterHamsters =
    requestedHamsters === undefined
      ? divingCapacity
      : Math.max(0, Math.floor(Number(requestedHamsters) || 0))
  const allocatedHamsters = survey.isUnderwater
    ? Math.min(ownedHamsters, divingCapacity, requestedUnderwaterHamsters)
    : ownedHamsters
  if (allocatedHamsters === 0) return null

  const normalizedLength = getManateeSurveyLength(survey.id, lengthId)

  return {
    ...game,
    manatees: {
      ...state,
      activeSurvey: {
        id: survey.id,
        lengthId: normalizedLength.id,
        allocatedHamsters,
        workCompleted: 0,
      },
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
    x: 8 + ((column + 0.5) * 84) / columnCount + xJitter,
    y: 12 + ((row + 0.5) * 76) / rowCount + yJitter,
    rotation: getRandomUnit(random) * 40 - 20,
  }
}

function createSurveyFinds(state, survey, lengthId, random) {
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
  let nextFindId = state.nextFindId

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
          nextFindId,
          finds.length,
          totalFindCount,
          random,
        ),
      )
      nextFindId += 1
    }
  })

  return { finds, nextFindId }
}

export function advanceManateeSurveyState(
  rawState,
  elapsedSeconds,
  hamsterCoordination,
  random = Math.random,
  surveyDurationMultiplier = 1,
) {
  const state = normalizeManateeState(rawState)
  if (!state.activeSurvey) return rawState ?? state

  const safeElapsedSeconds = Math.max(0, Number(elapsedSeconds) || 0)
  const baseWorkPerSecond = getMarshSurveyWorkPerSecond(
    state.activeSurvey.allocatedHamsters,
    hamsterCoordination,
  )
  const safeDurationMultiplier = Math.max(
    Number.EPSILON,
    Number(surveyDurationMultiplier) || 1,
  )
  const workCompleted =
    state.activeSurvey.workCompleted +
    (baseWorkPerSecond / safeDurationMultiplier) * safeElapsedSeconds
  const survey = MANATEE_SURVEYS[state.activeSurvey.id]
  const requiredWork = getManateeSurveyRequiredWork(
    survey.id,
    state.activeSurvey.lengthId,
  )

  if (workCompleted < requiredWork) {
    return {
      ...state,
      activeSurvey: {
        ...state.activeSurvey,
        workCompleted,
      },
    }
  }

  const results = createSurveyFinds(
    state,
    survey,
    state.activeSurvey.lengthId,
    random,
  )

  return {
    ...state,
    activeSurvey: null,
    pendingFinds: results.finds,
    pendingSurveyId: survey.id,
    pendingSurveyLengthId: state.activeSurvey.lengthId,
    nextFindId: results.nextFindId,
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
      pendingSurveyId: pendingFinds.length > 0 ? state.pendingSurveyId : null,
      pendingSurveyLengthId:
        pendingFinds.length > 0 ? state.pendingSurveyLengthId : null,
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
    },
  }
}
