import {
  getLayeredLeekEnrichmentYieldBonus,
  getLeekEnrichmentLevel,
  getNextSeedAugmentationCost,
  getSeedAugmentationCost,
  isSeedAugmentationVisible,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/augmentationLogic.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'
import { RichSoilAugmentation } from './RichSoilAugmentation.jsx'

export function LeekAugmentations({ game, onPurchaseSeedAugmentation }) {
  const enrichment =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT]
  const diagonal =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_DIAGONAL]
  const orthogonalSquared =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ORTHOGONAL_SQUARED]
  const enrichmentLevel = getLeekEnrichmentLevel(game.seedAugmentations)
  const enrichmentBonus = getLayeredLeekEnrichmentYieldBonus(
    game.seedAugmentations,
  )
  const enrichmentCost = getNextSeedAugmentationCost(
    game,
    enrichment.id,
  )
  const diagonalCost = getNextSeedAugmentationCost(game, diagonal.id)
  const orthogonalSquaredCost = getNextSeedAugmentationCost(game, orthogonalSquared.id)
  const hasEnrichingLeek =
    game.completedCropPerfections.includes('enrichingLeek')

  return (
    <>
      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='leek'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Enriching Leek</p>
            <h2>{enrichment.name}</h2>
          </div>
        </div>
        <p>
          Each level adds a further +5, +10, +15, +20, then +25 Crops
          to Enriching Leek's personal and adjacent harvest boost.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Level</dt>
            <dd>{enrichmentLevel} / {enrichment.maximumLevel}</dd>
          </div>
          <div>
            <dt>Extra adjacent boost</dt>
            <dd>+<FormattedNumber value={enrichmentBonus} /> Crops</dd>
          </div>
        </dl>
        <button
          type='button'
          className='trade-primary-button'
          onClick={() => onPurchaseSeedAugmentation(enrichment.id)}
          disabled={
            !hasEnrichingLeek ||
            enrichmentCost === null ||
            game.crops < enrichmentCost
          }
        >
          {!hasEnrichingLeek
            ? 'Perfect Leek first'
            : enrichmentCost === null
              ? 'Maximum level reached'
              : <>Augment: <FormattedNumber value={enrichmentCost} /> Crops</>}
        </button>
      </article>

      <article className='seed-augmentation-card'>
        <div className='seed-augmentation-heading'>
          <CropVisual
            cropId='leek'
            completedCropPerfections={game.completedCropPerfections}
            className='seed-augmentation-crop'
          />
          <div>
            <p className='eyebrow'>Enriching Leek</p>
            <h2>{diagonal.name}</h2>
          </div>
        </div>
        <p>
          Enriching Leek also gives its harvest boost to directly
          diagonal Crops.
        </p>
        <dl className='seed-augmentation-stats'>
          <div>
            <dt>Status</dt>
            <dd>{diagonalCost === null ? 'Active' : 'Locked'}</dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd><FormattedNumber value={getSeedAugmentationCost(game, diagonal.id)} /> Crops</dd>
          </div>
        </dl>
        <button
          type='button'
          className='trade-primary-button'
          onClick={() => onPurchaseSeedAugmentation(diagonal.id)}
          disabled={
            !hasEnrichingLeek ||
            diagonalCost === null ||
            game.crops < diagonalCost
          }
        >
          {!hasEnrichingLeek
            ? 'Perfect Leek first'
            : diagonalCost === null
              ? 'Augmentation active'
              : <>Augment: <FormattedNumber value={diagonalCost} /> Crops</>}
        </button>
      </article>

      {isSeedAugmentationVisible(game, orthogonalSquared.id) ? (
        <article className='seed-augmentation-card'>
          <div className='seed-augmentation-heading'>
            <CropVisual
              cropId='leek'
              completedCropPerfections={game.completedCropPerfections}
              className='seed-augmentation-crop'
            />
            <div>
              <p className='eyebrow'>Enriching Leek</p>
              <h2>{orthogonalSquared.name}</h2>
            </div>
          </div>
          <p>
            Adds +<FormattedNumber value={orthogonalSquared.enrichmentBonus} /> to
            Enriching Leek&apos;s enrichment and extends it to Crops two tiles away
            orthogonally at full strength, regardless of the intervening tile.
            Keeps its existing reach and self-enrichment.
          </p>
          <dl className='seed-augmentation-stats'>
            <div>
              <dt>Status</dt>
              <dd>{orthogonalSquaredCost === null ? 'Active' : 'Locked'}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd><FormattedNumber value={getSeedAugmentationCost(game, orthogonalSquared.id)} /> Crops</dd>
            </div>
          </dl>
          <button
            type='button'
            className='trade-primary-button'
            onClick={() => onPurchaseSeedAugmentation(orthogonalSquared.id)}
            disabled={
              !hasEnrichingLeek || orthogonalSquaredCost === null ||
              game.crops < orthogonalSquaredCost
            }
          >
            {!hasEnrichingLeek
              ? 'Perfect Leek first'
              : orthogonalSquaredCost === null
                ? 'Augmentation active'
                : <>Augment: <FormattedNumber value={orthogonalSquaredCost} /> Crops</>}
          </button>
        </article>
      ) : null}

      <RichSoilAugmentation
        game={game}
        onPurchaseSeedAugmentation={onPurchaseSeedAugmentation}
      />
    </>
  )
}
