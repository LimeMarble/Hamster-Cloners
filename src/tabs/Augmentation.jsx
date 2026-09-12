import {
  getLeekAugmentationYieldBonus,
  getLeekEnrichmentLevel,
  getMirrorCornEffectivenessBonus,
  getMirrorCornEffectivenessLevel,
  getMirrorCornMaximumReflections,
  getNextSeedAugmentationCost,
  getSplitweedMonocropLimitLevel,
  getSplitweedMonocropLimitAugmentationEffect,
  getSplitweedVineNourishmentStrengthBonus,
  hasMirrorCornDebuffRemovalAugmentation,
  isMirrorCornDebuffRemovalEnabled,
  isSeedAugmentationVisible,
  SEED_AUGMENTATIONS,
  SEED_AUGMENTATION_IDS,
} from '../game/gameLogic.js'
import { CROP_PERFECTIONS } from '../game/crops.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'
import { SweetPotatoAugmentations } from './SweetPotatoAugmentations.jsx'

export function Augmentation({
  game,
  onPurchaseSeedAugmentation,
  onToggleSeedAugmentation,
}) {
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
  const hasEnrichingLeek =
    game.completedCropPerfections.includes('enrichingLeek')
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
              <dd><FormattedNumber value={cornDebuffRemoval.cost} /> Crops</dd>
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
                    Augment —{' '}
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
            Corn reflection. Each new level costs 10 times the previous one.
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
                    Augment —{' '}
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
              <dd><FormattedNumber value={cornReflectionLimit.cost} /> Crops</dd>
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
                    Augment —{' '}
                    <FormattedNumber value={cornReflectionLimitCost} /> Crops
                  </>}
          </button>
        </article>

        <SweetPotatoAugmentations
          game={game}
          onPurchaseSeedAugmentation={onPurchaseSeedAugmentation}
        />

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
              debuff Crop type lets the vine affect one selected Turnip.
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
                <dd><FormattedNumber value={leechingVine.cost} /> Crops</dd>
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
                      Augment —{' '}
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
              Adds +{sneakyCrawler.nourishmentVarietyBonus} nourishment
              variety to Leeching Vine, allowing it to affect one additional
              Turnip without adding nourishment strength, range, or exponent.
            </p>
            <dl className='seed-augmentation-stats'>
              <div>
                <dt>Status</dt>
                <dd>{sneakyCrawlerCost === null ? 'Active' : 'Locked'}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd><FormattedNumber value={sneakyCrawler.cost} /> Crops</dd>
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
                      Augment —{' '}
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
                <dd><FormattedNumber value={greaterAbsorption.cost} /> Crops</dd>
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
                      Augment —{' '}
                      <FormattedNumber value={greaterAbsorptionCost} /> Crops
                    </>}
            </button>
          </article>
        ) : null}

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
            tiles. Each new level costs 50 times the previous one.
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
                    Augment —{' '}
                    <FormattedNumber value={splitweedMonocropLimitCost} /> Crops
                  </>}
          </button>
        </article>
        ) : null}
      </div>
    </section>
  )
}
