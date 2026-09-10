import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAPYBARA_DEMONSTRATION_IDS,
  CAPYBARA_DEMONSTRATIONS,
  CAPYBARA_SECONDARY_OBJECTIVE_IDS,
  FORTUNE_EFFECT_IDS,
  RABBIT_UNLOCK_IDS,
  completeCapybaraDemonstration,
  completeNextCapybaraDemonstrationForTesting,
  createBlueprint,
  createInitialGame,
  getCapybaraBlueprintCropYield,
  getCapybaraDemonstrationStatus,
  getCapybaraHamsterEfficiencyMultiplier,
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

test('testing completes each configured Capybara demonstration in order', () => {
  let game = createInitialGame()

  CAPYBARA_DEMONSTRATIONS.forEach((demonstration, index) => {
    game = completeNextCapybaraDemonstrationForTesting(game)

    assert.deepEqual(
      game.capybara.completedDemonstrations,
      CAPYBARA_DEMONSTRATIONS.slice(0, index + 1).map(({ id }) => id),
    )
    assert.ok(game.capybara.completedDemonstrations.includes(demonstration.id))
  })

  assert.equal(game.hasUnlockedRootTunnel, true)
  assert.equal(completeNextCapybaraDemonstrationForTesting(game), null)
})

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

  assert.equal(
    getCapybaraDemonstrationStatus(
      contactGame,
      CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
      { blueprintCropYield: target },
    ).secondaryVisible,
    false,
  )

  const completed = completeCapybaraDemonstration(
    contactGame,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    { blueprintCropYield: target },
  )

  assert.deepEqual(completed.capybara.completedDemonstrations, [
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
  ])
  assert.deepEqual(completed.capybara.completedSecondaryObjectives, [
    CAPYBARA_SECONDARY_OBJECTIVE_IDS.INTRODUCTION_NO_CLOVER,
  ])
  assert.equal(getCapybaraHamsterEfficiencyMultiplier(completed), 2)
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
    {
      completedDemonstrations: ['introduction'],
      completedSecondaryObjectives: [],
    },
  )
  assert.deepEqual(normalizeGame({}).capybara, {
    completedDemonstrations: [],
    completedSecondaryObjectives: [],
  })
  assert.deepEqual(
    normalizeGame({
      capybara: { completedDemonstrations: ['introduction'] },
    }).capybara,
    {
      completedDemonstrations: ['introduction'],
      completedSecondaryObjectives: [],
    },
  )
})

test('the hidden secondary reward is checked on the first pass and can be retried', () => {
  const target = CAPYBARA_DEMONSTRATIONS[0].target
  const cloverGame = {
    ...createContactGame(),
    blueprint: createBlueprint({
      rows: 2,
      columns: 2,
      cells: ['leek', 'fourLeafClover', null, null],
    }),
  }

  const firstPass = completeCapybaraDemonstration(
    cloverGame,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    { blueprintCropYield: target },
  )

  assert.deepEqual(firstPass.capybara.completedSecondaryObjectives, [])
  assert.equal(getCapybaraHamsterEfficiencyMultiplier(firstPass), 1)

  const revealed = getCapybaraDemonstrationStatus(
    firstPass,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    { blueprintCropYield: target },
  )
  assert.equal(revealed.secondaryVisible, true)
  assert.equal(revealed.secondaryConditionMet, false)
  assert.equal(revealed.canComplete, false)

  const cleanRetryGame = {
    ...firstPass,
    blueprint: createBlueprint({
      rows: 2,
      columns: 2,
      cells: ['leek', null, null, null],
    }),
  }
  const cleanRetry = completeCapybaraDemonstration(
    cleanRetryGame,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    { blueprintCropYield: target },
  )

  assert.deepEqual(cleanRetry.capybara.completedSecondaryObjectives, [
    CAPYBARA_SECONDARY_OBJECTIVE_IDS.INTRODUCTION_NO_CLOVER,
  ])
  assert.equal(getCapybaraHamsterEfficiencyMultiplier(cleanRetry), 2)
})

test('active Breeze effects fail Demonstration 0 secondary condition', () => {
  const game = {
    ...createContactGame(),
    fortune: {
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 10 },
      ],
    },
  }
  const completed = completeCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    { blueprintCropYield: CAPYBARA_DEMONSTRATIONS[0].target },
  )

  assert.deepEqual(completed.capybara.completedSecondaryObjectives, [])
})

test('Demonstration 1 visibly bans Clover and active Breeze effects', () => {
  const target = CAPYBARA_DEMONSTRATIONS[1].target
  const introductionCompleteGame = {
    ...createContactGame(),
    capybara: {
      completedDemonstrations: [CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION],
      completedSecondaryObjectives: [],
    },
  }

  assert.equal(target, 1e20)
  assert.equal(
    CAPYBARA_DEMONSTRATIONS[1].rewardName,
    'Floor Replicators',
  )
  assert.equal(
    CAPYBARA_DEMONSTRATIONS[1].hint,
    'Augmentations are your best friend here.',
  )
  assert.deepEqual(CAPYBARA_DEMONSTRATIONS[1].restrictions, [
    'No 4-Leaf Clover may be planted',
    'No Breeze of Fortune effects may be active',
  ])

  const cloverGame = {
    ...introductionCompleteGame,
    blueprint: createBlueprint({
      rows: 2,
      columns: 2,
      cells: ['leek', 'fourLeafClover', null, null],
    }),
  }
  const cloverStatus = getCapybaraDemonstrationStatus(
    cloverGame,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
    { blueprintCropYield: target },
  )
  assert.equal(cloverStatus.restrictionsMet, false)
  assert.equal(cloverStatus.canComplete, false)

  const breezeGame = {
    ...introductionCompleteGame,
    fortune: {
      activeEffects: [
        { id: FORTUNE_EFFECT_IDS.BOUNTY, remainingSeconds: 10 },
      ],
    },
  }
  const breezeStatus = getCapybaraDemonstrationStatus(
    breezeGame,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
    { blueprintCropYield: target },
  )
  assert.equal(breezeStatus.restrictionsMet, false)
  assert.equal(breezeStatus.canComplete, false)

  const completed = completeCapybaraDemonstration(
    introductionCompleteGame,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
    { blueprintCropYield: target },
  )
  assert.deepEqual(completed.capybara.completedDemonstrations, [
    CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
  ])
  assert.equal(completed.hasUnlockedFloorReplicators, true)
})

test("Demonstration 2 requires 1e300 Crops inside Fortune's Wrath", () => {
  const game = {
    ...createContactGame(),
    capybara: {
      completedDemonstrations: [
        CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
      ],
      completedSecondaryObjectives: [],
    },
    activeArea: 'misfortune',
    crops: 1e300,
  }
  const demonstration = CAPYBARA_DEMONSTRATIONS[2]
  const status = getCapybaraDemonstrationStatus(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
  )

  assert.equal(demonstration.target, 1e300)
  assert.equal(demonstration.rewardName, 'Establish contact with Manatees')
  assert.equal(status.current, 1e300)
  assert.equal(status.progress, 1)
  assert.equal(status.canComplete, true)

  const completion = completeCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
  )
  assert.ok(
    completion.capybara.completedDemonstrations.includes(
      CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
    ),
  )
})

test('Demonstration 3 tracks Manatee Development Goals and rewards Root Tunnel', () => {
  const game = {
    ...createContactGame(),
    capybara: {
      completedDemonstrations: [
        CAPYBARA_DEMONSTRATION_IDS.INTRODUCTION,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
        CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_TWO,
      ],
      completedSecondaryObjectives: [],
    },
    manatees: {
      ...createInitialGame().manatees,
      completedDevelopmentGoals: [
        'restoreFeedingGrounds',
        'cleanHumanWaste',
      ],
    },
  }
  const demonstration = CAPYBARA_DEMONSTRATIONS[3]
  const status = getCapybaraDemonstrationStatus(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_THREE,
  )

  assert.equal(demonstration.target, 3)
  assert.equal(demonstration.rewardName, 'Root Tunnel')
  assert.equal(status.current, 2)
  assert.equal(status.progress, 2 / 3)
  assert.equal(status.canComplete, false)

  const futureCompletion = completeCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_THREE,
    { manateeDevelopmentGoalsCompleted: 3 },
  )
  assert.equal(futureCompletion.hasUnlockedRootTunnel, true)
  assert.ok(
    futureCompletion.capybara.completedDemonstrations.includes(
      CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_THREE,
    ),
  )
})
