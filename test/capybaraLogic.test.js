import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  CAPYBARA_DEMONSTRATIONS,
  FORTUNE_EFFECT_IDS,
  RABBIT_UNLOCK_IDS,
  completeCapybaraDemonstration,
  createBlueprint,
  createInitialGame,
  getCapybaraBlueprintCropYield,
  hasSeedAugmentation,
  normalizeCapybaraState,
} from '../src/game/gameLogic.js'
import { normalizeGame } from '../src/game/storage.js'

function createContactGame() {
  const game = createInitialGame()

  return {
    ...game,
    blueprint: createBlueprint({
      rows: 2,
      columns: 2,
      cells: ['leek', null, null, null],
    }),
    trade: {
      ...game.trade,
      established: true,
      rabbitUnlocks: [RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT],
    },
  }
}

test('Capybara blueprint yield excludes Fields and testing multipliers but includes fortune', () => {
  const game = {
    ...createContactGame(),
    farmland: {
      rows: 1e20,
      columns: 1e20,
      floors: 1e20,
      farms: 1e20,
      otherMultiplier: 1e20,
    },
    testingCheats: {
      cropMultiplierEnabled: true,
      hamsterEfficiencyEnabled: false,
    },
  }
  const bountyGame = {
    ...game,
    fortune: {
      ...game.fortune,
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 10 },
      ],
    },
  }
  const opusGame = {
    ...game,
    fortune: {
      ...game.fortune,
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.OPUS, remainingSeconds: 10 },
      ],
    },
  }

  assert.equal(getCapybaraBlueprintCropYield(game), 1)
  assert.equal(getCapybaraBlueprintCropYield(bountyGame), 17.77)
  assert.equal(getCapybaraBlueprintCropYield(opusGame), 7.77)
})

test('Demonstration 0 requires Capybara contact and 500B blueprint yield', () => {
  const target = CAPYBARA_DEMONSTRATIONS[0].target
  const noContactGame = createInitialGame()
  const contactGame = createContactGame()

  assert.equal(target, 2e13)
  assert.equal(
    completeCapybaraDemonstration(
      noContactGame,
      CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
      { blueprintCropYield: target },
    ),
    null,
  )
  assert.equal(
    completeCapybaraDemonstration(
      contactGame,
      CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
      { blueprintCropYield: target - 1 },
    ),
    null,
  )

  const completed = completeCapybaraDemonstration(
    contactGame,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    { blueprintCropYield: target },
  )

  assert.deepEqual(completed.capybara.completedDemonstrations, [
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
  ])
  assert.equal(hasSeedAugmentation(completed), true)
  assert.equal(
    completeCapybaraDemonstration(
      completed,
      CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
      { blueprintCropYield: target },
    ),
    null,
  )
})

test('Capybara progress persists and legacy saves receive safe defaults', () => {
  assert.deepEqual(
    normalizeCapybaraState({
      completedDemonstrations: ['introduction', 'invalid', 'introduction'],
    }),
    { completedDemonstrations: ['introduction'] },
  )
  assert.deepEqual(normalizeGame({}).capybara, {
    completedDemonstrations: [],
  })
  assert.deepEqual(
    normalizeGame({
      capybara: { completedDemonstrations: ['introduction'] },
    }).capybara,
    { completedDemonstrations: ['introduction'] },
  )
})
