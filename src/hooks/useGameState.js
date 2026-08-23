import { useEffect, useRef, useState } from 'react'
import {
  ACTIVE_SIMULATION_STEP_SECONDS,
  advanceGameByElapsedTime,
} from '../game/gameSimulation.js'
import {
  SIMULATION_TICK_INTERVAL_MS,
  VISUAL_UPDATE_INTERVAL_MS,
} from '../game/gameConfig.js'
import { loadGameSnapshot, saveGame } from '../game/storage.js'
import { setActiveNumberNotation } from '../game/numberFormat.js'

const SAVE_INTERVAL_MS = 1000
const ACTIVE_CATCH_UP_LIMIT_SECONDS = 1

function getAdvanceMode(elapsedSeconds) {
  return elapsedSeconds <= ACTIVE_CATCH_UP_LIMIT_SECONDS
    ? 'active'
    : 'catch-up'
}

export function useGameState(isEditingBlueprintRef) {
  const [initialSnapshot] = useState(() => {
    const snapshot = loadGameSnapshot()
    setActiveNumberNotation(snapshot.game.numberNotation)
    return snapshot
  })
  const [game, setRenderedGame] = useState(initialSnapshot.game)
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
    setActiveNumberNotation(nextGame.numberNotation)
    setRenderedGame(nextGame)
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

  useEffect(() => {
    let saveTimeoutId
    let isActive = true

    const persistGame = () => {
      saveGame(gameRef.current, simulatedAtRef.current)

      if (isActive) {
        saveTimeoutId = window.setTimeout(
          persistGame,
          SAVE_INTERVAL_MS,
        )
      }
    }
    const persistImmediately = () =>
      saveGame(gameRef.current, simulatedAtRef.current)

    saveTimeoutId = window.setTimeout(persistGame, SAVE_INTERVAL_MS)
    window.addEventListener('pagehide', persistImmediately)

    return () => {
      isActive = false
      window.clearTimeout(saveTimeoutId)
      window.removeEventListener('pagehide', persistImmediately)
      persistImmediately()
    }
  }, [])

  useEffect(() => {
    let worker
    let fallbackTimeoutId
    let fallbackLastVisualAt = 0
    let isDisposed = false
    let isUsingFallback = false

    const publishWorkerSnapshot = (snapshot) => {
      if (
        snapshot?.type !== 'snapshot' ||
        snapshot.revision !== revisionRef.current ||
        !snapshot.game ||
        typeof snapshot.game !== 'object'
      ) {
        return
      }

      const snapshotTimestamp = Number(snapshot.simulatedAt)
      if (!Number.isFinite(snapshotTimestamp)) return

      gameRef.current = snapshot.game
      simulatedAtRef.current = snapshotTimestamp
      setActiveNumberNotation(snapshot.game.numberNotation)
      setRenderedGame(snapshot.game)
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
        setActiveNumberNotation(gameRef.current.numberNotation)
        setRenderedGame(gameRef.current)
      }

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
        publishWorkerSnapshot(event.data),
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

        revisionRef.current += 1
        setRenderedGame(gameRef.current)
        workerRef.current?.postMessage({
          type: 'replace-state',
          game: gameRef.current,
          revision: revisionRef.current,
          simulatedAt: now,
          isEditingBlueprint: isEditingBlueprintRef.current,
          visible: false,
        })
        saveGame(gameRef.current, now)
        return
      }

      workerRef.current?.postMessage({
        type: 'set-visibility',
        now,
        visible: true,
      })
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
  }, [isEditingBlueprintRef])

  return {
    game,
    gameRef,
    setGame: replaceGame,
    updateGame,
    setSimulationPaused,
    activeSimulationStepSeconds: ACTIVE_SIMULATION_STEP_SECONDS,
  }
}
