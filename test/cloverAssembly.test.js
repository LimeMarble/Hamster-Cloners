import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CLOVER_ASSEMBLY_PART_REQUIREMENT,
  CLOVER_ASSEMBLY_PARTS,
  GAME_AREA_IDS,
  GREATER_BLUEPRINTING_COST,
  RABBIT_UNLOCK_IDS,
  RABBIT_UNLOCKS,
  advanceCloverAssemblyState,
  advanceGameSimulationStep,
  completeCloverAssembly,
  createBlueprint,
  createInitialCloverAssemblyState,
  createInitialGame,
  isCloverAssemblyReady,
  purchaseRabbitUnlock,
  unlockGreaterBlueprinting,
  wipeMisfortuneAreaProgress,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

test('the Clover assembly precursors use their configured main Crop and Rabbit relation costs', () => {
  const mainGame = {
    ...createInitialGame(),
    crops: GREATER_BLUEPRINTING_COST,
  }
  const researched = unlockGreaterBlueprinting(mainGame)
  const charm = RABBIT_UNLOCKS.find(
    ({ id }) => id === RABBIT_UNLOCK_IDS.RABBITS_CHARM,
  )
  const charmed = purchaseRabbitUnlock(
    {
      ...mainGame,
      trade: {
        ...mainGame.trade,
        established: true,
        rabbitRelations: charm.cost,
      },
    },
    RABBIT_UNLOCK_IDS.RABBITS_CHARM,
  )

  assert.equal(GREATER_BLUEPRINTING_COST, 1e146)
  assert.ok(researched)
  assert.equal(researched.crops, 0)
  assert.equal(researched.hasUnlockedGreaterBlueprinting, true)
  assert.equal(
    unlockGreaterBlueprinting({
      ...mainGame,
      activeArea: GAME_AREA_IDS.MISFORTUNE,
    }),
    null,
  )
  assert.equal(charm.cost, 7.77e18)
  assert.ok(charmed)
  assert.equal(charmed.trade.rabbitRelations, 0)
  assert.ok(charmed.trade.rabbitUnlocks.includes(RABBIT_UNLOCK_IDS.RABBITS_CHARM))
})

test('assembly parts track the four requested Crop harvests independently and cap at their requirement', () => {
  const progress = advanceCloverAssemblyState(
    createInitialCloverAssemblyState(),
    {
      appleTree: 3e58,
      canola: 4e58,
      soybean: 5e58,
      carrot: 6e58,
      leek: 1e200,
    },
    2,
    true,
  )

  assert.deepEqual(
    CLOVER_ASSEMBLY_PARTS.map(({ id, cropId }) => [id, cropId]),
    [
      ['resilientStem', 'appleTree'],
      ['protectiveCoating', 'canola'],
      ['rootLubricant', 'soybean'],
      ['charmFitting', 'carrot'],
    ],
  )
  assert.equal(progress.partProgress.resilientStem, 6e58)
  assert.equal(
    progress.partProgress.protectiveCoating,
    CLOVER_ASSEMBLY_PART_REQUIREMENT,
  )
  assert.equal(
    progress.partProgress.rootLubricant,
    CLOVER_ASSEMBLY_PART_REQUIREMENT,
  )
  assert.equal(
    progress.partProgress.charmFitting,
    CLOVER_ASSEMBLY_PART_REQUIREMENT,
  )
  assert.equal(isCloverAssemblyReady(progress), false)
})

test('only Misfortune production advances an unlocked and charmed Clover assembly', () => {
  const blueprint = createBlueprint({ cells: ['appleTree'] })
  const initialGame = createInitialGame()
  const baseGame = {
    ...initialGame,
    hasUnlockedGreaterBlueprinting: true,
    blueprint,
    blueprintSlots: [blueprint],
    farmland: {
      ...initialGame.farmland,
      columns: 1,
    },
    trade: {
      ...initialGame.trade,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.RABBITS_CHARM],
    },
  }
  const mainResult = advanceGameSimulationStep(baseGame, 1)
  const misfortuneResult = advanceGameSimulationStep(
    { ...baseGame, activeArea: GAME_AREA_IDS.MISFORTUNE },
    1,
  )

  assert.equal(mainResult.cloverAssembly.partProgress.resilientStem, 0)
  assert.ok(misfortuneResult.cloverAssembly.partProgress.resilientStem > 0)
})

test("Rabbit's Charm is required to finish the 5-Leaf Clover assembly", () => {
  const completeProgress = Object.fromEntries(
    CLOVER_ASSEMBLY_PARTS.map(({ id }) => [
      id,
      CLOVER_ASSEMBLY_PART_REQUIREMENT,
    ]),
  )
  const initialGame = createInitialGame()
  const readyGame = {
    ...initialGame,
    hasUnlockedGreaterBlueprinting: true,
    cloverAssembly: {
      partProgress: completeProgress,
      assembled: false,
    },
  }

  assert.equal(isCloverAssemblyReady(readyGame.cloverAssembly), true)
  assert.equal(completeCloverAssembly(readyGame), null)

  const assembled = completeCloverAssembly({
    ...readyGame,
    trade: {
      ...readyGame.trade,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.RABBITS_CHARM],
    },
  })

  assert.ok(assembled)
  assert.equal(assembled.cloverAssembly.assembled, true)
})

test('Clover assembly research and part progress survive save normalization', () => {
  const normalized = normalizeGame({
    hasUnlockedGreaterBlueprinting: true,
    cloverAssembly: {
      partProgress: {
        resilientStem: 123,
        protectiveCoating: Number.POSITIVE_INFINITY,
        rootLubricant: -5,
        charmFitting: CLOVER_ASSEMBLY_PART_REQUIREMENT * 2,
      },
      assembled: true,
    },
  })

  assert.equal(normalized.hasUnlockedGreaterBlueprinting, true)
  assert.deepEqual(normalized.cloverAssembly, {
    partProgress: {
      resilientStem: 123,
      protectiveCoating: 0,
      rootLubricant: 0,
      charmFitting: CLOVER_ASSEMBLY_PART_REQUIREMENT,
    },
    assembled: true,
  })
})

test('wiping Misfortune clears assembly work but preserves both precursors', () => {
  const initialGame = createInitialGame()
  const wiped = wipeMisfortuneAreaProgress({
    ...initialGame,
    hasUnlockedGreaterBlueprinting: true,
    cloverAssembly: {
      partProgress: Object.fromEntries(
        CLOVER_ASSEMBLY_PARTS.map(({ id }) => [id, 123]),
      ),
      assembled: false,
    },
    trade: {
      ...initialGame.trade,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.RABBITS_CHARM],
    },
  })

  assert.equal(wiped.hasUnlockedGreaterBlueprinting, true)
  assert.ok(wiped.trade.rabbitUnlocks.includes(RABBIT_UNLOCK_IDS.RABBITS_CHARM))
  assert.deepEqual(wiped.cloverAssembly, createInitialCloverAssemblyState())
})
