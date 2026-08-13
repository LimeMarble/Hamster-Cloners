import { useEffect, useRef, useState } from 'react'
import {
  getBlueprintSlots,
  getColumnsProducedForTick,
  getCropHamsterEfficiencyMultiplier,
  getProductionForTick,
  getRowsProducedPerSecond,
  getRowDuplicatorEffectivenessMultiplier,
  getUnlockedBlueprintSlotCount,
  SIMULATION_TICK_INTERVAL_MS,
  VISUAL_UPDATE_INTERVAL_MS,
} from '../game/gameLogic.js'
import {
  APPLE_TREE_UNLOCK_CROP_COUNT,
  CROP_PERFECTION_UNLOCK_CROP_COUNT,
  KNOTWEED_UNLOCK_CROP_COUNT,
  LENTIL_UNLOCK_CROP_COUNT,
  ROOT_TUNNEL_UNLOCK_CROP_COUNT,
  TURNIP_UNLOCK_CROP_COUNT,
} from '../game/crops.js'
import { loadGame, saveGame } from '../game/storage.js'
import { setActiveNumberNotation } from '../game/numberFormat.js'

export function useGameState(isEditingBlueprintRef) {
  const [game, setRenderedGame] = useState(() => {
    const loadedGame = loadGame()
    setActiveNumberNotation(loadedGame.numberNotation)
    return loadedGame
  })
  const gameRef = useRef(game)

  function updateGame(update) {
    const nextGame = update(gameRef.current)
    gameRef.current = nextGame
    setActiveNumberNotation(nextGame.numberNotation)
    setRenderedGame(nextGame)
  }

  function replaceGame(nextGame) {
    gameRef.current = nextGame
    setActiveNumberNotation(nextGame.numberNotation)
    setRenderedGame(nextGame)
  }

  useEffect(() => {
    saveGame(game)
  }, [game])

  useEffect(() => {
    let simulationTimeoutId
    let visualTimeoutId
    let isActive = true

    const runSimulationTick = () => {
      if (!isActive) {
        return
      }

      const currentGame = gameRef.current
      const nextPlaytimeSeconds =
        (Number(currentGame.playtimeSeconds) || 0) +
        SIMULATION_TICK_INTERVAL_MS / 1000

      if (!isEditingBlueprintRef.current) {
        const productionForTick = getProductionForTick(
          currentGame.blueprint,
          currentGame.farmland,
          currentGame.completedCropPerfections,
          SIMULATION_TICK_INTERVAL_MS,
          currentGame.testingCheats?.cropMultiplierEnabled ? 10 : 1,
        )
        const nextCrops = currentGame.crops + productionForTick
        const rowDuplicatorEffectivenessMultiplier =
          getRowDuplicatorEffectivenessMultiplier(
            currentGame.blueprint,
            currentGame.completedCropPerfections,
          )
        const rowsBuiltPerSecond = currentGame.hasUnlockedRowDuplicators
          ? getRowsProducedPerSecond(
              currentGame.rowDuplicators,
              rowDuplicatorEffectivenessMultiplier,
            )
          : 0
        const columnsProducedForTick = getColumnsProducedForTick(
          currentGame.hamsters,
          currentGame.postUnionHamstersHired,
          getCropHamsterEfficiencyMultiplier(
            currentGame.blueprint,
            currentGame.completedCropPerfections,
            rowsBuiltPerSecond,
          ),
          SIMULATION_TICK_INTERVAL_MS,
          currentGame.testingCheats?.hamsterEfficiencyEnabled ? 10 : 1,
        )
        const rowsProducedForTick =
          rowsBuiltPerSecond * (SIMULATION_TICK_INTERVAL_MS / 1000)
        const hasUnlockedRootTunnel =
          currentGame.hasUnlockedRootTunnel ||
          nextCrops >= ROOT_TUNNEL_UNLOCK_CROP_COUNT
        const currentBlueprintSlots = getBlueprintSlots(currentGame)
        const activeBlueprintSlot = Math.min(
          Math.max(0, Math.floor(Number(currentGame.activeBlueprintSlot) || 0)),
          currentBlueprintSlots.length - 1,
        )
        const requiredBlueprintSlotCount = getUnlockedBlueprintSlotCount({
          ...currentGame,
          hasUnlockedRootTunnel,
        })
        const nextBlueprintSlots = [...currentBlueprintSlots]

        while (nextBlueprintSlots.length < requiredBlueprintSlotCount) {
          nextBlueprintSlots.push(currentGame.blueprint)
        }

        gameRef.current = {
          ...currentGame,
          crops: nextCrops,
          totalCropsMade:
            (Number(currentGame.totalCropsMade) || 0) +
            Math.max(0, productionForTick),
          playtimeSeconds: nextPlaytimeSeconds,
          hasUnlockedTurnip:
            currentGame.hasUnlockedTurnip ||
            nextCrops >= TURNIP_UNLOCK_CROP_COUNT,
          hasUnlockedAppleTree:
            currentGame.hasUnlockedAppleTree ||
            nextCrops >= APPLE_TREE_UNLOCK_CROP_COUNT,
          hasUnlockedLentil:
            currentGame.hasUnlockedLentil ||
            nextCrops >= LENTIL_UNLOCK_CROP_COUNT,
          hasUnlockedKnotweed:
            currentGame.hasUnlockedKnotweed ||
            nextCrops >= KNOTWEED_UNLOCK_CROP_COUNT,
          hasUnlockedRootTunnel,
          hasUnlockedCropPerfection:
            currentGame.hasUnlockedCropPerfection ||
            nextCrops >= CROP_PERFECTION_UNLOCK_CROP_COUNT,
          farmland: {
            ...currentGame.farmland,
            columns: currentGame.farmland.columns + columnsProducedForTick,
            rows: currentGame.farmland.rows + rowsProducedForTick,
          },
          blueprintSlots: nextBlueprintSlots,
          activeBlueprintSlot,
        }
      } else {
        gameRef.current = {
          ...currentGame,
          playtimeSeconds: nextPlaytimeSeconds,
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

      setRenderedGame((currentGame) =>
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
  }, [gameRef, isEditingBlueprintRef])

  return { game, gameRef, setGame: replaceGame, updateGame }
}
