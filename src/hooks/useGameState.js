import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ACTIVE_SIMULATION_STEP_SECONDS,
  advanceGameByElapsedTime,
  CATCH_UP_COMPRESSION_FACTOR,
  getSimulationStepCount,
} from '../game/gameSimulation.js'
import {
  AUTOSAVE_INTERVAL_MS,
  SIMULATION_TICK_INTERVAL_MS,
  VISUAL_UPDATE_INTERVAL_MS,
} from '../game/gameConfig.js'
import { loadGameSnapshot, saveGame } from '../game/storage.js'
import { setActiveNumberNotation } from '../game/numberFormat.js'
import { shareUnchangedStructure } from '../game/structuralSharing.js'

const ACTIVE_CATCH_UP_LIMIT_SECONDS = 1

function getAdvanceMode(elapsedSeconds) {
  return elapsedSeconds <= ACTIVE_CATCH_UP_LIMIT_SECONDS
    ? 'active'
    : 'catch-up'
}

function createPendingCatchUp(savedAt, now = Date.now()) {
  const elapsedSeconds = Math.max(0, (now - savedAt) / 1000)
  const estimatedTicks = Math.max(
    1,
    getSimulationStepCount(elapsedSeconds, 'catch-up'),
  )

  return {
    ticksRemaining: estimatedTicks,
    initialTicks: estimatedTicks,
    remainingSeconds: elapsedSeconds,
    totalSeconds: elapsedSeconds,
    compressionMultiplier: CATCH_UP_COMPRESSION_FACTOR,
    strategy: 'compressed',
    isPreparing: true,
  }
}

export function useGameState(isEditingBlueprintRef) {
  const [initialSnapshot] = useState(() => {
    const snapshot = loadGameSnapshot()
    setActiveNumberNotation(
      snapshot.game.numberNotation,
      snapshot.game.suffixScientificExponent,
    )
    return snapshot
  })
  const [game, setRenderedGame] = useState(initialSnapshot.game)
  const [lastSavedAt, setLastSavedAt] = useState(
    initialSnapshot.lastSavedAt,
  )
  const [backgroundCatchUp, setBackgroundCatchUp] = useState(() =>
    createPendingCatchUp(initialSnapshot.savedAt),
  )
  const [isGameReady, setIsGameReady] = useState(false)
  const gameRef = useRef(initialSnapshot.game)
  const workerRef = useRef(null)
  const revisionRef = useRef(0)
  const simulatedAtRef = useRef(initialSnapshot.savedAt)

  function advanceCurrentGameTo(
    targetTimestamp,
    isEditingBlueprint = isEditingBlueprintRef.current,
  ) {
    const elapsedSeconds = Math.max(
      0,
      (targetTimestamp - simulatedAtRef.current) / 1000,
    )

    if (elapsedSeconds > 0) {
      gameRef.current = advanceGameByElapsedTime(
        gameRef.current,
        elapsedSeconds,
        {
          mode: getAdvanceMode(elapsedSeconds),
          isEditingBlueprint,
        },
      )
      simulatedAtRef.current = targetTimestamp
    }

    return gameRef.current
  }

  function commitGame(
    nextGame,
    {
      simulatedAt = Date.now(),
      isEditingBlueprint = isEditingBlueprintRef.current,
      visible = !document.hidden,
    } = {},
  ) {
    revisionRef.current += 1
    gameRef.current = nextGame
    simulatedAtRef.current = simulatedAt
    setActiveNumberNotation(
      nextGame.numberNotation,
      nextGame.suffixScientificExponent,
    )
    setRenderedGame(nextGame)
    setBackgroundCatchUp(null)
    setIsGameReady(true)
    workerRef.current?.postMessage({
      type: 'replace-state',
      game: nextGame,
      revision: revisionRef.current,
      simulatedAt,
      isEditingBlueprint,
      visible,
    })
  }

  function updateGame(update) {
    const now = Date.now()
    const currentGame = advanceCurrentGameTo(now)
    commitGame(update(currentGame), { simulatedAt: now })
  }

  function replaceGame(nextGame) {
    commitGame(nextGame, { simulatedAt: Date.now() })
  }

  function setSimulationPaused(nextIsPaused) {
    const now = Date.now()
    const currentGame = advanceCurrentGameTo(
      now,
      isEditingBlueprintRef.current,
    )
    commitGame(currentGame, {
      simulatedAt: now,
      isEditingBlueprint: nextIsPaused,
    })
  }

  const saveCurrentGame = useCallback(() => {
    const didSave = saveGame(gameRef.current, simulatedAtRef.current)

    if (didSave) {
      setLastSavedAt(Date.now())
    }

    return didSave
  }, [])

  function compressBackgroundCatchUp() {
    workerRef.current?.postMessage({ type: 'compress-catch-up' })
  }

  function skipBackgroundCatchUp() {
    workerRef.current?.postMessage({ type: 'skip-catch-up' })
  }

  useEffect(() => {
    let saveTimeoutId
    let isActive = true

    const persistGame = () => {
      saveCurrentGame()

      if (isActive) {
        saveTimeoutId = window.setTimeout(
          persistGame,
          AUTOSAVE_INTERVAL_MS,
        )
      }
    }
    const persistImmediately = () => saveCurrentGame()

    saveTimeoutId = window.setTimeout(
      persistGame,
      AUTOSAVE_INTERVAL_MS,
    )
    window.addEventListener('pagehide', persistImmediately)

    return () => {
      isActive = false
      window.clearTimeout(saveTimeoutId)
      window.removeEventListener('pagehide', persistImmediately)
      saveGame(gameRef.current, simulatedAtRef.current)
    }
  }, [saveCurrentGame])

  useEffect(() => {
    let worker
    let fallbackTimeoutId
    let fallbackLastVisualAt = 0
    let isDisposed = false
    let isUsingFallback = false

    const publishWorkerMessage = (message) => {
      if (!message || message.revision !== revisionRef.current) return

      if (message.type === 'catch-up-progress') {
        setIsGameReady(false)
        setBackgroundCatchUp({
          ticksRemaining: Math.max(
            0,
            Math.ceil(Number(message.ticksRemaining) || 0),
          ),
          initialTicks: Math.max(
            1,
            Math.ceil(Number(message.initialTicks) || 1),
          ),
          remainingSeconds: Math.max(
            0,
            Number(message.remainingSeconds) || 0,
          ),
          totalSeconds: Math.max(0, Number(message.totalSeconds) || 0),
          compressionMultiplier: Math.max(
            1,
            Number(message.compressionMultiplier) || 1,
          ),
          strategy: message.strategy === 'skipped' ? 'skipped' : 'compressed',
        })
        return
      }

      if (message.type === 'catch-up-complete') {
        setBackgroundCatchUp(null)
        setIsGameReady(true)
        return
      }

      if (
        message.type !== 'snapshot' ||
        !message.game ||
        typeof message.game !== 'object'
      ) {
        return
      }

      const snapshotTimestamp = Number(message.simulatedAt)
      if (!Number.isFinite(snapshotTimestamp)) return

      const sharedGame = shareUnchangedStructure(
        gameRef.current,
        message.game,
      )
      gameRef.current = sharedGame
      simulatedAtRef.current = snapshotTimestamp
      setActiveNumberNotation(
        sharedGame.numberNotation,
        sharedGame.suffixScientificExponent,
      )
      setRenderedGame(sharedGame)
    }

    const runFallbackTick = () => {
      if (isDisposed || !isUsingFallback) return

      const now = Date.now()
      const elapsedSeconds = Math.max(
        0,
        (now - simulatedAtRef.current) / 1000,
      )

      if (elapsedSeconds > 0) {
        gameRef.current = advanceGameByElapsedTime(
          gameRef.current,
          elapsedSeconds,
          {
            mode: getAdvanceMode(elapsedSeconds),
            isEditingBlueprint: isEditingBlueprintRef.current,
          },
        )
        simulatedAtRef.current = now
      }

      if (now - fallbackLastVisualAt >= VISUAL_UPDATE_INTERVAL_MS) {
        fallbackLastVisualAt = now
        setActiveNumberNotation(
          gameRef.current.numberNotation,
          gameRef.current.suffixScientificExponent,
        )
        setRenderedGame(gameRef.current)
      }

      setBackgroundCatchUp(null)
      setIsGameReady(true)

      fallbackTimeoutId = window.setTimeout(
        runFallbackTick,
        SIMULATION_TICK_INTERVAL_MS,
      )
    }

    const startFallback = () => {
      if (isUsingFallback || isDisposed) return

      isUsingFallback = true
      workerRef.current = null
      fallbackTimeoutId = window.setTimeout(
        runFallbackTick,
        SIMULATION_TICK_INTERVAL_MS,
      )
    }

    const handleWorkerError = (event) => {
      event.preventDefault()
      worker?.terminate()
      worker = null
      startFallback()
    }

    try {
      worker = new Worker(
        new URL('../workers/gameSimulation.worker.js', import.meta.url),
        { type: 'module' },
      )
      workerRef.current = worker
      worker.addEventListener('message', (event) =>
        publishWorkerMessage(event.data),
      )
      worker.addEventListener('error', handleWorkerError)
      worker.postMessage({
        type: 'initialize',
        game: gameRef.current,
        revision: revisionRef.current,
        simulatedAt: simulatedAtRef.current,
        now: Date.now(),
        isEditingBlueprint: isEditingBlueprintRef.current,
        visible: !document.hidden,
      })
    } catch {
      startFallback()
    }

    const handleVisibilityChange = () => {
      const now = Date.now()

      if (document.hidden) {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'set-visibility',
            now,
            visible: false,
          })
          saveCurrentGame()
          return
        }

        const elapsedSeconds = Math.max(
          0,
          (now - simulatedAtRef.current) / 1000,
        )
        if (elapsedSeconds > 0) {
          gameRef.current = advanceGameByElapsedTime(
            gameRef.current,
            elapsedSeconds,
            {
              mode: getAdvanceMode(elapsedSeconds),
              isEditingBlueprint: isEditingBlueprintRef.current,
            },
          )
          simulatedAtRef.current = now
        }

        setRenderedGame(gameRef.current)
        saveCurrentGame()
        return
      }

      workerRef.current?.postMessage({
        type: 'set-visibility',
        now,
        visible: true,
      })
      setIsGameReady(false)
      setBackgroundCatchUp(
        createPendingCatchUp(simulatedAtRef.current, now),
      )
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      isDisposed = true
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
      window.clearTimeout(fallbackTimeoutId)
      worker?.terminate()

      if (workerRef.current === worker) {
        workerRef.current = null
      }
    }
  }, [isEditingBlueprintRef, saveCurrentGame])

  return {
    game,
    gameRef,
    setGame: replaceGame,
    updateGame,
    saveCurrentGame,
    lastSavedAt,
    setSimulationPaused,
    backgroundCatchUp,
    isGameReady,
    compressBackgroundCatchUp,
    skipBackgroundCatchUp,
    activeSimulationStepSeconds: ACTIVE_SIMULATION_STEP_SECONDS,
  }
}
