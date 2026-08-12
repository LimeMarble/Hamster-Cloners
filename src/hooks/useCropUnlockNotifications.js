import { useEffect, useState } from 'react'
import { CROP_DEFINITIONS } from '../game/crops.js'

export function useCropUnlockNotifications(initialUnlockedCropIds) {
  const [cropUnlockNotice, setCropUnlockNotice] = useState(null)
  const [cropUnlockQueue, setCropUnlockQueue] = useState([])
  const [observedUnlockedCropIds, setObservedUnlockedCropIds] = useState(
    initialUnlockedCropIds,
  )

  useEffect(() => {
    if (!cropUnlockNotice) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setCropUnlockNotice(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [cropUnlockNotice])

  useEffect(() => {
    if (cropUnlockNotice || cropUnlockQueue.length === 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      const [nextNotice, ...remainingNotices] = cropUnlockQueue
      setCropUnlockNotice(nextNotice)
      setCropUnlockQueue(remainingNotices)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [cropUnlockNotice, cropUnlockQueue])

  useEffect(() => {
    const retainedObservedCropIds = observedUnlockedCropIds.filter((cropId) =>
      initialUnlockedCropIds.includes(cropId),
    )
    const newCropIds = initialUnlockedCropIds.filter(
      (cropId) =>
        cropId !== 'leek' && !retainedObservedCropIds.includes(cropId),
    )
    const needsObservationUpdate =
      newCropIds.length > 0 ||
      retainedObservedCropIds.length !== observedUnlockedCropIds.length

    if (!needsObservationUpdate) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      if (newCropIds.length > 0) {
        setCropUnlockQueue((currentQueue) => [
          ...currentQueue,
          ...newCropIds.map((cropId) => ({
            crop: CROP_DEFINITIONS[cropId].name,
            message: CROP_DEFINITIONS[cropId].effectDescription,
          })),
        ])
      }

      setObservedUnlockedCropIds(initialUnlockedCropIds)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [initialUnlockedCropIds, observedUnlockedCropIds])

  function clearCropUnlockNotices() {
    setCropUnlockNotice(null)
    setCropUnlockQueue([])
  }

  return { cropUnlockNotice, clearCropUnlockNotices }
}
