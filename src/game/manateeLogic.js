export const MANATEE_SURVEY_IDS = Object.freeze({
  SEARCH_MARSH: 'searchMarsh',
})

export const MANATEE_RESOURCE_IDS = Object.freeze({
  WOOD: 'wood',
  STONE: 'stone',
})

export const MANATEE_BUILDING_IDS = Object.freeze({
  DIVING_CABIN: 'divingCabin',
})

const MARSH_REFERENCE_HAMSTERS = 1875
const MARSH_REFERENCE_COORDINATION = 1e24
const MARSH_REFERENCE_DURATION_SECONDS = 60
const MARSH_REFERENCE_COORDINATION_LOG = Math.log10(
  MARSH_REFERENCE_COORDINATION,
)
const MARSH_REQUIRED_WORK =
  MARSH_REFERENCE_DURATION_SECONDS *
  MARSH_REFERENCE_HAMSTERS *
  MARSH_REFERENCE_COORDINATION_LOG ** 10

export const MANATEE_SURVEYS = Object.freeze({
  [MANATEE_SURVEY_IDS.SEARCH_MARSH]: Object.freeze({
    id: MANATEE_SURVEY_IDS.SEARCH_MARSH,
    name: 'Search the Marsh',
    description:
      'Survey the marshland close to the water for construction materials.',
    requiredWork: MARSH_REQUIRED_WORK,
    referenceHamsters: MARSH_REFERENCE_HAMSTERS,
    referenceCoordination: MARSH_REFERENCE_COORDINATION,
    referenceDurationSeconds: MARSH_REFERENCE_DURATION_SECONDS,
    rewards: Object.freeze({
      branches: Object.freeze({
        minimumCount: 5,
        maximumCount: 7,
        minimumAmount: 20,
        maximumAmount: 30,
      }),
      pebbles: Object.freeze({
        minimumCount: 3,
        maximumCount: 4,
        minimumAmount: 10,
        maximumAmount: 12,
      }),
    }),
  }),
})

export const MANATEE_BUILDINGS = Object.freeze({
  [MANATEE_BUILDING_IDS.DIVING_CABIN]: Object.freeze({
    id: MANATEE_BUILDING_IDS.DIVING_CABIN,
    name: 'Diving Cabin',
    description:
      'Stores 50 sets of hamster-sized diving gear graciously provided by Capybaras.',
    cost: Object.freeze({
      [MANATEE_RESOURCE_IDS.WOOD]: 100,
      [MANATEE_RESOURCE_IDS.STONE]: 25,
    }),
    divingHamsterCapacity: 50,
  }),
})

export function createInitialManateeState() {
  return {
    resources: {
      [MANATEE_RESOURCE_IDS.WOOD]: 0,
      [MANATEE_RESOURCE_IDS.STONE]: 0,
    },
    activeSurvey: null,
    pendingFinds: [],
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

function normalizeFind(rawFind, index) {
  if (!rawFind || typeof rawFind !== 'object') return null

  const kind = rawFind.kind === 'branch' || rawFind.kind === 'pebble'
    ? rawFind.kind
    : null
  if (!kind) return null

  const resourceId =
    kind === 'branch'
      ? MANATEE_RESOURCE_IDS.WOOD
      : MANATEE_RESOURCE_IDS.STONE
  const amount = toNonNegativeInteger(rawFind.amount, 0)
  if (amount <= 0) return null

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
      Math.max(-40, Number.isFinite(Number(rawFind.rotation))
        ? Number(rawFind.rotation)
        : 0),
    ),
  }
}

export function normalizeManateeState(rawState) {
  const initialState = createInitialManateeState()
  if (!rawState || typeof rawState !== 'object') return initialState

  const rawSurvey = rawState.activeSurvey
  const activeSurvey =
    rawSurvey?.id === MANATEE_SURVEY_IDS.SEARCH_MARSH &&
    toNonNegativeInteger(rawSurvey.allocatedHamsters, 0) > 0
      ? {
          id: MANATEE_SURVEY_IDS.SEARCH_MARSH,
          allocatedHamsters: toNonNegativeInteger(
            rawSurvey.allocatedHamsters,
            0,
          ),
          workCompleted: Math.min(
            MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH].requiredWork,
            toNonNegativeNumber(rawSurvey.workCompleted, 0),
          ),
        }
      : null
  const pendingFinds = Array.isArray(rawState.pendingFinds)
    ? rawState.pendingFinds
        .map(normalizeFind)
        .filter(Boolean)
    : []
  const completedBuildings = Array.isArray(rawState.completedBuildings)
    ? [...new Set(rawState.completedBuildings)].filter((buildingId) =>
        Object.hasOwn(MANATEE_BUILDINGS, buildingId),
      )
    : []

  return {
    resources: {
      [MANATEE_RESOURCE_IDS.WOOD]: toNonNegativeInteger(
        rawState.resources?.[MANATEE_RESOURCE_IDS.WOOD],
        0,
      ),
      [MANATEE_RESOURCE_IDS.STONE]: toNonNegativeInteger(
        rawState.resources?.[MANATEE_RESOURCE_IDS.STONE],
        0,
      ),
    },
    activeSurvey,
    pendingFinds,
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

export function getMarshSurveyDurationSeconds(
  allocatedHamsters,
  hamsterCoordination,
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
    ? (MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH].requiredWork /
        workPerSecond) *
        safeDurationMultiplier
    : Infinity
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

export function startManateeSurvey(game) {
  const state = normalizeManateeState(game?.manatees)
  const allocatedHamsters = Math.max(
    0,
    Math.floor(Number(game?.hamsters) || 0),
  )

  if (
    allocatedHamsters === 0 ||
    state.activeSurvey ||
    state.pendingFinds.length > 0
  ) {
    return null
  }

  return {
    ...game,
    manatees: {
      ...state,
      activeSurvey: {
        id: MANATEE_SURVEY_IDS.SEARCH_MARSH,
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
  kind,
  amount,
  idNumber,
  placementIndex,
  random,
) {
  const column = placementIndex % 4
  const row = Math.floor(placementIndex / 4)
  const xJitter = getRandomUnit(random) * 8 - 4
  const yJitter = getRandomUnit(random) * 8 - 4

  return {
    id: `manatee-find-${idNumber}`,
    kind,
    resourceId:
      kind === 'branch'
        ? MANATEE_RESOURCE_IDS.WOOD
        : MANATEE_RESOURCE_IDS.STONE,
    amount,
    x: 13 + column * 24.5 + xJitter,
    y: 20 + row * 31 + yJitter,
    rotation:
      kind === 'branch'
        ? getRandomUnit(random) * 50 - 25
        : getRandomUnit(random) * 20 - 10,
  }
}

function createMarshFinds(state, random) {
  const survey = MANATEE_SURVEYS[MANATEE_SURVEY_IDS.SEARCH_MARSH]
  const branchCount = getRandomInteger(
    random,
    survey.rewards.branches.minimumCount,
    survey.rewards.branches.maximumCount,
  )
  const pebbleCount = getRandomInteger(
    random,
    survey.rewards.pebbles.minimumCount,
    survey.rewards.pebbles.maximumCount,
  )
  const finds = []
  let nextFindId = state.nextFindId

  for (let index = 0; index < branchCount; index += 1) {
    const amount = getRandomInteger(
      random,
      survey.rewards.branches.minimumAmount,
      survey.rewards.branches.maximumAmount,
    )
    finds.push(createFind('branch', amount, nextFindId, finds.length, random))
    nextFindId += 1
  }

  for (let index = 0; index < pebbleCount; index += 1) {
    const amount = getRandomInteger(
      random,
      survey.rewards.pebbles.minimumAmount,
      survey.rewards.pebbles.maximumAmount,
    )
    finds.push(createFind('pebble', amount, nextFindId, finds.length, random))
    nextFindId += 1
  }

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

  if (workCompleted < survey.requiredWork) {
    return {
      ...state,
      activeSurvey: {
        ...state.activeSurvey,
        workCompleted,
      },
    }
  }

  const results = createMarshFinds(state, random)

  return {
    ...state,
    activeSurvey: null,
    pendingFinds: results.finds,
    nextFindId: results.nextFindId,
  }
}

export function collectManateeFind(game, findId) {
  const state = normalizeManateeState(game?.manatees)
  const find = state.pendingFinds.find((candidate) => candidate.id === findId)
  if (!find) return null

  return {
    ...game,
    manatees: {
      ...state,
      resources: {
        ...state.resources,
        [find.resourceId]: state.resources[find.resourceId] + find.amount,
      },
      pendingFinds: state.pendingFinds.filter(
        (candidate) => candidate.id !== findId,
      ),
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
