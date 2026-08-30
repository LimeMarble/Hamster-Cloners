import {
  ACTIVE_SIMULATION_STEP_SECONDS,
  advanceGameByElapsedTime,
  advanceGameSimulationStep,
  CATCH_UP_COMPRESSION_FACTOR,
  CATCH_UP_SPEED_FACTOR,
  getSimulationStepCount,
  SKIPPED_CATCH_UP_STEPS,
} from '../game/gameSimulation.js'
import {
  SIMULATION_TICK_INTERVAL_MS,
  VISUAL_UPDATE_INTERVAL_MS,
} from '../game/gameConfig.js'

const CATCH_UP_CHUNK_MAX_STEPS = 120
const CATCH_UP_CHUNK_TIME_BUDGET_MS = 8
const CATCH_UP_IMMEDIATE_STEPS = 120
const ACTIVE_DELAY_BEFORE_CATCH_UP_STEPS = 600

let game = null
let revision = 0
let isEditingBlueprint = false
let isVisible = true
let simulatedAt = Date.now()
let simulationTimeoutId = null
let catchUpTimeoutId = null
let catchUp = null
let lastSnapshotAt = 0
let lastCatchUpProgressAt = 0

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

function stopCatchUpTimer() {
  if (catchUpTimeoutId !== null) {
    self.clearTimeout(catchUpTimeoutId)
    catchUpTimeoutId = null
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

function postCatchUpComplete() {
  self.postMessage({ type: 'catch-up-complete', revision })
}

function postCatchUpProgress(force = false) {
  if (!catchUp) return

  const now = Date.now()
  if (!force && now - lastCatchUpProgressAt < VISUAL_UPDATE_INTERVAL_MS) {
    return
  }

  lastCatchUpProgressAt = now
  self.postMessage({
    type: 'catch-up-progress',
    revision,
    ticksRemaining: catchUp.remainingTicks,
    initialTicks: catchUp.initialTicks,
    remainingSeconds: catchUp.remainingSeconds,
    totalSeconds: catchUp.totalSeconds,
    compressionMultiplier: catchUp.compressionMultiplier,
    strategy: catchUp.strategy,
  })
}

function cancelCatchUp(shouldNotify = true) {
  stopCatchUpTimer()
  catchUp = null

  if (shouldNotify) {
    postCatchUpComplete()
  }
}

function scheduleSimulationTick() {
  if (
    simulationTimeoutId !== null ||
    catchUp !== null ||
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

function finishCatchUp() {
  if (!catchUp) return

  simulatedAt = catchUp.targetTimestamp
  catchUp = null
  postSnapshot(true)
  postCatchUpComplete()
  scheduleSimulationTick()
}

function scheduleCatchUpChunk() {
  if (catchUpTimeoutId !== null || !catchUp || !isVisible) return

  catchUpTimeoutId = self.setTimeout(runCatchUpChunk, 0)
}

function runCatchUpChunk() {
  catchUpTimeoutId = null
  if (!catchUp || !game || !isVisible) return

  const chunkStartedAt = performance.now()
  let processedSteps = 0

  while (
    catchUp.remainingTicks > 0 &&
    processedSteps < CATCH_UP_CHUNK_MAX_STEPS &&
    performance.now() - chunkStartedAt < CATCH_UP_CHUNK_TIME_BUDGET_MS
  ) {
    const secondsForStep =
      catchUp.remainingSeconds / catchUp.remainingTicks

    game = advanceGameSimulationStep(game, secondsForStep, {
      isEditingBlueprint,
    })
    catchUp.remainingSeconds = Math.max(
      0,
      catchUp.remainingSeconds - secondsForStep,
    )
    catchUp.remainingTicks -= 1
    simulatedAt = Math.min(
      catchUp.targetTimestamp,
      simulatedAt + secondsForStep * 1000,
    )
    processedSteps += 1
  }

  if (catchUp.remainingTicks <= 0) {
    finishCatchUp()
    return
  }

  postCatchUpProgress()
  scheduleCatchUpChunk()
}

function startCatchUp(targetTimestamp) {
  stopSimulationTimer()
  cancelCatchUp(false)

  const target = normalizeTimestamp(targetTimestamp, simulatedAt)
  const elapsedSeconds = Math.max(0, (target - simulatedAt) / 1000)
  const defaultTickCount = getSimulationStepCount(elapsedSeconds, 'catch-up')

  if (defaultTickCount === 0) {
    postSnapshot(true)
    postCatchUpComplete()
    scheduleSimulationTick()
    return
  }

  if (defaultTickCount <= CATCH_UP_IMMEDIATE_STEPS) {
    game = advanceGameByElapsedTime(game, elapsedSeconds, {
      mode: 'catch-up',
      isEditingBlueprint,
    })
    simulatedAt = target
    postSnapshot(true)
    postCatchUpComplete()
    scheduleSimulationTick()
    return
  }

  catchUp = {
    targetTimestamp: target,
    remainingTicks: defaultTickCount,
    initialTicks: defaultTickCount,
    remainingSeconds: elapsedSeconds,
    totalSeconds: elapsedSeconds,
    compressionMultiplier: CATCH_UP_COMPRESSION_FACTOR,
    strategy: 'compressed',
  }
  lastCatchUpProgressAt = 0
  postCatchUpProgress(true)
  scheduleCatchUpChunk()
}

function runSimulationTick() {
  simulationTimeoutId = null
  if (!game || !isVisible || catchUp) return

  const now = Date.now()
  const elapsedSeconds = Math.max(0, (now - simulatedAt) / 1000)
  const wholeStepCount = Math.floor(
    elapsedSeconds / ACTIVE_SIMULATION_STEP_SECONDS + 1e-9,
  )

  if (wholeStepCount > ACTIVE_DELAY_BEFORE_CATCH_UP_STEPS) {
    startCatchUp(now)
    return
  }

  if (wholeStepCount > 0) {
    const secondsToAdvance =
      wholeStepCount * ACTIVE_SIMULATION_STEP_SECONDS
    game = advanceGameByElapsedTime(game, secondsToAdvance, {
      mode: 'active',
      isEditingBlueprint,
    })
    simulatedAt += secondsToAdvance * 1000
  }

  postSnapshot(false, now)
  scheduleSimulationTick()
}

function assignState(message) {
  game = message.game
  revision = Math.max(0, Math.floor(Number(message.revision) || 0))
  isEditingBlueprint = message.isEditingBlueprint === true
  isVisible = message.visible !== false
  simulatedAt = normalizeTimestamp(message.simulatedAt)
  lastSnapshotAt = 0
}

function replaceState(message) {
  stopSimulationTimer()
  cancelCatchUp(false)
  assignState(message)
  postCatchUpComplete()
  postSnapshot(true)
  scheduleSimulationTick()
}

function initialize(message) {
  stopSimulationTimer()
  cancelCatchUp(false)
  assignState(message)
  postSnapshot(true)

  if (isVisible) {
    startCatchUp(message.now)
  }
}

function setVisibility(message) {
  stopSimulationTimer()

  if (message.visible !== true) {
    isVisible = false
    cancelCatchUp(true)
    postSnapshot(true)
    return
  }

  isVisible = true
  startCatchUp(message.now)
}

function compressCatchUp() {
  if (!catchUp || catchUp.remainingTicks <= 1) return

  catchUp.remainingTicks = Math.max(
    1,
    Math.ceil(catchUp.remainingTicks / CATCH_UP_SPEED_FACTOR),
  )
  catchUp.compressionMultiplier = Math.max(
    CATCH_UP_COMPRESSION_FACTOR,
    catchUp.remainingSeconds /
      (catchUp.remainingTicks * ACTIVE_SIMULATION_STEP_SECONDS),
  )
  catchUp.strategy = 'compressed'
  postCatchUpProgress(true)
}

function skipCatchUp() {
  if (!catchUp || catchUp.remainingTicks <= SKIPPED_CATCH_UP_STEPS) return

  catchUp.remainingTicks = SKIPPED_CATCH_UP_STEPS
  catchUp.compressionMultiplier = Math.max(
    CATCH_UP_COMPRESSION_FACTOR,
    catchUp.remainingSeconds /
      (catchUp.remainingTicks * ACTIVE_SIMULATION_STEP_SECONDS),
  )
  catchUp.strategy = 'skipped'
  postCatchUpProgress(true)
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
    return
  }

  if (message.type === 'compress-catch-up') {
    compressCatchUp()
    return
  }

  if (message.type === 'skip-catch-up') {
    skipCatchUp()
  }
})
