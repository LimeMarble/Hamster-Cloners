import { grantFreeBlueprintExpansion } from './blueprintLogic.js'
import { CROP_DEFINITIONS, getUnlockedCropIds } from './crops.js'
import { getFieldsPlanted } from './cropProduction.js'
import { getRabbitRelationsMultiplier } from './cropEffects.js'
import { getFortuneModifiers } from './fortuneLogic.js'

export const TRADE_ESTABLISHMENT_COST = 1e57
export const RABBIT_CONTRACT_MIN_FACTOR = 1e7
export const RABBIT_CONTRACT_MAX_FACTOR = 5e7
export const RABBIT_ACTIVE_CONTRACT_COUNT = 3
export const RABBIT_CONTRACT_AVERAGE_FACTOR =
  (RABBIT_CONTRACT_MIN_FACTOR + RABBIT_CONTRACT_MAX_FACTOR) / 2
export const RABBIT_BLAZING_CONTRACT_RATE = 5
export const RABBIT_BLAZING_PACE_SWITCH_SECONDS = 5
export const RABBIT_CONTRACT_PACE_SAMPLE_SECONDS = 0.1
export const RABBIT_BULK_CONTRACT_RATE = 10
export const RABBIT_BULK_CONTRACT_INTERVAL_SECONDS = 0.1

export const RABBIT_UNLOCK_IDS = Object.freeze({
  CARROT: 'carrot',
  ROW_EXPANSION: 'rowExpansion',
  COLUMN_EXPANSION: 'columnExpansion',
  HAMSTER_EFFICIENCY: 'hamsterEfficiency',
  ROW_DUPLICATOR_EFFICIENCY: 'rowDuplicatorEfficiency',
  CONTRACTOR: 'contractor',
  CAPYBARA_CONTACT: 'capybaraContact',
  FOUR_LEAF_CLOVER: 'fourLeafClover',
})

export const RABBIT_UNLOCKS = Object.freeze([
  {
    id: RABBIT_UNLOCK_IDS.CARROT,
    name: 'Unlock Carrot',
    cost: 500,
    description:
      'Unlocks Carrot. Its harvest bonus grows with completed Rabbit contracts, and Carrot contracts give double relations.',
  },
  {
    id: RABBIT_UNLOCK_IDS.ROW_EXPANSION,
    name: 'Blueprint Row Expansion',
    cost: 1000,
    description: 'Adds one permanent blueprint row without resetting your field.',
  },
  {
    id: RABBIT_UNLOCK_IDS.COLUMN_EXPANSION,
    name: 'Blueprint Column Expansion',
    cost: 2000,
    description: 'Adds one permanent blueprint column without resetting your field.',
  },  {
    id: RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY,
    name: '×3 Hamster Efficiency',
    cost: 4444,
    description: 'A permanent external multiplier to Hamster Cloner production.',
  },
  {
    id: RABBIT_UNLOCK_IDS.ROW_DUPLICATOR_EFFICIENCY,
    name: '×2 Row Duplicator Efficiency',
    cost: 6000,
    description: 'A permanent external multiplier to Row Duplicator production.',
  },
  {
    id: RABBIT_UNLOCK_IDS.CONTRACTOR,
    name: 'Strike a deal with a Contractor',
    cost: 10000,
    description:
      'Finished Rabbit contracts are claimed and replaced automatically.',
  },
  {
    id: RABBIT_UNLOCK_IDS.FOUR_LEAF_CLOVER,
    name: 'Unlock 4-Leaf Clover',
    cost: 27777,
    description:
      'Unlocks one 4-Leaf Clover per blueprint and its collectible Breezes of Fortune.',
  },
  {
    id: RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT,
    name: 'Establish contact with Capybaras',
    cost: 40000,
    description:
      'Unlocks Capybara demonstrations of agricultural and technical prowess.',
  },
])

const RABBIT_UNLOCK_ID_SET = new Set(RABBIT_UNLOCKS.map(({ id }) => id))
const RABBIT_EXPANSION_TRACK_BY_UNLOCK_ID = Object.freeze({
  [RABBIT_UNLOCK_IDS.ROW_EXPANSION]: 'row',
  [RABBIT_UNLOCK_IDS.COLUMN_EXPANSION]: 'column',
})
const RABBIT_EXCLUDED_CROP_IDS = new Set([
  'appleTree',
  'knotweed',
  'pumpkin',
  'leechingGourd',
  'leechingGourdPart',
])

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function clampRandomValue(randomValue) {
  return Math.min(0.9999999999999999, Math.max(0, Number(randomValue) || 0))
}

export function createInitialTradeState() {
  return {
    established: false,
    rabbitRelations: 0,
    rabbitContractsCompleted: 0,
    rabbitContracts: [],
    rabbitUnlocks: [],
    rabbitContractsBlazing: false,
    rabbitContractPaceTransitionSeconds: 0,
    rabbitContractPaceSampleSeconds: RABBIT_CONTRACT_PACE_SAMPLE_SECONDS,
    rabbitContractEstimatedCompletionsPerSecond: 0,
    rabbitBulkContractElapsedSeconds: 0,
    rabbitBulkContractFractionalCompletions: 0,
    rabbitBulkRelationRemainder: 0,
  }
}

export function isRabbitContractCropEligible(cropId) {
  const definition = CROP_DEFINITIONS[cropId]

  return Boolean(
    definition &&
      definition.internalOnly !== true &&
      definition.temporarilyUnavailable !== true &&
      definition.doesNotHarvest !== true &&
      Number(definition.baseYield) > 0 &&
      !RABBIT_EXCLUDED_CROP_IDS.has(cropId),
  )
}

export function hasRabbitUnlock(game, unlockId) {
  return game.trade?.rabbitUnlocks?.includes(unlockId) === true
}

export function getRabbitContractCompletionsPerSecond(
  game,
  productionByCrop,
) {
  const averageContractSize =
    Math.max(1, getFieldsPlanted(game.farmland)) *
    RABBIT_CONTRACT_AVERAGE_FACTOR
  const grownCropRates = Object.entries(productionByCrop ?? {}).flatMap(
    ([cropId, productionPerSecond]) =>
      isRabbitContractCropEligible(cropId)
        ? [
            toNonNegativeNumber(productionPerSecond) /
              averageContractSize,
          ]
        : [],
  )

  return grownCropRates.length > 0 ? Math.min(...grownCropRates) : 0
}

export function advanceRabbitContractPaceState(
  game,
  productionPerSecondByCrop,
  elapsedSeconds,
) {
  const isBlazing = game.trade?.rabbitContractsBlazing === true
  const hasContractor = hasRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.CONTRACTOR,
  )
  const safeElapsedSeconds = toNonNegativeNumber(elapsedSeconds)

  if (!hasContractor) {
    return {
      rabbitContractsBlazing: false,
      rabbitContractPaceTransitionSeconds: 0,
      rabbitContractPaceSampleSeconds: RABBIT_CONTRACT_PACE_SAMPLE_SECONDS,
      rabbitContractEstimatedCompletionsPerSecond: 0,
    }
  }

  const accumulatedSampleSeconds =
    toNonNegativeNumber(game.trade?.rabbitContractPaceSampleSeconds) +
    safeElapsedSeconds
  const completedSampleIntervals = Math.floor(
    (accumulatedSampleSeconds + 1e-9) /
      RABBIT_CONTRACT_PACE_SAMPLE_SECONDS,
  )
  const shouldSample = completedSampleIntervals > 0
  const completionRate = shouldSample
    ? getRabbitContractCompletionsPerSecond(
        game,
        productionPerSecondByCrop,
      )
    : toNonNegativeNumber(
        game.trade?.rabbitContractEstimatedCompletionsPerSecond,
      )
  const sampleRemainder = shouldSample
    ? accumulatedSampleSeconds -
      completedSampleIntervals * RABBIT_CONTRACT_PACE_SAMPLE_SECONDS
    : accumulatedSampleSeconds
  const nextSampleSeconds = Math.max(
    0,
    sampleRemainder < 1e-9 ? 0 : sampleRemainder,
  )
  const shouldSwitch = isBlazing
    ? completionRate < RABBIT_BLAZING_CONTRACT_RATE
    : completionRate > RABBIT_BLAZING_CONTRACT_RATE
  const paceSampleState = {
    rabbitContractPaceSampleSeconds: nextSampleSeconds,
    rabbitContractEstimatedCompletionsPerSecond: completionRate,
  }

  if (!shouldSwitch) {
    return {
      rabbitContractsBlazing: isBlazing,
      rabbitContractPaceTransitionSeconds: 0,
      ...paceSampleState,
    }
  }

  const transitionSeconds =
    toNonNegativeNumber(
      game.trade?.rabbitContractPaceTransitionSeconds,
    ) + safeElapsedSeconds

  return transitionSeconds >= RABBIT_BLAZING_PACE_SWITCH_SECONDS
    ? {
        rabbitContractsBlazing: !isBlazing,
        rabbitContractPaceTransitionSeconds: 0,
        ...paceSampleState,
      }
    : {
        rabbitContractsBlazing: isBlazing,
        rabbitContractPaceTransitionSeconds: transitionSeconds,
        ...paceSampleState,
      }
}

export function getRabbitContractCropIds(game) {
  return getUnlockedCropIds(
    game.blueprint,
    game.unionized,
    game.hamsters,
    game.hasUnlockedTurnip,
    game.hasUnlockedAppleTree,
    game.hasUnlockedLentil,
    game.hasUnlockedKnotweed,
    game.hasUnlockedRootTunnel,
    game.hasUnlockedSunflower,
    game.rowDuplicators,
    hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.CARROT),
    hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.FOUR_LEAF_CLOVER),
    game.hasUnlockedWheat,
  ).filter(isRabbitContractCropEligible)
}

export function getRabbitContractRelationsReward(fieldsPlanted, factor) {
  const safeFields = Math.max(1, toNonNegativeNumber(fieldsPlanted, 1))
  const safeFactor = Math.max(0, toNonNegativeNumber(factor))

  return Math.max(
    0,
    Math.floor(Math.log10(safeFields) * (safeFactor / RABBIT_CONTRACT_MIN_FACTOR)),
  )
}

export function getRabbitBulkAverageRelationsPerContract(game) {
  const eligibleCropIds = getRabbitContractCropIds(game)

  if (eligibleCropIds.length === 0) return 0

  const fieldsPlanted = Math.max(1, getFieldsPlanted(game.farmland))
  const averageBaseReward = getRabbitContractRelationsReward(
    fieldsPlanted,
    RABBIT_CONTRACT_AVERAGE_FACTOR,
  )
  const relationMultiplier = getRabbitRelationsMultiplier(
    game.blueprint,
    game.completedCropPerfections,
    getFortuneModifiers(game).passiveEffectMultiplier,
  )
  const totalReward = eligibleCropIds.reduce(
    (sum, cropId) =>
      sum +
      Math.floor(
        averageBaseReward *
          (cropId === 'carrot' ? 2 : 1) *
          relationMultiplier,
      ),
    0,
  )

  return totalReward / eligibleCropIds.length
}

export function createRabbitContract(game, random = Math.random) {
  const eligibleCropIds = getRabbitContractCropIds(game)

  if (eligibleCropIds.length === 0) {
    return null
  }

  const factorStep = Math.floor(clampRandomValue(random()) * 41)
  const factor = RABBIT_CONTRACT_MIN_FACTOR + factorStep * 1e6
  const cropIndex = Math.floor(
    clampRandomValue(random()) * eligibleCropIds.length,
  )
  const cropId = eligibleCropIds[cropIndex]
  const fieldsPlanted = Math.max(1, getFieldsPlanted(game.farmland))
  const relationRewardMultiplier = cropId === 'carrot' ? 2 : 1

  return {
    cropId,
    factor,
    fieldsPlanted,
    requiredAmount: fieldsPlanted * factor,
    progress: 0,
    relationsReward:
      getRabbitContractRelationsReward(fieldsPlanted, factor) *
      relationRewardMultiplier,
  }
}

function createRabbitContracts(game, random = Math.random) {
  return Array.from(
    { length: RABBIT_ACTIVE_CONTRACT_COUNT },
    () => createRabbitContract(game, random),
  )
}

function normalizeRabbitContract(rawContract) {
  if (
    !rawContract ||
    typeof rawContract !== 'object' ||
    !isRabbitContractCropEligible(rawContract.cropId)
  ) {
    return null
  }

  const factor = toNonNegativeNumber(rawContract.factor)
  const fieldsPlanted = toNonNegativeNumber(rawContract.fieldsPlanted)
  const requiredAmount = toNonNegativeNumber(rawContract.requiredAmount)

  if (factor <= 0 || fieldsPlanted <= 0 || requiredAmount <= 0) {
    return null
  }

  return {
    cropId: rawContract.cropId,
    factor,
    fieldsPlanted,
    requiredAmount,
    progress: Math.min(
      requiredAmount,
      toNonNegativeNumber(rawContract.progress),
    ),
    relationsReward: toNonNegativeNumber(
      rawContract.relationsReward,
      getRabbitContractRelationsReward(fieldsPlanted, factor),
    ),
  }
}

function normalizeRabbitContracts(rawTrade) {
  const rawContracts = Array.isArray(rawTrade.rabbitContracts)
    ? rawTrade.rabbitContracts
    : rawTrade.rabbitContract
      ? [rawTrade.rabbitContract]
      : []
  const contracts = rawContracts
    .slice(0, RABBIT_ACTIVE_CONTRACT_COUNT)
    .map(normalizeRabbitContract)

  while (contracts.length < RABBIT_ACTIVE_CONTRACT_COUNT) {
    contracts.push(null)
  }

  return contracts
}

export function normalizeTradeState(rawTrade) {
  const initialTrade = createInitialTradeState()

  if (!rawTrade || typeof rawTrade !== 'object') {
    return initialTrade
  }

  return {
    established: rawTrade.established === true,
    rabbitRelations: toNonNegativeNumber(rawTrade.rabbitRelations),
    rabbitContractsCompleted: Math.floor(
      toNonNegativeNumber(rawTrade.rabbitContractsCompleted),
    ),
    rabbitContracts: normalizeRabbitContracts(rawTrade),
    rabbitUnlocks: Array.isArray(rawTrade.rabbitUnlocks)
      ? [
          ...new Set(
            rawTrade.rabbitUnlocks.filter((id) => RABBIT_UNLOCK_ID_SET.has(id)),
          ),
        ]
      : [],
    rabbitContractsBlazing: rawTrade.rabbitContractsBlazing === true,
    rabbitContractPaceTransitionSeconds: Math.min(
      RABBIT_BLAZING_PACE_SWITCH_SECONDS,
      toNonNegativeNumber(rawTrade.rabbitContractPaceTransitionSeconds),
    ),
    rabbitContractPaceSampleSeconds: Math.min(
      RABBIT_CONTRACT_PACE_SAMPLE_SECONDS,
      toNonNegativeNumber(
        rawTrade.rabbitContractPaceSampleSeconds,
        RABBIT_CONTRACT_PACE_SAMPLE_SECONDS,
      ),
    ),
    rabbitContractEstimatedCompletionsPerSecond: toNonNegativeNumber(
      rawTrade.rabbitContractEstimatedCompletionsPerSecond,
    ),
    rabbitBulkContractElapsedSeconds: Math.min(
      RABBIT_BULK_CONTRACT_INTERVAL_SECONDS,
      toNonNegativeNumber(rawTrade.rabbitBulkContractElapsedSeconds),
    ),
    rabbitBulkContractFractionalCompletions: Math.min(
      1 - Number.EPSILON,
      toNonNegativeNumber(rawTrade.rabbitBulkContractFractionalCompletions),
    ),
    rabbitBulkRelationRemainder: Math.min(
      1 - Number.EPSILON,
      toNonNegativeNumber(rawTrade.rabbitBulkRelationRemainder),
    ),
  }
}

export function establishTradeRelations(game, random = Math.random) {
  if (
    game.trade?.established === true ||
    Number(game.crops) < TRADE_ESTABLISHMENT_COST
  ) {
    return null
  }

  const establishedGame = {
    ...game,
    crops: game.crops - TRADE_ESTABLISHMENT_COST,
    trade: {
      ...createInitialTradeState(),
      ...game.trade,
      established: true,
    },
  }

  return {
    ...establishedGame,
    trade: {
      ...establishedGame.trade,
      rabbitContracts: createRabbitContracts(establishedGame, random),
    },
  }
}

function advanceRabbitContractsInBulk(
  game,
  completionRate,
  elapsedSeconds,
) {
  const accumulatedSeconds =
    toNonNegativeNumber(game.trade.rabbitBulkContractElapsedSeconds) +
    toNonNegativeNumber(elapsedSeconds)
  const completedIntervals = Math.floor(
    (accumulatedSeconds + 1e-9) /
      RABBIT_BULK_CONTRACT_INTERVAL_SECONDS,
  )

  if (completedIntervals === 0) {
    return {
      ...game.trade,
      rabbitBulkContractElapsedSeconds: accumulatedSeconds,
    }
  }

  const elapsedRemainder =
    accumulatedSeconds -
    completedIntervals * RABBIT_BULK_CONTRACT_INTERVAL_SECONDS
  const exactCompletions =
    toNonNegativeNumber(game.trade.rabbitBulkContractFractionalCompletions) +
    toNonNegativeNumber(completionRate) *
      completedIntervals *
      RABBIT_BULK_CONTRACT_INTERVAL_SECONDS
  const completedContracts = Math.floor(exactCompletions + 1e-9)
  const fractionalCompletions = Math.max(
    0,
    exactCompletions - completedContracts,
  )

  if (completedContracts === 0) {
    return {
      ...game.trade,
      rabbitBulkContractElapsedSeconds: Math.max(0, elapsedRemainder),
      rabbitBulkContractFractionalCompletions: fractionalCompletions,
    }
  }

  const exactRelations =
    toNonNegativeNumber(game.trade.rabbitBulkRelationRemainder) +
    completedContracts * getRabbitBulkAverageRelationsPerContract(game)
  const gainedRelations = Math.floor(exactRelations + 1e-9)

  return {
    ...game.trade,
    rabbitRelations:
      toNonNegativeNumber(game.trade.rabbitRelations) + gainedRelations,
    rabbitContractsCompleted:
      Math.floor(toNonNegativeNumber(game.trade.rabbitContractsCompleted)) +
      completedContracts,
    rabbitBulkContractElapsedSeconds: Math.max(0, elapsedRemainder),
    rabbitBulkContractFractionalCompletions: fractionalCompletions,
    rabbitBulkRelationRemainder: Math.max(0, exactRelations - gainedRelations),
  }
}

export function advanceRabbitContract(
  game,
  productionByCrop,
  random = Math.random,
  elapsedSeconds = 0,
  productionIsPerSecond = false,
) {
  if (game.trade?.established !== true) {
    return game.trade
  }

  const safeElapsedSeconds = toNonNegativeNumber(elapsedSeconds)
  const productionPerSecondByCrop = productionIsPerSecond
    ? productionByCrop ?? {}
    : safeElapsedSeconds > 0
      ? Object.fromEntries(
          Object.entries(productionByCrop ?? {}).map(([cropId, amount]) => [
            cropId,
            toNonNegativeNumber(amount) / safeElapsedSeconds,
          ]),
        )
      : {}
  const paceState = advanceRabbitContractPaceState(
    game,
    productionPerSecondByCrop,
    safeElapsedSeconds,
  )
  const tradeWithPace = {
    ...game.trade,
    ...paceState,
  }
  const hasContractor = hasRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.CONTRACTOR,
  )

  if (
    hasContractor &&
    paceState.rabbitContractEstimatedCompletionsPerSecond >
      RABBIT_BULK_CONTRACT_RATE
  ) {
    return advanceRabbitContractsInBulk(
      { ...game, trade: tradeWithPace },
      paceState.rabbitContractEstimatedCompletionsPerSecond,
      safeElapsedSeconds,
    )
  }

  const currentContracts = Array.isArray(game.trade.rabbitContracts)
    ? game.trade.rabbitContracts
    : normalizeRabbitContracts(game.trade)
  const rabbitContracts = currentContracts.map((currentContract) => {
    const contract = currentContract ?? createRabbitContract(game, random)

    if (!contract) {
      return null
    }

    const producedAmount =
      Math.max(
        0,
        Number(productionByCrop?.[contract.cropId]) || 0,
      ) * (productionIsPerSecond ? safeElapsedSeconds : 1)

    return {
      ...contract,
      progress: Math.min(
        contract.requiredAmount,
        contract.progress + producedAmount,
      ),
    }
  })
  const advancedTrade = {
    ...tradeWithPace,
    rabbitContracts,
    rabbitBulkContractElapsedSeconds: 0,
    rabbitBulkContractFractionalCompletions: toNonNegativeNumber(
      game.trade.rabbitBulkContractFractionalCompletions,
    ),
    rabbitBulkRelationRemainder: toNonNegativeNumber(
      game.trade.rabbitBulkRelationRemainder,
    ),
  }

  if (!hasContractor) {
    return advancedTrade
  }

  return claimCompletedRabbitContracts(
    { ...game, trade: advancedTrade },
    random,
  )
}

function claimCompletedRabbitContracts(game, random) {
  const contracts = game.trade.rabbitContracts
  const completedIndexes = contracts.flatMap((contract, index) =>
    contract && contract.progress >= contract.requiredAmount ? [index] : [],
  )

  if (completedIndexes.length === 0) {
    return game.trade
  }

  const relationMultiplier = getRabbitRelationsMultiplier(
    game.blueprint,
    game.completedCropPerfections,
    getFortuneModifiers(game).passiveEffectMultiplier,
  )
  const completedIndexSet = new Set(completedIndexes)
  const gainedRelations = completedIndexes.reduce(
    (total, index) =>
      total +
      Math.floor(
        toNonNegativeNumber(contracts[index].relationsReward) *
          relationMultiplier,
      ),
    0,
  )
  const gameWithRelations = {
    ...game,
    trade: {
      ...game.trade,
      rabbitRelations:
        toNonNegativeNumber(game.trade.rabbitRelations) + gainedRelations,
      rabbitContractsCompleted:
        Math.floor(toNonNegativeNumber(game.trade.rabbitContractsCompleted)) +
        completedIndexes.length,
    },
  }

  return {
    ...gameWithRelations.trade,
    rabbitContracts: contracts.map((contract, index) =>
      completedIndexSet.has(index)
        ? createRabbitContract(gameWithRelations, random)
        : contract,
    ),
  }
}

export function claimRabbitContract(
  game,
  contractIndex = 0,
  random = Math.random,
) {
  // Preserve the previous claimRabbitContract(game, random) call shape.
  if (typeof contractIndex === 'function') {
    random = contractIndex
    contractIndex = 0
  }

  const safeIndex = Math.floor(Number(contractIndex) || 0)
  const contracts = Array.isArray(game.trade?.rabbitContracts)
    ? game.trade.rabbitContracts
    : normalizeRabbitContracts(game.trade ?? {})
  const contract = contracts[safeIndex]

  if (
    game.trade?.established !== true ||
    safeIndex < 0 ||
    safeIndex >= RABBIT_ACTIVE_CONTRACT_COUNT ||
    !contract ||
    contract.progress < contract.requiredAmount
  ) {
    return null
  }

  const relationMultiplier = getRabbitRelationsMultiplier(
    game.blueprint,
    game.completedCropPerfections,
    getFortuneModifiers(game).passiveEffectMultiplier,
  )
  const gainedRelations = Math.floor(
    toNonNegativeNumber(contract.relationsReward) * relationMultiplier,
  )
  const gameWithRelations = {
    ...game,
    trade: {
      ...game.trade,
      rabbitRelations:
        toNonNegativeNumber(game.trade.rabbitRelations) + gainedRelations,
      rabbitContractsCompleted:
        Math.floor(toNonNegativeNumber(game.trade.rabbitContractsCompleted)) + 1,
      rabbitContracts: contracts.map((currentContract, index) =>
        index === safeIndex ? null : currentContract,
      ),
    },
  }

  return {
    ...gameWithRelations,
    trade: {
      ...gameWithRelations.trade,
      rabbitContracts: gameWithRelations.trade.rabbitContracts.map(
        (currentContract, index) =>
          index === safeIndex
            ? createRabbitContract(gameWithRelations, random)
            : currentContract,
      ),
    },
  }
}

export function purchaseRabbitUnlock(game, unlockId) {
  const unlock = RABBIT_UNLOCKS.find(({ id }) => id === unlockId)
  const currentRelations = toNonNegativeNumber(game.trade?.rabbitRelations)

  if (
    game.trade?.established !== true ||
    !unlock ||
    hasRabbitUnlock(game, unlockId) ||
    currentRelations < unlock.cost
  ) {
    return null
  }

  const expansionTrackId = RABBIT_EXPANSION_TRACK_BY_UNLOCK_ID[unlockId]
  const expansionGame = expansionTrackId
    ? grantFreeBlueprintExpansion(game, expansionTrackId)
    : game

  if (!expansionGame) {
    return null
  }

  return {
    ...expansionGame,
    trade: {
      ...expansionGame.trade,
      rabbitRelations: currentRelations - unlock.cost,
      rabbitUnlocks: [...expansionGame.trade.rabbitUnlocks, unlockId],
    },
  }
}