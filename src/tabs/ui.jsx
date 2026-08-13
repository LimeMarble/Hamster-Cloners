import { getCachedFormattedNumber } from '../game/numberFormat.js'
import {
  getCropEffectDescription,
  getCropName,
} from '../game/crops.js'
import { getBlueprintCropStats } from '../game/gameLogic.js'
import { getCropMark } from './uiHelpers.js'

export function FormattedNumber({ value, maximumFractionDigits = 1 }) {
  return getCachedFormattedNumber(value, maximumFractionDigits)
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

function RootTunnelDistance({ distances }) {
  if (!distances || distances.length === 0) {
    return null
  }

  return (
    <span className="crop-hover-tunnel-distance">
      {' '}via Root Tunnel (distance{distances.length === 1 ? '' : 's'}{' '}
      {distances.join(', ')})
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
  cursor,
}) {
  const stats = getBlueprintCropStats(
    blueprint,
    index,
    completedCropPerfections,
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
        <span aria-hidden="true">{getCropMark(stats.crop)}</span>{' '}
        {getCropName(stats.crop, completedCropPerfections)}
      </h3>
      <dl className="crop-hover-stats">
        <div>
          <dt>Harvest</dt>
          <dd>
            {stats.harvestDestroyedByAppleTree ? (
              'Destroyed'
            ) : (
              <>
                <FormattedNumber value={stats.harvestYield} maximumFractionDigits={2} /> Crops
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Hamster efficiency</dt>
          <dd>
            <SignedPercentage value={stats.hamsterEfficiencyBonus} />
          </dd>
        </div>
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
        {getCropEffectDescription(stats.crop, completedCropPerfections)}
      </p>
      <h4>Received effects</h4>
      {stats.receivedEffects.length > 0 ? (
        <ul className="crop-hover-effects">
          {stats.receivedEffects.map((effect, effectIndex) => {
            if (effect.type === 'crop-effect-modifier') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> Crop effects from {effect.count}{' '}
                  {getCropName(effect.sourceCropId, completedCropPerfections)}
                  {effect.count === 1 ? '' : 's'}
                  <RootTunnelDistance distances={effect.adjacencyDistances} />
                </li>
              )
            }

            if (effect.type === 'mirror-corn') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> Crop effects from {effect.count} Mirror Corn
                  {effect.count === 1 ? '' : 's'}
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

            if (effect.type === 'harvest-destruction') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  {effect.multiplier === undefined ? (
                    'Harvest destroyed by an adjacent Apple Tree'
                  ) : (
                    <>
                      ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> harvest from Apple Tree
                    </>
                  )}
                  <RootTunnelDistance distances={effect.adjacencyDistances} />
                </li>
              )
            }

            if (effect.type === 'global-harvest') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> all Crop harvest from {effect.count}{' '}
                  {getCropName(effect.sourceCropId, completedCropPerfections)}
                  {effect.count === 1 ? '' : 's'}

                </li>
              )
            }

            if (effect.type === 'monocrop') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={3} /> monocrop harvest multiplier
                </li>
              )
            }

            return (
              <li key={`${effect.type}-${effectIndex}`}>
                {effect.bonus >= 0 ? '+' : '−'}
                <FormattedNumber value={Math.abs(effect.bonus)} maximumFractionDigits={2} /> Crop yield from {effect.count}{' '}
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
