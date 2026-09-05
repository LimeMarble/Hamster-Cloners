import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MANATEE_DEVELOPMENT_GOAL_IDS,
  MANATEE_DEVELOPMENT_GOALS,
  MANATEE_PRIMITIVE_OBSTRUCTION,
  WETLANDS_CONNECTION_COLUMNS,
  WETLANDS_CONNECTION_TILES,
  WETLANDS_DIRECTION_ARROWS,
  WETLANDS_DIRECTION_LABELS,
  WETLANDS_FEEDING_GROUND_SAFE_PPM,
  WETLANDS_OBSTRUCTION_STRENGTH,
  calculateWetlandsConnection,
  getManateeRemainingDivingHamsterCapacity,
  getManateeRemainingHamsterCount,
  getWetlandsTileFlowDescription,
  hasCompletedManateeDevelopmentGoal,
} from '../game/gameLogic.js'
import { FormattedNumber } from './ui.jsx'
import { WetlandsObstructionPanel } from './WetlandsObstructionPanel.jsx'

function getTileName(tile) {
  if (tile.category === 'land') return 'Land'
  if (tile.category === 'outlet') return 'Combined outlet'
  if (tile.category === 'source') return tile.water
  if (tile.category === 'feeding-ground') return 'Feeding Ground'
  if (tile.category === 'channel') return 'Water channel'
  return 'Water'
}

function positionTooltip(tooltip, clientX, clientY) {
  if (!tooltip || typeof window === 'undefined') return

  const gap = 18
  const bounds = tooltip.getBoundingClientRect()
  const left = Math.max(
    10,
    Math.min(clientX + gap, window.innerWidth - bounds.width - 10),
  )
  const top = Math.max(
    10,
    Math.min(clientY + gap, window.innerHeight - bounds.height - 10),
  )

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
}

function TileDetails({
  tile,
  result,
  isObstructed,
  construction,
  canConstruct,
  constructionBlockers,
  isTouch,
}) {
  const feedingGround = result.feedingGroundsById[tile.id]
  const measurement = result.tileMeasurementsById[tile.id]
  const flowDescription = getWetlandsTileFlowDescription(tile)

  return (
    <div>
      <p className="eyebrow">Tile {tile.id}</p>
      <h4>{getTileName(tile)}</h4>
      {tile.direction ? (
        <p>
          Faces {WETLANDS_DIRECTION_LABELS[tile.direction]}{' '}
          {WETLANDS_DIRECTION_ARROWS[tile.direction]}
        </p>
      ) : null}
      <dl>
        <div>
          <dt>
            {tile.category === 'source' ? 'Source salinity' : 'Current salinity'}
          </dt>
          <dd>
            {tile.category === 'land' ? (
              'Not applicable'
            ) : measurement.ppm === null ? (
              'No active flow'
            ) : (
              <>
                <FormattedNumber
                  value={measurement.ppm}
                  maximumFractionDigits={1}
                />{' '}
                ppm
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>{tile.category === 'source' ? 'Source flow' : 'Net flow'}</dt>
          <dd>
            <FormattedNumber
              value={measurement.flow}
              maximumFractionDigits={2}
            />{' '}
            units / sec
          </dd>
        </div>
      </dl>
      {flowDescription ? <p>Normal flow: {flowDescription}.</p> : null}
      {feedingGround ? (
        <p className={feedingGround.isSafe ? 'is-safe' : 'is-unsafe'}>
          <strong>
            {feedingGround.isSafe ? 'Safe' : 'Vulnerable'} feeding ground
          </strong>
        </p>
      ) : null}
      {tile.category === 'land' ? (
        <p>Flow aimed here is blocked and redistributed among open paths.</p>
      ) : null}
      {tile.category === 'outlet' ? (
        <p>Water reaching this tile leaves through the eastern outlet.</p>
      ) : null}
      {tile.category === 'channel' ? (
        <p>
          Channels cannot hold primitive obstructions and keep their
          inlet-adjacent flow rules.
        </p>
      ) : null}
      {tile.canObstruct ? (
        <p className="wetlands-tooltip-action">
          {isObstructed
            ? `${isTouch ? 'Tap again' : 'Click'} to dismantle this obstruction and return its maintenance crew. Construction materials are not recovered.`
            : construction
              ? `Construction has ${Math.max(0, Math.ceil(construction.remainingSeconds))} seconds remaining. Its crew and diving gear are currently reserved.`
              : canConstruct
                ? `${isTouch ? 'Tap again' : 'Click'} to begin construction. The completed obstruction halves the flow weight aimed at this tile.`
                : constructionBlockers.join(' ')}
        </p>
      ) : null}
    </div>
  )
}

function WetlandsTile({
  tile,
  result,
  isObstructed,
  construction,
  canConstruct,
  isInspected,
  onInspect,
  onStopInspecting,
  onPointerPosition,
  onActivate,
}) {
  const feedingGround = result.feedingGroundsById[tile.id]
  const directionArrow = tile.direction
    ? WETLANDS_DIRECTION_ARROWS[tile.direction]
    : ''
  const statusClass = feedingGround
    ? feedingGround.isSafe
      ? ' wetlands-tile-safe'
      : ' wetlands-tile-unsafe'
    : ''

  return (
    <button
      type="button"
      className={`wetlands-tile wetlands-tile-${tile.category}${statusClass}${isObstructed ? ' wetlands-tile-obstructed' : ''}${construction ? ' wetlands-tile-constructing' : ''}${isInspected ? ' wetlands-tile-inspected' : ''}`}
      aria-label={`${tile.id}: ${getTileName(tile)}${isObstructed ? ', primitive obstruction placed' : construction ? ', primitive obstruction under construction' : ''}`}
      aria-pressed={tile.canObstruct ? isObstructed : undefined}
      aria-disabled={
        !tile.canObstruct || Boolean(construction) || (!isObstructed && !canConstruct)
      }
      onPointerDown={(event) => {
        onPointerPosition(event)
        onInspect(tile, event.pointerType !== 'mouse')
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onInspect(tile, false)
      }}
      onPointerMove={onPointerPosition}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') onStopInspecting(tile.id)
      }}
      onFocus={(event) => {
        if (!event.currentTarget.matches(':focus-visible')) return
        const bounds = event.currentTarget.getBoundingClientRect()
        onPointerPosition({
          pointerType: 'keyboard',
          clientX: bounds.right,
          clientY: bounds.top + bounds.height / 2,
        })
        onInspect(tile, false)
      }}
      onBlur={() => onStopInspecting(tile.id)}
      onClick={(event) => onActivate(tile, event)}
    >
      <span className="wetlands-tile-type">{getTileName(tile)}</span>
      {directionArrow ? (
        <span className="wetlands-tile-arrow" aria-hidden="true">
          {directionArrow}
        </span>
      ) : null}
      {feedingGround ? (
        <span className="wetlands-tile-ppm">
          <FormattedNumber
            value={feedingGround.ppm}
            maximumFractionDigits={0}
          />
        </span>
      ) : null}
      {isObstructed ? (
        <span className="wetlands-obstruction-mark" aria-hidden="true">
          Obstruction
        </span>
      ) : null}
      {construction ? (
        <span className="wetlands-construction-mark" aria-hidden="true">
          Building · {Math.max(0, Math.ceil(construction.remainingSeconds))}s
        </span>
      ) : null}
    </button>
  )
}

export function WetlandsConnectionPuzzle({
  game,
  state,
  onToggleObstruction,
  onClearObstructions,
}) {
  const obstructions = state.wetlandsConnection.obstructions
  const activeConstructions =
    state.wetlandsConnection.activeConstructions
  const obstructionKey = obstructions.join(',')
  const obstructionSet = useMemo(
    () => new Set(obstructions),
    // The normalized key is stable even though simulation snapshots clone arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obstructionKey],
  )
  const result = useMemo(
    () => calculateWetlandsConnection(obstructions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obstructionKey],
  )
  const constructionByTileId = new Map(
    activeConstructions.map((construction) => [
      construction.tileId,
      construction,
    ]),
  )
  const availableHamsters = getManateeRemainingHamsterCount(game)
  const availableDivingGear =
    getManateeRemainingDivingHamsterCapacity(game)
  const hasConstructionResources = Object.entries(
    MANATEE_PRIMITIVE_OBSTRUCTION.cost,
  ).every(
    ([resourceId, amount]) => state.resources[resourceId] >= amount,
  )
  const canConstructObstruction =
    hasConstructionResources &&
    availableHamsters >= MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew &&
    availableDivingGear >= MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew
  const constructionBlockers = [
    !hasConstructionResources ? 'More construction materials are needed.' : '',
    availableHamsters < MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew
      ? 'Ten unassigned hamsters are needed.'
      : '',
    availableDivingGear < MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew
      ? 'Ten available sets of diving gear are needed.'
      : '',
  ].filter(Boolean)
  const [inspectedTile, setInspectedTile] = useState(null)
  const [touchSelectionId, setTouchSelectionId] = useState(null)
  const [isTouchInspection, setIsTouchInspection] = useState(false)
  const lastPointerTypeRef = useRef('mouse')
  const lastPointerPositionRef = useRef({ x: 12, y: 12 })
  const tooltipRef = useRef(null)
  const goalId =
    MANATEE_DEVELOPMENT_GOAL_IDS.STABILIZE_WETLANDS_CONNECTION
  const goal = MANATEE_DEVELOPMENT_GOALS[goalId]
  const completed = hasCompletedManateeDevelopmentGoal(game, goalId)

  useEffect(() => {
    if (!inspectedTile) return

    positionTooltip(
      tooltipRef.current,
      lastPointerPositionRef.current.x,
      lastPointerPositionRef.current.y,
    )
  }, [inspectedTile])

  function inspectTile(tile, isTouch) {
    setInspectedTile(tile)
    setIsTouchInspection(isTouch)
    if (!isTouch) setTouchSelectionId(null)
  }

  function stopInspecting(tileId) {
    if (touchSelectionId) return
    setInspectedTile((currentTile) =>
      currentTile?.id === tileId ? null : currentTile,
    )
  }

  function handlePointerPosition(event) {
    lastPointerTypeRef.current = event.pointerType ?? 'keyboard'
    lastPointerPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    }
    positionTooltip(tooltipRef.current, event.clientX, event.clientY)
  }

  function activateTile(tile, event) {
    if (!tile.canObstruct) return

    const isObstructed = obstructionSet.has(tile.id)
    const construction = constructionByTileId.get(tile.id)
    if (construction || (!isObstructed && !canConstructObstruction)) return

    const isTouch =
      event.detail !== 0 && lastPointerTypeRef.current !== 'mouse'
    if (isTouch && touchSelectionId !== tile.id) {
      setTouchSelectionId(tile.id)
      setInspectedTile(tile)
      setIsTouchInspection(true)
      return
    }

    onToggleObstruction(tile.id)
    if (isTouch) setTouchSelectionId(tile.id)
  }

  return (
    <article
      className={`manatee-development-card wetlands-connection-card ${completed ? 'manatee-development-card-complete' : ''}`}
    >
      <header className="manatee-card-heading">
        <div>
          <p className="eyebrow">Contains one Development Goal</p>
          <h3>Wetlands Connection</h3>
        </div>
        <span className="manatee-survey-status" aria-live="polite">
          {completed
            ? `Goal complete · ${result.safeFeedingGroundCount} / ${result.feedingGrounds.length} safe`
            : `${result.safeFeedingGroundCount} / ${result.feedingGrounds.length} safe`}
        </span>
      </header>
      <p className="trade-copy">
        <strong>{goal.name}:</strong> {goal.description}
      </p>
      <p className="wetlands-help-copy">
        <span className="wetlands-desktop-help">
          Hover or focus a tile for its rules. Select a Water tile to construct
          or dismantle a Primitive Obstruction.
        </span>
        <span className="wetlands-mobile-help">
          Tap a tile once to inspect it. Tap the same Water tile again to
          construct or dismantle a Primitive Obstruction.
        </span>
      </p>

      <WetlandsObstructionPanel
        resources={state.resources}
        availableHamsters={availableHamsters}
        availableDivingGear={availableDivingGear}
      />

      <div className="wetlands-rule-strip" aria-label="Wetlands rules">
        <span>
          Safe at{' '}
          <strong>
            ≤{' '}
            <FormattedNumber
              value={WETLANDS_FEEDING_GROUND_SAFE_PPM}
              maximumFractionDigits={0}
            />{' '}
            ppm
          </strong>
        </span>
        <span>
          Obstructed flow weight{' '}
          <strong>×{WETLANDS_OBSTRUCTION_STRENGTH}</strong>
        </span>
        <span>
          Opposing flow <strong>20 / 30 / 30 / 20</strong>
        </span>
      </div>

      <div className="wetlands-board-scroller">
        <div
          className="wetlands-board"
          style={{ '--wetlands-columns': WETLANDS_CONNECTION_COLUMNS }}
          aria-label="Wetlands Connection tile map"
        >
          {WETLANDS_CONNECTION_TILES.map((tile) => (
            <WetlandsTile
              key={tile.id}
              tile={tile}
              result={result}
              isObstructed={obstructionSet.has(tile.id)}
              construction={constructionByTileId.get(tile.id)}
              canConstruct={canConstructObstruction}
              isInspected={inspectedTile?.id === tile.id}
              onInspect={inspectTile}
              onStopInspecting={stopInspecting}
              onPointerPosition={handlePointerPosition}
              onActivate={activateTile}
            />
          ))}
        </div>
      </div>

      <div className="wetlands-feeding-summary">
        {result.feedingGrounds.map((ground, index) => (
          <div
            className={ground.isSafe ? 'is-safe' : 'is-unsafe'}
            key={ground.tileId}
          >
            <span>Feeding Ground {index + 1} · {ground.tileId}</span>
            <strong>
              <FormattedNumber value={ground.ppm} maximumFractionDigits={1} /> ppm
            </strong>
          </div>
        ))}
      </div>

      <div className="wetlands-actions">
        <span>
          {obstructions.length} maintained · {activeConstructions.length} under
          construction ·{' '}
          {(obstructions.length + activeConstructions.length) *
            MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew}{' '}
          hamsters assigned
        </span>
        <button
          type="button"
          className="secondary-button"
          disabled={obstructions.length === 0}
          onClick={() => {
            setTouchSelectionId(null)
            setInspectedTile(null)
            onClearObstructions()
          }}
        >
          Dismantle completed obstructions
        </button>
      </div>

      {inspectedTile ? (
        <aside
          ref={tooltipRef}
          className={`wetlands-tile-tooltip${isTouchInspection ? ' wetlands-tile-tooltip-touch' : ''}`}
          aria-live="polite"
        >
          <TileDetails
            tile={inspectedTile}
            result={result}
            isObstructed={obstructionSet.has(inspectedTile.id)}
            construction={constructionByTileId.get(inspectedTile.id)}
            canConstruct={canConstructObstruction}
            constructionBlockers={constructionBlockers}
            isTouch={isTouchInspection}
          />
        </aside>
      ) : null}
    </article>
  )
}
