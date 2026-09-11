import { getCropName } from '../game/crops.js'
import { FormattedNumber } from './ui.jsx'

function getCellCenter(blueprint, index) {
  return {
    x: (index % blueprint.columns) + 0.5,
    y: Math.floor(index / blueprint.columns) + 0.5,
  }
}

function getGourdCenter(blueprint) {
  const anchorIndex = blueprint.cells.indexOf('leechingGourd')
  if (anchorIndex < 0) return null

  return {
    x: (anchorIndex % blueprint.columns) + 1,
    y: Math.floor(anchorIndex / blueprint.columns) + 1,
  }
}

function toPointList(points) {
  return points.map(({ x, y }) => `${x},${y}`).join(' ')
}

export function LeechingVineLines({ blueprint, editor }) {
  const gourdCenter = getGourdCenter(blueprint)
  const { activePath, inactivePath, activeTargetIndexes } = editor.status

  if (!gourdCenter || activePath.length + inactivePath.length === 0) {
    return null
  }

  const activePoints = [
    gourdCenter,
    ...activePath.map((index) => getCellCenter(blueprint, index)),
  ]
  const inactiveStart = activePoints.at(-1)
  const inactivePoints = [
    inactiveStart,
    ...inactivePath.map((index) => getCellCenter(blueprint, index)),
  ]

  return (
    <svg
      className="leeching-vine-lines"
      viewBox={`0 0 ${blueprint.columns} ${blueprint.rows}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {activePath.length > 0 ? (
        <polyline
          className="leeching-vine-line"
          points={toPointList(activePoints)}
        />
      ) : null}
      {inactivePath.length > 0 ? (
        <polyline
          className="leeching-vine-line leeching-vine-line-inactive"
          points={toPointList(inactivePoints)}
        />
      ) : null}
      {activeTargetIndexes.map((targetIndex) => {
        const target = getCellCenter(blueprint, targetIndex)
        const sourceIndex = activePath.find((pathIndex) => {
          const source = getCellCenter(blueprint, pathIndex)
          return Math.abs(source.x - target.x) + Math.abs(source.y - target.y) === 1
        })
        if (sourceIndex === undefined) return null

        return (
          <line
            className="leeching-vine-target-line"
            key={targetIndex}
            x1={getCellCenter(blueprint, sourceIndex).x}
            y1={getCellCenter(blueprint, sourceIndex).y}
            x2={target.x}
            y2={target.y}
          />
        )
      })}
    </svg>
  )
}

export function LeechingVineEditorPanel({
  completedCropPerfections,
  editor,
}) {
  if (editor.selectedGourdIndex === null) return null

  const { nourishment, vine, activeTargetIndexes } = editor.status
  const instruction = editor.isDrawing
    ? 'Select a highlighted empty tile to extend the vine. It can bend, but it cannot cross itself or pass through Crops.'
    : vine.path.length === 0
      ? 'Begin a vine, then route it through empty tiles.'
      : nourishment.targetCapacity === 0
        ? 'The Gourd needs at least one adjacent debuff Crop type before its vine can affect a Turnip.'
        : 'Select highlighted Turnips touching the vine. Select an assigned Turnip again to release it.'

  return (
    <section className="leeching-vine-editor" aria-live="polite">
      <div className="leeching-vine-editor-heading">
        <div>
          <p className="eyebrow">Leeching Vine configuration</p>
          <h3>Route nourishment through the field</h3>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={editor.onClose}
        >
          Close configuration
        </button>
      </div>

      <p>{instruction}</p>
      <dl className="leeching-vine-stats">
        <div>
          <dt>Nourishment strength</dt>
          <dd><FormattedNumber value={nourishment.strength} maximumFractionDigits={0} /></dd>
        </div>
        <div>
          <dt>Nourishment variety</dt>
          <dd><FormattedNumber value={nourishment.variety} maximumFractionDigits={0} /> types</dd>
        </div>
        <div>
          <dt>Vine length</dt>
          <dd>
            <FormattedNumber value={vine.path.length} maximumFractionDigits={0} />
            {' / '}
            <FormattedNumber value={nourishment.maximumLength} maximumFractionDigits={0} /> tiles
          </dd>
        </div>
        <div>
          <dt>Affected Turnips</dt>
          <dd>
            <FormattedNumber value={activeTargetIndexes.length} maximumFractionDigits={0} />
            {' / '}
            <FormattedNumber value={nourishment.targetCapacity} maximumFractionDigits={0} />
          </dd>
        </div>
        <div>
          <dt>Additional Gourd exponent</dt>
          <dd>+<FormattedNumber value={nourishment.bonusExponent} maximumFractionDigits={2} /></dd>
        </div>
      </dl>

      {nourishment.sources.length > 0 ? (
        <p className="leeching-vine-sources">
          Nourished by{' '}
          {nourishment.sources.map((source) =>
            `${getCropName(source.crop, completedCropPerfections)} (+${source.strength})`
          ).join(', ')}.
        </p>
      ) : null}

      <div className="leeching-vine-actions">
        {editor.isDrawing ? (
          <button
            type="button"
            className="primary-button"
            onClick={editor.onFinishDrawing}
          >
            Finish drawing
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={editor.onStartDrawing}
            disabled={vine.path.length >= nourishment.maximumLength}
          >
            {vine.path.length > 0 ? 'Continue vine' : 'Grow vine'}
          </button>
        )}
        <button
          type="button"
          className="secondary-button"
          onClick={editor.onUndoLastSegment}
          disabled={vine.path.length === 0}
        >
          Undo last segment
        </button>
        <button
          type="button"
          className="leeching-vine-clear-button"
          onClick={editor.onClearVine}
          disabled={vine.path.length === 0}
        >
          Clear vine
        </button>
      </div>
    </section>
  )
}
