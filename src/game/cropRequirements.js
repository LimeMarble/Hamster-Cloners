import { GAME_AREA_IDS } from './gameConfig.js'

// Prices are final values in their owning definitions. Demonstrations never
// increase them; this helper only chooses an explicit area-specific value.
export function getAreaCropValue(game, mainValue, misfortuneValue = mainValue) {
  const area = typeof game === 'string' ? game : game?.activeArea
  return area === GAME_AREA_IDS.MISFORTUNE ? misfortuneValue : mainValue
}
