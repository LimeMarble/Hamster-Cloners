import assert from 'node:assert/strict'
import test from 'node:test'
import { createSurveyFindCollector } from '../src/tabs/surveyFindCollection.js'

function createHarness({ removeOnCollect = true } = {}) {
  const timers = new Map()
  const intervals = new Map()
  const listeners = new Map()
  const collected = []
  const hitTests = []
  const finds = ['a', 'b', 'c'].map((id) => ({ id }))
  const elements = new Map(finds.map(({ id }) => [id, {
    dataset: { manateeFindId: id }, inScene: true,
    closest() { return this },
  }]))
  let hovered = null
  let nextId = 0
  let onCollectExtra = () => {}
  const browserWindow = {
    setTimeout: (callback, delay) => { timers.set(++nextId, { callback, delay }); return nextId },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (callback, delay) => { intervals.set(++nextId, { callback, delay }); return nextId },
    clearInterval: (id) => intervals.delete(id),
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type),
  }
  const collector = createSurveyFindCollector({
    browserWindow,
    browserDocument: { elementFromPoint(x, y) { hitTests.push([x, y]); return hovered } },
    getScene: () => ({ contains: (element) => element.inScene }),
    onCollect: (id) => {
      collected.push(id)
      if (removeOnCollect && hovered?.dataset?.manateeFindId === id) hovered = null
      onCollectExtra()
    },
  })
  const pointer = { isPrimary: true, pointerType: 'mouse', pointerId: 1,
    button: 0, buttons: 1, clientX: 10, clientY: 20 }
  return {
    collector, collected, hitTests, timers, intervals, listeners, finds,
    hover: (id) => { hovered = elements.get(id) ?? null },
    hoverElement: (element) => { hovered = element },
    start: (id = 'a', overrides = {}) => collector.start({ ...pointer, ...overrides }, id, finds),
    move: (overrides = {}) => listeners.get('pointermove')({ ...pointer, ...overrides }),
    end: (type = 'pointerup', overrides = {}) => listeners.get(type)({ ...pointer, ...overrides }),
    delay: () => {
      const [id, timer] = [...timers][0]
      timers.delete(id)
      timer.callback()
    },
    repeat: () => [...intervals.values()].forEach(({ callback }) => callback()),
    onCollectExtra: (callback) => { onCollectExtra = callback },
  }
}

test('holding the mouse collects the hovered object, never the remaining result list', () => {
  const h = createHarness()
  h.hover('a')
  h.start()
  assert.deepEqual(h.collected, [])
  assert.equal([...h.timers.values()][0].delay, 300)
  h.delay()
  assert.deepEqual(h.collected, ['a'])
  assert.equal([...h.intervals.values()][0].delay, 70)
  for (let tick = 0; tick < 20; tick++) h.repeat()
  assert.deepEqual(h.collected, ['a'])
  h.collector.destroy()
})

test('moving while holding collects only the newly hovered object and uses current cursor coordinates', () => {
  const h = createHarness()
  h.hover('a')
  h.start()
  h.delay()
  h.hover('c')
  h.move({ clientX: 150, clientY: 250 })
  assert.deepEqual(h.collected, ['a', 'c'])
  assert.deepEqual(h.hitTests.at(-1), [150, 250])
  h.hover('b')
  h.move()
  assert.deepEqual(h.collected, ['a', 'c', 'b'])
  h.collector.destroy()
})

test('leaving the objects before the hold delay expires collects nothing until another object is hovered', () => {
  const h = createHarness()
  h.hover('a')
  h.start()
  h.hover(null)
  h.move()
  h.delay()
  h.repeat()
  assert.deepEqual(h.collected, [])
  h.hover('b')
  h.move()
  assert.deepEqual(h.collected, ['b'])
  h.collector.destroy()
})

test('holding over empty space, unrelated controls or another survey cannot collect finds', () => {
  const h = createHarness()
  h.start()
  h.delay()
  h.hoverElement({ closest: () => null })
  h.move()
  h.hoverElement({ dataset: { manateeFindId: 'other' }, inScene: false,
    closest() { return this } })
  h.move()
  h.repeat()
  assert.deepEqual(h.collected, [])
  h.collector.destroy()
})

test('child visuals resolve to their find button and delayed DOM removal cannot collect it twice', () => {
  const h = createHarness({ removeOnCollect: false })
  const button = { dataset: { manateeFindId: 'b' }, inScene: true, closest() { return this } }
  h.hoverElement({ closest: () => button })
  h.start('b')
  h.delay()
  h.repeat()
  h.move()
  assert.deepEqual(h.collected, ['b'])
  h.collector.destroy()
})

test('release, cancellation, loss of mouse buttons and window blur stop held collection', () => {
  for (const stop of [
    (h) => h.end(),
    (h) => h.end('pointercancel'),
    (h) => h.move({ buttons: 0 }),
    (h) => h.listeners.get('blur')(),
  ]) {
    const h = createHarness()
    h.hover('a')
    h.start()
    h.delay()
    stop(h)
    assert.equal(h.timers.size, 0)
    assert.equal(h.intervals.size, 0)
    h.hover('b')
    h.move()
    h.repeat()
    assert.deepEqual(h.collected, ['a'])
    h.collector.destroy()
  }
})

test('other pointers cannot move or end the primary mouse hold, and invalid buttons cannot start one', () => {
  const h = createHarness()
  for (const overrides of [{ button: 1 }, { button: 2 }, { isPrimary: false }]) h.start('a', overrides)
  h.start('missing')
  assert.equal(h.timers.size, 0)
  h.hover('a')
  h.start()
  h.delay()
  h.hover('b')
  h.move({ pointerId: 2, buttons: 0 })
  h.end('pointerup', { pointerId: 2 })
  assert.deepEqual(h.collected, ['a'])
  assert.equal(h.intervals.size, 1)
  h.move()
  assert.deepEqual(h.collected, ['a', 'b'])
  h.collector.destroy()
})

test('short normal clicks and keyboard clicks still collect exactly one object', () => {
  const h = createHarness()
  h.start()
  h.end()
  h.collector.collectSingle('a', { detail: 1 })
  h.collector.collectSingle('b', { detail: 0 })
  assert.deepEqual(h.collected, ['a', 'b'])
  assert.equal(h.timers.size, 0)
  h.collector.destroy()
})

test('the release click following a hold is suppressed, but the next normal or keyboard click is not', () => {
  const h = createHarness()
  h.hover('a')
  h.start()
  h.delay()
  h.end()
  h.collector.collectSingle('a', { detail: 1 })
  assert.deepEqual(h.collected, ['a'])
  h.start('b')
  h.end()
  h.collector.collectSingle('b', { detail: 1 })
  assert.deepEqual(h.collected, ['a', 'b'])
  h.hover('c')
  h.start('c')
  h.delay()
  h.end()
  h.collector.collectSingle('a', { detail: 0 })
  assert.deepEqual(h.collected, ['a', 'b', 'c', 'a'])
  h.collector.destroy()
})

test('touch holding retains its existing sequence starting from the pressed object', () => {
  const h = createHarness()
  h.start('b', { pointerType: 'touch' })
  h.delay()
  h.repeat()
  h.repeat()
  h.repeat()
  assert.deepEqual(h.collected, ['b', 'c', 'a'])
  assert.equal(h.hitTests.length, 0)
  assert.equal(h.intervals.size, 0)
  h.collector.destroy()
})

test('unmounting clears every listener and timer, even while a find is being collected', () => {
  const h = createHarness()
  h.hover('a')
  h.start()
  h.onCollectExtra(() => h.collector.destroy())
  h.delay()
  assert.deepEqual(h.collected, ['a'])
  assert.equal(h.timers.size, 0)
  assert.equal(h.intervals.size, 0)
  assert.equal(h.listeners.size, 0)
})
