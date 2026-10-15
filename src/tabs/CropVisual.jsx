import { useState } from 'react'
import { CROP_DEFINITIONS, getCropImage } from '../game/crops.js'

export function CropVisual({
  cropId,
  completedCropPerfections = [],
  className = '',
}) {
  const imageUrl = getCropImage(cropId, completedCropPerfections)
  const [failedImageUrl, setFailedImageUrl] = useState(null)
  const classes = `crop-visual ${className}`.trim()

  if (imageUrl && failedImageUrl !== imageUrl) {
    return (
      <img
        className={`${classes} crop-visual-image`}
        src={imageUrl}
        alt=""
        aria-hidden="true"
        draggable="false"
        onError={() => setFailedImageUrl(imageUrl)}
      />
    )
  }

  return (
    <span
      className={`${classes} crop-visual-fallback`}
      aria-hidden="true"
    >
      {CROP_DEFINITIONS[cropId]?.icon ?? '🌾'}
    </span>
  )
}
