import { hasLeekDiagonalAugmentation } from '../game/augmentationLogic.js'
import { getMirrorCornMaximumReflections } from '../game/cropEffects.js'
import { hasCropPerfection } from '../game/crops.js'
import { getRabbitContractCropIds } from '../game/tradeLogic.js'

export const RABBIT_EXAMPLE_RECIPIENT = 'contractCrop'

// This is a teaching diagram, never a blueprint applied to the player's field.
export function getRabbitExampleBuild(game) {
  const perfections = game.completedCropPerfections ?? []
  const hasEnrichingLeek = hasCropPerfection(perfections, 'enrichingLeek')
  const hasMirrorCorn = hasCropPerfection(perfections, 'mirrorCorn')
  const usesDiagonalEnrichment = hasEnrichingLeek &&
    hasLeekDiagonalAugmentation(game.seedAugmentations)
  const reflectionCount = hasMirrorCorn
    ? Math.min(3, getMirrorCornMaximumReflections(game.seedAugmentations))
    : 0
  const recipientIndex = usesDiagonalEnrichment ? 8 : 7
  const cells = [null, 'turnip', null, 'turnip', 'leek', 'turnip', null,
    usesDiagonalEnrichment ? 'turnip' : null, null]
  const mirrorCornTargets = Array(9).fill(null)
  const reflectionCorners = [0, 2, 6]

  cells[recipientIndex] = RABBIT_EXAMPLE_RECIPIENT
  // Keep the harvest tile free, even before diagonal enrichment is available.
  reflectionCorners.slice(0, reflectionCount).forEach((index) => {
    cells[index] = 'corn'
    mirrorCornTargets[index] = 4
  })

  const eligibleCropIds = getRabbitContractCropIds(game)
  return {
    blueprint: { rows: 3, columns: 3, cells, mirrorCornTargets },
    recipientIndex,
    hasEnrichingLeek,
    hasMirrorCorn,
    usesDiagonalEnrichment,
    reflectionCount,
    eligibleCropIds,
    recipientCropIds: eligibleCropIds.filter((cropId) =>
      cropId !== 'leek' && cropId !== 'turnip' &&
      !(cropId === 'corn' && hasMirrorCorn && usesDiagonalEnrichment)),
  }
}
