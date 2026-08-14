import { getFieldsPlanted } from './cropProduction.js'
import { CROP_DEFINITIONS, getUnlockedCropIds } from './crops.js'

export const TRADE_ESTABLISHMENT_COST = 1e57
export const RABBIT_CONTRACT_MIN_FACTOR = 1e7
export const RABBIT_CONTRACT_MAX_FACTOR = 5e7

export const RABBIT_UNLOCK_IDS = Object.freeze({
  CARROT: 'carrot',
  HAMSTER_EFFICIENCY: 'hamsterEfficiency',
  ROW_DUPLICATOR_EFFICIENCY: 'rowDuplicatorEfficiency',
  CAPYBARA_CONTACT: 'capybaraContact',
  FOUR_LEAF_CLOVER: 'fourLeafClover',
})

export const RABBIT_UNLOCKS = Object.freeze([
  {
    id: RABBIT_UNLOCK_IDS.CARROT,
    name: 'Unlock Carrot',
    cost: 100,
    description: 'Secures the crop for a future update; Carrot is not plantable yet.',
  },
  {
    id: RABBIT_UNLOCK_IDS.HAMSTER_EFFICIENCY,
    name: '×3 Hamster Efficiency',
    cost: 1111,
    description: 'A permanent external multiplier to Hamster Cloner production.',
  },
  {
    id: RABBIT_UNLOCK_IDS.ROW_DUPLICATOR_EFFICIENCY,
    name: '×2 Row Duplicator Efficiency',
    cost: 2000,
    description: 'A permanent external multiplier to Row Duplicator production.',
  },
  {
    id: RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT,
    name: 'Establish contact with Capybaras',
    cost: 5000,
    description: 'Records first contact; Capybara contracts will arrive later.',
  },
  {
    id: RABBIT_UNLOCK_IDS.FOUR_LEAF_CLOVER,
    name: 'Unlock 4-Leaf Clover',
    cost: 7777,
    description: 'Secures the crop for a future update; 4-Leaf Clover is not plantable yet.',
  },
])

const RABBIT_UNLOCK_ID_SET = new Set(RABBIT_UNLOCKS.map(({ id }) => id))
const RABBIT_EXCLUDED_CROP_IDS = new Set([
  'appleTree',
  'knotweed',
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
    rabbitContract: null,
    rabbitUnlocks: [],
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
  const fieldsPlanted = Math.max(1, getFieldsPlanted(game.farmland))

  return {
    cropId: eligibleCropIds[cropIndex],
    factor,
    fieldsPlanted,
    requiredAmount: fieldsPlanted * factor,
    progress: 0,
    relationsReward: getRabbitContractRelationsReward(fieldsPlanted, factor),
  }
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

export function normalizeTradeState(rawTrade) {
  const initialTrade = createInitialTradeState()

  if (!rawTrade || typeof rawTrade !== 'object') {
    return initialTrade
  }

  return {
    established: rawTrade.established === true,
    rabbitRelations: toNonNegativeNumber(rawTrade.rabbitRelations),
    rabbitContract: normalizeRabbitContract(rawTrade.rabbitContract),
    rabbitUnlocks: Array.isArray(rawTrade.rabbitUnlocks)
      ? [...new Set(rawTrade.rabbitUnlocks.filter((id) => RABBIT_UNLOCK_ID_SET.has(id)))]
      : [],
  }
}

export function hasRabbitUnlock(game, unlockId) {
  return game.trade?.rabbitUnlocks?.includes(unlockId) === true
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
      rabbitContract: createRabbitContract(establishedGame, random),
    },
  }
}

export function advanceRabbitContract(game, productionByCrop) {
  if (game.trade?.established !== true) {
    return game.trade
  }

  const rabbitContract =
    game.trade.rabbitContract ?? createRabbitContract(game)

  if (!rabbitContract) {
    return game.trade
  }

  const producedAmount = Math.max(
    0,
    Number(productionByCrop?.[rabbitContract.cropId]) || 0,
  )

  return {
    ...game.trade,
    rabbitContract: {
      ...rabbitContract,
      progress: Math.min(
        rabbitContract.requiredAmount,
        rabbitContract.progress + producedAmount,
      ),
    },
  }
}

export function claimRabbitContract(game, random = Math.random) {
  const contract = game.trade?.rabbitContract

  if (
    game.trade?.established !== true ||
    !contract ||
    contract.progress < contract.requiredAmount
  ) {
    return null
  }

  const gameWithRelations = {
    ...game,
    trade: {
      ...game.trade,
      rabbitRelations:
        toNonNegativeNumber(game.trade.rabbitRelations) +
        toNonNegativeNumber(contract.relationsReward),
      rabbitContract: null,
    },
  }

  return {
    ...gameWithRelations,
    trade: {
      ...gameWithRelations.trade,
      rabbitContract: createRabbitContract(gameWithRelations, random),
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

  return {
    ...game,
    trade: {
      ...game.trade,
      rabbitRelations: currentRelations - unlock.cost,
      rabbitUnlocks: [...game.trade.rabbitUnlocks, unlockId],
    },
  }
}
