import { useState } from 'react'
import {
  exportBlueprint,
  importBlueprint,
} from '../game/blueprintTransfer.js'

export function useBlueprintTransfer({
  gameRef,
  commitBlueprint,
  unlockedCropIds,
  hasMirrorCorn,
  hasLeechingGourd,
}) {
  const [blueprintCode, setBlueprintCode] = useState('')
  const [blueprintTransferStatus, setBlueprintTransferStatus] = useState(null)

  function changeBlueprintCode(nextCode) {
    setBlueprintCode(nextCode)
    setBlueprintTransferStatus(null)
  }

  async function exportActiveBlueprint() {
    const nextBlueprintCode = exportBlueprint(gameRef.current.blueprint)

    setBlueprintCode(nextBlueprintCode)

    try {
      await navigator.clipboard.writeText(nextBlueprintCode)
      setBlueprintTransferStatus({
        type: 'success',
        message: 'Active blueprint copied to your clipboard.',
      })
    } catch {
      setBlueprintTransferStatus({
        type: 'success',
        message: 'Active blueprint code is ready below.',
      })
    }
  }

  function importActiveBlueprint() {
    const currentBlueprint = gameRef.current.blueprint

    try {
      const importedBlueprint = importBlueprint(blueprintCode, {
        rows: currentBlueprint.rows,
        columns: currentBlueprint.columns,
        unlockedCropIds,
        hasMirrorCorn,
        hasLeechingGourd,
      })

      commitBlueprint(importedBlueprint)
      setBlueprintTransferStatus({
        type: 'success',
        message: 'The active blueprint slot has been replaced.',
      })
      return true
    } catch (error) {
      setBlueprintTransferStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The blueprint could not be imported.',
      })
      return false
    }
  }

  function resetBlueprintTransfer() {
    setBlueprintCode('')
    setBlueprintTransferStatus(null)
  }

  return {
    blueprintCode,
    blueprintTransferStatus,
    onBlueprintCodeChange: changeBlueprintCode,
    onExportBlueprint: exportActiveBlueprint,
    onImportBlueprint: importActiveBlueprint,
    resetBlueprintTransfer,
  }
}
