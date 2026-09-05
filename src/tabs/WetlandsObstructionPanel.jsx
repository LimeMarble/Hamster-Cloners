import {
  MANATEE_PRIMITIVE_OBSTRUCTION,
  MANATEE_RESOURCES,
} from '../game/gameLogic.js'
import { FormattedNumber } from './ui.jsx'

export function WetlandsObstructionPanel({
  resources,
  availableHamsters,
  availableDivingGear,
}) {
  return (
    <section
      className="wetlands-obstruction-config"
      aria-label="Primitive Obstruction construction"
    >
      <div>
        <p className="eyebrow">Estuary infrastructure</p>
        <h4>{MANATEE_PRIMITIVE_OBSTRUCTION.name}</h4>
        <p>
          Construction takes{' '}
          <strong>
            <FormattedNumber
              value={MANATEE_PRIMITIVE_OBSTRUCTION.constructionSeconds}
              maximumFractionDigits={0}
            />{' '}
            seconds
          </strong>{' '}
          and temporarily reserves{' '}
          <FormattedNumber
            value={MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew}
            maximumFractionDigits={0}
          />{' '}
          hamsters with diving gear. The same crew remains assigned for
          maintenance after the gear is recovered.
        </p>
      </div>
      <dl>
        {Object.entries(MANATEE_PRIMITIVE_OBSTRUCTION.cost).map(
          ([resourceId, amount]) => (
            <div key={resourceId}>
              <dt>{MANATEE_RESOURCES[resourceId].name}</dt>
              <dd>
                <FormattedNumber
                  value={resources[resourceId]}
                  maximumFractionDigits={0}
                />{' '}
                /{' '}
                <FormattedNumber value={amount} maximumFractionDigits={0} />
              </dd>
            </div>
          ),
        )}
        <div>
          <dt>Available hamsters</dt>
          <dd>
            <FormattedNumber
              value={availableHamsters}
              maximumFractionDigits={0}
            />{' '}
            /{' '}
            <FormattedNumber
              value={MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew}
              maximumFractionDigits={0}
            />
          </dd>
        </div>
        <div>
          <dt>Available diving gear</dt>
          <dd>
            <FormattedNumber
              value={availableDivingGear}
              maximumFractionDigits={0}
            />{' '}
            /{' '}
            <FormattedNumber
              value={MANATEE_PRIMITIVE_OBSTRUCTION.hamsterCrew}
              maximumFractionDigits={0}
            />
          </dd>
        </div>
      </dl>
    </section>
  )
}
