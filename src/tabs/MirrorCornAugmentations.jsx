import {
  getMirrorCornEffectivenessBonus,
  getMirrorCornEffectivenessLevel,
  getNextSeedAugmentationCost,
  getSeedAugmentationCost,
  hasMirrorCornDebuffRemovalAugmentation,
  isMirrorCornDebuffRemovalEnabled,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/augmentationLogic.js'
import { getMirrorCornMaximumReflections } from '../game/cropEffects.js'
import { CROP_PERFECTIONS } from '../game/crops.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'

export function MirrorCornAugmentations({
  game,
  onPurchaseSeedAugmentation,
  onToggleSeedAugmentation,
}) {
  const cornDebuffRemoval =
    SEED_AUGMENTATIONS[
      SEED_AUGMENTATION_IDS.MIRROR_CORN_DEBUFF_REMOVAL
    ]
  const cornEffectiveness =
    SEED_AUGMENTATIONS[
      SEED_AUGMENTATION_IDS.MIRROR_CORN_EFFECTIVENESS
    ]
  const cornReflectionLimit =
    SEED_AUGMENTATIONS[
      SEED_AUGMENTATION_IDS.MIRROR_CORN_REFLECTION_LIMIT
    ]
  const cornDebuffRemovalCost = getNextSeedAugmentationCost(
    game,
    cornDebuffRemoval.id,
  )
  const cornEffectivenessCost = getNextSeedAugmentationCost(
    game,
    cornEffectiveness.id,
  )
  const cornReflectionLimitCost = getNextSeedAugmentationCost(
    game,
    cornReflectionLimit.id,
  )
  const hasMirrorCorn = game.completedCropPerfections.includes('mirrorCorn')
  const cornDebuffRemovalUnlocked =
    hasMirrorCornDebuffRemovalAugmentation(game.seedAugmentations)
  const cornDebuffRemovalEnabled =
    isMirrorCornDebuffRemovalEnabled(game.seedAugmentations)
  const mirrorCornEffectMultiplier =
    CROP_PERFECTIONS.mirrorCorn.diagonalTargetEffectMultiplier +
    getMirrorCornEffectivenessBonus(game.seedAugmentations)
  const mirrorCornEffectivenessLevel = getMirrorCornEffectivenessLevel(
    game.seedAugmentations,
  )
  const safeReflectionLimit = getMirrorCornMaximumReflections(
    game.seedAugmentations,
  )

  return (
    <>
      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='corn'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Mirror Corn</p>
            <h2>{cornDebuffRemoval.name}</h2>
          </div>
        </div>
        <p>
          Removes Mirror Corn's −50% Hamster Efficiency debuff. Once
          purchased, this protection can be toggled at any time.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Status</dt>
            <dd>
              {!cornDebuffRemovalUnlocked
                ? 'Locked'
                : cornDebuffRemovalEnabled
                  ? 'Debuff removed'
                  : 'Debuff enabled'}
            </dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd><FormattedNumber value={getSeedAugmentationCost(game, cornDebuffRemoval.id)} /> Crops</dd>
          </div>
        </dl>
        <button
          type='button'
          className='trade-primary-button'
          onClick={() =>
            cornDebuffRemovalUnlocked
              ? onToggleSeedAugmentation(cornDebuffRemoval.id)
              : onPurchaseSeedAugmentation(cornDebuffRemoval.id)
          }
          disabled={
            !hasMirrorCorn ||
            (!cornDebuffRemovalUnlocked &&
              game.crops < cornDebuffRemovalCost)
          }
        >
          {!hasMirrorCorn
            ? 'Perfect Corn first'
            : cornDebuffRemovalUnlocked
              ? cornDebuffRemovalEnabled
                ? 'Restore Hamster debuff'
                : 'Remove Hamster debuff'
              : <>
                  Augment:{' '}
                  <FormattedNumber value={cornDebuffRemovalCost} /> Crops
                </>}
        </button>
      </article>

      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='corn'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Mirror Corn</p>
            <h2>{cornEffectiveness.name}</h2>
          </div>
        </div>
        <p>
          Each level adds +1 to the multiplier supplied by every Mirror
          Corn reflection.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Level</dt>
            <dd>
              {mirrorCornEffectivenessLevel} / {cornEffectiveness.maximumLevel}
            </dd>
          </div>
          <div>
            <dt>Reflection multiplier</dt>
            <dd>×<FormattedNumber value={mirrorCornEffectMultiplier} /></dd>
          </div>
          <div>
            <dt>Next cost</dt>
            <dd>
              {cornEffectivenessCost === null
                ? 'Maximum level'
                : <><FormattedNumber value={cornEffectivenessCost} /> Crops</>}
            </dd>
          </div>
        </dl>
        <button
          type='button'
          className='trade-primary-button'
          onClick={() => onPurchaseSeedAugmentation(cornEffectiveness.id)}
          disabled={
            !hasMirrorCorn ||
            cornEffectivenessCost === null ||
            game.crops < cornEffectivenessCost
          }
        >
          {!hasMirrorCorn
            ? 'Perfect Corn first'
            : cornEffectivenessCost === null
              ? 'Maximum level'
              : <>
                  Augment:{' '}
                  <FormattedNumber value={cornEffectivenessCost} /> Crops
                </>}
        </button>
      </article>

      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='corn'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Mirror Corn</p>
            <h2>{cornReflectionLimit.name}</h2>
          </div>
        </div>
        <p>
          Raises the safe reflection limit by one. Exceeding the limit is
          still allowed, but destroys that tile's harvest and all passives.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Safe reflections per tile</dt>
            <dd>{safeReflectionLimit}</dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd><FormattedNumber value={getSeedAugmentationCost(game, cornReflectionLimit.id)} /> Crops</dd>
          </div>
        </dl>
        <button
          type='button'
          className='trade-primary-button'
          onClick={() =>
            onPurchaseSeedAugmentation(cornReflectionLimit.id)
          }
          disabled={
            !hasMirrorCorn ||
            cornReflectionLimitCost === null ||
            game.crops < cornReflectionLimitCost
          }
        >
          {!hasMirrorCorn
            ? 'Perfect Corn first'
            : cornReflectionLimitCost === null
              ? 'Augmentation active'
              : <>
                  Augment:{' '}
                  <FormattedNumber value={cornReflectionLimitCost} /> Crops
                </>}
        </button>
      </article>
    </>
  )
}
