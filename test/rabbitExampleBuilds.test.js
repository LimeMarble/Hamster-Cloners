import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  createBlueprint, createInitialGame, getDiagonalTileIndexes,
  getMirrorCornMaximumReflections, getRabbitContractCropIds,
} from '../src/game/gameLogic.js'
import { getRabbitExampleBuild, RABBIT_EXAMPLE_RECIPIENT } from '../src/tabs/rabbitExampleBuilds.js'
import { SOYBEAN_UNLOCK_FLOOR_REPLICATOR_COUNT } from '../src/game/crops.js'

let server, RabbitExampleBuildsGuide, Trade
before(async () => {
  server = await createServer({ logLevel: 'silent',
    resolve: { preserveSymlinks: true },
    server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ RabbitExampleBuildsGuide } = await server.ssrLoadModule('/src/tabs/RabbitExampleBuilds.jsx'))
  ;({ Trade } = await server.ssrLoadModule('/src/tabs/Trade.jsx'))
})
after(async () => { await server?.close() })

function rabbitGame() {
  const game = createInitialGame()
  return {
    ...game,
    blueprint: createBlueprint({ rows: 5, columns: 5 }),
    unionized: true,
    hamsters: 125,
    hasUnlockedCorn: true,
    hasUnlockedTurnip: true,
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn'],
    trade: { ...game.trade, established: true, rabbitUnlocks: [] },
  }
}

function renderGuide(game) {
  return renderToStaticMarkup(createElement(RabbitExampleBuildsGuide, { game }))
}

test('the early module has an orthogonal recipient, three Turnips, and two reflections', () => {
  const { blueprint, recipientIndex, reflectionCount } = getRabbitExampleBuild(rabbitGame())
  assert.equal(recipientIndex, 7)
  assert.equal(reflectionCount, 2)
  assert.deepEqual(blueprint.cells, [
    'corn', 'turnip', 'corn', 'turnip', 'leek', 'turnip',
    null, RABBIT_EXAMPLE_RECIPIENT, null,
  ])
  assert.deepEqual(blueprint.mirrorCornTargets, [4, null, 4, null, null, null, null, null, null])
})

test('diagonal enrichment moves the recipient to the corner and makes room for a fourth Turnip', () => {
  const game = rabbitGame()
  game.seedAugmentations.leekDiagonalUnlocked = true
  const example = getRabbitExampleBuild(game)
  assert.equal(example.recipientIndex, 8)
  assert.equal(example.blueprint.cells[7], 'turnip')
  assert.equal(example.reflectionCount, 2)
  assert.deepEqual(example.recipientCropIds, getRabbitContractCropIds(game)
    .filter((cropId) => !['leek', 'turnip', 'corn'].includes(cropId)))
  assert.match(renderGuide(game), /no separate setup is needed/)
})

test('the safe-reflection augmentation adds the third Corn in either layout', () => {
  for (const diagonal of [false, true]) {
    const game = rabbitGame()
    game.seedAugmentations.leekDiagonalUnlocked = diagonal
    game.seedAugmentations.mirrorCornReflectionLimitUnlocked = true
    const example = getRabbitExampleBuild(game)
    assert.equal(example.reflectionCount, 3)
    assert.equal(example.blueprint.cells[6], 'corn')
    assert.equal(example.blueprint.mirrorCornTargets[6], 4)
    assert.equal(example.blueprint.cells[example.recipientIndex], RABBIT_EXAMPLE_RECIPIENT)
  }
})

test('every reflection is a legal diagonal target and never exceeds the safe limit', () => {
  for (const diagonal of [false, true]) {
    for (const reflectionUpgrade of [false, true]) {
      const game = rabbitGame()
      game.seedAugmentations.leekDiagonalUnlocked = diagonal
      game.seedAugmentations.mirrorCornReflectionLimitUnlocked = reflectionUpgrade
      const { blueprint, reflectionCount } = getRabbitExampleBuild(game)
      assert.ok(reflectionCount <= getMirrorCornMaximumReflections(game.seedAugmentations))
      blueprint.mirrorCornTargets.forEach((target, index) => {
        if (target === null) return
        assert.equal(blueprint.cells[index], 'corn')
        assert.equal(blueprint.cells[target], 'leek')
        assert.ok(getDiagonalTileIndexes(blueprint, index).includes(target))
      })
      const markup = renderGuide(game)
      assert.equal((markup.match(/<line /g) ?? []).length, reflectionCount)
      assert.equal((markup.match(/class="rabbit-example-tile/g) ?? []).length, 9)
    }
  }
})

test('Corn remains a recipient before diagonal enrichment, with no crop-specific selector', () => {
  const game = rabbitGame()
  assert.ok(getRabbitExampleBuild(game).recipientCropIds.includes('corn'))
  const markup = renderGuide(game)
  assert.match(markup, /use a separate harvest setup until/)
  assert.match(markup, /Contract<br\/>crop/)
  assert.doesNotMatch(markup, /<select|<input/)
})

test('unowned perfections do not create fake reflections or diagonal enrichment', () => {
  const game = rabbitGame()
  game.completedCropPerfections = []
  game.seedAugmentations.leekDiagonalUnlocked = true
  const example = getRabbitExampleBuild(game)
  assert.equal(example.reflectionCount, 0)
  assert.equal(example.usesDiagonalEnrichment, false)
  assert.match(renderGuide(game), /Requires Enriching Leek/)
  assert.match(renderGuide(game), /Perfect Corn into Mirror Corn/)
})

test('recipient list includes unlocked Peanuts and filters all rejected crops through the real pool', () => {
  const game = {
    ...rabbitGame(),
    hasUnlockedAppleTree: true,
    hasUnlockedKnotweed: true,
    earnedAchievementIds: ['makingPeanuts'],
  }
  game.trade.rabbitUnlocks = ['carrot', 'fourLeafClover']
  game.completedCropPerfections.push('leechingGourd', 'splitweed')
  const example = getRabbitExampleBuild(game)
  assert.ok(example.recipientCropIds.includes('peanuts'))
  assert.ok(example.recipientCropIds.includes('carrot'))
  for (const cropId of ['appleTree', 'pumpkin', 'leechingGourd', 'knotweed', 'splitweedPart', 'fourLeafClover']) {
    assert.ok(!example.eligibleCropIds.includes(cropId), cropId)
    assert.ok(!example.recipientCropIds.includes(cropId), cropId)
  }
  const markup = renderGuide(game)
  assert.match(markup, /Peanuts/)
  assert.doesNotMatch(markup, /Apple Sapling|Leeching Gourd|Splitweed|Clover/)
})

test('locked recipient crops remain hidden and the guide never modifies the game', () => {
  const game = rabbitGame()
  const previous = JSON.stringify(game)
  assert.ok(!getRabbitExampleBuild(game).recipientCropIds.includes('peanuts'))
  assert.doesNotMatch(renderGuide(game), /Peanuts|Canola|Soybean|Wheat|Sunflower/)
  assert.equal(JSON.stringify(game), previous)
})

test('the guide launcher appears only under established Rabbit relations and content is lazy', () => {
  const game = rabbitGame()
  const rabbits = renderToStaticMarkup(createElement(Trade, { game, activeRelation: 'rabbits' }))
  assert.match(rabbits, /aria-haspopup="dialog" aria-expanded="false"/)
  assert.match(rabbits, /Example builds/)
  assert.match(rabbits, /<dialog/)
  assert.doesNotMatch(rabbits, /Example 3 by 3|Currently eligible recipient crops/)
  assert.doesNotMatch(renderToStaticMarkup(createElement(Trade, {
    game: { ...game, trade: { ...game.trade, established: false } }, activeRelation: 'rabbits',
  })), /Example builds/)
  game.trade.rabbitUnlocks = ['capybaraContact']
  assert.doesNotMatch(renderToStaticMarkup(createElement(Trade, {
    game, activeRelation: 'capybaras', capybaraBlueprintCropYield: 0,
  })), /Example builds/)
})

test('the blazing display names an eligible Soybean missing from the active blueprint', () => {
  const initial = createInitialGame()
  const game = {
    ...initial,
    blueprint: createBlueprint({ rows: 1, columns: 2, cells: ['leek', null] }),
    hasUnlockedTurnip: true,
    floorReplicators: SOYBEAN_UNLOCK_FLOOR_REPLICATOR_COUNT,
    areaProgress: { misfortune: { rowDuplicators: 500 } },
    trade: {
      ...initial.trade, established: true, rabbitContractsBlazing: true,
      rabbitUnlocks: ['contractor'],
    },
  }
  const markup = renderToStaticMarkup(createElement(Trade, {
    game, activeRelation: 'rabbits',
    rabbitContractProductionPerSecondByCrop: { leek: 1e30, corn: 1e30, turnip: 1e30 },
  }))
  assert.match(markup, /Limiting Crop:/)
  assert.match(markup, /Soybean/)
  assert.match(markup, /slowest unlocked/)
  assert.doesNotMatch(markup, /slowest grown/)
})
