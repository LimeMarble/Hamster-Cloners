export const MANATEE_SURVEY_IDS = Object.freeze({
  SEARCH_MARSH: 'searchMarsh',
  MANGROVE_ROOTS: 'mangroveRoots',
  SEDIMENT: 'sediment',
  CLEAN_HUMAN_WASTE: 'cleanHumanWaste',
  TEND_SHOAL_GRASS: 'tendShoalGrass',
  TEND_WATER_LETTUCE: 'tendWaterLettuce',
  TEND_MANGROVE_SAPLING: 'tendMangroveSapling',
})

export const MANATEE_BUILDING_IDS = Object.freeze({
  DIVING_CABIN: 'divingCabin',
  SUBMERGED_GARDEN: 'submergedGarden',
})

export const MANATEE_ZONE_IDS = Object.freeze({
  MARSH: 'marsh',
  UNDERWATER_MARSH: 'underwaterMarsh',
  ESTUARY: 'estuary',
})

export const MANATEE_ZONES = Object.freeze([
  Object.freeze({
    id: MANATEE_ZONE_IDS.MARSH,
    name: 'Marsh',
    description: 'Survey the shoreline and construct surface structures.',
  }),
  Object.freeze({
    id: MANATEE_ZONE_IDS.UNDERWATER_MARSH,
    name: 'Underwater Marsh',
    description: 'Send equipped hamsters beneath the marsh water.',
  }),
  Object.freeze({
    id: MANATEE_ZONE_IDS.ESTUARY,
    name: 'Estuary',
    description:
      'Help restore the estuary after the Diving Hub unlocks flippers.',
    requiredBuildingId: MANATEE_BUILDING_IDS.DIVING_CABIN,
    requiredBuildingStage: 1,
  }),
])

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

const MANATEE_SURVEY_LENGTHS_BY_MAXIMUM_TIER = Object.freeze(
  MANATEE_SURVEY_LENGTHS.map((_, maximumTier) =>
    Object.freeze(
      MANATEE_SURVEY_LENGTHS.filter((length) => length.tier <= maximumTier),
    ),
  ),
)

export const DEFAULT_MANATEE_SURVEY_TIME_LENGTH_SCALE = 15

export const MANATEE_RESOURCE_IDS = Object.freeze({
  MANGROVE_TWIG: 'mangroveTwig',
  MANGROVE_WOOD: 'mangroveWood',
  LIMESTONE: 'limestone',
  MANGROVE_ROOTS: 'mangroveRoots',
  MANGROVE_LEAVES: 'mangroveLeaves',
  MANGROVE_SEEDS: 'mangroveSeeds',
  PETE: 'pete',
  WATER_LETTUCE: 'waterLettuce',
  SHOAL_GRASS: 'shoalGrass',
})

export const MANATEE_RESOURCES = Object.freeze({
  [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.MANGROVE_TWIG,
    name: 'Mangrove Twig',
    iconClass: 'mangrove-twig',
  }),
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
  [MANATEE_RESOURCE_IDS.MANGROVE_SEEDS]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.MANGROVE_SEEDS,
    name: 'Mangrove Seeds',
    iconClass: 'mangrove-seeds',
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
  [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: Object.freeze({
    id: MANATEE_RESOURCE_IDS.SHOAL_GRASS,
    name: 'Shoal Grass',
    iconClass: 'shoal-grass',
  }),
})

export const MANATEE_DEVELOPMENT_GOAL_IDS = Object.freeze({
  RESTORE_FEEDING_GROUNDS: 'restoreFeedingGrounds',
  CLEAN_HUMAN_WASTE: 'cleanHumanWaste',
  STABILIZE_WETLANDS_CONNECTION: 'stabilizeWetlandsConnection',
})

export const MANATEE_DEVELOPMENT_GOAL_TARGET = 3

export const MANATEE_PRIMITIVE_OBSTRUCTION = Object.freeze({
  id: 'O1',
  name: 'Primitive Obstruction',
  constructionSeconds: 10,
  hamsterCrew: 10,
  cost: Object.freeze({
    [MANATEE_RESOURCE_IDS.MANGROVE_WOOD]: 5,
    [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 10,
  }),
})

export const MANATEE_DEVELOPMENT_GOALS = Object.freeze({
  [MANATEE_DEVELOPMENT_GOAL_IDS.RESTORE_FEEDING_GROUNDS]: Object.freeze({
    id: MANATEE_DEVELOPMENT_GOAL_IDS.RESTORE_FEEDING_GROUNDS,
    name: 'Restore the Feeding Grounds',
    type: 'construction',
    description:
      'Rebuild a safe and plentiful feeding ground using materials gathered throughout Manatee territory.',
    cost: Object.freeze({
      [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 1200,
      [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 1000,
      [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 1000,
      [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 200,
      [MANATEE_RESOURCE_IDS.MANGROVE_SEEDS]: 150,
    }),
  }),
  [MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE]: Object.freeze({
    id: MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE,
    name: 'Clean out Human Waste',
    type: 'survey',
    description:
      'Search the estuary for discarded human waste and remove every object you find.',
    target: 125000,
    progressUnit: 'Waste cleared',
    surveyId: MANATEE_SURVEY_IDS.CLEAN_HUMAN_WASTE,
  }),
  [MANATEE_DEVELOPMENT_GOAL_IDS.STABILIZE_WETLANDS_CONNECTION]: Object.freeze({
    id: MANATEE_DEVELOPMENT_GOAL_IDS.STABILIZE_WETLANDS_CONNECTION,
    name: 'Restore Freshwater Flow',
    type: 'puzzle',
    description:
      'Place primitive obstructions to spread the brackish flow evenly enough that every feeding ground remains safe.',
  }),
})

export const MANATEE_GARDEN_TENDING_HAMSTER_COUNT = 10
export const MANATEE_MANGROVE_TENDING_HAMSTER_COUNT = 30
export const MANATEE_GARDEN_TENDING_DURATION_SECONDS = 300

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

function createDevelopmentReward(
  kind,
  developmentGoalId,
  minimumCount,
  maximumCount = minimumCount,
  minimumAmount = 1,
  maximumAmount = minimumAmount,
) {
  return Object.freeze({
    kind,
    developmentGoalId,
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
  supportsTimeLengths = isUnderwater,
  maximumLengthTier = MANATEE_SURVEY_LENGTHS.length - 1,
  timeLengthScale,
  fixedDurationSeconds,
  fixedHamsterAllocation,
  requiredBuildingId,
  requiredBuildingStage,
  developmentGoalId,
}) {
  const hasFixedDuration = Number(fixedDurationSeconds) > 0
  const normalizedMaximumLengthTier = supportsTimeLengths
    ? Math.max(
        0,
        Math.min(
          MANATEE_SURVEY_LENGTHS.length - 1,
          Math.floor(Number(maximumLengthTier) || 0),
        ),
      )
    : 0

  return Object.freeze({
    id,
    name,
    description,
    requiredWork: hasFixedDuration
      ? Number(fixedDurationSeconds)
      : getRequiredWork(referenceDurationSeconds),
    referenceHamsters: MARSH_REFERENCE_HAMSTERS,
    referenceCoordination: MARSH_REFERENCE_COORDINATION,
    referenceDurationSeconds,
    rewards: Object.freeze(rewards),
    isUnderwater,
    supportsTimeLengths,
    maximumLengthTier: normalizedMaximumLengthTier,
    ...(hasFixedDuration
      ? { fixedDurationSeconds: Number(fixedDurationSeconds) }
      : {}),
    ...(Number(fixedHamsterAllocation) > 0
      ? { fixedHamsterAllocation: Math.floor(fixedHamsterAllocation) }
      : {}),
    ...(requiredBuildingId ? { requiredBuildingId } : {}),
    ...(Number(requiredBuildingStage) > 0
      ? { requiredBuildingStage: Math.floor(requiredBuildingStage) }
      : {}),
    ...(developmentGoalId ? { developmentGoalId } : {}),
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
      createReward('branch', MANATEE_RESOURCE_IDS.MANGROVE_TWIG, 5, 7, 20, 30),
      createReward('pebble', MANATEE_RESOURCE_IDS.LIMESTONE, 3, 4, 10, 12),
      createReward('mangrove-seed', MANATEE_RESOURCE_IDS.MANGROVE_SEEDS, 0, 1, 1, 1),
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
      createReward('mangrove-seed', MANATEE_RESOURCE_IDS.MANGROVE_SEEDS, 2, 3, 1, 1),
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
      createReward('water-lettuce', MANATEE_RESOURCE_IDS.WATER_LETTUCE, 1, 4, 1, 5),
      createReward('shoal-grass', MANATEE_RESOURCE_IDS.SHOAL_GRASS, 1, 3, 3, 6),
      createReward('limestone', MANATEE_RESOURCE_IDS.LIMESTONE, 5, 5, 10, 15),
    ],
  }),
  [MANATEE_SURVEY_IDS.CLEAN_HUMAN_WASTE]: createSurvey({
    id: MANATEE_SURVEY_IDS.CLEAN_HUMAN_WASTE,
    name: 'Clean out Human Waste',
    description:
      'Search the estuary and manually clear the waste objects brought in by human activity.',
    referenceDurationSeconds: 10,
    isUnderwater: true,
    supportsTimeLengths: true,
    maximumLengthTier: 1,
    requiredBuildingId: MANATEE_BUILDING_IDS.DIVING_CABIN,
    requiredBuildingStage: 1,
    developmentGoalId: MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE,
    rewards: [
      createDevelopmentReward(
        'discarded-bottle',
        MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE,
        6,
        8,
        15,
        50,
      ),
      createDevelopmentReward(
        'tangled-plastic',
        MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE,
        6,
        8,
        15,
        50,
      ),
      createDevelopmentReward(
        'rusted-can',
        MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE,
        6,
        7,
        15,
        50,
      ),
      createDevelopmentReward(
        'food-wrapper',
        MANATEE_DEVELOPMENT_GOAL_IDS.CLEAN_HUMAN_WASTE,
        7,
        7,
        15,
        50,
      ),
    ],
  }),
  [MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS]: createSurvey({
    id: MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
    name: 'Tend Shoal Grass',
    description:
      'Send a fixed team of 10 hamsters to cultivate Shoal Grass in the Submerged Garden.',
    referenceDurationSeconds: MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    fixedDurationSeconds: MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    fixedHamsterAllocation: MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
    isUnderwater: true,
    supportsTimeLengths: false,
    requiredBuildingId: MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    requiredBuildingStage: 1,
    rewards: [
      createReward(
        'shoal-grass',
        MANATEE_RESOURCE_IDS.SHOAL_GRASS,
        25,
        25,
        5,
        10,
      ),
    ],
  }),
  [MANATEE_SURVEY_IDS.TEND_WATER_LETTUCE]: createSurvey({
    id: MANATEE_SURVEY_IDS.TEND_WATER_LETTUCE,
    name: 'Tend Water Lettuce',
    description:
      'Send a fixed team of 10 hamsters to cultivate Water Lettuce in the Submerged Garden.',
    referenceDurationSeconds: MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    fixedDurationSeconds: MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    fixedHamsterAllocation: MANATEE_GARDEN_TENDING_HAMSTER_COUNT,
    isUnderwater: true,
    supportsTimeLengths: false,
    requiredBuildingId: MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    requiredBuildingStage: 2,
    rewards: [
      createReward(
        'water-lettuce',
        MANATEE_RESOURCE_IDS.WATER_LETTUCE,
        25,
        25,
        5,
        10,
      ),
    ],
  }),
  [MANATEE_SURVEY_IDS.TEND_MANGROVE_SAPLING]: createSurvey({
    id: MANATEE_SURVEY_IDS.TEND_MANGROVE_SAPLING,
    name: 'Tend Mangrove Saplings',
    description:
      'Send a fixed team of 30 hamsters to tend Mangrove Saplings in the Submerged Garden.',
    referenceDurationSeconds: MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    fixedDurationSeconds: MANATEE_GARDEN_TENDING_DURATION_SECONDS,
    fixedHamsterAllocation: MANATEE_MANGROVE_TENDING_HAMSTER_COUNT,
    isUnderwater: true,
    supportsTimeLengths: false,
    requiredBuildingId: MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    requiredBuildingStage: 3,
    rewards: [
      createReward(
        'mangrove-leaf',
        MANATEE_RESOURCE_IDS.MANGROVE_LEAVES,
        15,
        20,
        10,
        20,
      ),
      createReward(
        'mangrove-wood',
        MANATEE_RESOURCE_IDS.MANGROVE_WOOD,
        8,
        10,
        8,
        10,
      ),
      createReward(
        'mangrove-root',
        MANATEE_RESOURCE_IDS.MANGROVE_ROOTS,
        10,
        12,
        2,
        4,
      ),
      createReward(
        'mangrove-seed',
        MANATEE_RESOURCE_IDS.MANGROVE_SEEDS,
        8,
        10,
        3,
        4,
      ),
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
      [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 100,
      [MANATEE_RESOURCE_IDS.LIMESTONE]: 25,
    }),
    divingHamsterCapacity: 50,
    maximumStage: 1,
    stages: Object.freeze([
      Object.freeze({
        stage: 1,
        name: 'Diving Hub',
        description:
          'Stores 200 sets of hamster-sized diving gear, now upgraded with flippers.',
        cost: Object.freeze({
          [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 500,
          [MANATEE_RESOURCE_IDS.LIMESTONE]: 1000,
          [MANATEE_RESOURCE_IDS.MANGROVE_WOOD]: 200,
        }),
        divingHamsterCapacity: 200,
        implemented: true,
      }),
    ]),
  }),
  [MANATEE_BUILDING_IDS.SUBMERGED_GARDEN]: Object.freeze({
    id: MANATEE_BUILDING_IDS.SUBMERGED_GARDEN,
    name: 'Submerged Garden',
    description:
      'An underwater cultivation site that begins empty and can support three specialized growing stages.',
    cost: Object.freeze({
      [MANATEE_RESOURCE_IDS.LIMESTONE]: 200,
      [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 40,
      [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 50,
      [MANATEE_RESOURCE_IDS.PETE]: 300,
      [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 20,
      [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 15,
    }),
    maximumStage: 3,
    stages: Object.freeze([
      Object.freeze({
        stage: 1,
        name: 'Shoal Grass Bed',
        description:
          'Unlocks Shoal Grass crop access and lets 10 hamsters tend it for 300 seconds.',
        cropId: 'shoalGrass',
        resourceId: MANATEE_RESOURCE_IDS.SHOAL_GRASS,
        surveyId: MANATEE_SURVEY_IDS.TEND_SHOAL_GRASS,
        cost: Object.freeze({
          [MANATEE_RESOURCE_IDS.PETE]: 550,
          [MANATEE_RESOURCE_IDS.SHOAL_GRASS]: 50,
        }),
        implemented: true,
      }),
      Object.freeze({
        stage: 2,
        name: 'Water Lettuce Bed',
        description: 'Unlocks Water Lettuce crop access.',
        cropId: 'waterLettuce',
        resourceId: MANATEE_RESOURCE_IDS.WATER_LETTUCE,
        cost: Object.freeze({
          [MANATEE_RESOURCE_IDS.PETE]: 1250,
          [MANATEE_RESOURCE_IDS.WATER_LETTUCE]: 100,
        }),
        surveyId: MANATEE_SURVEY_IDS.TEND_WATER_LETTUCE,
        implemented: true,
      }),
      Object.freeze({
        stage: 3,
        name: 'Mangrove Sapling Bed',
        description:
          'Unlocks Mangrove Sapling crop access and lets 30 hamsters tend the larger saplings for 300 seconds.',
        cropId: 'mangroveSapling',
        resourceId: MANATEE_RESOURCE_IDS.MANGROVE_SEEDS,
        surveyId: MANATEE_SURVEY_IDS.TEND_MANGROVE_SAPLING,
        cost: Object.freeze({
          [MANATEE_RESOURCE_IDS.PETE]: 450,
          [MANATEE_RESOURCE_IDS.MANGROVE_ROOTS]: 175,
          [MANATEE_RESOURCE_IDS.MANGROVE_LEAVES]: 250,
          [MANATEE_RESOURCE_IDS.MANGROVE_TWIG]: 500,
          [MANATEE_RESOURCE_IDS.MANGROVE_SEEDS]: 25,
        }),
        implemented: true,
      }),
    ]),
  }),
})

const MANATEE_SURVEY_LENGTH_BY_ID = new Map(
  MANATEE_SURVEY_LENGTHS.map((length) => [length.id, length]),
)

export function getManateeSurveyLengths(surveyId) {
  const maximumLengthTier =
    MANATEE_SURVEYS[surveyId]?.maximumLengthTier ?? 0
  return MANATEE_SURVEY_LENGTHS_BY_MAXIMUM_TIER[maximumLengthTier]
}

export function getManateeSurveyLength(surveyId, lengthId) {
  const survey = MANATEE_SURVEYS[surveyId]
  if (!survey?.supportsTimeLengths) {
    return MANATEE_SURVEY_LENGTH_BY_ID.get(
      MANATEE_SURVEY_LENGTH_IDS.STANDARD,
    )
  }

  const requestedLength = MANATEE_SURVEY_LENGTH_BY_ID.get(lengthId)
  return requestedLength?.tier <= survey.maximumLengthTier
    ? requestedLength
    : MANATEE_SURVEY_LENGTH_BY_ID.get(MANATEE_SURVEY_LENGTH_IDS.STANDARD)
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
