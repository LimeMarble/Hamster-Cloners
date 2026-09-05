const MAX_STRUCTURAL_CACHE_ENTRIES = 64

function haveSameDependencies(previousDependencies, nextDependencies) {
  return (
    previousDependencies.length === nextDependencies.length &&
    previousDependencies.every((dependency, index) =>
      Object.is(dependency, nextDependencies[index]),
    )
  )
}

function serializeCacheValue(value, seen = new WeakSet()) {
  if (value === null) return 'null'

  const valueType = typeof value

  if (valueType === 'number') {
    if (Number.isNaN(value)) return 'number:NaN'
    if (Object.is(value, -0)) return 'number:-0'
    return `number:${value}`
  }

  if (valueType === 'string') return `string:${JSON.stringify(value)}`
  if (valueType === 'boolean') return `boolean:${value}`
  if (valueType === 'undefined') return 'undefined'
  if (valueType === 'bigint') return `bigint:${value}`
  if (valueType === 'symbol') return `symbol:${String(value)}`
  if (valueType === 'function') return `function:${String(value)}`

  if (seen.has(value)) return 'circular'
  seen.add(value)

  if (Array.isArray(value)) {
    const serialized = `array:[${value
      .map((item) => serializeCacheValue(item, seen))
      .join(',')}]`
    seen.delete(value)
    return serialized
  }

  const serialized = `object:{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${serializeCacheValue(value[key], seen)}`,
    )
    .join(',')}}`
  seen.delete(value)
  return serialized
}

function createStructuralCacheKey(dependencies) {
  return serializeCacheValue(dependencies)
}

function rememberStructuralValue(cache, key, value) {
  if (cache.has(key)) {
    cache.delete(key)
  }

  cache.set(key, value)

  if (cache.size > MAX_STRUCTURAL_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value)
  }
}

export function createBlueprintCalculationCache({
  structuralFallback = true,
} = {}) {
  const cachedByBlueprint = new WeakMap()
  const cachedByStructure = new Map()

  return function getCachedBlueprintCalculation(
    blueprint,
    dependencies,
    calculate,
  ) {
    if (!blueprint || typeof blueprint !== 'object') {
      return calculate()
    }

    const nextDependencies = [
      blueprint.rows,
      blueprint.columns,
      blueprint.cells,
      blueprint.mirrorCornTargets,
      blueprint.rootTunnelConnections,
      ...dependencies,
    ]
    const cached = cachedByBlueprint.get(blueprint)

    if (
      cached &&
      haveSameDependencies(cached.dependencies, nextDependencies)
    ) {
      return cached.value
    }

    if (!structuralFallback) {
      const value = calculate()
      cachedByBlueprint.set(blueprint, {
        dependencies: nextDependencies,
        value,
      })
      return value
    }

    const structuralKey = createStructuralCacheKey(nextDependencies)

    if (cachedByStructure.has(structuralKey)) {
      const value = cachedByStructure.get(structuralKey)
      rememberStructuralValue(cachedByStructure, structuralKey, value)
      cachedByBlueprint.set(blueprint, {
        dependencies: nextDependencies,
        value,
      })
      return value
    }

    const value = calculate()
    cachedByBlueprint.set(blueprint, {
      dependencies: nextDependencies,
      value,
    })
    rememberStructuralValue(cachedByStructure, structuralKey, value)
    return value
  }
}
