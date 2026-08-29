export const MANATEE_SURVEY_IDS = Object.freeze({
  SEARCH_MARSH: 'searchMarsh',
  MANGROVE_ROOTS: 'mangroveRoots',
  SEDIMENT: 'sediment',
})

export const MANATEE_SURVEY_LENGTH_IDS = Object.freeze({
  STANDARD: 'standard',
  EXTENDED: 'extended',
  THOROUGH: 'thorough',
})

export const MANATEE_SURVEY_LENGTHS = Object.freeze([
  Object.freeze({
    id: MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    name: 'Standard',
    tier: 0,
  }),
  Object.freeze({
    id: MANATEE_SURVEY_LENGTH_IDS.EXTENDED,
    name: 'Extended',
    tier: 1,
  }),
  Object.freeze({
    id: MANATEE_SURVEY_LENGTH_IDS.THOROUGH,
    name: 'Thorough',
    tier: 2,
  }),
])

export const DEFAULT_MANATEE_SURVEY_TIME_LENGTH_SCALE = 15

export const MANATEE_RESOURCE_IDS = Object.freeze({
  MANGROVE_WOOD: 'mangroveWood',
  LIMESTONE: 'limestone',
  MANGROVE_ROOTS: 'mangroveRoots',
  MANGROVE_LEAVES: 'mangroveLeaves',
  PETE: 'pete',
  WATER_LETTUCE: 'waterLettuce',
  MUSK_GRASS: 'muskGrass',
})

export const MANATEE_RESOURCES = Object.freeze({
  [MANATEE_RESOURCE_IDS.MANGROVE_WOOD]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.MANGROVE_WOOD,
    name: 'Mangrove Wood',
    iconClass: 'mangrove-wood',
  }),
  [MANATEE_RESOURCE_IDS.LIMESTONE]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.LIMESTONE,
    name: 'Limestone',
    iconClass: 'limestone',
  }),
  [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.MANGROVE_ROOTS,
    name: 'Mangrove Roots',
    iconClass: 'mangrove-roots',
  }),
  [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.MANGROVE_LEAVES,
    name: 'Mangrove Leaves',
    iconClass: 'mangrove-leaves',
  }),
  [MANATEE_RESOURCE_IDS.PETE]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.PETE,
    name: 'Pete',
    iconClass: 'pete',
  }),
  [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.WATER_LETTUCE,
    name: 'Water Lettuce',
    iconClass: 'water-lettuce',
  }),
  [MANATEE_RESOURCE_IDS.MUSK_GRASS]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.MUSK_GRASS,
    name: 'Musk Grass',
    iconClass: 'musk-grass',
  }),
})

export const MANATEE_BUILDING_IDS = Object.freeze({
  DIVING_CABIN: 'divingCabin',
})

const MARSH_REFERENCE_HAMSTERS = 1875
const MARSH_REFERENCE_COORDINATION = 1e24
const MARSH_REFERENCE_COORDINATION_LOG = Math.log10(
  MARSH_REFERENCE_COORDINATION,
)

function getRequiredWork(referenceDurationSeconds) {
  return (
    referenceDurationSeconds *
    MARSH_REFERENCE_HAMSTERS *
    MARSH_REFERENCE_COORDINATION_LOG ** 10
  )
}

function createReward(
  kind,
  resourceId,
  minimumCount,
  maximumCount,
  minimumAmount,
  maximumAmount,
) {
  return Object.freeze({
    kind,
    resourceId,
    minimumCount,
    maximumCount,
    minimumAmount,
    maximumAmount,
  })
}

function createSurvey({
  id,
  name,
  description,
  referenceDurationSeconds,
  rewards,
  isUnderwater = false,
  timeLengthScale,
}) {
  return Object.freeze({
    id,
    name,
    description,
    requiredWork: getRequiredWork(referenceDurationSeconds),
    referenceHamsters: MARSH_REFERENCE_HAMSTERS,
    referenceCoordination: MARSH_REFERENCE_COORDINATION,
    referenceDurationSeconds,
    rewards: Object.freeze(rewards),
    isUnderwater,
    supportsTimeLengths: isUnderwater,
    ...(timeLengthScale === undefined ? {} : { timeLengthScale }),
  })
}

export const MANATEE_SURVEYS = Object.freeze({
  [MANATEE_SURVEY_IDS.SEARCH_MARSH]: createSurvey({
    id: MANATEE_SURVEY_IDS.SEARCH_MARSH,
    name: 'Search the Marsh',
    description:
      'Survey the marshland close to the water for construction materials.',
    referenceDurationSeconds: 60,
    rewards: [
      createReward('branch', MANATEE_RESOURCE_IDS.MANGROVE_WOOD, 5, 7, 20, 30),
      createReward('pebble', MANATEE_RESOURCE_IDS.LIMESTONE, 3, 4, 10, 12),
    ],
  }),
  [MANATEE_SURVEY_IDS.MANGROVE_ROOTS]: createSurvey({
    id: MANATEE_SURVEY_IDS.MANGROVE_ROOTS,
    name: 'Survey Mangrove Roots',
    description:
      'Search beneath the tangled mangrove roots for useful plant matter and buried Pete.',
    referenceDurationSeconds: 1,
    isUnderwater: true,
    rewards: [
      createReward('mangrove-root', MANATEE_RESOURCE_IDS.MANGROVE_ROOTS, 4, 5, 1, 2),
      createReward('mangrove-leaf', MANATEE_RESOURCE_IDS.MANGROVE_LEAVES, 8, 10, 1, 1),
      createReward('pete', MANATEE_RESOURCE_IDS.PETE, 0, 2, 8, 10),
    ],
  }),
  [MANATEE_SURVEY_IDS.SEDIMENT]: createSurvey({
    id: MANATEE_SURVEY_IDS.SEDIMENT,
    name: 'Survey Sediment',
    description:
      'Comb through underwater sediment for dense deposits and marsh plants.',
    referenceDurationSeconds: 2,
    isUnderwater: true,
    rewards: [
      createReward('pete', MANATEE_RESOURCE_IDS.PETE, 10, 12, 8, 10),
      createReward('water-lettuce', MANATEE_RESOURCE_IDS.WATER_LETTUCE, 0, 4, 1, 5),
      createReward('musk-grass', MANATEE_RESOURCE_IDS.MUSK_GRASS, 1, 3, 3, 6),
      createReward('limestone', MANATEE_RESOURCE_IDS.LIMESTONE, 5, 5, 10, 15),
    ],
  }),
})

export const MANATEE_BUILDINGS = Object.freeze({
  [MANATEE_BUILDING_IDS.DIVING_CABIN]: Object.freeze({
    id: MANATEE_BUILDING_IDS.DIVING_CABIN,
    name: 'Diving Cabin',
    description:
      'Stores 50 sets of hamster-sized diving gear graciously provided by Capybaras.',
    cost: Object.freeze({
      [MANATEE_RESOURCE_IDS.MANGROVE_WOOD]: 100,
      [MANATEE_RESOURCE_IDS.LIMESTONE]: 25,
    }),
    divingHamsterCapacity: 50,
  }),
})

const MANATEE_SURVEY_LENGTH_BY_ID = new Map(
  MANATEE_SURVEY_LENGTHS.map((length) => [length.id, length]),
)

export function getManateeSurveyLength(surveyId, lengthId) {
  const survey = MANATEE_SURVEYS[surveyId]
  if (!survey?.supportsTimeLengths) {
    return MANATEE_SURVEY_LENGTH_BY_ID.get(
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    )
  }

  return (
    MANATEE_SURVEY_LENGTH_BY_ID.get(lengthId) ??
    MANATEE_SURVEY_LENGTH_BY_ID.get(MANATEE_SURVEY_LENGTH_IDS.STANDARD)
  )
}

export function getManateeSurveyTimeLengthScale(surveyId) {
  const configuredScale = Number(MANATEE_SURVEYS[surveyId]?.timeLengthScale)
  return configuredScale > 1
    ? configuredScale
    : DEFAULT_MANATEE_SURVEY_TIME_LENGTH_SCALE
}

export function getManateeSurveyDurationMultiplier(
  surveyId,
  lengthId = MANATEE_SURVEY_LENGTH_IDS.STANDARD,
) {
  const length = getManateeSurveyLength(surveyId, lengthId)
  return getManateeSurveyTimeLengthScale(surveyId) ** length.tier
}

export function getManateeSurveyRewardMultipliers(
  surveyId,
  lengthId = MANATEE_SURVEY_LENGTH_IDS.STANDARD,
) {
  const length = getManateeSurveyLength(surveyId, lengthId)
  return {
    objectCount: 2 ** length.tier,
    objectValue: 4 ** length.tier,
  }
}

export function getManateeSurveyRequiredWork(
  surveyId,
  lengthId = MANATEE_SURVEY_LENGTH_IDS.STANDARD,
) {
  const survey = MANATEE_SURVEYS[surveyId]
  if (!survey) return Infinity

  return (
    survey.requiredWork *
    getManateeSurveyDurationMultiplier(surveyId, lengthId)
  )
}
