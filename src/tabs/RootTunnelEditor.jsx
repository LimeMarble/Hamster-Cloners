import { getCropName } from '../game/crops.js'
import { isMirrorCornTunnelConnection } from '../game/rootTunnelLogic.js'
import { CropVisual } from './CropVisual.jsx'

function getTileLabel(blueprint, index) {
  const row = Math.floor(index / blueprint.columns) + 1
  const column = (index % blueprint.columns) + 1
  return `row ${row}, column ${column}`
}

export function RootTunnelConnectionLines({ blueprint }) {
  const links = (blueprint.rootTunnelConnections ?? []).filter(
    (connection) => !isMirrorCornTunnelConnection(blueprint, connection),
  )

  if (links.length === 0) return null

  const getCellCenter = (index) => ({
    x: (index % blueprint.columns) + 0.5,
    y: Math.floor(index / blueprint.columns) + 0.5,
  })

  return (
    <svg
      className="root-tunnel-lines"
      viewBox={`0 0 ${blueprint.columns} ${blueprint.rows}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="root-tunnel-arrow"
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
        >
          <path d="M 0 0 L 5 2.5 L 0 5 z" />
        </marker>
      </defs>
      {links.map(({ tunnelIndex, senderIndex, recipientIndex }) => {
        const sender = getCellCenter(senderIndex)
        const tunnel = getCellCenter(tunnelIndex)
        const recipient = getCellCenter(recipientIndex)

        return (
          <polyline
            className="root-tunnel-line"
            key={`${tunnelIndex}-${senderIndex}-${recipientIndex}`}
            points={`${sender.x},${sender.y} ${tunnel.x},${tunnel.y} ${recipient.x},${recipient.y}`}
            markerEnd="url(#root-tunnel-arrow)"
          />
        )
      })}
    </svg>
  )
}

export function RootTunnelEditorPanel({
  blueprint,
  completedCropPerfections,
  editor,
}) {
  if (editor.selectedTunnelIndex === null || !editor.connectionState) {
    return null
  }

  const mirrorRouteCount = editor.connectionState.connections.filter(
    (connection) => isMirrorCornTunnelConnection(blueprint, connection),
  ).length
  const instruction =
    editor.connectionDraft?.phase === 'sender'
      ? 'Select a highlighted surrounding Crop to send its effect.'
      : editor.connectionDraft?.phase === 'recipient'
        ? 'Now select the highlighted Crop that should receive the effect.'
        : 'This Root Tunnel is configured. Start another connection or edit an existing one.'

  return (
    <section className="root-tunnel-editor" aria-live="polite">
      <div className="root-tunnel-editor-heading">
        <div>
          <p className="eyebrow">Root Tunnel configuration</p>
          <h3>{getTileLabel(blueprint, editor.selectedTunnelIndex)}</h3>
        </div>
        <div className="root-tunnel-capacity">
          <strong>{editor.connectionState.ordinaryPairCount} / 2</strong>
          <span>ordinary pairs</span>
          <small>{mirrorRouteCount} free Mirror Corn routes</small>
        </div>
      </div>

      <p>{instruction}</p>

      {editor.connectionState.connections.length > 0 ? (
        <div className="root-tunnel-connection-list">
          {editor.connectionState.connections.map((connection) => {
            const senderCrop = blueprint.cells[connection.senderIndex]
            const recipientCrop = blueprint.cells[connection.recipientIndex]
            const isMirror = isMirrorCornTunnelConnection(
              blueprint,
              connection,
            )

            return (
              <div
                className="root-tunnel-connection"
                key={`${connection.tunnelIndex}-${connection.senderIndex}-${connection.recipientIndex}`}
              >
                <span>
                  <CropVisual
                    cropId={senderCrop}
                    completedCropPerfections={completedCropPerfections}
                    className="root-tunnel-crop-icon"
                  />
                  {getCropName(senderCrop, completedCropPerfections)} →{' '}
                  <CropVisual
                    cropId={recipientCrop}
                    completedCropPerfections={completedCropPerfections}
                    className="root-tunnel-crop-icon"
                  />
                  {getCropName(recipientCrop, completedCropPerfections)}
                  {isMirror ? <small> · free Mirror route</small> : null}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => editor.onRemoveConnection(connection)}
                >
                  Remove link
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="root-tunnel-editor-actions">
        {editor.connectionDraft ? (
          <button
            type="button"
            className="secondary-button"
            onClick={editor.onCancelConnection}
          >
            Cancel connection
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={editor.onStartConnection}
          >
            Add connection
          </button>
        )}
        <button
          type="button"
          className="root-tunnel-remove-button"
          onClick={editor.onRemoveTunnel}
        >
          Remove Root Tunnel
        </button>
      </div>
    </section>
  )
}
