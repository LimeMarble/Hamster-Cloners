import { getBaseFieldProductionSnapshot } from './cropProduction.js'
import { getFortuneModifiers } from './fortuneLogic.js'
import { RABBIT_UNLOCK_IDS, hasRabbitUnlock } from './tradeLogic.js'

export const CAPYBARA_DEMONSTRATION_IDS = Object.freeze({
  INTRODUCTION: 'introduction',
})

export const CAPYBARA_DEMONSTRATIONS = Object.freeze([
  {
    id: CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    number: 0,
    name: 'Introduction',
    goal: 'Have a field blueprint with a Crop yield of at least 500B Crops.',
    target: 5e11,
    unit: 'blueprint Crop yield',
    restrictions: [],
    rewardName: 'Seed Augmentation',
    rewardDescription:
      'Allows further modifications of perfected Crops at a steep Crop price.',
    hint: 'Luck may need to be on your side...',
  },
])

const CAPYBARA_DEMONSTRATION_ID_SET = new Set(
  CAPYBARA_DEMONSTRATIONS.map(({ id }) => id),
)

function toNonNegativeNumber(value) {
  const parsed = Number(value)
  if (parsed === Infinity) return Number.MAX_VALUE
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function createInitialCapybaraState() {
  return {
    completedDemonstrations: [],
  }
}

export function normalizeCapybaraState(rawCapybara) {
  if (!rawCapybara || typeof rawCapybara !== 'object') {
    return createInitialCapybaraState()
  }

  return {
    completedDemonstrations: Array.isArray(
      rawCapybara.completedDemonstrations,
    )
      ? [
          ...new Set(
            rawCapybara.completedDemonstrations.filter((id) =>
              CAPYBARA_DEMONSTRATION_ID_SET.has(id),
            ),
          ),
        ]
      : [],
  }
}

export function hasCompletedCapybaraDemonstration(game, demonstrationId) {
  return game.capybara?.completedDemonstrations?.includes(demonstrationId) === true
}

export function hasSeedAugmentation(game) {
  return hasCompletedCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
  )
}

export function getCapybaraBlueprintCropYield(game) {
  const fortuneModifiers = getFortuneModifiers(game.fortune)
  const snapshot = getBaseFieldProductionSnapshot(
    game.blueprint,
    game.completedCropPerfections,
    game.trade?.rabbitContractsCompleted ?? 0,
    fortuneModifiers.passiveEffectMultiplier,
  )

  return Math.max(
    0,
    snapshot.total *
      fortuneModifiers.cropYieldMultiplier *
      fortuneModifiers.harvestMultiplier,
  )
}

export function getCapybaraDemonstrationStatus(
  game,
  demonstrationId,
  metrics = {},
) {
  const demonstration = CAPYBARA_DEMONSTRATIONS.find(
    ({ id }) => id === demonstrationId,
  )

  if (!demonstration) {
    return null
  }

  const current = toNonNegativeNumber(
    metrics.blueprintCropYield ?? getCapybaraBlueprintCropYield(game),
  )
  const completed = hasCompletedCapybaraDemonstration(game, demonstrationId)
  const hasContact = hasRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT,
  )

  return {
    ...demonstration,
    current,
    progress: demonstration.target > 0
      ? Math.min(1, current / demonstration.target)
      : 0,
    completed,
    canComplete: hasContact && !completed && current >= demonstration.target,
  }
}

export function completeCapybaraDemonstration(
  game,
  demonstrationId,
  metrics,
) {
  const status = getCapybaraDemonstrationStatus(
    game,
    demonstrationId,
    metrics,
  )

  if (!status?.canComplete) {
    return null
  }

  const capybara = normalizeCapybaraState(game.capybara)

  return {
    ...game,
    capybara: {
      ...capybara,
      completedDemonstrations: [
        ...capybara.completedDemonstrations,
        demonstrationId,
      ],
    },
  }
}
