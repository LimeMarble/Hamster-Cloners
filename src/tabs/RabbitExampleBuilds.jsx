import { useState } from 'react'
import { getCropName } from '../game/crops.js'
import { CropVisual } from './CropVisual.jsx'
import { getRabbitExampleBuild, RABBIT_EXAMPLE_RECIPIENT } from './rabbitExampleBuilds.js'

function ExampleGrid({ blueprint, perfections }) {
  return (
    <div className="rabbit-example-grid" role="group" aria-label="Example 3 by 3 contract harvest layout">
      {blueprint.cells.map((cropId, index) => {
        const label = cropId === RABBIT_EXAMPLE_RECIPIENT
          ? 'Contract crop'
          : cropId ? getCropName(cropId, perfections) : 'Empty tile'
        return (
          <div
            className={'rabbit-example-tile' + (cropId === RABBIT_EXAMPLE_RECIPIENT
              ? ' rabbit-example-recipient' : '')}
            key={index}
            aria-label={'Row ' + (Math.floor(index / 3) + 1) + ', column ' +
              (index % 3 + 1) + ': ' + label}
            title={label}
          >
            {cropId === RABBIT_EXAMPLE_RECIPIENT ? (
              <span>Contract<br />crop</span>
            ) : cropId ? (
              <CropVisual cropId={cropId} completedCropPerfections={perfections}
                className="rabbit-example-crop-icon" />
            ) : null}
          </div>
        )
      })}
      <svg className="rabbit-example-reflections" viewBox="0 0 3 3" aria-hidden="true">
        {blueprint.mirrorCornTargets.map((target, index) => target === null ? null : (
          <line key={index} x1={index % 3 + 0.5} y1={Math.floor(index / 3) + 0.5}
            x2={target % 3 + 0.5} y2={Math.floor(target / 3) + 0.5} />
        ))}
      </svg>
    </div>
  )
}

export function RabbitExampleBuildsGuide({ game }) {
  const example = getRabbitExampleBuild(game)
  const perfections = game.completedCropPerfections ?? []
  const leekName = getCropName('leek', perfections)
  const turnipName = getCropName('turnip', perfections)

  return (
    <div className="rabbit-example-guide">
      <p className="trade-copy">
        A repeatable harvest module for Rabbit contracts. The contract crop can
        change without changing the layout.
      </p>
      <div className="rabbit-example-layout">
        <figure className="rabbit-example-figure">
          <ExampleGrid blueprint={example.blueprint} perfections={perfections} />
          <figcaption>
            {example.usesDiagonalEnrichment ? 'Diagonal harvest setup' : 'Orthogonal harvest setup'}
          </figcaption>
        </figure>
        <div className="rabbit-example-explanation">
          <h3>How it works</h3>
          <p>
            The Turnips boost the central {leekName}, which adds harvest to the
            contract crop. Repeat the module for crops that need more harvest.
          </p>
          {example.hasMirrorCorn ? (
            <p>
              Aim all {example.reflectionCount === 2 ? 'two' : 'three'} Mirror
              Corn reflections at the central {leekName}, as shown by the yellow
              lines, not at the contract crop.
            </p>
          ) : (
            <p>Perfect Corn into Mirror Corn to add reflections to this setup.</p>
          )}
          <p>
            {example.usesDiagonalEnrichment
              ? 'Diagonal Enrichment lets the contract crop sit in the corner, leaving room for four Turnips.'
              : 'Keep the contract crop directly beside the Leek until Diagonal Enrichment is purchased.'}
          </p>
          {!example.hasEnrichingLeek ? (
            <p className="rabbit-example-prerequisite">Requires Enriching Leek to add harvest to adjacent crops.</p>
          ) : null}
          {!example.eligibleCropIds.includes('turnip') ? (
            <p className="rabbit-example-prerequisite">Unlock Turnip before adding the Turnip tiles.</p>
          ) : null}
        </div>
      </div>
      <section className="rabbit-example-support" aria-labelledby="rabbit-example-support-title">
        <h3 id="rabbit-example-support-title">Which crops need a separate setup?</h3>
        <p><strong>{leekName} and {turnipName}:</strong> harvested by the support tiles; no separate setup needed.</p>
        <p>
          <strong>Corn:</strong>{' '}
          {example.hasMirrorCorn && example.usesDiagonalEnrichment
            ? 'your Mirror Corn tiles also receive diagonal Leek enrichment, so no separate setup is needed.'
            : 'use a separate harvest setup until you have Mirror Corn and Diagonal Enrichment.'}
        </p>
        <p>Use the contract crop tile for other eligible crops, or Corn while it still needs its own setup.</p>
      </section>
      <section aria-labelledby="rabbit-example-crops-title">
        <h3 id="rabbit-example-crops-title">Currently eligible recipient crops</h3>
        <div className="rabbit-example-crop-list">
          {example.recipientCropIds.map((cropId) => (
            <span className="rabbit-example-crop-chip" key={cropId}>
              <CropVisual cropId={cropId} completedCropPerfections={perfections}
                className="rabbit-example-list-icon" />
              {getCropName(cropId, perfections)}
            </span>
          ))}
        </div>
        {example.recipientCropIds.length === 0 ? <p>No recipient crops unlocked yet.</p> : null}
        <p className="trade-copy">Only crops accepted by Rabbit contracts are listed here.</p>
      </section>
      <p className="trade-copy">This is a reference only. Opening it does not change your blueprint or pause production.</p>
    </div>
  )
}

export function RabbitExampleBuilds({ game }) {
  const [isOpen, setIsOpen] = useState(false)

  function openGuide(event) {
    // Native dialog handles keyboard focus, Escape, and blocking background input.
    event.currentTarget.nextElementSibling.showModal()
    setIsOpen(true)
  }

  function closeFromBackdrop(event) {
    if (event.target !== event.currentTarget) return
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect()
    if (event.clientX < left || event.clientX > right ||
        event.clientY < top || event.clientY > bottom) {
      event.currentTarget.close()
    }
  }

  return (
    <div className="rabbit-example-launcher">
      <button type="button" className="trade-primary-button" aria-haspopup="dialog"
        aria-expanded={isOpen} onClick={openGuide}>Example builds</button>
      <dialog className="rabbit-example-dialog" aria-labelledby="rabbit-example-builds-title"
        onClose={() => setIsOpen(false)} onClick={closeFromBackdrop}>
        <header className="rabbit-example-heading">
          <div>
            <p className="eyebrow">Rabbit contracts</p>
            <h2 id="rabbit-example-builds-title">Example builds</h2>
          </div>
          <form method="dialog">
            <button className="icon-button" aria-label="Close example builds" autoFocus>×</button>
          </form>
        </header>
        {isOpen ? <RabbitExampleBuildsGuide game={game} /> : null}
      </dialog>
    </div>
  )
}
