import {
  getNextSeedAugmentationCost,
  getSeedAugmentationCost,
  hasRichSoilAugmentation,
  isSeedAugmentationVisible,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/augmentationLogic.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'

export function RichSoilAugmentation({ game, onPurchaseSeedAugmentation }) {
  const augmentation = SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.RICH_SOIL]
  if (!isSeedAugmentationVisible(game, augmentation.id)) return null

  const purchased = hasRichSoilAugmentation(game.seedAugmentations)
  const isInMisfortune = game.activeArea === augmentation.purchaseArea
  const hasEnrichingLeek =
    game.completedCropPerfections.includes('enrichingLeek')
  const cost = getNextSeedAugmentationCost(game, augmentation.id)

  return (
    <article className='seed-augmentation-card'>
      <div className='seed-augmentation-heading'>
        <CropVisual
          cropId='leek'
          completedCropPerfections={game.completedCropPerfections}
          className='seed-augmentation-crop'
        />
        <div>
          <p className='eyebrow'>Enriching Leek · Misfortune only</p>
          <h2>{augmentation.name}</h2>
        </div>
      </div>
      <p>
        Multiplies each Enriching Leek harvest contribution by the receiving
        Crop&apos;s base harvest, with a minimum multiplier of ×1. Uses base
        harvest before enrichment and other harvest boosts.
      </p>
      <p>Purchased with Misfortune Crops and active only in Misfortune.</p>
      <p>
        Also unlocks Leek Fortune Cookie in the 5-Leaf Clover loadout pool:
        Leek Enrichment ^1.2 for 55 seconds, costing 3 Fortune
        points per 1% chance. The cookie is usable in both areas and starts
        at 0% in every loadout.
      </p>
      <dl className='seed-augmentation-stats'>
        <div>
          <dt>Status</dt>
          <dd>
            {purchased
              ? isInMisfortune ? 'Active' : 'Inactive outside Misfortune'
              : 'Locked'}
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>
            <FormattedNumber value={getSeedAugmentationCost(game, augmentation.id)} /> Misfortune Crops
          </dd>
        </div>
      </dl>
      <button
        type='button'
        className='trade-primary-button'
        onClick={() => onPurchaseSeedAugmentation(augmentation.id)}
        disabled={
          !isInMisfortune || !hasEnrichingLeek ||
          purchased || cost === null || game.crops < cost
        }
      >
        {purchased
          ? isInMisfortune ? 'Augmentation active' : 'Active only in Misfortune'
          : !hasEnrichingLeek
            ? 'Perfect Leek first'
            : <>
                Augment: <FormattedNumber value={cost} /> Misfortune Crops
              </>}
      </button>
    </article>
  )
}
