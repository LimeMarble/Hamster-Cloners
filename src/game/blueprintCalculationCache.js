function haveSameDependencies(previousDependencies, nextDependencies) {
  return (
    previousDependencies.length === nextDependencies.length &&
    previousDependencies.every((dependency, index) =>
      Object.is(dependency, nextDependencies[index]),
    )
  )
}

export function createBlueprintCalculationCache() {
  const cachedByBlueprint = new WeakMap()

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
      ...dependencies,
    ]
    const cached = cachedByBlueprint.get(blueprint)

    if (
      cached &&
      haveSameDependencies(cached.dependencies, nextDependencies)
    ) {
      return cached.value
    }

    const value = calculate()
    cachedByBlueprint.set(blueprint, {
      dependencies: nextDependencies,
      value,
    })
    return value
  }
}