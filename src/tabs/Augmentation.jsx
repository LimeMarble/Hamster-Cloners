import {
  getSelectedAugmentationCategory,
  getVisibleAugmentationCategories,
} from './augmentationCategories.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'
import { LeekAugmentations } from './LeekAugmentations.jsx'
import { MirrorCornAugmentations } from './MirrorCornAugmentations.jsx'
import { SweetPotatoAugmentations } from './SweetPotatoAugmentations.jsx'
import { LeechingGourdAugmentations } from './LeechingGourdAugmentations.jsx'
import { SplitweedAugmentations } from './SplitweedAugmentations.jsx'

const CROP_AUGMENTATION_COMPONENTS = {
  leek: LeekAugmentations,
  corn: MirrorCornAugmentations,
  sweetPotato: SweetPotatoAugmentations,
  pumpkin: LeechingGourdAugmentations,
  knotweed: SplitweedAugmentations,
}

export function Augmentation({
  game,
  activeCropId = 'leek',
  onActiveCropChange,
  onPurchaseSeedAugmentation,
  onToggleSeedAugmentation,
}) {
  const categories = getVisibleAugmentationCategories(game)
  const selectedCategory = getSelectedAugmentationCategory(categories, activeCropId)
  const CropAugmentations = CROP_AUGMENTATION_COMPONENTS[selectedCategory?.cropId]

  return (
    <section className='trade-panel' aria-labelledby='augmentation-title'>
      <header className='trade-header'>
        <div>
          <p className='eyebrow'>Capybara technology</p>
          <h1 id='augmentation-title'>Seed Augmentation</h1>
          <p className='trade-copy'>
            Modify perfected Crops with powerful, increasingly expensive
            improvements. Choose a Crop below to view its upgrades.
          </p>
        </div>
        <div className='relations-balance' aria-label='Current Crops'>
          <span>Crops</span>
          <strong><FormattedNumber value={game.crops} /></strong>
        </div>
      </header>

      <nav className='trade-relation-tabs augmentation-crop-tabs' aria-label='Crop augmentations'>
        {categories.map((category) => {
          const selected = category.cropId === selectedCategory.cropId
          return (
            <button
              type='button'
              key={category.cropId}
              className={`trade-relation-tab augmentation-crop-tab ${selected ? 'trade-relation-tab-active' : ''}`}
              aria-pressed={selected}
              aria-controls='augmentation-crop-panel'
              onClick={() => onActiveCropChange(category.cropId)}
            >
              <CropVisual
                cropId={category.cropId}
                completedCropPerfections={game.completedCropPerfections}
                className='augmentation-crop-icon'
              />
              <span>{category.name}</span>
              <span className='augmentation-crop-count'>
                ({category.augmentationIds.length})
              </span>
            </button>
          )
        })}
      </nav>

      {selectedCategory && CropAugmentations ? (
        <section
          id='augmentation-crop-panel'
          className='augmentation-crop-panel'
          aria-labelledby='augmentation-crop-title'
        >
          <h2 id='augmentation-crop-title'>{selectedCategory.name} augmentations</h2>
          <div className='seed-augmentation-grid'>
            <CropAugmentations
              key={selectedCategory.cropId}
              game={game}
              onPurchaseSeedAugmentation={onPurchaseSeedAugmentation}
              onToggleSeedAugmentation={onToggleSeedAugmentation}
            />
          </div>
        </section>
      ) : (
        <p className='trade-copy'>No Crop augmentations are available yet.</p>
      )}
    </section>
  )
}
