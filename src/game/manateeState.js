import {
  MANATEE_BUILDINGS,
  MANATEE_DEVELOPMENT_GOALS,
  MANATEE_RESOURCES,
  MANATEE_RESOURCE_IDS,
  MANATEE_SURVEYS,
  MANATEE_SURVEY_IDS,
  getManateeSurveyLength,
  getManateeSurveyRequiredWork,
} from './manateeConfig.js'

const FIND_REWARD_BY_KIND = new Map(
  Object.values(MANATEE_SURVEYS).flatMap((survey) =>
    survey.rewards.map((reward) => [reward.kind, reward]),
  ),
)
const FIND_SURVEY_BY_KIND = new Map()

Object.values(MANATEE_SURVEYS).forEach((survey) => {
  survey.rewards.forEach((reward) => {
    if (!FIND_SURVEY_BY_KIND.has(reward.kind)) {
      FIND_SURVEY_BY_KIND.set(reward.kind, survey.id)
    }
  })
})

const LEGACY_RESOURCE_IDS = Object.freeze({
  [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 'twig',
  [MANATEE_RESOURCE_IDS.LIMESTONE]: 'stone',
  [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 'muskGrass',
})

const LEGACY_SURVEY_IDS = Object.freeze({
  tendMuskGrass: MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
})

const LEGACY_FIND_KINDS = Object.freeze({
  'musk-grass': 'shoal-grass',
})

export function createInitialManateeState() {
  return {
    resources: Object.fromEntries(
      Object.keys(MANATEE_RESOURCES).map((resourceId) => [resourceId, 0]),
    ),
    activeSurveys: [],
    pendingFinds: [],
    completedBuildings: [],
    buildingStages: {},
    completedDevelopmentGoals: [],
    developmentGoalProgress: Object.fromEntries(
      Object.keys(MANATEE_DEVELOPMENT_GOALS).map((goalId) => [goalId, 0]),
    ),
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
  if (resourceId === 'twig') return MANATEE_RESOURCE_IDS.MANGROVE_TWIG
  if (resourceId === 'stone') return MANATEE_RESOURCE_IDS.LIMESTONE
  if (resourceId === 'muskGrass') return MANATEE_RESOURCE_IDS.SHOAL_GRASS
  return null
}

function getNormalizedSurveyId(surveyId) {
  return LEGACY_SURVEY_IDS[surveyId] ?? surveyId
}

function normalizeActiveSurvey(rawSurvey) {
  const survey = MANATEE_SURVEYS[getNormalizedSurveyId(rawSurvey?.id)]
  if (!survey) return null

  const allocatedHamsters = toNonNegativeInteger(
    rawSurvey.allocatedHamsters,
    0,
  )
  if (allocatedHamsters <= 0) return null

  const length = getManateeSurveyLength(survey.id, rawSurvey.lengthId)

  return {
    id: survey.id,
    lengthId: length.id,
    allocatedHamsters,
    workCompleted: Math.min(
      getManateeSurveyRequiredWork(survey.id, length.id),
      toNonNegativeNumber(rawSurvey.workCompleted, 0),
    ),
  }
}

function normalizeFind(
  rawFind,
  index,
  legacySurveyId,
  legacySurveyLengthId,
) {
  if (!rawFind || typeof rawFind !== 'object') return null

  const rawKind = typeof rawFind.kind === 'string' ? rawFind.kind : ''
  const kind = LEGACY_FIND_KINDS[rawKind] ?? rawKind
  const configuredReward = FIND_REWARD_BY_KIND.get(kind)
  const resourceId =
    configuredReward?.resourceId ??
    getNormalizedResourceId(rawFind.resourceId)
  const developmentGoalId = Object.hasOwn(
    MANATEE_DEVELOPMENT_GOALS,
    configuredReward?.developmentGoalId,
  )
    ? configuredReward.developmentGoalId
    : Object.hasOwn(MANATEE_DEVELOPMENT_GOALS, rawFind.developmentGoalId)
      ? rawFind.developmentGoalId
      : null
  const amount = toNonNegativeInteger(rawFind.amount, 0)
  if (!kind || (!resourceId && !developmentGoalId) || amount <= 0) return null

  const surveyId = MANATEE_SURVEYS[getNormalizedSurveyId(rawFind.surveyId)]?.id ??
    MANATEE_SURVEYS[getNormalizedSurveyId(legacySurveyId)]?.id ??
    FIND_SURVEY_BY_KIND.get(kind) ??
    MANATEE_SURVEY_IDS.SEARCH_MARSH
  const lengthId = getManateeSurveyLength(
    surveyId,
    rawFind.surveyLengthId ?? legacySurveyLengthId,
  ).id

  return {
    id:
      typeof rawFind.id === 'string' && rawFind.id.length > 0
        ? rawFind.id
        : `recovered-find-${index + 1}`,
    kind,
    resourceId,
    developmentGoalId,
    amount,
    surveyId,
    surveyLengthId: lengthId,
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

  const rawActiveSurveys = Array.isArray(rawState.activeSurveys)
    ? rawState.activeSurveys
    : rawState.activeSurvey
      ? [rawState.activeSurvey]
      : []
  const seenSurveyIds = new Set()
  const activeSurveys = rawActiveSurveys
    .map(normalizeActiveSurvey)
    .filter((survey) => {
      if (!survey || seenSurveyIds.has(survey.id)) return false
      seenSurveyIds.add(survey.id)
      return true
    })
  const pendingFinds = Array.isArray(rawState.pendingFinds)
    ? rawState.pendingFinds
        .map((find, index) =>
          normalizeFind(
            find,
            index,
            rawState.pendingSurveyId,
            rawState.pendingSurveyLengthId,
          ),
        )
        .filter(Boolean)
    : []
  const completedBuildings = Array.isArray(rawState.completedBuildings)
    ? [...new Set(rawState.completedBuildings)].filter((buildingId) =>
        Object.hasOwn(MANATEE_BUILDINGS, buildingId),
      )
    : []
  const buildingStages = Object.fromEntries(
    completedBuildings.map((buildingId) => {
      const maximumStage = Math.max(
        0,
        Math.floor(Number(MANATEE_BUILDINGS[buildingId]?.maximumStage) || 0),
      )

      return [
        buildingId,
        Math.min(
          maximumStage,
          toNonNegativeInteger(rawState.buildingStages?.[buildingId], 0),
        ),
      ]
    }),
  )
  const completedDevelopmentGoals = Array.isArray(
    rawState.completedDevelopmentGoals,
  )
    ? [...new Set(rawState.completedDevelopmentGoals)].filter((goalId) =>
        Object.hasOwn(MANATEE_DEVELOPMENT_GOALS, goalId),
      )
    : []
  const developmentGoalProgress = Object.fromEntries(
    Object.entries(MANATEE_DEVELOPMENT_GOALS).map(([goalId, goal]) => {
      const target = Math.max(0, Number(goal.target) || 0)
      const savedProgress = toNonNegativeInteger(
        rawState.developmentGoalProgress?.[goalId],
        0,
      )

      return [
        goalId,
        target > 0 ? Math.min(target, savedProgress) : 0,
      ]
    }),
  )

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
    activeSurveys,
    pendingFinds,
    completedBuildings,
    buildingStages,
    completedDevelopmentGoals,
    developmentGoalProgress,
    nextFindId: Math.max(
      pendingFinds.length + 1,
      toNonNegativeInteger(rawState.nextFindId, initialState.nextFindId),
    ),
  }
}

export function hasCompletedManateeDevelopmentGoal(game, goalId) {
  return normalizeManateeState(game?.manatees).completedDevelopmentGoals.includes(
    goalId,
  )
}

export function getCompletedManateeDevelopmentGoalCount(game) {
  return normalizeManateeState(game?.manatees).completedDevelopmentGoals.length
}

export function getManateeDevelopmentGoalProgress(game, goalId) {
  const state = normalizeManateeState(game?.manatees)
  const goal = MANATEE_DEVELOPMENT_GOALS[goalId]

  if (!goal) return 0
  if (state.completedDevelopmentGoals.includes(goalId)) {
    return Math.max(1, Number(goal.target) || 1)
  }

  return state.developmentGoalProgress[goalId] ?? 0
}

export function getManateeBuildingStage(game, buildingId) {
  const state = normalizeManateeState(game?.manatees)
  if (!state.completedBuildings.includes(buildingId)) return 0
  return state.buildingStages[buildingId] ?? 0
}

export function getUnlockedManateeCropIds(game) {
  const state = normalizeManateeState(game?.manatees)

  return state.completedBuildings.flatMap((buildingId) => {
    const building = MANATEE_BUILDINGS[buildingId]
    const completedStage = state.buildingStages[buildingId] ?? 0

    return (building?.stages ?? [])
      .filter(
        (stage) =>
          stage.implemented !== false &&
          stage.stage <= completedStage &&
          typeof stage.cropId === 'string',
      )
      .map((stage) => stage.cropId)
  })
}

function getOwnedHamsterCount(game) {
  return Math.max(0, Math.floor(Number(game?.hamsters) || 0))
}

function getAllocatedHamsterCount(state, predicate = () => true) {
  return state.activeSurveys.reduce(
    (total, survey) =>
      total + (predicate(survey) ? survey.allocatedHamsters : 0),
    0,
  )
}

export function getManateeSurveyingHamsterCount(game) {
  const state = normalizeManateeState(game?.manatees)
  return Math.min(getOwnedHamsterCount(game), getAllocatedHamsterCount(state))
}

export function getManateeSurveyAllocatedHamsterCount(game, surveyId) {
  const state = normalizeManateeState(game?.manatees)
  const ownedHamsters = getOwnedHamsterCount(game)
  let remainingHamsters = ownedHamsters

  for (const survey of state.activeSurveys) {
    const allocatedHamsters = Math.min(
      remainingHamsters,
      survey.allocatedHamsters,
    )
    if (survey.id === surveyId) return allocatedHamsters
    remainingHamsters -= allocatedHamsters
  }

  return 0
}

export function getManateeRemainingHamsterCount(game) {
  const state = normalizeManateeState(game?.manatees)
  return Math.max(
    0,
    getOwnedHamsterCount(game) - getAllocatedHamsterCount(state),
  )
}

export function getManateeDivingHamsterCapacity(game) {
  const state = normalizeManateeState(game?.manatees)

  return state.completedBuildings.reduce(
    (total, buildingId) => {
      const building = MANATEE_BUILDINGS[buildingId]
      const completedStage = state.buildingStages[buildingId] ?? 0
      const stageCapacity = [...(building?.stages ?? [])]
        .reverse()
        .find(
          (stage) =>
            stage.stage <= completedStage &&
            Number.isFinite(stage.divingHamsterCapacity),
        )?.divingHamsterCapacity

      return total + (stageCapacity ?? building?.divingHamsterCapacity ?? 0)
    },
    0,
  )
}

export function getManateeRemainingDivingHamsterCapacity(game) {
  const state = normalizeManateeState(game?.manatees)
  const allocatedDivingHamsters = getAllocatedHamsterCount(
    state,
    (survey) => MANATEE_SURVEYS[survey.id]?.isUnderwater,
  )

  return Math.max(
    0,
    getManateeDivingHamsterCapacity(game) - allocatedDivingHamsters,
  )
}
