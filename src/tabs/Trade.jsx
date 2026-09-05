import {
  CAPYBARA_DEMONSTRATIONS,
  RABBIT_BLAZING_CONTRACT_RATE,
  RABBIT_UNLOCK_IDS,
  RABBIT_UNLOCKS,
  TRADE_ESTABLISHMENT_COST,
  getCapybaraDemonstrationStatus,
  hasCompletedCapybaraDemonstration,
  CAPYBARA_DEMONSTRATION_IDS,
  getRabbitRelationsMultiplier,
  hasRabbitUnlock,
} from '../game/gameLogic.js'
import { getCropName } from '../game/crops.js'
import { BlazingCarrotPerfection } from './BlazingCarrotPerfection.jsx'
import { CropVisual } from './CropVisual.jsx'
import { FormattedNumber } from './ui.jsx'
import { ManateeRelations } from './ManateeRelations.jsx'

function EstablishTradeCard({ game, onEstablishTrade }) {
  const canAfford = game.crops >= TRADE_ESTABLISHMENT_COST

  return (
    <article className="trade-establishment-card">
      <div>
        <p className="eyebrow">New gameplay system</p>
        <h2>Establish trade relations</h2>
        <p>
          Open a permanent trade route without resetting any progress. Your
          first trading partners will be the Rabbits.
        </p>
      </div>
      <div className="trade-establishment-action">
        <strong>
          <FormattedNumber
            value={TRADE_ESTABLISHMENT_COST}
            maximumFractionDigits={0}
          />{' '}
          Crops
        </strong>
        <button
          type="button"
          className="trade-primary-button"
          onClick={onEstablishTrade}
          disabled={!canAfford}
        >
          Establish relations
        </button>
      </div>
    </article>
  )
}

function RabbitContract({
  game,
  contract,
  contractIndex,
  productionPerSecond,
  onClaimRabbitContract,
}) {
  if (!contract) {
    return (
      <article className="rabbit-contract-card">
        <p>The Rabbits are preparing this contract.</p>
      </article>
    )
  }

  const cropName = getCropName(
    contract.cropId,
    game.completedCropPerfections,
  )
  const progress = Math.min(
    1,
    Math.max(0, contract.progress / contract.requiredAmount),
  )
  const canClaim = contract.progress >= contract.requiredAmount

  return (
    <article className="rabbit-contract-card">
      <div className="rabbit-contract-heading">
        <div className="rabbit-contract-crop">
          <CropVisual
            cropId={contract.cropId}
            completedCropPerfections={game.completedCropPerfections}
            className="rabbit-contract-crop-visual"
          />
          <div>
            <p className="eyebrow">Rabbit contract {contractIndex + 1}</p>
            <h3>Deliver {cropName}</h3>
          </div>
        </div>
        <strong className="relations-reward">
          +<FormattedNumber
            value={contract.relationsReward}
            maximumFractionDigits={0}
          />{' '}
          relations
        </strong>
      </div>

      <p className="trade-copy">
        Contract progress counts this crop&apos;s real harvest while the
        contract is active.
      </p>

      <div
        className="rabbit-contract-track"
        role="progressbar"
        aria-label={`${cropName} contract progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 1000) / 10}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="rabbit-contract-values">
        <span>
          <FormattedNumber value={contract.progress} /> /{' '}
          <FormattedNumber value={contract.requiredAmount} /> {cropName}
        </span>
        <span>
          <FormattedNumber value={productionPerSecond} /> / sec
        </span>
      </div>

      <button
        type="button"
        className="trade-primary-button"
        onClick={() => onClaimRabbitContract(contractIndex)}
        disabled={!canClaim}
      >
        {canClaim ? 'Complete contract' : 'Delivery in progress'}
      </button>
    </article>
  )
}

function RabbitUnlocks({
  game,
  canUnlockBlazingCarrot,
  hasBlazingCarrot,
  onPurchaseRabbitUnlock,
  onUnlockBlazingCarrot,
}) {
  return (
    <section className="rabbit-unlocks" aria-labelledby="rabbit-unlocks-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Spend Rabbit relations</p>
          <h2 id="rabbit-unlocks-title">Rabbit unlocks</h2>
        </div>
      </div>
      <div className="rabbit-unlock-grid">
        {RABBIT_UNLOCKS.map((unlock) => {
          const isPurchased = hasRabbitUnlock(game, unlock.id)
          const canAfford = game.trade.rabbitRelations >= unlock.cost

          return (
            <article
              className={`rabbit-unlock-card ${
                isPurchased ? 'rabbit-unlock-purchased' : ''
              }`}
              key={unlock.id}
            >
              <div>
                <h3>{unlock.name}</h3>
                <p>{unlock.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onPurchaseRabbitUnlock(unlock.id)}
                disabled={isPurchased || !canAfford}
              >
                {isPurchased ? (
                  'Unlocked'
                ) : (
                  <>
                    <FormattedNumber
                      value={unlock.cost}
                      maximumFractionDigits={0}
                    />{' '}
                    relations
                  </>
                )}
              </button>
            </article>
          )
        })}
      </div>
      <BlazingCarrotPerfection
        game={game}
        canUnlock={canUnlockBlazingCarrot}
        hasUnlocked={hasBlazingCarrot}
        onUnlock={onUnlockBlazingCarrot}
      />
    </section>
  )
}

function CapybaraDemonstrations({
  game,
  blueprintCropYield,
  onCompleteCapybaraDemonstration,
}) {
  return (
    <section
      className="trading-group capybara-demonstrations"
      aria-labelledby="capybaras-title"
    >
      <div className="trading-group-title">
        <span className="capybara-mark" aria-hidden="true">C</span>
        <div>
          <p className="eyebrow">Technological partner</p>
          <h2 id="capybaras-title">Capybaras</h2>
        </div>
      </div>
      <p className="trade-copy capybara-lore">
        The Capybaras are too technologically advanced to want anything you
        can currently offer. They are willing to share their knowledge if you
        can pass their demonstrations.
      </p>

      <div className="capybara-demonstration-list">
        {CAPYBARA_DEMONSTRATIONS.map((demonstration) => {
          const status = getCapybaraDemonstrationStatus(
            game,
            demonstration.id,
            { blueprintCropYield },
          )
          const hasSecondaryObjective = Boolean(status.secondaryObjective)
          const usesDevelopmentGoals =
            demonstration.metric === 'manateeDevelopmentGoals'
          const progressLabel = usesDevelopmentGoals
            ? 'Development Goals completed'
            : 'Blueprint Crop yield'
          const statusLabel = status.secondaryCompleted
            ? 'Mastered'
            : status.completed
              ? hasSecondaryObjective
                ? 'Passed · Bonus challenge'
                : 'Passed'
              : !status.hasPrerequisite
                ? 'Locked'
                : !status.restrictionsMet
                  ? 'Restricted'
                  : 'In progress'
          const buttonLabel = status.completed
            ? hasSecondaryObjective
              ? status.secondaryCompleted
                ? 'Secondary condition cleared'
                : status.canComplete
                  ? 'Clear secondary condition'
                  : status.hasReachedGoal
                    ? 'Secondary condition not met'
                    : 'Goal not reached'
              : 'Demonstration passed'
            : !status.hasPrerequisite
              ? `Complete Demonstration ${demonstration.number - 1} first`
              : !status.restrictionsMet
                ? 'Restrictions not met'
                : status.canComplete
                  ? 'Pass demonstration'
                  : 'Goal not reached'

          return (
            <article
              className={'capybara-demonstration-card' +
                (status.completed ? ' capybara-demonstration-completed' : '')}
              key={demonstration.id}
            >
              <div className='capybara-demonstration-heading'>
                <div>
                  <p className='eyebrow'>
                    Demonstration {demonstration.number}
                  </p>
                  <h3>{demonstration.name}</h3>
                </div>
                <strong>{statusLabel}</strong>
              </div>

              <p className='trade-copy'>
                {usesDevelopmentGoals ? (
                  demonstration.goal
                ) : (
                  <>
                    Have a field blueprint with a Crop yield of at least{' '}
                    <FormattedNumber value={demonstration.target} /> Crops.
                  </>
                )}
              </p>
              <div
                className='rabbit-contract-track'
                role='progressbar'
                aria-label={
                  'Demonstration ' + demonstration.number + ' progress'
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(status.progress * 1000) / 10}
              >
                <span
                  style={{ width: String(status.progress * 100) + '%' }}
                />
              </div>
              <div className='capybara-demonstration-value'>
                <span>{progressLabel}</span>
                <strong>
                  <FormattedNumber value={status.current} /> /{' '}
                  <FormattedNumber value={demonstration.target} />{' '}
                  {usesDevelopmentGoals ? 'Goals' : 'Crops'}
                </strong>
              </div>

              <dl className='capybara-demonstration-details'>
                <div>
                  <dt>Restrictions</dt>
                  <dd>
                    {demonstration.restrictions.length > 0
                      ? demonstration.restrictions.join(', ')
                      : 'None'}
                  </dd>
                </div>
                <div>
                  <dt>Reward</dt>
                  <dd>
                    <strong>{demonstration.rewardName}</strong>
                    {demonstration.rewardDescription ? (
                      <>
                        {demonstration.rewardJoiner ?? ' — '}
                        {demonstration.rewardDescription}
                      </>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>Hint</dt>
                  <dd>{demonstration.hint}</dd>
                </div>
              </dl>

              {status.secondaryVisible ? (
                <div className='capybara-secondary-objective'>
                  <p className='eyebrow'>Secondary condition revealed</p>
                  <h4>{status.secondaryObjective.condition}</h4>
                  <p>
                    <strong>
                      {status.secondaryCompleted
                        ? 'Cleared'
                        : status.secondaryConditionMet
                          ? 'Condition met'
                          : 'Condition not met'}
                    </strong>
                  </p>
                  <p>
                    <strong>{status.secondaryObjective.rewardName}</strong> —{' '}
                    {status.secondaryObjective.rewardDescription}
                  </p>
                </div>
              ) : null}

              <button
                type='button'
                className='trade-primary-button'
                onClick={() =>
                  onCompleteCapybaraDemonstration(demonstration.id)
                }
                disabled={!status.canComplete}
              >
                {buttonLabel}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
export function Trade({
  game,
  activeRelation,
  activeManateeZone,
  rabbitContractProductionPerSecondByCrop,
  capybaraBlueprintCropYield,
  canUnlockBlazingCarrot,
  hasBlazingCarrot,
  onActiveRelationChange,
  onActiveManateeZoneChange,
  onEstablishTrade,
  onClaimRabbitContract,
  onPurchaseRabbitUnlock,
  onUnlockBlazingCarrot,
  onCompleteCapybaraDemonstration,
  onStartManateeSurvey,
  onCancelManateeSurvey,
  onCollectManateeFind,
  onConstructManateeBuilding,
  onUpgradeManateeBuilding,
  onCompleteManateeDevelopmentGoal,
  onToggleWetlandsObstruction,
  onClearWetlandsObstructions,
}) {
  const hasCapybaraContact = hasRabbitUnlock(
    game,
    RABBIT_UNLOCK_IDS.CAPYBARA_CONTACT,
  )
  const hasManateeContact = hasCompletedCapybaraDemonstration(
    game,
    CAPYBARA_DEMONSTRATION_IDS.DEMONSTRATION_ONE,
  )
  const rabbitContracts = game.trade.rabbitContracts ?? []
  const rabbitContractsCompleted =
    game.trade.rabbitContractsCompleted ?? 0
  const rabbitRelationsMultiplier = getRabbitRelationsMultiplier(
    game.blueprint,
    game.completedCropPerfections,
  )
  const rabbitContractCompletionRate =
    game.trade.rabbitContractEstimatedCompletionsPerSecond ?? 0
  const hasBlazingContractPace =
    game.trade.rabbitContractsBlazing === true

  return (
    <section className="trade-panel" aria-labelledby="trade-title">
      <header className="trade-header">
        <div>
          <p className="eyebrow">Inter-farm exchange</p>
          <h1 id="trade-title">Trade</h1>
          <p className="trade-copy">
            Fulfill crop-specific contracts and spend the relations you earn
            on permanent unlocks.
          </p>
        </div>
        {game.trade.established && activeRelation === 'rabbits' ? (
          <div className="relations-balance">
            <span>Rabbit relations</span>
            <strong>
              <FormattedNumber
                value={game.trade.rabbitRelations}
                maximumFractionDigits={0}
              />
            </strong>
          </div>
        ) : null}
      </header>

      {game.trade.established ? (
        <>
          <nav className="trade-relation-tabs" aria-label="Trade relations">
            <button
              type="button"
              className={`trade-relation-tab ${activeRelation === 'rabbits' ? 'trade-relation-tab-active' : ''}`}
              onClick={() => onActiveRelationChange('rabbits')}
              aria-pressed={activeRelation === 'rabbits'}
            >
              Rabbits
            </button>
            {hasCapybaraContact ? (
              <button
                type="button"
                className={`trade-relation-tab ${activeRelation === 'capybaras' ? 'trade-relation-tab-active' : ''}`}
                onClick={() => onActiveRelationChange('capybaras')}
                aria-pressed={activeRelation === 'capybaras'}
              >
                Capybaras
              </button>
            ) : null}
            {hasManateeContact ? (
              <button
                type="button"
                className={`trade-relation-tab ${activeRelation === 'manatees' ? 'trade-relation-tab-active' : ''}`}
                onClick={() => onActiveRelationChange('manatees')}
                aria-pressed={activeRelation === 'manatees'}
              >
                Manatees
              </button>
            ) : null}
          </nav>

          {activeRelation === 'rabbits' ? (
            <div className="trade-relation-panel">
              <section className="trading-group" aria-labelledby="rabbits-title">
                <div className="trading-group-title">
                  <span aria-hidden="true">🐇</span>
                  <div>
                    <p className="eyebrow">Trading partner</p>
                    <h2 id="rabbits-title">Rabbits</h2>
                  </div>
                </div>
                <p className="trade-copy rabbit-lore">
                  The Rabbits insist they dislike apples, pumpkins, and pesky
                  weeds. Whether that is accurate rabbit lore is another question.
                </p>
                <div className="rabbit-contract-summary">
                  <span>
                    Contracts completed: <strong><FormattedNumber value={rabbitContractsCompleted} maximumFractionDigits={0} /></strong>
                  </span>
                  <span>
                    Relation rewards: <strong>×<FormattedNumber value={rabbitRelationsMultiplier} maximumFractionDigits={3} /></strong>
                  </span>
                </div>
                <div className="rabbit-contract-grid">
                  {hasBlazingContractPace ? (
                    <article className="rabbit-contract-card rabbit-contract-card-blazing">
                      <p className="eyebrow">Rabbit contracts</p>
                      <h3>
                        Rabbit contracts are being completed at a blazing fast
                        pace.
                      </h3>
                      <p className="trade-copy">
                        Current pace: approximately{' '}
                        <FormattedNumber
                          value={rabbitContractCompletionRate}
                          maximumFractionDigits={2}
                        />{' '}
                        contracts per second, estimated from the slowest grown
                        eligible Crop and an average-sized contract. This is
                        above the{' '}
                        <FormattedNumber
                          value={RABBIT_BLAZING_CONTRACT_RATE}
                          maximumFractionDigits={0}
                        />{' '}
                        per-second display limit.
                      </p>
                    </article>
                  ) : (
                    rabbitContracts.map((contract, contractIndex) => (
                      <RabbitContract
                        game={game}
                        contract={contract}
                        contractIndex={contractIndex}
                        key={contractIndex}
                        productionPerSecond={Math.max(
                          0,
                          Number(
                            rabbitContractProductionPerSecondByCrop?.[
                              contract?.cropId
                            ],
                          ) || 0,
                        )}
                        onClaimRabbitContract={onClaimRabbitContract}
                      />
                    ))
                  )}
                </div>
              </section>
              <RabbitUnlocks
                game={game}
                canUnlockBlazingCarrot={canUnlockBlazingCarrot}
                hasBlazingCarrot={hasBlazingCarrot}
                onPurchaseRabbitUnlock={onPurchaseRabbitUnlock}
                onUnlockBlazingCarrot={onUnlockBlazingCarrot}
              />
            </div>
          ) : activeRelation === 'capybaras' && hasCapybaraContact ? (
            <CapybaraDemonstrations
              game={game}
              blueprintCropYield={capybaraBlueprintCropYield}
              onCompleteCapybaraDemonstration={
                onCompleteCapybaraDemonstration
              }
            />
          ) : activeRelation === 'manatees' && hasManateeContact ? (
            <ManateeRelations
              game={game}
              activeZone={activeManateeZone}
              onActiveZoneChange={onActiveManateeZoneChange}
              onStartManateeSurvey={onStartManateeSurvey}
              onCancelManateeSurvey={onCancelManateeSurvey}
              onCollectManateeFind={onCollectManateeFind}
              onConstructManateeBuilding={
                onConstructManateeBuilding
              }
              onUpgradeManateeBuilding={onUpgradeManateeBuilding}
              onCompleteManateeDevelopmentGoal={
                onCompleteManateeDevelopmentGoal
              }
              onToggleWetlandsObstruction={onToggleWetlandsObstruction}
              onClearWetlandsObstructions={onClearWetlandsObstructions}
            />
          ) : null}
        </>
      ) : (
        <EstablishTradeCard
          game={game}
          onEstablishTrade={onEstablishTrade}
        />
      )}
    </section>
  )
}
