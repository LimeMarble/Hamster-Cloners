import {
  getLeekAugmentationYieldBonus,
  getLeekEnrichmentLevel,
  getNextSeedAugmentationCost,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/gameLogic.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'

export function Augmentation({ game, onPurchaseSeedAugmentation }) {
  const enrichment =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_ENRICHMENT]
  const diagonal =
    SEED_AUGMENTATIONS[SEED_AUGMENTATION_IDS.LEEK_DIAGONAL]
  const enrichmentLevel = getLeekEnrichmentLevel(game.seedAugmentations)
  const enrichmentBonus = getLeekAugmentationYieldBonus(
    game.seedAugmentations,
  )
  const enrichmentCost = getNextSeedAugmentationCost(
    game,
    enrichment.id,
  )
  const diagonalCost = getNextSeedAugmentationCost(game, diagonal.id)
  const hasEnrichingLeek =
    game.completedCropPerfections.includes('enrichingLeek')

  return (
    <section className='trade-panel' aria-labelledby='augmentation-title'>
      <header className='trade-header'>
        <div>
          <p className='eyebrow'>Capybara technology</p>
          <h1 id='augmentation-title'>Seed Augmentation</h1>
          <p className='trade-copy'>
            Modify perfected Crops with powerful, increasingly expensive
            improvements.
          </p>
        </div>
        <div className='relations-balance' aria-label='Current Crops'>
          <span>Crops</span>
          <strong><FormattedNumber value={game.crops} /></strong>
        </div>
      </header>

      <div className='seed-augmentation-grid'>
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
            to Enriching Leek's adjacent harvest boost.
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
                : <>Augment — <FormattedNumber value={enrichmentCost} /> Crops</>}
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
              <dd><FormattedNumber value={diagonal.cost} /> Crops</dd>
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
                : <>Augment — <FormattedNumber value={diagonalCost} /> Crops</>}
          </button>
        </article>
      </div>
    </section>
  )
}
