import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createInitialGame,
  getCropProductionPerSecond,
  getCropHamsterEfficiencyMultiplier,
  getDiagonalCropIndexes,
  getFieldsPlanted,
  getHamsterCoordinationMultiplier,
  getHamsterExternalMultiplier,
  getHamsterStateAfterHire,
  getMaxHamsterPurchase,
  getNextHamsterCost,
  getProductionForTick,
  getColumnsProducedPerSecond,
  getColumnsProducedForTick,
  SIMULATION_TICK_INTERVAL_MS,
  VISUAL_UPDATE_INTERVAL_MS,
  HIRE_MAX_UNLOCK_COUNT,
  UNIONIZATION_HAMSTER_COUNT,
  UNION_STATUS_RETIRE_HIRE_COUNT,
  INVENTIONS_HAMSTER_UNLOCK_COUNT,
  getBlueprintExpansion,
  getBlueprintExpansionTrackProgress,
  getBlueprintCropStats,
  canUnlockCropPerfection,
  canUnlockRowDuplicators,
  hasReachedMonocropLimit,
  resetForBlueprintExpansion,
  resetForRowDuplicators,
  ROW_DUPLICATORS_UNLOCK_CROP_COUNT,
  unlockCropPerfection,
} from './game/gameLogic'
import {
  CROP_DEFINITIONS,
  CROP_PERFECTIONS,
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CROP_PERFECTION_UNLOCK_CROP_COUNT,
  LENTIL_UNLOCK_CROP_COUNT,
  ROOT_TUNNEL_UNLOCK_CROP_COUNT,
  getCropEffectDescription,
  getCropName,
  getUnlockedCropIds,
  getVisibleCropIds,
  TURNIP_UNLOCK_CROP_COUNT,
} from './game/crops.js'
import { getMonocropThreshold } from './game/monocropPenalty.js'
import { getCachedFormattedNumber } from './game/numberFormat.js'
import { exportGame, importGame, loadGame, saveGame } from './game/storage'
import './App.css'

function FormattedNumber({ value, maximumFractionDigits = 1 }) {
  return getCachedFormattedNumber(value, maximumFractionDigits)
}

function MirrorCornConnectionLines({ blueprint, links, pending = false }) {
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

function getCropMark(crop) {
  return crop ? CROP_DEFINITIONS[crop].icon : null
}

function SignedPercentage({ value }) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''

  return (
    <>{sign}<FormattedNumber value={Math.abs(value) * 100} maximumFractionDigits={1} />%</>
  )
}

function CropHoverInspector({
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
              <><FormattedNumber value={stats.harvestYield} maximumFractionDigits={2} /> Crops</>
            )}
          </dd>
        </div>
        <div>
          <dt>Hamster efficiency</dt>
          <dd><SignedPercentage value={stats.hamsterEfficiencyBonus} /></dd>
        </div>
        {stats.externalCropBuffMultiplier !== null ? (
          <div>
            <dt>External effects</dt>
            <dd>×<FormattedNumber value={stats.externalCropBuffMultiplier} maximumFractionDigits={2} /></dd>
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
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> Crop effects from {effect.count} {getCropName(effect.sourceCropId, completedCropPerfections)}{effect.count === 1 ? '' : 's'}
                </li>
              )
            }

            if (effect.type === 'mirror-corn') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> Crop effects from {effect.count} Mirror Corn{effect.count === 1 ? '' : 's'}
                </li>
              )
            }

            if (effect.type === 'harvest-destruction') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  Harvest destroyed by an adjacent Apple Tree
                </li>
              )
            }

            if (effect.type === 'global-harvest') {
              return (
                <li key={`${effect.type}-${effectIndex}`}>
                  ×<FormattedNumber value={effect.multiplier} maximumFractionDigits={2} /> all Crop harvest from {effect.count} {getCropName(effect.sourceCropId, completedCropPerfections)}{effect.count === 1 ? '' : 's'}
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
                +<FormattedNumber value={effect.bonus} maximumFractionDigits={2} /> Crop yield from {effect.count} {getCropName(effect.sourceCropId, completedCropPerfections)}{effect.count === 1 ? '' : 's'}
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

function App() {
  const [game, setGame] = useState(loadGame)
  const [isEditingBlueprint, setIsEditingBlueprint] = useState(false)
  const gameRef = useRef(game)
  const isEditingBlueprintRef = useRef(isEditingBlueprint)
  const [isUnionConfirmationOpen, setIsUnionConfirmationOpen] = useState(false)
  const [pendingBlueprintExpansionId, setPendingBlueprintExpansionId] = useState(null)
  const [isRowDuplicatorUnlockPending, setIsRowDuplicatorUnlockPending] =
    useState(false)
  const [activeTab, setActiveTab] = useState('field')
  const [activeInventionsTab, setActiveInventionsTab] = useState('blueprint')
  const [selectedCrop, setSelectedCrop] = useState('leek')
  const [cropUnlockNotice, setCropUnlockNotice] = useState(null)
  const [cropUnlockQueue, setCropUnlockQueue] = useState([])
  const [pendingMirrorCornPlacement, setPendingMirrorCornPlacement] =
    useState(null)
  const [hoveredEditorCrop, setHoveredEditorCrop] = useState(null)
  const [observedUnlockedCropIds, setObservedUnlockedCropIds] = useState(() => {
    const initiallyUnlockedCropIds = getUnlockedCropIds(
      game.blueprint,
      game.unionized,
      game.hamsters,
      game.hasUnlockedTurnip,
      game.hasUnlockedAppleTree,
      game.hasUnlockedLentil,
      game.hasUnlockedRootTunnel,
    )

    return getVisibleCropIds(
      initiallyUnlockedCropIds,
      game.totalHamstersHired,
    ).filter((cropId) => initiallyUnlockedCropIds.includes(cropId))
  })
  const [isMonocropWarningOpen, setIsMonocropWarningOpen] = useState(false)
  const [hardResetClicks, setHardResetClicks] = useState(0)
  const [lastHardResetClickAt, setLastHardResetClickAt] = useState(0)
  const [saveCode, setSaveCode] = useState('')
  const [saveTransferStatus, setSaveTransferStatus] = useState(null)

  function updateGame(update) {
    const nextGame = update(gameRef.current)
    gameRef.current = nextGame
    setGame(nextGame)
  }

  function setBlueprintEditing(nextIsEditing) {
    isEditingBlueprintRef.current = nextIsEditing
    setIsEditingBlueprint(nextIsEditing)
  }

  function updateHoveredEditorCrop(index, event) {
    if (!game.blueprint.cells[index]) {
      setHoveredEditorCrop(null)
      return
    }

    setHoveredEditorCrop({
      index,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const nextHamsterCost = useMemo(
    () => getNextHamsterCost(game.hamsters, game.unionized),
    [game.hamsters, game.unionized],
  )
  const formattedTotalHamstersHired = getCachedFormattedNumber(
    game.totalHamstersHired,
    0,
  )
  const productionPerSecond = useMemo(
    () =>
      getCropProductionPerSecond(
        game.blueprint,
        game.farmland,
        game.completedCropPerfections,
      ),
    [game.blueprint, game.farmland, game.completedCropPerfections],
  )
  const cropHamsterEfficiencyMultiplier = useMemo(
    () =>
      getCropHamsterEfficiencyMultiplier(
        game.blueprint,
        game.completedCropPerfections,
      ),
    [game.blueprint, game.completedCropPerfections],
  )
  const hamsterCoordinationMultiplier = useMemo(
    () =>
      getHamsterCoordinationMultiplier(
        game.hamsters,
        game.postUnionHamstersHired,
      ),
    [game.hamsters, game.postUnionHamstersHired],
  )
  const hamsterExternalMultiplier = getHamsterExternalMultiplier()
  const columnsBuiltPerSecond = useMemo(
    () =>
      getColumnsProducedPerSecond(
        game.hamsters,
        game.postUnionHamstersHired,
        cropHamsterEfficiencyMultiplier,
      ),
    [
      game.hamsters,
      game.postUnionHamstersHired,
      cropHamsterEfficiencyMultiplier,
    ],
  )
  const fieldsPlantedPerSecond = useMemo(
    () =>
      columnsBuiltPerSecond *
      (game.farmland.rows +
        (game.hasUnlockedRowDuplicators ? game.farmland.columns : 0)),
    [
      columnsBuiltPerSecond,
      game.farmland.columns,
      game.farmland.rows,
      game.hasUnlockedRowDuplicators,
    ],
  )
  const unlockedCropIds = useMemo(
    () =>
      getUnlockedCropIds(
        game.blueprint,
        game.unionized,
        game.hamsters,
        game.hasUnlockedTurnip,
        game.hasUnlockedAppleTree,
        game.hasUnlockedLentil,
        game.hasUnlockedRootTunnel,
      ),
    [
      game.blueprint,
      game.unionized,
      game.hamsters,
      game.hasUnlockedTurnip,
      game.hasUnlockedAppleTree,
      game.hasUnlockedLentil,
      game.hasUnlockedRootTunnel,
    ],
  )
  const visibleCropIds = useMemo(
    () => getVisibleCropIds(unlockedCropIds, game.totalHamstersHired),
    [unlockedCropIds, game.totalHamstersHired],
  )
  const visibleUnlockedCropIds = useMemo(
    () =>
      visibleCropIds.filter((cropId) => unlockedCropIds.includes(cropId)),
    [visibleCropIds, unlockedCropIds],
  )
  const fieldSize = game.blueprint.rows * game.blueprint.columns
  const monocropThreshold = getMonocropThreshold(fieldSize)
  const showMonocropLimit =
    game.hasSeenMonocropLimit || hasReachedMonocropLimit(game.blueprint)
  const unionStatus =
    game.unionized &&
    game.postUnionHamstersHired >= UNION_STATUS_RETIRE_HIRE_COUNT
      ? null
      : game.unionized
        ? 'Unionized: 900 hamsters left. 100 stayed, and future hiring costs now grow normally.'
        : game.totalHamstersHired >= 500
          ? `Unionization: ${formattedTotalHamstersHired} / ${UNIONIZATION_HAMSTER_COUNT} hamsters. At 1,000, 900 will leave and 100 will remain.`
          : game.totalHamstersHired >= 100
            ? `???: ${formattedTotalHamstersHired} / ${UNIONIZATION_HAMSTER_COUNT}`
            : null
  const canHireMax =
    game.crops >= nextHamsterCost &&
    (game.unionized || game.totalHamstersHired < UNIONIZATION_HAMSTER_COUNT - 1)
  const blueprintExpansionTracks = getBlueprintExpansionTrackProgress(game)
  const pendingBlueprintExpansion = pendingBlueprintExpansionId
    ? getBlueprintExpansion(pendingBlueprintExpansionId)
    : null
  const areInventionsUnlocked =
    game.totalHamstersHired >= INVENTIONS_HAMSTER_UNLOCK_COUNT
  const showInventionsUnlockPrompt =
    areInventionsUnlocked && !game.hasVisitedInventions
  const canUnlockEnrichingLeek = canUnlockCropPerfection(
    game,
    'enrichingLeek',
  )
  const canUnlockMirrorCorn = canUnlockCropPerfection(game, 'mirrorCorn')
  const canUnlockRows = canUnlockRowDuplicators(game)
  const hasEnrichingLeek = game.completedCropPerfections.includes(
    'enrichingLeek',
  )
  const hasMirrorCorn = game.completedCropPerfections.includes('mirrorCorn')
  const mirrorCornLinks = hasMirrorCorn
    ? (game.blueprint.mirrorCornTargets ?? []).flatMap(
        (targetIndex, sourceIndex) =>
          targetIndex !== null && game.blueprint.cells[sourceIndex] === 'corn'
            ? [{ sourceIndex, targetIndex }]
            : [],
      )
    : []
  const pendingMirrorCornLinks = pendingMirrorCornPlacement
    ? pendingMirrorCornPlacement.targetIndexes.map((targetIndex) => ({
        sourceIndex: pendingMirrorCornPlacement.sourceIndex,
        targetIndex,
      }))
    : []

  useEffect(() => {
    saveGame(game)
  }, [game])

  useEffect(() => {
    if (!cropUnlockNotice) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setCropUnlockNotice(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [cropUnlockNotice])

  useEffect(() => {
    if (cropUnlockNotice || cropUnlockQueue.length === 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      const [nextNotice, ...remainingNotices] = cropUnlockQueue
      setCropUnlockNotice(nextNotice)
      setCropUnlockQueue(remainingNotices)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [cropUnlockNotice, cropUnlockQueue])

  useEffect(() => {
    const currentUnlockedCropIds = visibleUnlockedCropIds
    const retainedObservedCropIds = observedUnlockedCropIds.filter((cropId) =>
      currentUnlockedCropIds.includes(cropId),
    )
    const newCropIds = currentUnlockedCropIds.filter(
      (cropId) =>
        cropId !== 'leek' && !retainedObservedCropIds.includes(cropId),
    )

    const needsObservationUpdate =
      newCropIds.length > 0 ||
      retainedObservedCropIds.length !== observedUnlockedCropIds.length

    if (!needsObservationUpdate) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      if (newCropIds.length > 0) {
        setCropUnlockQueue((currentQueue) => [
          ...currentQueue,
          ...newCropIds.map((cropId) => ({
            crop: CROP_DEFINITIONS[cropId].name,
            message: CROP_DEFINITIONS[cropId].effectDescription,
          })),
        ])
      }

      setObservedUnlockedCropIds(currentUnlockedCropIds)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [observedUnlockedCropIds, visibleUnlockedCropIds])

  useEffect(() => {
    if (hardResetClicks === 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setHardResetClicks(0)
      setLastHardResetClickAt(0)
    }, 4000)
    return () => window.clearTimeout(timeoutId)
  }, [hardResetClicks, lastHardResetClickAt])

  useEffect(() => {
    let simulationTimeoutId
    let visualTimeoutId
    let isActive = true

    const runSimulationTick = () => {
      if (!isActive) {
        return
      }

      if (!isEditingBlueprintRef.current) {
        const currentGame = gameRef.current
        const nextCrops =
          currentGame.crops +
          getProductionForTick(
            currentGame.blueprint,
            currentGame.farmland,
            currentGame.completedCropPerfections,
          )
        const columnsProducedForTick = getColumnsProducedForTick(
          currentGame.hamsters,
          currentGame.postUnionHamstersHired,
          getCropHamsterEfficiencyMultiplier(
            currentGame.blueprint,
            currentGame.completedCropPerfections,
          ),
        )

        gameRef.current = {
          ...currentGame,
          crops: nextCrops,
          hasUnlockedTurnip:
            currentGame.hasUnlockedTurnip ||
            nextCrops >= TURNIP_UNLOCK_CROP_COUNT,
          hasUnlockedAppleTree:
            currentGame.hasUnlockedAppleTree ||
            nextCrops >= APPLE_TREE_UNLOCK_CROP_COUNT,
          hasUnlockedLentil:
            currentGame.hasUnlockedLentil || nextCrops >= LENTIL_UNLOCK_CROP_COUNT,
          hasUnlockedRootTunnel:
            currentGame.hasUnlockedRootTunnel ||
            nextCrops >= ROOT_TUNNEL_UNLOCK_CROP_COUNT,
          hasUnlockedCropPerfection:
            currentGame.hasUnlockedCropPerfection ||
            nextCrops >= CROP_PERFECTION_UNLOCK_CROP_COUNT,
          farmland: {
            ...currentGame.farmland,
            columns:
              currentGame.farmland.columns + columnsProducedForTick,
            rows: currentGame.hasUnlockedRowDuplicators
              ? currentGame.farmland.rows + columnsProducedForTick
              : currentGame.farmland.rows,
          },
        }
      }

      simulationTimeoutId = window.setTimeout(
        runSimulationTick,
        SIMULATION_TICK_INTERVAL_MS,
      )
    }

    const publishVisualUpdate = () => {
      if (!isActive) {
        return
      }

      setGame((currentGame) =>
        currentGame === gameRef.current ? currentGame : gameRef.current,
      )
      visualTimeoutId = window.setTimeout(
        publishVisualUpdate,
        VISUAL_UPDATE_INTERVAL_MS,
      )
    }

    simulationTimeoutId = window.setTimeout(
      runSimulationTick,
      SIMULATION_TICK_INTERVAL_MS,
    )
    visualTimeoutId = window.setTimeout(
      publishVisualUpdate,
      VISUAL_UPDATE_INTERVAL_MS,
    )

    return () => {
      isActive = false
      window.clearTimeout(simulationTimeoutId)
      window.clearTimeout(visualTimeoutId)
    }
  }, [])

  function completeHamsterHire() {
    updateGame((currentGame) => {
      const currentCost = getNextHamsterCost(
        currentGame.hamsters,
        currentGame.unionized,
      )
      if (currentGame.crops < currentCost) {
        return currentGame
      }

      const nextHamsterState = getHamsterStateAfterHire(currentGame)

      return {
        ...currentGame,
        crops: currentGame.crops - currentCost,
        ...nextHamsterState,
      }
    })
  }

  function buyHamster() {
    const currentGame = gameRef.current
    const currentHamsterCost = getNextHamsterCost(
      currentGame.hamsters,
      currentGame.unionized,
    )

    if (currentGame.crops < currentHamsterCost) {
      return
    }

    if (
      !currentGame.unionized &&
      currentGame.totalHamstersHired >= UNIONIZATION_HAMSTER_COUNT - 1
    ) {
      setIsUnionConfirmationOpen(true)
      return
    }

    completeHamsterHire()
  }

  function buyMaxHamsters() {
    updateGame((currentGame) => {
      const { purchased, ...nextGame } = getMaxHamsterPurchase(currentGame)

      return purchased > 0 ? { ...currentGame, ...nextGame } : currentGame
    })
  }

  function confirmUnionization() {
    completeHamsterHire()
    setIsUnionConfirmationOpen(false)
  }

  function setPlot(index, crop, mirrorCornTargetIndex = null) {
    if (crop !== null && !unlockedCropIds.includes(crop)) {
      return
    }

    const currentGame = gameRef.current

    const nextBlueprint = {
      ...currentGame.blueprint,
      cells: currentGame.blueprint.cells.map((cell, cellIndex) =>
        cellIndex === index ? crop : cell,
      ),
      mirrorCornTargets: (currentGame.blueprint.mirrorCornTargets ?? []).map(
        (targetIndex, sourceIndex) => {
          if (sourceIndex === index) {
            return crop === 'corn' ? mirrorCornTargetIndex : null
          }
          return targetIndex === index ? null : targetIndex
        },
      ),
    }
    const hasReachedLimit = hasReachedMonocropLimit(nextBlueprint)
    const hasJustReachedLimit =
      !currentGame.hasSeenMonocropLimit &&
      !hasReachedMonocropLimit(currentGame.blueprint) &&
      hasReachedLimit

    updateGame(() => ({
      ...currentGame,
      blueprint: nextBlueprint,
      hasSeenMonocropLimit:
        currentGame.hasSeenMonocropLimit || hasReachedLimit,
    }))

    if (hasJustReachedLimit) {
      setIsMonocropWarningOpen(true)
    }
  }

  function handleEditorPlotClick(index, crop) {
    if (pendingMirrorCornPlacement) {
      if (index === pendingMirrorCornPlacement.sourceIndex) {
        setPendingMirrorCornPlacement(null)
        return
      }
      if (pendingMirrorCornPlacement.targetIndexes.includes(index)) {
        setPlot(
          pendingMirrorCornPlacement.sourceIndex,
          'corn',
          index,
        )
        setPendingMirrorCornPlacement(null)
      }
      return
    }

    const nextCrop = crop === selectedCrop ? null : selectedCrop

    if (nextCrop === 'corn' && hasMirrorCorn) {
      const targetIndexes = getDiagonalCropIndexes(game.blueprint, index)

      if (targetIndexes.length > 0) {
        setPendingMirrorCornPlacement({ sourceIndex: index, targetIndexes })
        return
      }
    }

    setPlot(index, nextCrop)
  }

  function confirmBlueprintExpansionReset() {
    if (!pendingBlueprintExpansionId) {
      return
    }

    updateGame((currentGame) => {
      const resetGame = resetForBlueprintExpansion(
        currentGame,
        pendingBlueprintExpansionId,
      )
      return resetGame ?? currentGame
    })
    setPendingBlueprintExpansionId(null)
    setActiveTab('field')
  }

  function confirmRowDuplicatorReset() {
    updateGame((currentGame) => {
      const resetGame = resetForRowDuplicators(currentGame)
      return resetGame ?? currentGame
    })
    setIsRowDuplicatorUnlockPending(false)
    setActiveTab('field')
  }

  function unlockEnrichingLeek() {
    updateGame((currentGame) => {
      const nextGame = unlockCropPerfection(currentGame, 'enrichingLeek')
      return nextGame ?? currentGame
    })
  }

  function unlockMirrorCorn() {
    updateGame((currentGame) => {
      const nextGame = unlockCropPerfection(currentGame, 'mirrorCorn')
      return nextGame ?? currentGame
    })
  }

  function handleHardReset(event) {
    const now = event.timeStamp
    const isWithinResetWindow = now - lastHardResetClickAt <= 4000
    const nextClickCount = isWithinResetWindow ? hardResetClicks + 1 : 1

    if (nextClickCount >= 5) {
      updateGame(() => createInitialGame())
      setActiveTab('field')
      setActiveInventionsTab('blueprint')
      setSelectedCrop('leek')
      setCropUnlockNotice(null)
      setCropUnlockQueue([])
      setHardResetClicks(0)
      setLastHardResetClickAt(0)
      return
    }

    setHardResetClicks(nextClickCount)
    setLastHardResetClickAt(now)
  }

  function openOptions() {
    setHardResetClicks(0)
    setLastHardResetClickAt(0)
    setSaveTransferStatus(null)
    setActiveTab('options')
  }

  async function exportSave() {
    const nextSaveCode = exportGame(gameRef.current)
    setSaveCode(nextSaveCode)

    try {
      await navigator.clipboard.writeText(nextSaveCode)
      setSaveTransferStatus({
        type: 'success',
        message: 'Save code copied to your clipboard.',
      })
    } catch {
      setSaveTransferStatus({
        type: 'success',
        message: 'Save code is ready below. Copy it somewhere safe.',
      })
    }
  }

  function importSave() {
    try {
      const importedGame = importGame(saveCode)

      gameRef.current = importedGame
      setGame(importedGame)
      setIsEditingBlueprint(false)
      setIsUnionConfirmationOpen(false)
      setPendingBlueprintExpansionId(null)
      setIsRowDuplicatorUnlockPending(false)
      setPendingMirrorCornPlacement(null)
      setHoveredEditorCrop(null)
      setSelectedCrop('leek')
      setSaveCode('')
      setSaveTransferStatus({
        type: 'success',
        message: 'Save imported. Your local progress has been replaced.',
      })
    } catch (error) {
      setSaveTransferStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The save code could not be imported.',
      })
    }
  }

  function openInventions() {
    if (!areInventionsUnlocked) {
      return
    }

    updateGame((currentGame) => ({
      ...currentGame,
      hasVisitedInventions: true,
    }))
    setActiveTab('inventions')
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Hamster Cloners home">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span>Hamster Cloners</span>
        </a>
        <span className="save-status">Saved locally</span>
      </header>

      <nav className="game-tabs" aria-label="Game sections">
        <button
          type="button"
          className={`game-tab ${activeTab === 'field' ? 'game-tab-active' : ''}`}
          onClick={() => setActiveTab('field')}
        >
          Field
        </button>
        <div className="inventions-tab-wrap">
          <button
            type="button"
            className={`game-tab ${activeTab === 'inventions' ? 'game-tab-active' : ''}`}
            onClick={openInventions}
            disabled={!areInventionsUnlocked}
            title={
              areInventionsUnlocked
                ? 'View inventions'
                : `Unlocks after ${INVENTIONS_HAMSTER_UNLOCK_COUNT} Hamsters`
            }
          >
            Inventions
          </button>
          {showInventionsUnlockPrompt ? (
            <aside className="inventions-unlock-callout" role="status" aria-live="polite">
              <strong>Inventions unlocked!</strong>
              <span>Visit this tab to discover your first milestone reset.</span>
            </aside>
          ) : null}
        </div>
        <span className="game-tab" aria-disabled="true">Statistics</span>
        <button
          type="button"
          className={`game-tab ${activeTab === 'options' ? 'game-tab-active' : ''}`}
          onClick={openOptions}
        >
          Options
        </button>
      </nav>

      {activeTab === 'field' ? (
        <>
      <section className="hero-panel" id="main" aria-labelledby="game-title">
        <div>
          <p className="eyebrow">Current crop total</p>
          <h1 id="game-title"><FormattedNumber value={game.crops} /> Crops</h1>
          <p className="hero-copy">
            You are gaining <FormattedNumber value={productionPerSecond} /> Crops per second.
          </p>
        </div>
      </section>

      <section className="game-grid" aria-label="Farm controls">
        <article className="field-card">
          <div className="section-heading blueprint-heading">
            <div>
              <p className="eyebrow">Blueprint</p>
              <h2>Your clonable field</h2>
            </div>
            {showMonocropLimit ? (
              <span className="monocrop-pill">
                <span>Monocrop limit</span>
                <strong><FormattedNumber value={monocropThreshold} /> plots</strong>
              </span>
            ) : null}
            <span className="size-pill">{game.blueprint.rows} × {game.blueprint.columns}</span>
          </div>

          <button
            type="button"
            className="blueprint-preview"
            onClick={() => {
              setHoveredEditorCrop(null)
              setBlueprintEditing(true)
            }}
            aria-label="Open the blueprint editor"
          >
            <span
              className="field-grid"
              style={{ gridTemplateColumns: `repeat(${game.blueprint.columns}, minmax(54px, 1fr))` }}
            >
              {game.blueprint.cells.map((crop, index) => (
                <span className={`plot ${crop ? `plot-${crop}` : ''}`} key={index}>
                  {crop ? <span aria-hidden="true">{getCropMark(crop)}</span> : null}
                </span>
              ))}
            </span>
            <span className="edit-hint">Click field to edit blueprint</span>
          </button>

          <dl className="field-stats">
            <div>
              <dt>Fields planted</dt>
              <dd><FormattedNumber value={getFieldsPlanted(game.farmland)} maximumFractionDigits={2} /></dd>
            </div>
            {game.hasUnlockedRowDuplicators ? (
              <>
                <div>
                  <dt>Columns built</dt>
                  <dd><FormattedNumber value={game.farmland.columns} maximumFractionDigits={2} /></dd>
                </div>
                <div>
                  <dt>Rows built</dt>
                  <dd><FormattedNumber value={game.farmland.rows} maximumFractionDigits={2} /></dd>
                </div>
              </>
            ) : null}
          </dl>
        </article>

        <article className="replicator-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Workforce</p>
              <h2>Hamster Replicators</h2>
            </div>
            <span className="hamster-badge" aria-label={`${game.hamsters} hamster replicators`}>
              {game.hamsters}
            </span>
          </div>
          <p className="card-copy">
            {game.unionized
              ? game.postUnionHamstersHired >= UNION_STATUS_RETIRE_HIRE_COUNT
                ? 'The hamster workforce is working at an established pace.'
                : game.postUnionHamstersHired > 0
                  ? 'A post-union hire has enabled a compounded 3% Hamster Efficiency bonus per active hamster.'
                  : 'The 100 remaining hamsters are working normally. Hire a post-union hamster to activate their compounded Hamster Efficiency bonus.'
              : 'Every trained hamster tends the field. The hiring cost rises by 1 Crop... for now.'}
          </p>
          {unionStatus ? (
            <p className={`union-status ${game.unionized ? 'union-status-complete' : ''}`}>
              {unionStatus}
            </p>
          ) : null}
          <dl className="replicator-stats">
            <div>
              <dt>Fields planted / sec</dt>
              <dd><FormattedNumber value={fieldsPlantedPerSecond} maximumFractionDigits={2} /></dd>
            </div>
            <div>
              <dt>Hamster coordination</dt>
              <dd>×<FormattedNumber value={hamsterCoordinationMultiplier} maximumFractionDigits={2} /></dd>
            </div>
            <div>
              <dt>Field efficiency</dt>
              <dd>×<FormattedNumber value={cropHamsterEfficiencyMultiplier} maximumFractionDigits={2} /></dd>
            </div>
            <div>
              <dt>External multipliers</dt>
              <dd>×<FormattedNumber value={hamsterExternalMultiplier} maximumFractionDigits={2} /></dd>
            </div>
          </dl>
          <div className="replicator-summary next-lesson">
            <span>Next lesson</span>
            <strong><FormattedNumber value={nextHamsterCost} maximumFractionDigits={0} /> Crops</strong>
          </div>
          <div className="hire-actions">
            <button
              type="button"
              className="primary-button"
              onClick={buyHamster}
              disabled={game.crops < nextHamsterCost}
            >
              Hire &amp; teach hamster
            </button>
            {game.totalHamstersHired >= HIRE_MAX_UNLOCK_COUNT ? (
              <button
                type="button"
                className="secondary-button"
                onClick={buyMaxHamsters}
                disabled={!canHireMax}
              >
                Hire max
              </button>
            ) : null}
          </div>
          <p className="affordability" aria-live="polite">
            {game.crops >= nextHamsterCost
              ? 'Ready for a new recruit.'
              : <><FormattedNumber value={nextHamsterCost - game.crops} /> more Crops needed.</>}
          </p>
        </article>
      </section>
        </>
      ) : activeTab === 'inventions' ? (
        <section className="inventions-panel" aria-labelledby="inventions-title">
          <p className="eyebrow">Milestone inventions</p>
          <h1 id="inventions-title">Inventions</h1>
          <p className="inventions-intro">
            Reach a listed threshold, reset the current field, and unlock exactly
            what the invention advertises.
          </p>
          {game.hasUnlockedCropPerfection ? (
            <nav className="invention-tabs" aria-label="Invention categories">
              <button
                type="button"
                className={`invention-tab ${activeInventionsTab === 'blueprint' ? 'invention-tab-active' : ''}`}
                onClick={() => setActiveInventionsTab('blueprint')}
              >
                Blueprint
              </button>
              <button
                type="button"
                className={`invention-tab ${activeInventionsTab === 'cropPerfection' ? 'invention-tab-active' : ''}`}
                onClick={() => setActiveInventionsTab('cropPerfection')}
              >
                Crop Perfection
              </button>
            </nav>
          ) : null}
          {activeInventionsTab === 'cropPerfection' &&
          game.hasUnlockedCropPerfection ? (
            <section aria-labelledby="crop-perfection-title">
              <p className="eyebrow">Crop perfection</p>
              <h2 id="crop-perfection-title">Permanent crop refinements</h2>
              <article className="invention-card crop-perfection-card">
                <div>
                  <p className="eyebrow">Leek perfection</p>
                  <h2>
                    {hasEnrichingLeek
                      ? CROP_PERFECTIONS.enrichingLeek.name
                      : 'Enriching Leek'}
                  </h2>
                  <p>
                    Rename Leek to Enriching Leek and grant +5 Crop yield to
                    adjacent crops.
                  </p>
                </div>
                {hasEnrichingLeek ? (
                  <span className="invention-complete">Perfected</span>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={unlockEnrichingLeek}
                    disabled={!canUnlockEnrichingLeek}
                  >
                    Spend <FormattedNumber value={CROP_PERFECTIONS.enrichingLeek.cost} maximumFractionDigits={0} />
                    {' '}Crops
                  </button>
                )}
              </article>
              {!hasEnrichingLeek ? (
                <p className="invention-progress">
                  <FormattedNumber
                    value={Math.min(game.crops, CROP_PERFECTIONS.enrichingLeek.cost)}
                    maximumFractionDigits={0}
                  />{' '}
                  / <FormattedNumber value={CROP_PERFECTIONS.enrichingLeek.cost} maximumFractionDigits={0} /> Crops
                </p>
              ) : null}
              <article className="invention-card crop-perfection-card">
                <div>
                  <p className="eyebrow">Corn perfection</p>
                  <h2>{CROP_PERFECTIONS.mirrorCorn.name}</h2>
                  <p>
                    Harvest 5 Crops, apply −50% Hamster Efficiency, and boost
                    one diagonally selected crop effect by 100%.
                  </p>
                </div>
                {hasMirrorCorn ? (
                  <span className="invention-complete">Perfected</span>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={unlockMirrorCorn}
                    disabled={!canUnlockMirrorCorn}
                  >
                    Spend <FormattedNumber value={CROP_PERFECTIONS.mirrorCorn.cost} maximumFractionDigits={0} />
                    {' '}Crops
                  </button>
                )}
              </article>
              {!hasMirrorCorn ? (
                <p className="invention-progress">
                  <FormattedNumber
                    value={Math.min(game.crops, CROP_PERFECTIONS.mirrorCorn.cost)}
                    maximumFractionDigits={0}
                  />{' '}
                  / <FormattedNumber value={CROP_PERFECTIONS.mirrorCorn.cost} maximumFractionDigits={0} /> Crops
                </p>
              ) : null}
            </section>
          ) : (
            <>
            <article className="invention-card row-duplicator-card">
              <div>
                <p className="eyebrow">Milestone invention</p>
                <h2>Row Duplicators</h2>
                <p>
                  Reset at <FormattedNumber value={ROW_DUPLICATORS_UNLOCK_CROP_COUNT} maximumFractionDigits={0} /> Crops to make every hamster-built Column also build one Row.
                </p>
              </div>
              {game.hasUnlockedRowDuplicators ? (
                <span className="invention-complete">Complete</span>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIsRowDuplicatorUnlockPending(true)}
                  disabled={!canUnlockRows}
                >
                  Reset field &amp; unlock
                </button>
              )}
            </article>
            {!game.hasUnlockedRowDuplicators ? (
              <p className="invention-progress">
                <FormattedNumber
                  value={Math.min(game.crops, ROW_DUPLICATORS_UNLOCK_CROP_COUNT)}
                  maximumFractionDigits={0}
                />{' '}
                / <FormattedNumber value={ROW_DUPLICATORS_UNLOCK_CROP_COUNT} maximumFractionDigits={0} /> Crops
              </p>
            ) : null}
            {blueprintExpansionTracks.map((track) => {
            const { nextExpansion } = track
            const completed = nextExpansion === undefined
            const canUnlock =
              nextExpansion !== undefined &&
              track.nextCost !== null &&
              game.crops >= track.nextCost

            return (
              <div key={track.id}>
                <article className="invention-card">
                  <div>
                    <p className="eyebrow">
                      Progressive milestone · {track.completedStageCount} /{' '}
                      {track.stages.length} unlocked
                    </p>
                    <h2>{track.title}</h2>
                    {completed ? (
                      <p>All available stages in this expansion track are unlocked.</p>
                    ) : track.nextCost === null ? (
                      <p>
                        The next stage costs <FormattedNumber value={nextExpansion.cost} maximumFractionDigits={0} />
                        {' '}Crops. Complete its prerequisite expansion first.
                      </p>
                    ) : (
                      <p>
                        Reset at <FormattedNumber value={nextExpansion.cost} maximumFractionDigits={0} /> Crops to{' '}
                        {nextExpansion.rewardDescription}.
                      </p>
                    )}
                  </div>
                  {completed ? (
                    <span className="invention-complete">Complete</span>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setPendingBlueprintExpansionId(nextExpansion.id)}
                      disabled={!canUnlock}
                    >
                      Reset field &amp; unlock
                    </button>
                  )}
                </article>
                {!completed ? (
                  <p className="invention-progress">
                    <FormattedNumber value={Math.min(game.crops, nextExpansion.cost)} maximumFractionDigits={0} /> /{' '}
                    <FormattedNumber value={nextExpansion.cost} maximumFractionDigits={0} /> Crops
                  </p>
                ) : null}
              </div>
            )
            })}
            </>
          )}
        </section>
      ) : (
        <section className="inventions-panel options-panel" aria-labelledby="options-title">
          <p className="eyebrow">Game options</p>
          <h1 id="options-title">Options</h1>
          <article className="invention-card save-transfer-card">
            <div>
              <p className="eyebrow">Save transfer</p>
              <h2>Export or import save data</h2>
              <p>
                Your progress is stored locally as a Base64 save code. Export it
                before changing browsers or devices; importing replaces this
                browser&apos;s current progress.
              </p>
            </div>
            <div className="save-transfer-controls">
              <button
                type="button"
                className="primary-button"
                onClick={exportSave}
              >
                Export save
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={importSave}
                disabled={!saveCode.trim()}
              >
                Import save
              </button>
            </div>
            <label className="save-code-label" htmlFor="save-code">
              Save code
              <textarea
                id="save-code"
                className="save-code-input"
                value={saveCode}
                onChange={(event) => setSaveCode(event.target.value)}
                placeholder="Export a save or paste a Base64 save code here"
                spellCheck="false"
              />
            </label>
            {saveTransferStatus ? (
              <p
                className={`save-transfer-status save-transfer-status-${saveTransferStatus.type}`}
                role="status"
              >
                {saveTransferStatus.message}
              </p>
            ) : null}
          </article>
          <article className="invention-card hard-reset-card">
            <div>
              <p className="eyebrow">Irreversible</p>
              <h2>Hard Reset</h2>
              <p>
                Completely erase all local progress and return to the beginning.
                This has no reward.
              </p>
            </div>
            <button
              type="button"
              className="hard-reset-button"
              onClick={handleHardReset}
            >
              {hardResetClicks === 0
                ? 'Hard reset'
                : `Hard reset — click 5 times within 4 seconds (${hardResetClicks}/5)`}
            </button>
          </article>
        </section>
      )}

      {isEditingBlueprint ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="blueprint-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Blueprint editor</p>
                <h2 id="editor-title">Place your Crops</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setBlueprintEditing(false)
                  setPendingMirrorCornPlacement(null)
                  setHoveredEditorCrop(null)
                }}
                aria-label="Close blueprint editor"
              >
                ×
              </button>
            </div>

            <p className="editing-notice">
              Harvesting is paused while you modify this blueprint.
            </p>

            {pendingMirrorCornPlacement ? (
              <p className="mirror-corn-notice">
                Choose one yellow-lined diagonal crop to boost. Click the pending
                Mirror Corn tile again to cancel.
              </p>
            ) : hasMirrorCorn && selectedCrop === 'corn' ? (
              <p className="mirror-corn-notice">
                Place Mirror Corn beside a diagonally adjacent planted crop, then
                choose the crop to boost.
              </p>
            ) : null}

            <div className="blueprint-editor-layout">
              <div className="editor-grid-wrapper">
                <MirrorCornConnectionLines
                  blueprint={game.blueprint}
                  links={mirrorCornLinks}
                />
                <MirrorCornConnectionLines
                  blueprint={game.blueprint}
                  links={pendingMirrorCornLinks}
                  pending
                />
                <div
                  className="editor-grid"
                  style={{ gridTemplateColumns: `repeat(${game.blueprint.columns}, minmax(64px, 1fr))` }}
                >
                  {game.blueprint.cells.map((crop, index) => {
                    const isPendingMirrorCornSource =
                      pendingMirrorCornPlacement?.sourceIndex === index
                    const isPendingMirrorCornTarget =
                      pendingMirrorCornPlacement?.targetIndexes.includes(index)

                    return (
                      <button
                        type="button"
                        className={`editor-plot ${crop ? `editor-plot-${crop}` : ''} ${isPendingMirrorCornSource ? 'editor-plot-mirror-source' : ''} ${isPendingMirrorCornTarget ? 'editor-plot-mirror-target' : ''}`}
                        key={index}
                        onClick={() => handleEditorPlotClick(index, crop)}
                        onPointerEnter={(event) => updateHoveredEditorCrop(index, event)}
                        onPointerMove={(event) => updateHoveredEditorCrop(index, event)}
                        onPointerLeave={() => setHoveredEditorCrop(null)}
                        onFocus={(event) => {
                          if (!crop) {
                            return
                          }

                          const bounds = event.currentTarget.getBoundingClientRect()
                          setHoveredEditorCrop({
                            index,
                            x: bounds.right,
                            y: bounds.top,
                          })
                        }}
                        onBlur={() => setHoveredEditorCrop(null)}
                        aria-label={
                          isPendingMirrorCornTarget
                            ? `Boost ${getCropName(crop, game.completedCropPerfections)} with Mirror Corn`
                            : crop === selectedCrop
                              ? `Remove ${getCropName(crop, game.completedCropPerfections)} from plot`
                              : `Plant ${getCropName(selectedCrop, game.completedCropPerfections)} in plot`
                        }
                      >
                        {crop ? <span aria-hidden="true">{getCropMark(crop)}</span> : <span>Plant</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="crop-palette" aria-label="Crop selection">
                <p className="eyebrow">Selected crop</p>
                <div className="crop-options">
                  {visibleCropIds.map((cropId) => {
                    const crop = CROP_DEFINITIONS[cropId]
                    const unlocked = unlockedCropIds.includes(cropId)

                    return (
                      <button
                        type="button"
                        className={`crop-option ${selectedCrop === cropId ? 'crop-option-selected' : ''}`}
                        key={cropId}
                        onClick={() => {
                          setSelectedCrop(cropId)
                          setPendingMirrorCornPlacement(null)
                        }}
                        disabled={!unlocked}
                      >
                        <span className="crop-option-name">
                          <span className="crop-option-icon" aria-hidden="true">
                            {crop.icon}
                          </span>
                          {getCropName(cropId, game.completedCropPerfections)}
                        </span>
                        <small>
                          {unlocked
                            ? getCropEffectDescription(
                                cropId,
                                game.completedCropPerfections,
                              )
                            : crop.unlockDescription}
                        </small>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {hoveredEditorCrop ? (
              <CropHoverInspector
                blueprint={game.blueprint}
                index={hoveredEditorCrop.index}
                completedCropPerfections={game.completedCropPerfections}
                cursor={hoveredEditorCrop}
              />
            ) : null}

            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setBlueprintEditing(false)
                  setPendingMirrorCornPlacement(null)
                  setHoveredEditorCrop(null)
                }}
              >
                Resume harvest
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isMonocropWarningOpen ? (
        <div className="modal-backdrop monocrop-warning-backdrop" role="presentation">
          <section
            className="monocrop-warning-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="monocrop-warning-title"
          >
            <p className="eyebrow">Field warning</p>
            <h2 id="monocrop-warning-title">Monocrop limit reached</h2>
            <p>
              One crop has reached the monocrop limit for this field, reducing
              its yield.
            </p>
            <p>
              The penalty also weakens positive crop buffs and makes crop debuffs
              stronger. Mix in other crops to keep your field productive.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setIsMonocropWarningOpen(false)}
            >
              Got it
            </button>
          </section>
        </div>
      ) : null}

      {isUnionConfirmationOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="union-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="union-title"
          >
            <p className="eyebrow">A workforce decision</p>
            <h2 id="union-title">The hamsters are ready to unionize.</h2>
            <p>
              Hiring this 1,000th hamster will cause 900 hamsters to leave. The
              100 who remain will continue working, but future hires must follow
              the union&apos;s growing hiring costs.
            </p>
            <p>
              Once you make a post-union hire, the organized workforce may find
              a faster way to work.
            </p>
            <div className="union-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsUnionConfirmationOpen(false)}
              >
                Not yet
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmUnionization}
              >
                Comply &amp; hire the 1,000th
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingBlueprintExpansion ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="union-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="blueprint-reset-title"
          >
            <p className="eyebrow">Milestone reset</p>
            <h2 id="blueprint-reset-title">Unlock {pendingBlueprintExpansion.title}?</h2>
            <p>
              This spends your current Crops and resets accumulated Columns to zero.
              Your hamster workforce stays, ready to rebuild the field.
            </p>
            <p>You will permanently {pendingBlueprintExpansion.rewardDescription}.</p>
            <div className="union-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingBlueprintExpansionId(null)}
              >
                Not yet
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmBlueprintExpansionReset}
              >
                Reset &amp; unlock
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isRowDuplicatorUnlockPending ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="union-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="row-duplicator-reset-title"
          >
            <p className="eyebrow">Milestone reset</p>
            <h2 id="row-duplicator-reset-title">Unlock Row Duplicators?</h2>
            <p>
              This spends your current Crops and resets accumulated Rows and
              Columns to zero. Your hamster workforce stays ready to rebuild.
            </p>
            <p>
              Every future hamster-built Column will also build one Row.
            </p>
            <div className="union-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsRowDuplicatorUnlockPending(false)}
              >
                Not yet
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmRowDuplicatorReset}
              >
                Reset &amp; unlock
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {cropUnlockNotice ? (
        <aside className="crop-unlock-toast" role="status" aria-live="polite">
          <span className="crop-unlock-label">New crop unlocked</span>
          <strong>{cropUnlockNotice.crop}</strong>
          <span>{cropUnlockNotice.message}</span>
        </aside>
      ) : null}
    </main>
  )
}

export default App
