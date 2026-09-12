import {
  CLOVER_ASSEMBLY_PART_REQUIREMENT,
  CLOVER_ASSEMBLY_PARTS,
  GAME_AREA_IDS,
  GREATER_BLUEPRINTING_COST,
  RABBIT_UNLOCK_IDS,
  hasRabbitUnlock,
  normalizeCloverAssemblyState,
} from '../game/gameLogic.js'
import { getCropName } from '../game/crops.js'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'

function CloverAssemblyPart({ game, part, progress }) {
  const progressRatio = Math.min(
    1,
    progress / CLOVER_ASSEMBLY_PART_REQUIREMENT,
  )

  return (
    <article className="clover-assembly-part">
      <div className="clover-assembly-part-heading">
        <CropVisual
          cropId={part.cropId}
          completedCropPerfections={game.completedCropPerfections}
          className="clover-assembly-crop-icon"
        />
        <div>
          <h3>{part.name}</h3>
          <p>
            Harvested from{' '}
            {getCropName(part.cropId, game.completedCropPerfections)}
          </p>
        </div>
      </div>
      <div
        className="clover-assembly-progress-track"
        role="progressbar"
        aria-label={`${part.name} progress`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progressRatio * 1000) / 10}
      >
        <span style={{ width: `${progressRatio * 100}%` }} />
      </div>
      <p className="clover-assembly-progress-copy">
        <FormattedNumber value={progress} /> /{' '}
        <FormattedNumber value={CLOVER_ASSEMBLY_PART_REQUIREMENT} />{' '}
        {getCropName(part.cropId, game.completedCropPerfections)} harvest
      </p>
    </article>
  )
}

export function CloverAssembly({
  game,
  canUnlockGreaterBlueprinting,
  isCloverAssemblyReady,
  onUnlockGreaterBlueprinting,
  onCompleteCloverAssembly,
}) {
  const hasGreaterBlueprinting =
    game.hasUnlockedGreaterBlueprinting === true
  const hasRabbitsCharm = hasRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.RABBITS_CHARM,
  )
  const assembly = normalizeCloverAssemblyState(game.cloverAssembly)
  const isInMisfortune = game.activeArea === GAME_AREA_IDS.MISFORTUNE
  const mainFieldCrops = isInMisfortune
    ? Math.max(0, Number(game.areaProgress?.main?.crops) || 0)
    : Math.max(0, Number(game.crops) || 0)

  return (
    <>
      <article className="invention-card crop-perfection-card">
        <div>
          <p className="eyebrow">Clover perfection precursor</p>
          <h2>Greater Blueprinting</h2>
          <p>
            Develop the precision plans needed to reveal and construct the
            5-Leaf Clover assembly. This research uses Crops from the main
            field and does not reset it.
          </p>
        </div>
        {hasGreaterBlueprinting ? (
          <span className="invention-complete">Researched</span>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={onUnlockGreaterBlueprinting}
            disabled={!canUnlockGreaterBlueprinting}
          >
            {isInMisfortune ? (
              'Main field only'
            ) : (
              <>
                Spend <FormattedNumber value={GREATER_BLUEPRINTING_COST} />{' '}
                Crops
              </>
            )}
          </button>
        )}
      </article>
      {!hasGreaterBlueprinting ? (
        <p className="invention-progress">
          <FormattedNumber
            value={Math.min(mainFieldCrops, GREATER_BLUEPRINTING_COST)}
          />{' '}
          / <FormattedNumber value={GREATER_BLUEPRINTING_COST} /> main-field
          Crops
        </p>
      ) : null}

      {hasGreaterBlueprinting ? (
        <section
          className="clover-assembly"
          aria-labelledby="clover-assembly-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Clover perfection</p>
              <h2 id="clover-assembly-title">5-Leaf Clover assembly</h2>
            </div>
            {assembly.assembled ? (
              <span className="invention-complete">Assembled</span>
            ) : null}
          </div>
          <p>
            Fabricate each part from its Crop&apos;s real harvest in Misfortune.
            Part harvest also remains part of your normal Crop income.
          </p>
          {!hasRabbitsCharm ? (
            <p className="clover-assembly-lock">
              Rabbit&apos;s Charm is still required to fit these pieces together.
            </p>
          ) : !isInMisfortune && !assembly.assembled ? (
            <p className="clover-assembly-lock">
              Enter Misfortune to begin fabricating the four parts.
            </p>
          ) : null}
          <div className="clover-assembly-parts">
            {CLOVER_ASSEMBLY_PARTS.map((part) => (
              <CloverAssemblyPart
                game={game}
                key={part.id}
                part={part}
                progress={assembly.partProgress[part.id]}
              />
            ))}
          </div>
          {assembly.assembled ? (
            <p className="clover-assembly-complete-copy">
              The 5-Leaf Clover is assembled. Its greater fortunes have yet to
              reveal themselves.
            </p>
          ) : (
            <button
              type="button"
              className="primary-button clover-assembly-complete-button"
              onClick={onCompleteCloverAssembly}
              disabled={!hasRabbitsCharm || !isCloverAssemblyReady}
            >
              {hasRabbitsCharm
                ? isCloverAssemblyReady
                  ? 'Assemble 5-Leaf Clover'
                  : 'Fabricate all four parts'
                : "Requires Rabbit's Charm"}
            </button>
          )}
        </section>
      ) : null}
    </>
  )
}
