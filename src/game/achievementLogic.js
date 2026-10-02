import { ACHIEVEMENTS } from './achievementDefinitions.js'
import { createBlueprintCalculationCache } from './blueprintCalculationCache.js'
import { CROP_DEFINITIONS } from './crops.js'
import { getBlueprintCropStats } from './cropStats.js'
import {
  getBlueprintMonocropMultiplier,
  getGlobalRowProductionEffects,
  isMirrorCornOverloaded,
  isWaterLettuceFieldInfested,
} from './cropEffects.js'
import { getBaseFieldIncome, getCropHamsterEfficiencyMultiplier } from './cropProduction.js'
import { getFortuneModifiers } from './fortuneLogic.js'

const cacheMetrics = createBlueprintCalculationCache({ structuralFallback: false })
const cacheStructure = createBlueprintCalculationCache({ structuralFallback: false })
const metricCropIds = new Map([
  ['sweetPotato', ['potato', 'hamster-efficiency']],
  ['leek', ['leek', 'adjacent-crop-yield']],
  ['turnip', ['turnip', 'adjacent-crop-effects']],
  ['appleTree', ['apple', null]],
  ['sunflower', ['sunflower', 'row-duplicator-efficiency']],
])

function getBlueprintStructure(blueprint) {
  return cacheStructure(blueprint, [], () => {
    const types = new Set()
    const indicesByCrop = new Map()
    blueprint.cells.forEach((id, index) => {
      if (!CROP_DEFINITIONS[id] || CROP_DEFINITIONS[id].internalOnly || id === 'rootTunnel') return
      types.add(id)
      if (!indicesByCrop.has(id)) indicesByCrop.set(id, [])
      indicesByCrop.get(id).push(index)
    })
    return { types, indicesByCrop, infested: isWaterLettuceFieldInfested(blueprint) }
  })
}

function getBlueprintMetrics(game, blueprint, fortune, pendingIds) {
  const perfections = game.completedCropPerfections ?? []
  const seeds = game.seedAugmentations ?? {}
  const structure = getBlueprintStructure(blueprint)
  const needsApple = pendingIds.has('apple10B') && structure.types.has('appleTree')
  const needsCanola = pendingIds.has('canola800') && structure.types.has('canola')
  return cacheMetrics(blueprint, [
    perfections, seeds, ...Object.values(fortune),
    needsCanola ? game.hamsters : 0,
    needsApple ? game.trade?.rabbitContractsCompleted : 0,
    needsApple ? game.trade?.totalRabbitRelationsEarned : 0,
    ...pendingIds,
  ], () => {
    const metrics = {}
    const monocrop = getBlueprintMonocropMultiplier(blueprint, perfections, seeds)
    metrics.diverseUnpenalized = structure.types.size >= 6 && monocrop >= 1
    metrics.infested = structure.infested
    if (pendingIds.has('controlledBurn') || pendingIds.has('youGetNothing')) {
      const income = getBaseFieldIncome(blueprint, perfections,
        game.trade?.rabbitContractsCompleted ?? 0,
        fortune.passiveEffectMultiplier, seeds, fortune.activeArea,
        fortune.leekEnrichmentExponent) * fortune.harvestMultiplier * fortune.cropYieldMultiplier
      metrics.controlledBurn = income > 0 && blueprint.cells.some((id, index) =>
        CROP_DEFINITIONS[id] && !CROP_DEFINITIONS[id].internalOnly &&
        isMirrorCornOverloaded(blueprint, index, perfections, seeds),
      )
      metrics.nothing = income <= 0 && getCropHamsterEfficiencyMultiplier(
        blueprint, perfections, 0, fortune.passiveEffectMultiplier, seeds,
      ) <= 0
    }
    if (needsCanola) {
      metrics.canola = getGlobalRowProductionEffects(blueprint, game.hamsters,
        perfections, fortune.passiveEffectMultiplier, seeds)
        .find((effect) => effect.sourceCropId === 'canola')?.multiplier ?? 1
    }
    metricCropIds.forEach((metric, id) => {
      if (!ACHIEVEMENTS.some((achievement) =>
        achievement.metric === metric[0] && pendingIds.has(achievement.id),
      )) return
      for (const index of structure.indicesByCrop.get(id) ?? []) {
        const stats = getBlueprintCropStats(blueprint, index, perfections, 0,
          game.hamsters, game.trade?.rabbitContractsCompleted ?? 0, fortune, seeds,
          game.trade?.totalRabbitRelationsEarned ?? 0)
        const value = metric[1]
          ? stats?.passiveStats.find((stat) => stat.id === metric[1])?.value ?? 0
          : stats?.harvestYield ?? 0
        metrics[metric[0]] = Math.max(metrics[metric[0]] ?? 0, value)
      }
    })
    return metrics
  })
}

// State snapshots retain awards. Stable blueprint/modifier inputs reuse metrics;
// crops, farmland and ticking timers are deliberately not cache dependencies.
export function awardAchievements(game, previousGame = null) {
  const earned = new Set(game.earnedAchievementIds ?? [])
  const pending = ACHIEVEMENTS.filter((achievement) => !earned.has(achievement.id))
  if (pending.length === 0) return game
  const pendingIds = new Set(pending.filter((achievement) => achievement.tier === 1)
    .map((achievement) => achievement.id))
  const eventMetrics = {}
  const previousBlueprint = previousGame?.blueprint
  if (previousBlueprint && previousBlueprint !== game.blueprint &&
      previousBlueprint.rows === game.blueprint.rows &&
      previousBlueprint.columns === game.blueprint.columns) {
    eventMetrics.cropRotation = previousBlueprint.cells.some((crop, index) =>
      crop === 'leek' && CROP_DEFINITIONS[game.blueprint.cells[index]] &&
      game.blueprint.cells[index] !== 'leek' && game.blueprint.cells[index] !== 'rootTunnel',
    )
    eventMetrics.backUnderControl =
      getBlueprintMonocropMultiplier(previousBlueprint,
        previousGame.completedCropPerfections, previousGame.seedAugmentations) < 1 &&
      getBlueprintMonocropMultiplier(game.blueprint,
        game.completedCropPerfections, game.seedAugmentations) >= 1
  }
  const fortune = getFortuneModifiers(game)
  const blueprints = pendingIds.size > 0
    ? [...new Set([game.blueprint, ...(game.blueprintSlots ?? [])])].filter(Boolean)
    : []
  const metrics = blueprints.map((blueprint) => getBlueprintMetrics(
    game, blueprint, fortune, pendingIds,
  ))
  for (const achievement of pending) {
    if (achievement.metric
      ? metrics.some((values) => values[achievement.metric] >= achievement.target)
      : achievement.condition(game, eventMetrics) ||
        metrics.some((values) => achievement.condition(game, values))) {
      earned.add(achievement.id)
    }
  }
  return earned.size === (game.earnedAchievementIds?.length ?? 0)
    ? game
    : { ...game, earnedAchievementIds: [...earned] }
}
