import { grantFreeBlueprintExpansion } from './blueprintLogic.js'
import { CROP_DEFINITIONS, getUnlockedCropIds } from './crops.js'
import { getFieldsPlanted } from './cropProduction.js'
import { getRabbitRelationsMultiplier } from './cropEffects.js'
import { getFortuneModifiers } from './fortuneLogic.js'

export const TRADE_ESTABLISHMENT_COST = 1e57
export const RABBIT_CONTRACT_MIN_FACTOR = 1e7
export const RABBIT_CONTRACT_MAX_FACTOR = 5e7
export const RABBIT_ACTIVE_CONTRACT_COUNT = 3

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
    cost: 77777,
    description:
      'Unlocks one 4-Leaf Clover per blueprint and its collectible Breezes of Fortune.',
  },
  {
    id: RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT,
    name: 'Establish contact with Capybaras',
    cost: 125000,
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

export function advanceRabbitContract(
  game,
  productionByCrop,
  random = Math.random,
) {
  if (game.trade?.established !== true) {
    return game.trade
  }

  const currentContracts = Array.isArray(game.trade.rabbitContracts)
    ? game.trade.rabbitContracts
    : normalizeRabbitContracts(game.trade)
  const rabbitContracts = currentContracts.map((currentContract) => {
    const contract = currentContract ?? createRabbitContract(game)

    if (!contract) {
      return null
    }

    const producedAmount = Math.max(
      0,
      Number(productionByCrop?.[contract.cropId]) || 0,
    )

    return {
      ...contract,
      progress: Math.min(
        contract.requiredAmount,
        contract.progress + producedAmount,
      ),
    }
  })

  const advancedTrade = {
    ...game.trade,
    rabbitContracts,
  }

  if (!hasRabbitUnlock(game, RABBIT_UNLOCK_IDS.CONTRACTOR)) {
    return advancedTrade
  }

  return rabbitContracts.reduce(
    (trade, _contract, index) =>
      claimRabbitContract({ ...game, trade }, index, random)?.trade ?? trade,
    advancedTrade,
  )
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