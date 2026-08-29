function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function shareUnchangedStructure(previousValue, nextValue) {
  if (Object.is(previousValue, nextValue)) {
    return previousValue
  }

  if (Array.isArray(previousValue) && Array.isArray(nextValue)) {
    if (previousValue.length !== nextValue.length) {
      return nextValue
    }

    const sharedItems = nextValue.map((item, index) =>
      shareUnchangedStructure(previousValue[index], item),
    )
    const isUnchanged = sharedItems.every((item, index) =>
      Object.is(item, previousValue[index]),
    )

    return isUnchanged ? previousValue : sharedItems
  }

  if (isPlainObject(previousValue) && isPlainObject(nextValue)) {
    const previousKeys = Object.keys(previousValue)
    const nextKeys = Object.keys(nextValue)

    if (previousKeys.length !== nextKeys.length) {
      return nextValue
    }

    let isUnchanged = true
    const sharedObject = {}

    for (const key of nextKeys) {
      if (!Object.prototype.hasOwnProperty.call(previousValue, key)) {
        return nextValue
      }

      const sharedValue = shareUnchangedStructure(
        previousValue[key],
        nextValue[key],
      )
      sharedObject[key] = sharedValue

      if (!Object.is(sharedValue, previousValue[key])) {
        isUnchanged = false
      }
    }

    return isUnchanged ? previousValue : sharedObject
  }

  return nextValue
}
