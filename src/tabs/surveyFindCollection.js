const FIND_HOLD_DELAY_MS = 300
const FIND_HOLD_REPEAT_MS = 70

export function createSurveyFindCollector({ browserWindow, browserDocument, getScene, onCollect }) {
  let delayId = null
  let repeatId = null
  let heldPointerId = null
  let mouseHold = null
  let suppressClick = false

  function stop() {
    browserWindow.clearTimeout(delayId)
    browserWindow.clearInterval(repeatId)
    delayId = null
    repeatId = null
    heldPointerId = null
    mouseHold = null
  }

  function start(event, startingFindId, finds) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    const startingIndex = finds.findIndex(({ id }) => id === startingFindId)
    if (startingIndex < 0) return

    stop()
    suppressClick = false
    heldPointerId = event.pointerId
    const collectedIds = new Set()
    const isMouse = event.pointerType === 'mouse'
    mouseHold = isMouse
      ? { x: event.clientX, y: event.clientY, collectHovered: null }
      : null
    // Touch retains the existing hold-to-collect sequence, without requiring hover.
    const orderedIds = isMouse ? [] : [
      ...finds.slice(startingIndex), ...finds.slice(0, startingIndex),
    ].map(({ id }) => id)
    let nextIndex = 0

    function collectNext() {
      if (heldPointerId === null) return
      if (isMouse) {
        const element = browserDocument.elementFromPoint(mouseHold.x, mouseHold.y)
          ?.closest('button.manatee-find[data-manatee-find-id]')
        const findId = element?.dataset.manateeFindId
        if (!element || !getScene()?.contains(element) || !findId || collectedIds.has(findId)) return
        collectedIds.add(findId)
        onCollect(findId)
      } else {
        if (nextIndex >= orderedIds.length) {
          stop()
          return
        }
        onCollect(orderedIds[nextIndex++])
      }
    }

    delayId = browserWindow.setTimeout(() => {
      delayId = null
      suppressClick = true
      if (mouseHold) mouseHold.collectHovered = collectNext
      collectNext()
      if (heldPointerId !== null) {
        repeatId = browserWindow.setInterval(collectNext, FIND_HOLD_REPEAT_MS)
      }
    }, FIND_HOLD_DELAY_MS)
  }

  function pointerMove(event) {
    if (!mouseHold || event.pointerId !== heldPointerId) return
    if ((event.buttons & 1) === 0) {
      stop()
      return
    }
    mouseHold.x = event.clientX
    mouseHold.y = event.clientY
    mouseHold.collectHovered?.()
  }

  function pointerEnd(event) {
    if (event.pointerId === heldPointerId) stop()
  }

  function collectSingle(findId, event) {
    // A keyboard click must not inherit suppression from a previous mouse hold.
    const shouldSuppress = suppressClick && event?.detail !== 0
    suppressClick = false
    if (!shouldSuppress) onCollect(findId)
  }

  browserWindow.addEventListener('pointermove', pointerMove)
  browserWindow.addEventListener('pointerup', pointerEnd)
  browserWindow.addEventListener('pointercancel', pointerEnd)
  browserWindow.addEventListener('blur', stop)

  function destroy() {
    stop()
    browserWindow.removeEventListener('pointermove', pointerMove)
    browserWindow.removeEventListener('pointerup', pointerEnd)
    browserWindow.removeEventListener('pointercancel', pointerEnd)
    browserWindow.removeEventListener('blur', stop)
  }

  return { start, collectSingle, stop, destroy }
}
