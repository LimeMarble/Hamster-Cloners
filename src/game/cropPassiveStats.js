import * as cropEffects from './cropEffects.js'

export function getCropPassiveStats({
  blueprint,
  index,
  crop,
  definition,
  baseHamsterEfficiencyBonus,
  hamsterEfficiencyBonus,
  monocropMultiplier,
  passiveEffectMultiplier,
  completedCropPerfections,
  rabbitContractsCompleted,
  globalRowProductionEffects,
  globalHamsterEfficiencyEffects,
  baseGlobalPassiveEffectMultiplier,
  seedAugmentations,
}) {
  const adjustForMonocrop = (bonus) =>
    bonus > 0 ? bonus * monocropMultiplier : bonus / monocropMultiplier
  const passiveStats = []

  if (baseHamsterEfficiencyBonus !== 0) {
    passiveStats.push({
      id: 'hamster-efficiency',
      label: 'Hamster efficiency',
      format: 'percentage',
      value: hamsterEfficiencyBonus,
    })
  }
  const baseRowDuplicatorEffectivenessBonus =
    definition.rowDuplicatorEffectivenessBonus ?? 0
  if (baseRowDuplicatorEffectivenessBonus !== 0) {
    passiveStats.push({
      id: 'row-duplicator-efficiency',
      label: 'Row Duplicator efficiency',
      format: 'percentage',
      value:
        adjustForMonocrop(baseRowDuplicatorEffectivenessBonus) *
        passiveEffectMultiplier *
        cropEffects.getAdjacentCropEffectMultiplier(
          blueprint,
          index,
          crop,
          baseRowDuplicatorEffectivenessBonus < 0,
          completedCropPerfections,
          passiveEffectMultiplier,
        ) *
        cropEffects.getMirrorCornEffectMultiplier(
          blueprint,
          index,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        ),
    })
  }
  if (definition.adjacentCropEffectModifier !== undefined) {
    passiveStats.push({
      id: 'adjacent-crop-effects',
      label: 'Adjacent Crop effects',
      format: 'multiplier',
      value: cropEffects.getAdjacentCropEffectModifier(
        blueprint,
        crop,
        'leek',
        0,
        false,
        completedCropPerfections,
        passiveEffectMultiplier,
      ),
    })
  }
  const ownBaseAdjacentHarvestBonus = cropEffects.getAdjacentHarvestModifier(
    blueprint,
    crop,
    completedCropPerfections,
    passiveEffectMultiplier,
    seedAugmentations,
  )
  if (ownBaseAdjacentHarvestBonus !== 0) {
    passiveStats.push({
      id: 'adjacent-crop-yield',
      label: 'Adjacent Crop yield',
      format: 'crop-yield',
      value:
        ownBaseAdjacentHarvestBonus *
        cropEffects.getAdjacentCropEffectMultiplier(
          blueprint,
          index,
          crop,
          ownBaseAdjacentHarvestBonus < 0,
          completedCropPerfections,
          passiveEffectMultiplier,
        ) *
        cropEffects.getMirrorCornEffectMultiplier(
          blueprint,
          index,
          completedCropPerfections,
          passiveEffectMultiplier,
          seedAugmentations,
        ),
    })
  }
  const cropOccurrenceIndex =
    blueprint.cells
      .slice(0, index + 1)
      .filter((cell) => cell === crop).length - 1
  const ownGlobalHarvestEffect = cropEffects.getGlobalHarvestEffects(
    blueprint,
    completedCropPerfections,
    rabbitContractsCompleted,
    passiveEffectMultiplier,
  ).filter((effect) => effect.sourceCropId === crop)[cropOccurrenceIndex]
  if (ownGlobalHarvestEffect) {
    passiveStats.push({
      id: 'global-crop-harvest',
      label: 'Global Crop harvest',
      format: 'percentage',
      value: ownGlobalHarvestEffect.bonus,
    })
  }
  const ownGlobalRowEffect = globalRowProductionEffects.find(
    (effect) => effect.sourceCropId === crop,
  )
  if (ownGlobalRowEffect) {
    passiveStats.push({
      id: 'global-row-production',
      label: 'Global Row production',
      format: 'percentage',
      value: ownGlobalRowEffect.bonus / ownGlobalRowEffect.count,
    })
  }

  const ownGlobalHamsterEffect = globalHamsterEfficiencyEffects.find(
    (effect) => effect.sourceCropId === crop,
  )
  if (ownGlobalHamsterEffect) {
    passiveStats.push({
      id: 'global-hamster-efficiency',
      label: 'Global Hamster efficiency',
      format: 'percentage',
      value: ownGlobalHamsterEffect.bonus / ownGlobalHamsterEffect.count,
    })
  }
  const rabbitRelationsEffect = cropEffects.getRabbitRelationsEffects(
    blueprint,
    completedCropPerfections,
    passiveEffectMultiplier,
  ).find((effect) => effect.sourceCropId === crop)
  if (rabbitRelationsEffect) {
    passiveStats.push({
      id: 'rabbit-relations',
      label: 'Total Rabbit relations',
      format: 'percentage',
      value: rabbitRelationsEffect.bonus,
    })
  }

  if (crop === 'knotweed' && baseGlobalPassiveEffectMultiplier !== 1) {
    passiveStats.push({
      id: 'global-crop-passives',
      label: 'Global Crop passives',
      format: 'multiplier',
      value: baseGlobalPassiveEffectMultiplier,
    })

    const splitweedCount = cropEffects.getPlantedCropCount(
      blueprint,
      'knotweed',
    )
    const mirrorCornEffectivenessBonus =
      cropEffects.getSplitweedMirrorCornEffectivenessBonus(
        blueprint,
        completedCropPerfections,
      )

    if (splitweedCount > 0 && mirrorCornEffectivenessBonus > 0) {
      passiveStats.push({
        id: 'mirror-corn-effectiveness',
        label: 'Mirror Corn effectiveness',
        format: 'multiplier',
        value: 1 + mirrorCornEffectivenessBonus / splitweedCount,
      })
    }
  }
  if (crop === 'leechingGourd') {
    const gourdEffect = cropEffects.getLeechingGourdTurnipEffect(
      blueprint,
      completedCropPerfections,
      passiveEffectMultiplier,
    )

    if (gourdEffect.multiplier !== 1) {
      passiveStats.push({
        id: 'turnip-effectiveness',
        label: 'Turnip effectiveness',
        format: 'multiplier',
        value: gourdEffect.multiplier,
      })
    }
  }
  return passiveStats
}
