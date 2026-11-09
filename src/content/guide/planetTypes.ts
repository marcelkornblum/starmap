/**
 * DEC-R032 / AUD-071: Planet Types Guide Catalog
 * Curated planetary classification guide entries covering canonical compositions.
 */

import { PLANET_TYPES_GUIDE_PATH, type PlanetTypeGuideEntry } from './types';

export const PLANET_TYPE_GUIDE_ENTRIES: readonly PlanetTypeGuideEntry[] = [
  {
    id: 'terrestrial',
    composition: 'terrestrial',
    title: 'Terrestrial Worlds',
    summary:
      'Rocky and metal-rich planets (≤ 2 M⊕, ≤ 1.25 R⊕) with solid silicate crusts, differentiated mantles, and metallic iron-nickel cores.',
    massRangeMearth: '≤ 2 M⊕',
    radiusRangeRearth: '≤ 1.25 R⊕',
    bulkComposition: 'Silicate rocks, iron-nickel core, volatile-poor crust and mantle',
    habitabilityNotes:
      'Prime candidates for surface liquid water and biosignature detection within circumstellar habitable zones.',
    canonicalRadiusRearth: 1.0,
    textureTheme: 'rocky-silicate',
    interiorLayers: ['Iron-Nickel Core', 'Silicate Mantle', 'Rocky Crust'],
    href: `${PLANET_TYPES_GUIDE_PATH}/terrestrial`,
    examples: [
      {
        name: 'Earth', // guard-disable-line G-literals -- educational reference target (DEC-R032)
        href: '/system/sol?focus=earth',
        note: 'Standard terrestrial benchmark with active plate tectonics and surface hydrosphere.',
      },
      {
        name: 'Proxima Centauri b',
        href: '/galaxy?focus=proxima-centauri-b',
        note: 'Terrestrial exoplanet orbiting within the conservative habitable zone of Proxima Centauri.',
      },
    ],
  },
  {
    id: 'super-earth',
    composition: 'super-earth',
    title: 'Super-Earths',
    summary:
      'Massive rocky worlds (2–10 M⊕, 1.25–2.0 R⊕) bridging terrestrial planets and volatile-rich ice giants, featuring high surface gravities and potentially deep silicate mantles.',
    massRangeMearth: '2–10 M⊕',
    radiusRangeRearth: '1.25–2.0 R⊕',
    bulkComposition: 'Silicate mantles, metallic iron-nickel cores, and dense secondary volatile or ocean layers',
    habitabilityNotes:
      'Strong surface gravity supports volatile retention; stable surface liquid water environments possible within circumstellar habitable zones.',
    canonicalRadiusRearth: 1.6,
    textureTheme: 'rocky-silicate',
    interiorLayers: ['Metallic Core', 'Silicate Mantle', 'Crust / Ocean Layer'],
    href: `${PLANET_TYPES_GUIDE_PATH}/super-earth`,
    examples: [
      {
        name: 'Tau Ceti e', // guard-disable-line G-literals -- educational reference target (DEC-R032)
        href: '/galaxy?focus=tau-ceti-e',
        note: 'Potentially rocky super-Earth orbiting near the inner edge of Tau Ceti’s habitable zone.',
      },
      {
        name: 'Tau Ceti f',
        href: '/galaxy?focus=tau-ceti-f',
        note: 'Outer super-Earth candidate in the Tau Ceti system.',
      },
    ],
  },
  {
    id: 'ice-giant',
    composition: 'ice-giant',
    title: 'Ice Giants & Sub-Neptunes',
    summary:
      'Intermediate-mass worlds (10–50 M⊕) dominated by supercritical volatile mantles (water, methane, ammonia) beneath hydrogen-helium envelopes.',
    massRangeMearth: '10–50 M⊕',
    radiusRangeRearth: '2.0–6.0 R⊕',
    bulkComposition: 'Water, ammonia, and methane ices/fluids, with 10–20% hydrogen/helium envelope',
    habitabilityNotes:
      'Atmospheric water-cloud habitable zones may theoretically exist, but lack solid surfaces.',
    canonicalRadiusRearth: 4.0,
    textureTheme: 'slush-methane',
    interiorLayers: [
      'Rock-Ice Core',
      'Supercritical Water-Ammonia-Methane Mantle',
      'Hydrogen-Helium Atmosphere',
    ],
    href: `${PLANET_TYPES_GUIDE_PATH}/ice-giant`,
    examples: [
      {
        name: 'Uranus',
        href: '/system/sol?focus=uranus',
        note: 'Seventh planet from Sol, featuring an extreme 97.8° axial tilt.',
      },
      {
        name: 'Neptune',
        href: '/system/sol?focus=neptune',
        note: 'Outer ice giant of the Solar System with dynamic supersonic storm systems.',
      },
      {
        name: 'Tau Ceti g',
        href: '/galaxy?focus=tau-ceti-g',
        note: 'Candidate sub-Neptune / ice-giant companion in the Tau Ceti system.',
      },
    ],
  },
  {
    id: 'gas-giant',
    composition: 'gas-giant',
    title: 'Gas Giants',
    summary:
      'Massive Jovian worlds (> 50 M⊕) composed predominantly of hydrogen and helium, featuring no distinct solid surface and deep metallic hydrogen mantles.',
    massRangeMearth: '> 50 M⊕',
    radiusRangeRearth: '> 6.0 R⊕',
    bulkComposition: 'Metallic and molecular hydrogen, helium, with a dense heavy-element core',
    habitabilityNotes:
      'Inhospitable to carbon-based surface life; however, large icy or rocky moons may host subsurface oceans.',
    canonicalRadiusRearth: 11.2,
    textureTheme: 'banded-gas',
    interiorLayers: [
      'Rocky/Icy Core',
      'Liquid Metallic Hydrogen Mantle',
      'Molecular Hydrogen-Helium Envelope',
    ],
    href: `${PLANET_TYPES_GUIDE_PATH}/gas-giant`,
    examples: [
      {
        name: 'Jupiter', // guard-disable-line G-literals -- educational reference target (DEC-R032)
        href: '/system/sol?focus=jupiter',
        note: 'Largest planet in the Solar System, possessing a vast magnetosphere and 95 known moons.',
      },
      {
        name: 'Saturn', // guard-disable-line G-literals -- educational reference target (DEC-R032)
        href: '/system/sol?focus=saturn',
        note: 'Extensive ring system with diverse major icy satellites including Titan and Enceladus.',
      },
    ],
  },
];
