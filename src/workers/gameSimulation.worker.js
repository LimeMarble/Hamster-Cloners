import {
  ACTIVE_SIMULATION_STEP_SECONDS,
  advanceGameByElapsedTime,
  MAX_CATCH_UP_STEPS,
} from '../game/gameSimulation.js'
import {
  SIMULATION_TICK_INTERVAL_MS,
  VISUAL_UPDATE_INTERVAL_MS,
} from '../game/gameConfig.js'

let game = null
let revision = 0
let isEditingBlueprint = false
let isVisible = true
let simulatedAt = Date.now()
let simulationTimeoutId = null
let lastSnapshotAt = 0

function normalizeTimestamp(value, fallback = Date.now()) {
  const timestamp = Number(value)
  return Number.isFinite(timestamp) && timestamp >= 0
    ? timestamp
    : fallback
}

function stopSimulationTimer() {
  if (simulationTimeoutId !== null) {
    self.clearTimeout(simulationTimeoutId)
    simulationTimeoutId = null
  }
}

function postSnapshot(force = false, now = Date.now()) {
  if (
    !game ||
    (!force && now - lastSnapshotAt < VISUAL_UPDATE_INTERVAL_MS)
  ) {
    return
  }

  lastSnapshotAt = now
  self.postMessage({
    type: 'snapshot',
    game,
    revision,
    simulatedAt,
  })
}

function advanceCatchUp(targetTimestamp) {
  const target = normalizeTimestamp(targetTimestamp, simulatedAt)
  const elapsedSeconds = Math.max(0, (target - simulatedAt) / 1000)

  if (elapsedSeconds > 0) {
    game = advanceGameByElapsedTime(game, elapsedSeconds, {
      mode: 'catch-up',
      isEditingBlueprint,
    })
    simulatedAt = target
  }
}

function scheduleSimulationTick() {
  if (
    simulationTimeoutId !== null ||
    !game ||
    !isVisible
  ) {
    return
  }

  simulationTimeoutId = self.setTimeout(
    runSimulationTick,
    SIMULATION_TICK_INTERVAL_MS,
  )
}

function runSimulationTick() {
  simulationTimeoutId = null
  if (!game || !isVisible) return

  const now = Date.now()
  const elapsedSeconds = Math.max(0, (now - simulatedAt) / 1000)
  const wholeStepCount = Math.floor(
    elapsedSeconds / ACTIVE_SIMULATION_STEP_SECONDS + 1e-9,
  )

  if (wholeStepCount > 0) {
    const secondsToAdvance =
      wholeStepCount * ACTIVE_SIMULATION_STEP_SECONDS
    game = advanceGameByElapsedTime(game, secondsToAdvance, {
      mode:
        wholeStepCount > MAX_CATCH_UP_STEPS
          ? 'catch-up'
          : 'active',
      isEditingBlueprint,
    })
    simulatedAt += secondsToAdvance * 1000
  }

  postSnapshot(false, now)
  scheduleSimulationTick()
}

function replaceState(message) {
  stopSimulationTimer()
  game = message.game
  revision = Math.max(0, Math.floor(Number(message.revision) || 0))
  isEditingBlueprint = message.isEditingBlueprint === true
  isVisible = message.visible !== false
  simulatedAt = normalizeTimestamp(message.simulatedAt)
  lastSnapshotAt = 0
  postSnapshot(true)
  scheduleSimulationTick()
}

function initialize(message) {
  replaceState(message)
  stopSimulationTimer()
  advanceCatchUp(message.now)
  isVisible = message.visible !== false
  postSnapshot(true)
  scheduleSimulationTick()
}

function setVisibility(message) {
  stopSimulationTimer()
  advanceCatchUp(message.now)
  isVisible = message.visible === true
  postSnapshot(true)
  scheduleSimulationTick()
}

self.addEventListener('message', (event) => {
  const message = event.data

  if (!message || typeof message !== 'object') return

  if (message.type === 'initialize') {
    initialize(message)
    return
  }

  if (message.type === 'replace-state') {
    replaceState(message)
    return
  }

  if (message.type === 'set-visibility') {
    setVisibility(message)
  }
})
