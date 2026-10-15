import {
  getNextSeedAugmentationCost,
  getSplitweedMonocropLimitLevel,
  isSeedAugmentationVisible,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/augmentationLogic.js'
import { getSplitweedMonocropLimitAugmentationEffect } from '../game/cropEffects.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'

export function SplitweedAugmentations({ game, onPurchaseSeedAugmentation }) {
  const splitweedMonocropLimit =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SPLITWEED_MONOCROP_LIMIT]
  const splitweedMonocropLimitCost = getNextSeedAugmentationCost(
    game,
    splitweedMonocropLimit.id,
  )
  const splitweedMonocropLimitLevel = getSplitweedMonocropLimitLevel(
    game.seedAugmentations,
  )
  const hasSplitweed = game.completedCropPerfections.includes('splitweed')
  const isSplitweedAugmentationVisible = isSeedAugmentationVisible(
    game,
    splitweedMonocropLimit.id,
  )
  const splitweedMonocropEffect =
    getSplitweedMonocropLimitAugmentationEffect(
      game.blueprint,
      game.completedCropPerfections,
      game.seedAugmentations,
    )

  return (
    <>
      {isSplitweedAugmentationVisible ? (
      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='knotweed'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Splitweed</p>
            <h2>{splitweedMonocropLimit.name}</h2>
          </div>
        </div>
        <p>
          Each directly adjacent Crop that inherently produces no harvest
          adds +1 to the Monocrop limit per level. Each Crop is counted
          once per adjacent Splitweed, even when it occupies multiple
          tiles.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Level</dt>
            <dd>
              {splitweedMonocropLimitLevel} /{' '}
              {splitweedMonocropLimit.maximumLevel}
            </dd>
          </div>
          <div>
            <dt>Adjacent non-harvesting Crops</dt>
            <dd>
              <FormattedNumber
                value={splitweedMonocropEffect.adjacentNonHarvestingCropCount}
                maximumFractionDigits={0}
              />
            </dd>
          </div>
          <div>
            <dt>Current Monocrop limit bonus</dt>
            <dd>
              +<FormattedNumber
                value={splitweedMonocropEffect.bonus}
                maximumFractionDigits={0}
              />
            </dd>
          </div>
          <div>
            <dt>Next cost</dt>
            <dd>
              {splitweedMonocropLimitCost === null
                ? 'Maximum level'
                : <>
                    <FormattedNumber value={splitweedMonocropLimitCost} /> Crops
                  </>}
            </dd>
          </div>
        </dl>
        <button
          type='button'
          className='trade-primary-button'
          onClick={() =>
            onPurchaseSeedAugmentation(splitweedMonocropLimit.id)
          }
          disabled={
            !hasSplitweed ||
            splitweedMonocropLimitCost === null ||
            game.crops < splitweedMonocropLimitCost
          }
        >
          {!hasSplitweed
            ? 'Perfect Knotweed first'
            : splitweedMonocropLimitCost === null
              ? 'Maximum level reached'
              : <>
                  Augment:{' '}
                  <FormattedNumber value={splitweedMonocropLimitCost} /> Crops
                </>}
        </button>
      </article>
      ) : null}
    </>
  )
}
