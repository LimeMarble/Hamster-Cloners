import {
  formatWholeNumber,
  getCachedFormattedNumber,
} from '../game/numberFormat.js'
import {
  getCropEffectDescription,
  getCropName,
} from '../game/crops.js'
import {
  getBlueprintCropStats,
  getFortuneModifiers,
} from '../game/gameLogic.js'
import { CropVisual } from './CropVisual.jsx'

export function FormattedNumber({ value, maximumFractionDigits = 1 }) {
  return getCachedFormattedNumber(value, maximumFractionDigits)
}

export function WholeNumber({ value }) {
  return formatWholeNumber(value)
}

export function MonocropStatus({ limit, multiplier }) {
  return (
    <span className="monocrop-pill">
      <span>Monocrop limit</span>
      <strong>
        <FormattedNumber value={limit} maximumFractionDigits={0} /> plots
      </strong>
      <span className="monocrop-penalty-label">
        Monocrop penalty to harvest and crop passives
      </span>
      <strong>
        ×<FormattedNumber value={multiplier} maximumFractionDigits={3} />
      </strong>
    </span>
  )
}

export function SignedPercentage({ value }) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''

  return (
    <>
      {sign}
      <FormattedNumber value={Math.abs(value) * 100} maximumFractionDigits={1} />%
    </>
  )
}

function CropPassiveStatValue({ stat }) {
  if (stat.format === 'percentage') {
    return <SignedPercentage value={stat.value} />
  }

  if (stat.format === 'crop-yield') {
    return (
      <>
        {stat.value > 0 ? '+' : stat.value < 0 ? '−' : ''}
        <FormattedNumber
          value={Math.abs(stat.value)}
          maximumFractionDigits={2}
        />{' '}
        Crops
      </>
    )
  }

  return (
    <>
      ×<FormattedNumber value={stat.value} maximumFractionDigits={3} />
    </>
  )
}
function RootTunnelDistance({ distances }) {
  if (!distances || distances.length === 0) {
    return null
  }

  return (
    <span className="crop-hover-tunnel-distance">
      {' '}via Root Tunnel (distance{distances.length === 1 ? '' : 's'}{' '}
      {distances.map((distance) => getCachedFormattedNumber(distance, 2)).join(', ')})
    </span>
  )
}

export function MirrorCornConnectionLines({ blueprint, links, pending = false }) {
  if (links.length === 0) {
    return null
  }

  const getCellCenter = (index) => ({
    x: (index % blueprint.columns) + 0.5,
    y: Math.floor(index / blueprint.columns) + 0.5,
  })

  return (
    <svg
      className="mirror-corn-lines"
      viewBox={`0 0 ${blueprint.columns} ${blueprint.rows}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {links.map(({ sourceIndex, targetIndex }) => {
        const source = getCellCenter(sourceIndex)
        const target = getCellCenter(targetIndex)

        return (
          <line
            className={pending ? 'mirror-corn-line-pending' : 'mirror-corn-line'}
            key={`${sourceIndex}-${targetIndex}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
          />
        )
      })}
    </svg>
  )
}

export function CropHoverInspector({
  blueprint,
  index,
  completedCropPerfections,
  rowsProducedPerSecond,
  activeHamsters,
  rabbitContractsCompleted,
  totalRabbitRelationsEarned,
  revealManateeEffects,
  fortune,
  seedAugmentations,
  cursor,
}) {
  const stats = getBlueprintCropStats(
    blueprint,
    index,
    completedCropPerfections,
    rowsProducedPerSecond,
    activeHamsters,
    rabbitContractsCompleted,
    getFortuneModifiers(fortune),
    seedAugmentations,
    totalRabbitRelationsEarned,
  )

  if (!stats) {
    return null
  }

  return (
    <aside
      className="crop-hover-inspector"
      aria-live="polite"
      style={{ left: cursor.x, top: cursor.y }}
    >
      <p className="eyebrow">Hovered crop</p>
      <h3>
        <CropVisual
          cropId={stats.crop}
          completedCropPerfections={completedCropPerfections}
          className="crop-hover-visual"
        />{' '}
        {getCropName(stats.crop, completedCropPerfections)}
      </h3>
      <dl className="crop-hover-stats">
        <div>
          <dt>Harvest</dt>
          <dd>
            {stats.harvestDestroyedByAppleTree ||
            stats.harvestDestroyedByBlazingCarrot ||
            stats.harvestDestroyedByInfestation ? (
              'Destroyed'
            ) : (
              <>
                <FormattedNumber value={stats.harvestYield} maximumFractionDigits={2} /> Crops
              </>
            )}
          </dd>
        </div>
        {stats.passiveStats.map((stat) => (
          <div key={stat.id}>
            <dt>{stat.label}</dt>
            <dd>
              <CropPassiveStatValue stat={stat} />
            </dd>
          </div>
        ))}
        {stats.externalCropBuffMultiplier !== null ? (
          <div>
            <dt>External effects</dt>
            <dd>
              ×<FormattedNumber value={stats.externalCropBuffMultiplier} maximumFractionDigits={2} />
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="crop-hover-own-effect">
        {getCropEffectDescription(
          stats.crop,
          completedCropPerfections,
          seedAugmentations,
          revealManateeEffects,
        )}
      </p>
      <h4>Received effects</h4>
      {stats.receivedEffects.length > 0 ? (
        <ul className="crop-hover-effects">
          {stats.receivedEffects.map((effect, effectIndex) => {
            if (effect.type === 'blazing-carrot-burn') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  Burned by an orthogonally adjacent Blazing Carrot; harvest
                  and all passive effects are disabled.
                </li>
              )
            }

            if (effect.type === 'crop-effect-modifier') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> Crop effects from <FormattedNumber value={effect.count} maximumFractionDigits={0} />{' '}
                  {getCropName(effect.sourceCropId, completedCropPerfections)}
                  {effect.count === 1 ? '' : 's'}
                  <RootTunnelDistance distances={effect.adjacencyDistances} />
                </li>
              )
            }

            if (effect.type === 'mirror-corn') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> Crop effects from <FormattedNumber value={effect.count} maximumFractionDigits={0} /> Mirror Corn
                  {effect.count === 1 ? '' : 's'}
                </li>
              )
            }

            if (effect.type === 'mirror-corn-overload') {
              return (
                <li key={effect.type + '-' + effectIndex}>
                  Reflected sunlight overload: <FormattedNumber value={effect.count} maximumFractionDigits={0} /> reflections exceeds the safe limit of <FormattedNumber value={effect.safeLimit} maximumFractionDigits={0} />. This Crop's harvest and all passive effects are destroyed.
                </li>
              )
            }

            if (effect.type === 'leeching-gourd') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> Turnip effectiveness from Leeching Gourd
                  <RootTunnelDistance distances={effect.adjacencyDistances} />
                </li>
              )
            }

            if (effect.type === 'water-lettuce-infestation') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  Field-wide Water Lettuce infestation; this Crop's harvest
                  and all passive effects are disabled.
                </li>
              )
            }

            if (effect.type === 'shoal-grass-network') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  Connected network: <FormattedNumber value={effect.count} maximumFractionDigits={0} /> Shoal Grass
                </li>
              )
            }

            if (effect.type === 'shoal-grass-debuff-nullification') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  Debuffs nullified by a complete Shoal Grass surround.
                </li>
              )
            }

            if (effect.type === 'harvest-destruction') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  {effect.multiplier === undefined ? (
                    'Harvest destroyed by an adjacent Apple Sapling'
                  ) : (
                    <>
                      ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> harvest from Apple Sapling
                    </>
                  )}
                  <RootTunnelDistance distances={effect.adjacencyDistances} />
                </li>
              )
            }

            if (effect.type === 'global-passive-suppression') {
              return (
                <li key={effect.type + '-' + effectIndex}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> global Crop passive effects after field-wide modifiers
                </li>
              )
            }

            if (effect.type === 'fortune-passive') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={3} /> Crop passive effects from Breezes of Fortune
                </li>
              )
            }

            if (effect.type === 'fortune-crop-yield') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={3} /> Crop yields from Breezes of Fortune
                </li>
              )
            }

            if (effect.type === 'fortune-harvest') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={3} /> harvest from Breezes of Fortune
                </li>
              )
            }
            if (effect.type === 'global-hamster-efficiency') {
              return (
                <li key={effectIndex}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> global Hamster Efficiency from <FormattedNumber value={effect.count} maximumFractionDigits={0} />{' '}
                  {getCropName(effect.sourceCropId, completedCropPerfections)}
{effect.count === 1 ? '' : 's'} (cannot be boosted)
                </li>
              )
            }

            if (effect.type === 'global-row-production') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> global Row production from <FormattedNumber value={effect.count} maximumFractionDigits={0} />{' '}
                  {getCropName(effect.sourceCropId, completedCropPerfections)}
                  {effect.count === 1 ? '' : 's'} (cannot be boosted)
                </li>
              )
            }
            if (effect.type === 'carrot-high-harvest') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> all Crop harvest from <FormattedNumber value={effect.qualifyingCropTypeCount} maximumFractionDigits={0} />{' '}
                  high-harvest Crop type{effect.qualifyingCropTypeCount === 1 ? '' : 's'} and{' '}
                  <FormattedNumber value={effect.activeCarrotCount} maximumFractionDigits={0} />{' '}
                  {getCropName('carrot', completedCropPerfections)}
                  {effect.activeCarrotCount === 1 ? '' : 's'}
                </li>
              )
            }
            if (effect.type === 'sampling-lentil-trade') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> all Crop harvest from Sampling Lentil beside{' '}
                  <FormattedNumber value={effect.adjacentTradedCropCount} maximumFractionDigits={2} /> traded Crop adjacencies (cannot be boosted)
                </li>
              )
            }
            if (effect.type === 'global-harvest') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> all Crop harvest from <FormattedNumber value={effect.count} maximumFractionDigits={0} />{' '}
                  {getCropName(effect.sourceCropId, completedCropPerfections)}
                  {effect.count === 1 ? '' : 's'}

                </li>
              )
            }

            if (effect.type === 'monocrop') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={3} /> monocrop multiplier to harvest and crop passives
                </li>
              )
            }

            return (
              <li key={`${effect.type}-${effectIndex}`}>
                {effect.bonus >= 0 ? '+' : '−'}
                <FormattedNumber value={Math.abs(effect.bonus)} maximumFractionDigits={2} /> Crop yield from <FormattedNumber value={effect.count} maximumFractionDigits={0} />{' '}
                {getCropName(effect.sourceCropId, completedCropPerfections)}
                {effect.count === 1 ? '' : 's'}
                <RootTunnelDistance distances={effect.adjacencyDistances} />
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="crop-hover-empty">No effects received.</p>
      )}
    </aside>
  )
}
