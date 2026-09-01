import {
  MANATEE_RESOURCES,
  MANATEE_ZONE_IDS,
  MANATEE_ZONES,
  getBlazingCarrotSurveyTimeEffect,
  getFortuneModifiers,
  getHamsterCoordinationMultiplier,
  normalizeManateeState,
} from '../game/gameLogic.js'
import { MarshZone } from './MarshZone.jsx'
import { UnderwaterMarsh } from './UnderwaterMarsh.jsx'
import { FormattedNumber } from './ui.jsx'

function ManateeResources({ resources }) {
  return (
    <dl className="manatee-resource-grid" aria-label="Manatee resources">
      {Object.values(MANATEE_RESOURCES).map((resource) => (
        <div key={resource.id}>
          <dt>{resource.name}</dt>
          <dd>
            <span
              className={`manatee-resource-icon manatee-resource-icon-${resource.iconClass}`}
              aria-hidden="true"
            />
            <FormattedNumber
              value={resources[resource.id]}
              maximumFractionDigits={0}
            />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ManateeRelations({
  game,
  activeZone,
  onActiveZoneChange,
  onStartManateeSurvey,
  onCollectManateeFind,
  onConstructManateeBuilding,
  onUpgradeManateeBuilding,
}) {
  const state = normalizeManateeState(game.manatees)
  const selectedZone = MANATEE_ZONES.some((zone) => zone.id === activeZone)
    ? activeZone
    : MANATEE_ZONE_IDS.MARSH
  const coordination = getHamsterCoordinationMultiplier(
    game.hamsters,
    game.postUnionHamstersHired,
  )
  const surveyTimeEffect = getBlazingCarrotSurveyTimeEffect(
    game.blueprint,
    game.completedCropPerfections,
    game.trade?.totalRabbitRelationsEarned ?? 0,
    getFortuneModifiers(game.fortune).passiveEffectMultiplier,
    game.seedAugmentations,
  )

  return (
    <section className="trading-group manatee-relations" aria-labelledby="manatees-title">
      <div className="trading-group-title">
        <span aria-hidden="true">🌊</span>
        <div>
          <p className="eyebrow">New territory</p>
          <h2 id="manatees-title">Manatees</h2>
        </div>
      </div>
      <p className="trade-copy">
        The Manatees have no use for ordinary trade goods, but they will let
        your hamsters survey their territory and help with construction.
      </p>
      <ManateeResources resources={state.resources} />

      <nav className="manatee-zone-tabs" aria-label="Manatee zones">
        {MANATEE_ZONES.map((zone) => (
          <button
            type="button"
            className={`manatee-zone-tab ${selectedZone === zone.id ? 'manatee-zone-tab-active' : ''}`}
            key={zone.id}
            onClick={() => onActiveZoneChange(zone.id)}
            aria-pressed={selectedZone === zone.id}
            title={zone.description}
          >
            {zone.name}
          </button>
        ))}
      </nav>

      {selectedZone === MANATEE_ZONE_IDS.UNDERWATER_MARSH ? (
        <UnderwaterMarsh
          game={game}
          state={state}
          coordination={coordination}
          surveyTimeEffect={surveyTimeEffect}
          onStartSurvey={onStartManateeSurvey}
          onCollectFind={onCollectManateeFind}
          onConstructBuilding={onConstructManateeBuilding}
          onUpgradeBuilding={onUpgradeManateeBuilding}
        />
      ) : (
        <MarshZone
          game={game}
          state={state}
          coordination={coordination}
          surveyTimeEffect={surveyTimeEffect}
          onStartSurvey={onStartManateeSurvey}
          onCollectFind={onCollectManateeFind}
          onConstructBuilding={onConstructManateeBuilding}
          onUpgradeBuilding={onUpgradeManateeBuilding}
        />
      )}
    </section>
  )
}
