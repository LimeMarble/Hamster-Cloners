import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInitialGame, getCropPerfectionCost, getNextSeedAugmentationCost,
  getSeedAugmentationCost, getRowDuplicatorsUnlockCropCount,
  getTradeEstablishmentCost,
} from '../src/game/gameLogic.js'
import { getCropUnlockRequirement } from '../src/game/crops.js'

// Effective prices captured before folding, at each item's intended unlock era.
// Earlier Main content uses its pre-Demo-1 prices; Misfortune-era Main content
// uses its pre-Demo-2 prices, and Sterile Symbiosis uses its post-Demo-2 price.
const EXPECTED = {
  "main": {
    "perfections": {
      "enrichingLeek": 20000000000,
      "mirrorCorn": 4000000000000,
      "fourLeafClover": null,
      "leechingGourd": 20000000000000000000,
      "sweetPotato": 2e+99,
      "samplingLentil": 2.5e+140,
      "splitweed": 3e+38,
      "blazingCarrot": 25000000000000000
    },
    "augmentations": {
      "leekEnrichment": {
        "initial": 1e+66,
        "levels": [
          1e+66,
          2e+66,
          4e+66,
          8e+66,
          1.6e+67,
          null
        ]
      },
      "leekDiagonal": {
        "initial": 1e+68,
        "levels": [
          1e+68
        ]
      },
      "richSoil": {
        "initial": 5e+71,
        "levels": [
          5e+71
        ]
      },
      "mirrorCornDebuffRemoval": {
        "initial": 2.5e+72,
        "levels": [
          2.5e+72
        ]
      },
      "mirrorCornEffectiveness": {
        "initial": 4e+73,
        "levels": [
          4e+73,
          4e+74,
          4e+75,
          4e+76,
          4e+77,
          4e+78,
          4e+79,
          4e+80,
          null
        ]
      },
      "mirrorCornReflectionLimit": {
        "initial": 1e+78,
        "levels": [
          1e+78
        ]
      },
      "splitweedMonocropLimit": {
        "initial": 5e+184,
        "levels": [
          5e+184,
          2.5e+186,
          1.25e+188,
          6.25e+189,
          null
        ]
      },
      "sweeterBond": {
        "initial": 3.5e+103,
        "levels": [
          3.5e+103,
          3.5e+106,
          3.5e+109,
          null
        ]
      },
      "loosenedBoundaries": {
        "initial": 5e+108,
        "levels": [
          5e+108,
          2.5e+111,
          1.25e+114,
          6.25e+116,
          null
        ]
      },
      "restoredConnections": {
        "initial": 5e+112,
        "levels": [
          5e+112
        ]
      },
      "leechingVine": {
        "initial": 5e+144,
        "levels": [
          5e+144
        ]
      },
      "sneakyCrawler": {
        "initial": 1.5e+148,
        "levels": [
          1.5e+148
        ]
      },
      "greaterAbsorption": {
        "initial": 3e+149,
        "levels": [
          3e+149
        ]
      }
    },
    "cropUnlocks": {
      "corn": null,
      "turnip": 100000000,
      "appleTree": 1000000000000000,
      "lentil": 80000000000000000,
      "knotweed": 20000000000000000000,
      "wheat": 1.25e+32,
      "sunflower": 1.42e+44,
      "cropPerfection": 1000000000
    },
    "rowDuplicators": 4.04e+23,
    "trade": 1e+57
  },
  "misfortune": {
    "perfections": {
      "enrichingLeek": 200000000000,
      "mirrorCorn": 40000000000000,
      "fourLeafClover": null,
      "leechingGourd": 200000000000000000000,
      "sweetPotato": 2e+99,
      "samplingLentil": 2.5e+140,
      "splitweed": 3e+39,
      "blazingCarrot": 25000000000000000
    },
    "augmentations": {
      "leekEnrichment": {
        "initial": 1e+67,
        "levels": [
          1e+67,
          2e+67,
          4e+67,
          8e+67,
          1.6e+68,
          null
        ]
      },
      "leekDiagonal": {
        "initial": 1e+69,
        "levels": [
          1e+69
        ]
      },
      "richSoil": {
        "initial": 5e+71,
        "levels": [
          5e+71
        ]
      },
      "mirrorCornDebuffRemoval": {
        "initial": 2.5e+73,
        "levels": [
          2.5e+73
        ]
      },
      "mirrorCornEffectiveness": {
        "initial": 4e+74,
        "levels": [
          4e+74,
          4e+75,
          4e+76,
          4e+77,
          4e+78,
          4e+79,
          4e+80,
          4e+81,
          null
        ]
      },
      "mirrorCornReflectionLimit": {
        "initial": 1e+79,
        "levels": [
          1e+79
        ]
      },
      "splitweedMonocropLimit": {
        "initial": 5e+183,
        "levels": [
          5e+183,
          2.5e+185,
          1.25e+187,
          6.25e+188,
          null
        ]
      },
      "sweeterBond": {
        "initial": 3.5e+103,
        "levels": [
          3.5e+103,
          3.5e+106,
          3.5e+109,
          null
        ]
      },
      "loosenedBoundaries": {
        "initial": 5e+108,
        "levels": [
          5e+108,
          2.5e+111,
          1.25e+114,
          6.25e+116,
          null
        ]
      },
      "restoredConnections": {
        "initial": 5e+112,
        "levels": [
          5e+112
        ]
      },
      "leechingVine": {
        "initial": 5e+144,
        "levels": [
          5e+144
        ]
      },
      "sneakyCrawler": {
        "initial": 1.5e+148,
        "levels": [
          1.5e+148
        ]
      },
      "greaterAbsorption": {
        "initial": 3e+149,
        "levels": [
          3e+149
        ]
      }
    },
    "cropUnlocks": {
      "corn": 2500000,
      "turnip": 1000000000,
      "appleTree": 1000000000000000000,
      "lentil": 800000000000000000000,
      "knotweed": 2e+22,
      "wheat": 1.25e+36,
      "sunflower": 1.42e+45,
      "cropPerfection": 10000000000
    },
    "rowDuplicators": 4.04e+24,
    "trade": 1e+58
  }
}

const LEVEL_FIELDS = {
  leekEnrichment: 'leekEnrichmentLevel',
  mirrorCornEffectiveness: 'mirrorCornEffectivenessLevel',
  splitweedMonocropLimit: 'splitweedMonocropLimitLevel',
  sweeterBond: 'sweeterBondLevel',
  loosenedBoundaries: 'loosenedBoundariesLevel',
}

function equalPrice(actual, expected, label) {
  if (expected === null) return assert.equal(actual, null, label)
  assert.ok(Math.abs(actual / expected - 1) < 1e-12, label)
}

for (const area of ['main', 'misfortune']) {
  test('fixed prices preserve intended unlock-era balancing in ' + area, () => {
    const expected = EXPECTED[area]
    for (const demos of [[], ['introduction', 'demonstrationOne'],
      ['introduction', 'demonstrationOne', 'misfortuneTrial']]) {
      const game = { ...createInitialGame(), activeArea: area,
        capybara: { completedDemonstrations: demos } }
      for (const [id, cost] of Object.entries(expected.perfections)) {
        equalPrice(getCropPerfectionCost(id, game), cost, id)
      }
      for (const [id, prices] of Object.entries(expected.augmentations)) {
        equalPrice(getSeedAugmentationCost(game, id), prices.initial, id)
        prices.levels.forEach((cost, level) => {
          const state = LEVEL_FIELDS[id] ? { [LEVEL_FIELDS[id]]: level } : {}
          equalPrice(getNextSeedAugmentationCost({
            ...game, seedAugmentations: { ...game.seedAugmentations, ...state },
          }, id), cost, id + ' level ' + level)
        })
      }
      for (const [id, cost] of Object.entries(expected.cropUnlocks)) {
        assert.equal(getCropUnlockRequirement(id, area), cost, id)
      }
      equalPrice(getRowDuplicatorsUnlockCropCount(game), expected.rowDuplicators, 'Row Duplicators')
      equalPrice(getTradeEstablishmentCost(game), expected.trade, 'Trade')
    }
  })
}

