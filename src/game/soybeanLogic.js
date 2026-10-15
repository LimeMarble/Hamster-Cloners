import { createBlueprintCalculationCache } from './blueprintCalculationCache.js'

const getCachedSoybeanPatternCounts = createBlueprintCalculationCache()

export function getSoybeanPatternCounts(blueprint) {
  return getCachedSoybeanPatternCounts(blueprint, [], () => {
    const rows = Math.max(0, Math.floor(Number(blueprint?.rows) || 0))
    const columns = Math.max(0, Math.floor(Number(blueprint?.columns) || 0))
    const cells = Array.isArray(blueprint?.cells) ? blueprint.cells : []
    let horizontalConnectionCount = 0
    let squareCount = 0

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column
        if (cells[index] !== 'soybean') continue

        if (
          column + 1 < columns &&
          cells[index + 1] === 'soybean'
        ) {
          horizontalConnectionCount += 1
        }

        if (
          row + 1 < rows &&
          column + 1 < columns &&
          cells[index + 1] === 'soybean' &&
          cells[index + columns] === 'soybean' &&
          cells[index + columns + 1] === 'soybean'
        ) {
          squareCount += 1
        }
      }
    }

    return {
      horizontalConnectionCount,
      squareCount,
    }
  })
}
