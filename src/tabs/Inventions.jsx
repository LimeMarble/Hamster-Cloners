import { CROP_PERFECTIONS } from '../game/crops.js'
import { ROW_DUPLICATORS_UNLOCK_CROP_COUNT } from '../game/gameLogic.js'
import { FormattedNumber } from './ui.jsx'

export function Inventions({
  game,
  activeInventionsTab,
  onActiveInventionsTabChange,
  blueprintExpansionTracks,
  canUnlockEnrichingLeek,
  canUnlockMirrorCorn,
  canUnlockLeechingGourd,
  canUnlockSamplingLentil,
  canUnlockSplitweed,
  canUnlockRows,
  hasEnrichingLeek,
  hasMirrorCorn,
  hasLeechingGourd,
  hasSamplingLentil,
  hasSplitweed,
  onUnlockEnrichingLeek,
  onUnlockMirrorCorn,
  onUnlockLeechingGourd,
  onUnlockSamplingLentil,
  onUnlockSplitweed,
  onRequestRowDuplicatorUnlock,
  onRequestBlueprintExpansion,
  pendingBlueprintExpansion,
  isRowDuplicatorUnlockPending,
  onCancelBlueprintExpansion,
  onConfirmBlueprintExpansion,
  onCancelRowDuplicatorUnlock,
  onConfirmRowDuplicatorUnlock,
}) {
  return (
    <>
      <section className="inventions-panel" aria-labelledby="inventions-title">
        <p className="eyebrow">Milestone inventions</p>
        <h1 id="inventions-title">Inventions</h1>
        <p className="inventions-intro">
          Reach a listed threshold, reset the current field, and unlock exactly
          what the invention advertises.
        </p>
        {game.hasUnlockedCropPerfection ? (
          <nav className="invention-tabs" aria-label="Invention categories">
            <button
              type="button"
              className={`invention-tab ${activeInventionsTab === 'blueprint' ? 'invention-tab-active' : ''}`}
              onClick={() => onActiveInventionsTabChange('blueprint')}
            >
              Blueprint
            </button>
            <button
              type="button"
              className={`invention-tab ${activeInventionsTab === 'cropPerfection' ? 'invention-tab-active' : ''}`}
              onClick={() => onActiveInventionsTabChange('cropPerfection')}
            >
              Crop Perfection
            </button>
          </nav>
        ) : null}
        {activeInventionsTab === 'cropPerfection' &&
        game.hasUnlockedCropPerfection ? (
          <section aria-labelledby="crop-perfection-title">
            <p className="eyebrow">Crop perfection</p>
            <h2 id="crop-perfection-title">Permanent crop refinements</h2>
            <article className="invention-card crop-perfection-card">
              <div>
                <p className="eyebrow">Leek perfection</p>
                <h2>
                  {hasEnrichingLeek
                    ? CROP_PERFECTIONS.enrichingLeek.name
                    : 'Enriching Leek'}
                </h2>
                <p>
                  Rename Leek to Enriching Leek and grant +5 Crop yield to
                  adjacent crops.
                </p>
              </div>
              {hasEnrichingLeek ? (
                <span className="invention-complete">Perfected</span>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={onUnlockEnrichingLeek}
                  disabled={!canUnlockEnrichingLeek}
                >
                  Spend{' '}
                  <FormattedNumber value={CROP_PERFECTIONS.enrichingLeek.cost} maximumFractionDigits={0} />{' '}
                  Crops
                </button>
              )}
            </article>
            {!hasEnrichingLeek ? (
              <p className="invention-progress">
                <FormattedNumber
                  value={Math.min(game.crops, CROP_PERFECTIONS.enrichingLeek.cost)}
                  maximumFractionDigits={0}
                />{' '}
                /{' '}
                <FormattedNumber value={CROP_PERFECTIONS.enrichingLeek.cost} maximumFractionDigits={0} />{' '}
                Crops
              </p>
            ) : null}
            <article className="invention-card crop-perfection-card">
              <div>
                <p className="eyebrow">Corn perfection</p>
                <h2>{CROP_PERFECTIONS.mirrorCorn.name}</h2>
                <p>
                  {CROP_PERFECTIONS.mirrorCorn.baseEffectDescription}.{' '}
                  {CROP_PERFECTIONS.mirrorCorn.effectDescription}.
                </p>
              </div>
              {hasMirrorCorn ? (
                <span className="invention-complete">Perfected</span>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={onUnlockMirrorCorn}
                  disabled={!canUnlockMirrorCorn}
                >
                  Spend{' '}
                  <FormattedNumber value={CROP_PERFECTIONS.mirrorCorn.cost} maximumFractionDigits={0} />{' '}
                  Crops
                </button>
              )}
            </article>
            {!hasMirrorCorn ? (
              <p className="invention-progress">
                <FormattedNumber
                  value={Math.min(game.crops, CROP_PERFECTIONS.mirrorCorn.cost)}
                  maximumFractionDigits={0}
                />{' '}
                /{' '}
                <FormattedNumber value={CROP_PERFECTIONS.mirrorCorn.cost} maximumFractionDigits={0} />{' '}
                Crops
              </p>
            ) : null}
            <article className="invention-card crop-perfection-card">
              <div>
                <p className="eyebrow">Pumpkin perfection</p>
                <h2>{CROP_PERFECTIONS.leechingGourd.name}</h2>
                <p>
                  Occupies one 2×2 block and gives all Turnips +5% effectiveness
                  per adjacent debuff, with harmful crops counting twice.
                </p>
              </div>
              {hasLeechingGourd ? (
                <span className="invention-complete">Perfected</span>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={onUnlockLeechingGourd}
                  disabled={!canUnlockLeechingGourd}
                >
                  Spend{' '}
                  <FormattedNumber value={CROP_PERFECTIONS.leechingGourd.cost} maximumFractionDigits={0} />{' '}
                  Crops
                </button>
              )}
            </article>
            {!hasLeechingGourd ? (
              <p className="invention-progress">
                <FormattedNumber
                  value={Math.min(game.crops, CROP_PERFECTIONS.leechingGourd.cost)}
                  maximumFractionDigits={0}
                />{' '}
                /{' '}
                <FormattedNumber value={CROP_PERFECTIONS.leechingGourd.cost} maximumFractionDigits={0} />{' '}
                Crops
              </p>
            ) : null}
            {game.hasUnlockedLentil ? (
              <>
                <article className="invention-card crop-perfection-card">
                  <div>
                    <p className="eyebrow">Lentil perfection</p>
                    <h2>{CROP_PERFECTIONS.samplingLentil.name}</h2>
                    <p>
                      Raises Lentil&apos;s global harvest boost from ×1.25 to
                      ×1.8. Each adjacent traded Crop also adds +1× to a
                      separate global harvest multiplier; that adjacency
                      multiplier cannot be boosted.
                    </p>
                  </div>
                  {hasSamplingLentil ? (
                    <span className="invention-complete">Perfected</span>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={onUnlockSamplingLentil}
                      disabled={!canUnlockSamplingLentil}
                    >
                      Spend{' '}
                      <FormattedNumber
                        value={CROP_PERFECTIONS.samplingLentil.cost}
                        maximumFractionDigits={0}
                      />{' '}
                      Crops
                    </button>
                  )}
                </article>
                {!hasSamplingLentil ? (
                  <p className="invention-progress">
                    <FormattedNumber
                      value={Math.min(
                        game.crops,
                        CROP_PERFECTIONS.samplingLentil.cost,
                      )}
                      maximumFractionDigits={0}
                    />{' '}
                    /{' '}
                    <FormattedNumber
                      value={CROP_PERFECTIONS.samplingLentil.cost}
                      maximumFractionDigits={0}
                    />{' '}
                    Crops
                  </p>
                ) : null}
              </>
            ) : null}
            {game.hasUnlockedRowDuplicators ? (
              <>
                <article className="invention-card crop-perfection-card">
                  <div>
                    <p className="eyebrow">Knotweed perfection</p>
                    <h2>{CROP_PERFECTIONS.splitweed.name}</h2>
                    <p>
                      Occupies one 2×2 block and suppresses global Crop passives
                      to ×0 unless Leeching Gourd nullifies the debuff.
                      Splitweed counts as eight debuff crops for Gourd adjacency
                      and gives +2 Monocrop limit and +0.5× Mirror Corn
                      effectiveness per planted Splitweed. These effects cannot
                      be boosted.
                    </p>
                  </div>
                  {hasSplitweed ? (
                    <span className="invention-complete">Perfected</span>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={onUnlockSplitweed}
                      disabled={!canUnlockSplitweed}
                    >
                      Spend{' '}
                      <FormattedNumber
                        value={CROP_PERFECTIONS.splitweed.cost}
                        maximumFractionDigits={0}
                      />{' '}
                      Crops
                    </button>
                  )}
                </article>
                {!hasSplitweed ? (
                  <p className="invention-progress">
                    <FormattedNumber
                      value={Math.min(
                        game.crops,
                        CROP_PERFECTIONS.splitweed.cost,
                      )}
                      maximumFractionDigits={0}
                    />{' '}
                    /{' '}
                    <FormattedNumber
                      value={CROP_PERFECTIONS.splitweed.cost}
                      maximumFractionDigits={0}
                    />{' '}
                    Crops
                  </p>
                ) : null}
              </>
            ) : null}
          </section>
        ) : (
          <>
            {blueprintExpansionTracks.map((track) => {
              const { nextExpansion } = track
              const completed = nextExpansion === undefined
              const canUnlock =
                nextExpansion !== undefined &&
                track.nextCost !== null &&
                game.crops >= track.nextCost

              return (
                <div key={track.id}>
                  <article className="invention-card milestone-invention-card">
                    <div>
                      <p className="eyebrow">
                        Progressive milestone ·{' '}
                        <FormattedNumber value={track.completedStageCount} maximumFractionDigits={0} /> /{' '}
                        <FormattedNumber value={track.stages.length} maximumFractionDigits={0} /> unlocked
                      </p>
                      <h2>{track.title}</h2>
                      {completed ? (
                        <p>All available stages in this expansion track are unlocked.</p>
                      ) : track.nextCost === null ? (
                        <p>
                          The next stage costs{' '}
                          <FormattedNumber value={nextExpansion.cost} maximumFractionDigits={0} />{' '}
                          Crops. Complete its prerequisite expansion first.
                        </p>
                      ) : (
                        <p>
                          Reset at{' '}
                          <FormattedNumber value={nextExpansion.cost} maximumFractionDigits={0} />{' '}
                          Crops to {nextExpansion.rewardDescription}.
                        </p>
                      )}
                    </div>
                    {completed ? (
                      <span className="invention-complete">Complete</span>
                    ) : (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => onRequestBlueprintExpansion(nextExpansion.id)}
                        disabled={!canUnlock}
                      >
                        Reset field &amp; unlock
                      </button>
                    )}
                  </article>
                  {!completed ? (
                    <p className="invention-progress">
                      <FormattedNumber value={Math.min(game.crops, nextExpansion.cost)} maximumFractionDigits={0} /> /{' '}
                      <FormattedNumber value={nextExpansion.cost} maximumFractionDigits={0} /> Crops
                    </p>
                  ) : null}
                </div>
              )
            })}
            <article className="invention-card milestone-invention-card row-duplicator-card">
              <div>
                <p className="eyebrow">Milestone invention</p>
                <h2>Row Duplicators</h2>
                <p>
                  Reset at{' '}
                  <FormattedNumber value={ROW_DUPLICATORS_UNLOCK_CROP_COUNT} maximumFractionDigits={0} />{' '}
                  Crops to unlock purchasable Row Duplicators.
                </p>
              </div>
              {game.hasUnlockedRowDuplicators ? (
                <span className="invention-complete">Complete</span>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={onRequestRowDuplicatorUnlock}
                  disabled={!canUnlockRows}
                >
                  Reset field &amp; unlock
                </button>
              )}
            </article>
            {!game.hasUnlockedRowDuplicators ? (
              <p className="invention-progress">
                <FormattedNumber
                  value={Math.min(game.crops, ROW_DUPLICATORS_UNLOCK_CROP_COUNT)}
                  maximumFractionDigits={0}
                />{' '}
                /{' '}
                <FormattedNumber value={ROW_DUPLICATORS_UNLOCK_CROP_COUNT} maximumFractionDigits={0} />{' '}
                Crops
              </p>
            ) : null}
          </>
        )}
      </section>

      {pendingBlueprintExpansion ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="union-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="blueprint-reset-title"
          >
            <p className="eyebrow">Milestone reset</p>
            <h2 id="blueprint-reset-title">Unlock {pendingBlueprintExpansion.title}?</h2>
            <p>
              This spends your current Crops and resets accumulated Columns to zero.
              Your hamster workforce stays, ready to rebuild the field.
            </p>
            <p>You will permanently {pendingBlueprintExpansion.rewardDescription}.</p>
            <div className="union-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onCancelBlueprintExpansion}
              >
                Not yet
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={onConfirmBlueprintExpansion}
              >
                Reset &amp; unlock
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isRowDuplicatorUnlockPending ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="union-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="row-duplicator-reset-title"
          >
            <p className="eyebrow">Milestone reset</p>
            <h2 id="row-duplicator-reset-title">Unlock Row Duplicators?</h2>
            <p>
              This spends your current Crops and resets the farmland to one
              starting Row and zero Columns. Your hamster workforce stays ready
              to rebuild.
            </p>
            <p>
              Hamsters will continue building only Columns. Purchasable Row
              Duplicators will become the only source of Rows on the Field tab.
            </p>
            <div className="union-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onCancelRowDuplicatorUnlock}
              >
                Not yet
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={onConfirmRowDuplicatorUnlock}
              >
                Reset &amp; unlock
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
