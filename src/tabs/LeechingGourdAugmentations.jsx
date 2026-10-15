import {
  getNextSeedAugmentationCost,
  getLeechingVineTargetsPerType,
  getSeedAugmentationCost,
  getSplitweedVineNourishmentStrengthBonus,
  isSeedAugmentationVisible,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/augmentationLogic.js'
import { CROP_PERFECTIONS } from '../game/crops.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'

export function LeechingGourdAugmentations({ game, onPurchaseSeedAugmentation }) {
  const leechingVine =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEECHING_VINE]
  const leechingVineCost = getNextSeedAugmentationCost(
    game,
    leechingVine.id,
  )
  const hasLeechingGourd =
    game.completedCropPerfections.includes('leechingGourd')
  const isLeechingVineVisible = isSeedAugmentationVisible(
    game,
    leechingVine.id,
  )
  const sneakyCrawler =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SNEAKY_CRAWLER]
  const sneakyCrawlerCost = getNextSeedAugmentationCost(
    game,
    sneakyCrawler.id,
  )
  const isSneakyCrawlerVisible = isSeedAugmentationVisible(
    game,
    sneakyCrawler.id,
  )
  const greaterAbsorption =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.GREATER_ABSORPTION]
  const greaterAbsorptionCost = getNextSeedAugmentationCost(
    game,
    greaterAbsorption.id,
  )
  const isGreaterAbsorptionVisible = isSeedAugmentationVisible(
    game,
    greaterAbsorption.id,
  )
  const splitweedVineNourishmentStrength =
    CROP_PERFECTIONS.splitweed.vineNourishmentStrength +
    getSplitweedVineNourishmentStrengthBonus(game.seedAugmentations)
  const vineTargetsPerType = getLeechingVineTargetsPerType(game.seedAugmentations)

  return (
    <>
      {isLeechingVineVisible ? (
        <article className='seed-augmentation-card'>
          <div className='seed-augmentation-heading'>
            <CropVisual
              cropId='pumpkin'
              completedCropPerfections={game.completedCropPerfections}
              className='seed-augmentation-crop'
            />
            <div>
              <p className='eyebrow'>Leeching Gourd</p>
              <h2>{leechingVine.name}</h2>
            </div>
          </div>
          <p>
            Draw one bending vine from Leeching Gourd through empty tiles.
            Adjacent debuff Crops provide nourishment strength: each point
            adds one tile of range and +0.1 to the exponent of the extra
            Gourd multiplier. Splitweed provides{' '}
            {splitweedVineNourishmentStrength} strength. Each unique
            debuff Crop type lets the vine affect {vineTargetsPerType} selected Turnips.
          </p>
          <p>
            The existing Gourd bonus remains global. A selected Turnip also
            receives Gourd multiplier ^ (0.1 × nourishment strength).
          </p>
          <dl className='seed-augmentation-stats'>
            <div>
              <dt>Status</dt>
              <dd>{leechingVineCost === null ? 'Active' : 'Locked'}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd><FormattedNumber value={getSeedAugmentationCost(game, leechingVine.id)} /> Crops</dd>
            </div>
          </dl>
          <button
            type='button'
            className='trade-primary-button'
            onClick={() => onPurchaseSeedAugmentation(leechingVine.id)}
            disabled={
              !hasLeechingGourd ||
              leechingVineCost === null ||
              game.crops < leechingVineCost
            }
          >
            {!hasLeechingGourd
              ? 'Perfect Pumpkin first'
              : leechingVineCost === null
                ? 'Augmentation active'
                : <>
                    Augment:{' '}
                    <FormattedNumber value={leechingVineCost} /> Crops
                  </>}
          </button>
        </article>
      ) : null}

      {isSneakyCrawlerVisible ? (
        <article className='seed-augmentation-card'>
          <div className='seed-augmentation-heading'>
            <CropVisual
              cropId='pumpkin'
              completedCropPerfections={game.completedCropPerfections}
              className='seed-augmentation-crop'
            />
            <div>
              <p className='eyebrow'>Leeching Gourd</p>
              <h2>{sneakyCrawler.name}</h2>
            </div>
          </div>
          <p>
            Raises Leeching Vine's affected Turnips from{' '}
            {leechingVine.targetsPerNourishmentType} to{' '}
            {leechingVine.targetsPerNourishmentType +
              sneakyCrawler.targetsPerNourishmentTypeBonus} per nourishment
            type without adding nourishment strength, range, or exponent.
          </p>
          <dl className='seed-augmentation-stats'>
            <div>
              <dt>Status</dt>
              <dd>{sneakyCrawlerCost === null ? 'Active' : 'Locked'}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd><FormattedNumber value={getSeedAugmentationCost(game, sneakyCrawler.id)} /> Crops</dd>
            </div>
          </dl>
          <button
            type='button'
            className='trade-primary-button'
            onClick={() => onPurchaseSeedAugmentation(sneakyCrawler.id)}
            disabled={
              !hasLeechingGourd ||
              sneakyCrawlerCost === null ||
              game.crops < sneakyCrawlerCost
            }
          >
            {!hasLeechingGourd
              ? 'Perfect Pumpkin first'
              : sneakyCrawlerCost === null
                ? 'Augmentation active'
                : <>
                    Augment:{' '}
                    <FormattedNumber value={sneakyCrawlerCost} /> Crops
                  </>}
          </button>
        </article>
      ) : null}

      {isGreaterAbsorptionVisible ? (
        <article className='seed-augmentation-card'>
          <div className='seed-augmentation-heading'>
            <CropVisual
              cropId='pumpkin'
              completedCropPerfections={game.completedCropPerfections}
              className='seed-augmentation-crop'
            />
            <div>
              <p className='eyebrow'>Leeching Gourd</p>
              <h2>{greaterAbsorption.name}</h2>
            </div>
          </div>
          <p>
            Each adjacent Splitweed provides +
            {greaterAbsorption.splitweedNourishmentStrengthBonus}{' '}
            additional vine nourishment strength, increasing its
            contribution from 2 to 3. This also adds one tile of range and
            +0.1 to the extra Gourd exponent per Splitweed.
          </p>
          <dl className='seed-augmentation-stats'>
            <div>
              <dt>Status</dt>
              <dd>{greaterAbsorptionCost === null ? 'Active' : 'Locked'}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd><FormattedNumber value={getSeedAugmentationCost(game, greaterAbsorption.id)} /> Crops</dd>
            </div>
          </dl>
          <button
            type='button'
            className='trade-primary-button'
            onClick={() =>
              onPurchaseSeedAugmentation(greaterAbsorption.id)
            }
            disabled={
              !hasLeechingGourd ||
              greaterAbsorptionCost === null ||
              game.crops < greaterAbsorptionCost
            }
          >
            {!hasLeechingGourd
              ? 'Perfect Pumpkin first'
              : greaterAbsorptionCost === null
                ? 'Augmentation active'
                : <>
                    Augment:{' '}
                    <FormattedNumber value={greaterAbsorptionCost} /> Crops
                  </>}
          </button>
        </article>
      ) : null}
    </>
  )
}
