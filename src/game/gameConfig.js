export const SIMULATION_TICK_INTERVAL_MS = 1000 / 60
export const VISUAL_UPDATE_INTERVAL_MS = 100
export const BASE_CROP_YIELD_PER_PLOT = 1
export const INITIAL_BLUEPRINT_SIZE = { rows: 1, columns: 1 }
export const STARTING_CROPS = 10
export const HAMSTER_BASE_COST = 5
export const HAMSTER_COST_GROWTH = 1.1
export const COLUMNS_PER_HAMSTER_PER_SECOND = 0.1
export const ROWS_PER_ROW_DUPLICATOR_PER_SECOND = 0.1
export const POST_UNION_HAMSTER_EFFICIENCY_GROWTH = 1.03
export const ROW_DUPLICATOR_COORDINATION_GROWTH = 1.02
export const ROOT_TUNNEL_ADJACENCY_DECAY = 0.8
export const UNIONIZATION_HAMSTER_COUNT = 1000
export const UNIONIZED_HAMSTER_COUNT = 100
export const HIRE_MAX_UNLOCK_COUNT = 10
export const UNION_STATUS_RETIRE_HIRE_COUNT = 20
export const INVENTIONS_HAMSTER_UNLOCK_COUNT = 50
export const ROW_DUPLICATORS_UNLOCK_CROP_COUNT = 4.04e23
export const ROW_DUPLICATOR_BASE_COST = 1e12
export const ROW_DUPLICATOR_COST_GROWTH = 1.2
export const BLUEPRINT_EXPANSION_CONFIG = [
  {
    id: 'column',
    title: 'Blueprint Column Expansion',
    maximumExpansions: 16,
    baseCost: 1e4,
    costScale: 1e4,
    acceleratedScalingAfter: 5,
    acceleratedCostScale: 1e3,
    initialPrerequisiteIds: [],
  },
  {
    id: 'row',
    title: 'Blueprint Row Expansion',
    maximumExpansions: 20,
    baseCost: 1e7,
    costScale: 1e2,
    acceleratedScalingAfter: 5,
    acceleratedCostScale: 1e3,
    initialPrerequisiteIds: ['firstColumn'],
  },
]

const EXPANSION_ORDINAL_IDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
]

function getExpansionStageCost(config, stageIndex) {
  const regularScaleSteps = Math.min(
    stageIndex,
    config.acceleratedScalingAfter - 1,
  )
  const acceleratedScaleStepCount = Math.max(
    0,
    stageIndex - config.acceleratedScalingAfter + 1,
  )
  const acceleratedScalePowers =
    (acceleratedScaleStepCount * (acceleratedScaleStepCount + 1)) / 2
  const baseCostExponent = Math.round(Math.log10(config.baseCost))
  const costScaleExponent = Math.round(Math.log10(config.costScale))
  const accelerationExponent = Math.round(
    Math.log10(config.acceleratedCostScale),
  )
  const totalCostExponent =
    baseCostExponent +
    regularScaleSteps * costScaleExponent +
    acceleratedScaleStepCount * costScaleExponent +
    acceleratedScalePowers * accelerationExponent

  return Number.parseFloat(`1e${totalCostExponent}`)
}

function createBlueprintExpansionTrack(config) {
  const expansionLabel = config.id === 'column' ? 'column' : 'row'
  const expansionTitle = `${expansionLabel[0].toUpperCase()}${expansionLabel.slice(1)}`

  return {
    id: config.id,
    title: config.title,
    stages: Array.from({ length: config.maximumExpansions }, (_, stageIndex) => {
      const stageId = `${EXPANSION_ORDINAL_IDS[stageIndex]}${expansionTitle}`
      const previousStageId =
        stageIndex > 0
          ? `${EXPANSION_ORDINAL_IDS[stageIndex - 1]}${expansionTitle}`
          : null

      return {
        id: stageId,
        cost: getExpansionStageCost(config, stageIndex),
        prerequisiteIds: previousStageId
          ? [previousStageId]
          : config.initialPrerequisiteIds,
        rewardDescription:
          stageIndex === 0 && config.id === 'column'
            ? 'gain one permanent blueprint column and unlock Corn'
            : `gain another permanent blueprint ${expansionLabel}`,
      }
    }),
  }
}

export const BLUEPRINT_EXPANSION_TRACKS = BLUEPRINT_EXPANSION_CONFIG.map(
  createBlueprintExpansionTrack,
)

export const BLUEPRINT_EXPANSIONS = BLUEPRINT_EXPANSION_TRACKS.flatMap(
  (track) =>
    track.stages.map((stage) => ({
      ...stage,
      trackId: track.id,
      direction: track.id,
      title: track.title,
    })),
)
