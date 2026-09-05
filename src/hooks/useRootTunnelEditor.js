import { useMemo, useState } from 'react'
import {
  addRootTunnelConnection,
  getRootTunnelConnectionState,
  getValidRootTunnelRecipientIndexes,
  getValidRootTunnelSenderIndexes,
  removeRootTunnelConnection,
} from '../game/rootTunnelLogic.js'

export function useRootTunnelEditor({ blueprint, gameRef, commitBlueprint }) {
  const [selectedTunnelIndex, setSelectedTunnelIndex] = useState(null)
  const [connectionDraft, setConnectionDraft] = useState(null)
  const selectedTunnelIsValid =
    selectedTunnelIndex !== null &&
    blueprint.cells[selectedTunnelIndex] === 'rootTunnel'
  const activeTunnelIndex = selectedTunnelIsValid
    ? selectedTunnelIndex
    : null
  const connectionState = useMemo(
    () =>
      activeTunnelIndex === null
        ? null
        : getRootTunnelConnectionState(blueprint, activeTunnelIndex),
    [activeTunnelIndex, blueprint],
  )
  const validSenderIndexes = useMemo(
    () =>
      activeTunnelIndex === null || connectionDraft?.phase !== 'sender'
        ? []
        : getValidRootTunnelSenderIndexes(blueprint, activeTunnelIndex),
    [activeTunnelIndex, blueprint, connectionDraft],
  )
  const validRecipientIndexes = useMemo(
    () =>
      activeTunnelIndex === null ||
      connectionDraft?.phase !== 'recipient'
        ? []
        : getValidRootTunnelRecipientIndexes(
            blueprint,
            activeTunnelIndex,
            connectionDraft.senderIndex,
          ),
    [activeTunnelIndex, blueprint, connectionDraft],
  )

  function startConnection(tunnelIndex = activeTunnelIndex) {
    if (blueprint.cells[tunnelIndex] !== 'rootTunnel') return

    setSelectedTunnelIndex(tunnelIndex)
    setConnectionDraft({ phase: 'sender', senderIndex: null })
  }

  function resetRootTunnelEditor() {
    setSelectedTunnelIndex(null)
    setConnectionDraft(null)
  }

  function handlePlotClick(index, crop) {
    if (crop === 'rootTunnel') {
      startConnection(index)
      return true
    }

    if (activeTunnelIndex === null || !connectionDraft) return false

    if (
      connectionDraft.phase === 'sender' &&
      validSenderIndexes.includes(index)
    ) {
      setConnectionDraft({ phase: 'recipient', senderIndex: index })
      return true
    }

    if (
      connectionDraft.phase === 'recipient' &&
      validRecipientIndexes.includes(index)
    ) {
      const currentBlueprint = gameRef.current.blueprint
      const nextConnections = addRootTunnelConnection(
        currentBlueprint,
        activeTunnelIndex,
        connectionDraft.senderIndex,
        index,
      )

      if (nextConnections) {
        const mirrorCornTargets = [
          ...(currentBlueprint.mirrorCornTargets ?? []),
        ]
        if (currentBlueprint.cells[connectionDraft.senderIndex] === 'corn') {
          mirrorCornTargets[connectionDraft.senderIndex] = index
        }

        commitBlueprint({
          ...currentBlueprint,
          mirrorCornTargets,
          rootTunnelConnections: nextConnections,
        })
        setConnectionDraft(null)
      }

      return true
    }

    return true
  }

  function removeConnection(connection) {
    const currentBlueprint = gameRef.current.blueprint
    const rootTunnelConnections = removeRootTunnelConnection(
      currentBlueprint,
      connection.tunnelIndex,
      connection.senderIndex,
      connection.recipientIndex,
    )
    const mirrorCornTargets = [
      ...(currentBlueprint.mirrorCornTargets ?? []),
    ]

    if (
      currentBlueprint.cells[connection.senderIndex] === 'corn' &&
      mirrorCornTargets[connection.senderIndex] === connection.recipientIndex
    ) {
      mirrorCornTargets[connection.senderIndex] = null
    }

    commitBlueprint({
      ...currentBlueprint,
      mirrorCornTargets,
      rootTunnelConnections,
    })
    setConnectionDraft(null)
  }

  function removeTunnel() {
    if (activeTunnelIndex === null) return

    const confirmed = window.confirm(
      'Remove this Root Tunnel and all of its configured connections?',
    )
    if (!confirmed) return

    const currentBlueprint = gameRef.current.blueprint
    const removedConnections = (
      currentBlueprint.rootTunnelConnections ?? []
    ).filter((connection) => connection.tunnelIndex === activeTunnelIndex)
    const removedMirrorSenders = new Set(
      removedConnections.flatMap((connection) =>
        currentBlueprint.cells[connection.senderIndex] === 'corn'
          ? [connection.senderIndex]
          : [],
      ),
    )

    commitBlueprint({
      ...currentBlueprint,
      cells: currentBlueprint.cells.map((crop, index) =>
        index === activeTunnelIndex ? null : crop,
      ),
      mirrorCornTargets: (currentBlueprint.mirrorCornTargets ?? []).map(
        (targetIndex, sourceIndex) =>
          removedMirrorSenders.has(sourceIndex) ? null : targetIndex,
      ),
      rootTunnelConnections: (
        currentBlueprint.rootTunnelConnections ?? []
      ).filter((connection) => connection.tunnelIndex !== activeTunnelIndex),
    })
    resetRootTunnelEditor()
  }

  return {
    selectedTunnelIndex: activeTunnelIndex,
    connectionDraft,
    connectionState,
    validSenderIndexes,
    validRecipientIndexes,
    onStartConnection: () => startConnection(),
    onCancelConnection: () => setConnectionDraft(null),
    onRemoveConnection: removeConnection,
    onRemoveTunnel: removeTunnel,
    handlePlotClick,
    resetRootTunnelEditor,
  }
}
