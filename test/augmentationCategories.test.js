import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  createInitialGame,
  MISFORTUNE_UPGRADE_IDS,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../src/game/gameLogic.js'
import {
  AUGMENTATION_CROP_CATEGORIES,
  getSelectedAugmentationCategory,
  getVisibleAugmentationCategories,
} from '../src/tabs/augmentationCategories.js'

let server
let Augmentation

before(async () => {
  server = await createServer({
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })
  ;({ Augmentation } = await server.ssrLoadModule('/src/tabs/Augmentation.jsx'))
})

after(async () => { await server?.close() })

function lateGame() {
  const initial = createInitialGame()
  return {
    ...initial,
    activeArea: 'misfortune',
    crops: 1e200,
    completedCropPerfections: ['enrichingLeek', 'mirrorCorn', 'sweetPotato', 'leechingGourd', 'splitweed'],
    completedMisfortuneUpgrades: [
      MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS,
      MISFORTUNE_UPGRADE_IDS.NOURISHING_MISERY,
      MISFORTUNE_UPGRADE_IDS.HUNT_FOR_SOMETHING_GREATER,
      MISFORTUNE_UPGRADE_IDS.NOT_SO_FINAL_SUPPORT,
    ],
    capybara: { ...initial.capybara, completedDemonstrations: ['introduction', 'demonstrationOne', 'misfortuneTrial'] },
  }
}

function render(game, activeCropId = 'leek') {
  return renderToStaticMarkup(createElement(Augmentation, {
    game,
    activeCropId,
    onActiveCropChange() {},
    onPurchaseSeedAugmentation() {},
    onToggleSeedAugmentation() {},
  }))
}

const cardCount = (html) => (html.match(/class="seed-augmentation-card"/g) ?? []).length

test('every augmentation belongs to exactly one registered crop category', () => {
  const game = lateGame()
  const categories = getVisibleAugmentationCategories(game)
  const ids = categories.flatMap(({ augmentationIds }) => augmentationIds)
  assert.deepEqual(categories.map(({ cropId }) => cropId), ['leek', 'corn', 'sweetPotato', 'pumpkin', 'knotweed'])
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual([...ids].sort(), Object.keys(SEED_AUGMENTATIONS).sort())
  for (const augmentation of Object.values(SEED_AUGMENTATIONS)) {
    assert.ok(AUGMENTATION_CROP_CATEGORIES.some(({ cropId }) => cropId === augmentation.cropId))
    assert.ok(categories.find(({ cropId }) => cropId === augmentation.cropId).augmentationIds.includes(augmentation.id))
  }
})

test('categories and counts follow existing research and demonstration visibility', () => {
  const game = createInitialGame()
  assert.deepEqual(getVisibleAugmentationCategories(game).map(({ cropId, augmentationIds }) => [cropId, augmentationIds.length]), [['leek', 2], ['corn', 3]])
  const researched = {
    ...game,
    completedMisfortuneUpgrades: [MISFORTUNE_UPGRADE_IDS.ADVERSITY_GROWN_TUBERS],
  }
  assert.deepEqual(getVisibleAugmentationCategories(researched).map(({ cropId }) => cropId), ['leek', 'corn', 'sweetPotato'])
  assert.ok(!render(game).includes('Sterile Symbiosis'))
})

test('Rich Soil stays inside Leek and keeps its Misfortune precursor and area restrictions', () => {
  const game = lateGame()
  const withoutResearch = { ...game, completedMisfortuneUpgrades: [] }
  assert.equal(getVisibleAugmentationCategories(withoutResearch)[0].augmentationIds.length, 2)
  assert.ok(!render(withoutResearch).includes('<h2>Rich Soil</h2>'))
  assert.ok(getVisibleAugmentationCategories(game)[0].augmentationIds.includes(SEED_AUGMENTATION_IDS.RICH_SOIL))
  assert.ok(render(game).includes('<h2>Rich Soil</h2>'))
  assert.ok(!render({ ...game, activeArea: 'main' }).includes('<h2>Rich Soil</h2>'))
  const owned = { ...game, activeArea: 'main', seedAugmentations: { ...game.seedAugmentations, richSoilUnlocked: true } }
  assert.ok(render(owned).includes('Inactive outside Misfortune'))
  assert.ok(!render(game, 'corn').includes('<h2>Rich Soil</h2>'))
})

test('invalid or hidden selections fall back to the first available crop', () => {
  const categories = getVisibleAugmentationCategories(createInitialGame())
  assert.equal(getSelectedAugmentationCategory(categories, 'corn').cropId, 'corn')
  assert.equal(getSelectedAugmentationCategory(categories, 'knotweed').cropId, 'leek')
  assert.equal(getSelectedAugmentationCategory(categories, 'unknown').cropId, 'leek')
  assert.equal(getSelectedAugmentationCategory([], 'leek'), null)
  const html = render(createInitialGame(), 'knotweed')
  assert.ok(html.includes('Enriching Leek augmentations'))
  assert.ok(html.includes('<h2>Layered Enrichment</h2>'))
  assert.ok(!html.includes('<h2>Safe Handling</h2>'))
})

test('each crop selection renders only that crop’s cards, with one pressed category button', () => {
  const game = lateGame()
  const allNames = Object.values(SEED_AUGMENTATIONS).map(({ name }) => name)
  for (const category of getVisibleAugmentationCategories(game)) {
    const html = render(game, category.cropId)
    assert.equal(cardCount(html), category.augmentationIds.length)
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1)
    assert.ok(html.includes(`>${category.name} augmentations</h2>`))
    for (const name of allNames) {
      const belongsToCrop = category.augmentationIds.some((id) => SEED_AUGMENTATIONS[id].name === name)
      assert.equal(html.includes(`<h2>${name}</h2>`), belongsToCrop, name)
    }
  }
})

test('Corn purchase and toggle status remain intact inside its category', () => {
  const game = lateGame()
  assert.ok(render(game, 'corn').includes('Safe Handling'))
  const purchased = {
    ...game,
    seedAugmentations: {
      ...game.seedAugmentations,
      mirrorCornDebuffRemovalUnlocked: true,
      mirrorCornDebuffRemovalEnabled: true,
      mirrorCornEffectivenessLevel: 8,
    },
  }
  const protectedHtml = render(purchased, 'corn')
  assert.ok(protectedHtml.includes('Restore Hamster debuff'))
  assert.ok(protectedHtml.includes('Maximum level'))
  const disabledHtml = render({ ...purchased, seedAugmentations: { ...purchased.seedAugmentations, mirrorCornDebuffRemovalEnabled: false } }, 'corn')
  assert.ok(disabledHtml.includes('Remove Hamster debuff'))
})

test('every crop category hides cost-growth explanations but keeps effects and purchase prices', () => {
  const game = lateGame()
  for (const category of getVisibleAugmentationCategories(game)) {
    const html = render(game, category.cropId)
    assert.doesNotMatch(html, /increasingly expensive|Each new level costs|times the previous/i)
    assert.match(html, /Augment —/)
    assert.match(html, /Crops/)
    assert.equal(cardCount(html), category.augmentationIds.length)
  }
  assert.match(render(game, 'corn'), /Each level adds \+1 to the multiplier/)
  assert.match(render(game, 'sweetPotato'), /growth exponent cap by 4/)
  assert.match(render(game, 'knotweed'), /adds \+1 to the Monocrop limit per level/)
})
