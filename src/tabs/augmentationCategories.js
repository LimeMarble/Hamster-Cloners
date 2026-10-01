import {
  isSeedAugmentationVisible,
  SEED_AUGMENTATIONS,
} from '../game/augmentationLogic.js'
import { CROP_PERFECTIONS } from '../game/crops.js'

export const AUGMENTATION_CROP_CATEGORIES = Object.freeze([
  { cropId: 'leek', name: CROP_PERFECTIONS.enrichingLeek.name },
  { cropId: 'corn', name: CROP_PERFECTIONS.mirrorCorn.name },
  { cropId: 'sweetPotato', name: CROP_PERFECTIONS.sweetPotato.name },
  { cropId: 'pumpkin', name: CROP_PERFECTIONS.leechingGourd.name },
  { cropId: 'knotweed', name: CROP_PERFECTIONS.splitweed.name },
].map(Object.freeze))

export function getVisibleAugmentationCategories(game) {
  const visibleAugmentations = Object.values(SEED_AUGMENTATIONS).filter(
    ({ id }) => isSeedAugmentationVisible(game, id),
  )

  return AUGMENTATION_CROP_CATEGORIES.map((category) => ({
    ...category,
    augmentationIds: visibleAugmentations
      .filter(({ cropId }) => cropId === category.cropId)
      .map(({ id }) => id),
  })).filter(({ augmentationIds }) => augmentationIds.length > 0)
}

export function getSelectedAugmentationCategory(categories, cropId) {
  return categories.find((category) => category.cropId === cropId) ??
    categories[0] ?? null
}
