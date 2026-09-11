import {
  getLoosenedBoundariesLevel,
  getNextSeedAugmentationCost,
  getSweeterBondLevel,
  getSweetPotatoCrowdingBase,
  getSweetPotatoGrowthExponentCap,
  isSeedAugmentationVisible,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/gameLogic.js'
import { CROP_PERFECTIONS } from '../game/crops.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'

function AugmentationButton({
  augmentation,
  cost,
  hasSweetPotato,
  crops,
  onPurchase,
}) {
  const isMaximumLevel = cost === null

  return (
    <button
      type='button'
      className='trade-primary-button'
      onClick={() => onPurchase(augmentation.id)}
      disabled={!hasSweetPotato || isMaximumLevel || crops < cost}
    >
      {!hasSweetPotato
        ? 'Perfect Potato first'
        : isMaximumLevel
          ? 'Maximum level reached'
          : <>
              Augment — <FormattedNumber value={cost} /> Crops
            </>}
    </button>
  )
}

export function SweetPotatoAugmentations({
  game,
  onPurchaseSeedAugmentation,
}) {
  const sweeterBond =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.SWEETER_BOND]
  const loosenedBoundaries =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LOOSENED_BOUNDARIES]

  if (!isSeedAugmentationVisible(game, sweeterBond.id)) {
    return null
  }

  const hasSweetPotato =
    game.completedCropPerfections.includes('sweetPotato')
  const sweeterBondLevel = getSweeterBondLevel(game.seedAugmentations)
  const loosenedBoundariesLevel = getLoosenedBoundariesLevel(
    game.seedAugmentations,
  )
  const sweeterBondCost = getNextSeedAugmentationCost(game, sweeterBond.id)
  const loosenedBoundariesCost = getNextSeedAugmentationCost(
    game,
    loosenedBoundaries.id,
  )
  const growthExponentCap = getSweetPotatoGrowthExponentCap(
    CROP_PERFECTIONS.sweetPotato,
    game.seedAugmentations,
  )
  const crowdingBase = getSweetPotatoCrowdingBase(
    CROP_PERFECTIONS.sweetPotato,
    game.seedAugmentations,
  )

  return (
    <>
      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='sweetPotato'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Sweet Potato</p>
            <h2>{sweeterBond.name}</h2>
          </div>
        </div>
        <p>
          Each level raises the connected-bed growth exponent cap by 4.
          Each new level costs 1,000 times the previous one.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Level</dt>
            <dd>{sweeterBondLevel} / {sweeterBond.maximumLevel}</dd>
          </div>
          <div>
            <dt>Growth exponent cap</dt>
            <dd>{growthExponentCap}</dd>
          </div>
          <div>
            <dt>Next cost</dt>
            <dd>
              {sweeterBondCost === null
                ? 'Maximum level'
                : <><FormattedNumber value={sweeterBondCost} /> Crops</>}
            </dd>
          </div>
        </dl>
        <AugmentationButton
          augmentation={sweeterBond}
          cost={sweeterBondCost}
          hasSweetPotato={hasSweetPotato}
          crops={game.crops}
          onPurchase={onPurchaseSeedAugmentation}
        />
      </article>

      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='sweetPotato'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Sweet Potato</p>
            <h2>{loosenedBoundaries.name}</h2>
          </div>
        </div>
        <p>
          Each level raises the base in the Sweet Potato crowding penalty by
          0.05. The penalty remains base^(m × (m − 1) / 2), where m is the
          bed&apos;s number of unique connected Turnip and Mirror Corn buffs.
          Each new level costs 500 times the previous one.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Level</dt>
            <dd>
              {loosenedBoundariesLevel} / {loosenedBoundaries.maximumLevel}
            </dd>
          </div>
          <div>
            <dt>Crowding base</dt>
            <dd>
              <FormattedNumber
                value={crowdingBase}
                maximumFractionDigits={2}
              />
            </dd>
          </div>
          <div>
            <dt>Next cost</dt>
            <dd>
              {loosenedBoundariesCost === null
                ? 'Maximum level'
                : <>
                    <FormattedNumber value={loosenedBoundariesCost} /> Crops
                  </>}
            </dd>
          </div>
        </dl>
        <AugmentationButton
          augmentation={loosenedBoundaries}
          cost={loosenedBoundariesCost}
          hasSweetPotato={hasSweetPotato}
          crops={game.crops}
          onPurchase={onPurchaseSeedAugmentation}
        />
      </article>
    </>
  )
}
