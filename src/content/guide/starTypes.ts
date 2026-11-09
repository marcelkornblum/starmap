/**
 * DEC-R032 / AUD-071: Star Types Guide Catalog
 * Curated astronomical guide entries covering the Morgan-Keenan spectral classes.
 */

import { STAR_TYPES_GUIDE_PATH, type StarTypeGuideEntry } from './types';

export const STAR_TYPE_GUIDE_ENTRIES: readonly StarTypeGuideEntry[] = [
  {
    id: 'o',
    spectralClass: 'O',
    title: 'O-Type Blue Hypergiants & Dwarfs',
    summary:
      'Extremely hot, luminous blue stars (> 30,000 K) with intense ultraviolet radiation and strong ionized helium absorption lines.',
    effectiveTempRange: '> 30,000 K',
    massRangeMsun: '> 16 M☉',
    radiusRangeRsun: '> 6.6 R☉',
    luminosityRangeLsun: '> 30,000 L☉',
    habitableZoneAu: '> 400 AU',
    chromaticity: 'Deep Blue',
    href: `${STAR_TYPES_GUIDE_PATH}/o`,
    canonicalRadiusRsun: 10.0,
    canonicalTempK: 40000,
    chromaticityHex: '#9bb0ff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: '10 Lacertae',
        href: '/galaxy?focus=10-lacertae&select=star-type:o',
        note: 'Standard O9V main-sequence reference star.',
      },
      {
        name: 'Alnitak',
        href: '/galaxy?focus=alnitak&select=star-type:o',
        note: 'O9.7Ib supergiant in Orion’s Belt.',
      },
    ],
  },
  {
    id: 'b',
    spectralClass: 'B',
    title: 'B-Type Blue-White Stars',
    summary:
      'Hot blue-white stars (10,000–30,000 K) characterized by neutral helium absorption lines and high stellar winds.',
    effectiveTempRange: '10,000–30,000 K',
    massRangeMsun: '2.1–16 M☉',
    radiusRangeRsun: '1.8–6.6 R☉',
    luminosityRangeLsun: '25–30,000 L☉',
    habitableZoneAu: '5–400 AU',
    chromaticity: 'Blue-White',
    href: `${STAR_TYPES_GUIDE_PATH}/b`,
    canonicalRadiusRsun: 4.5,
    canonicalTempK: 20000,
    chromaticityHex: '#aabfff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Rigel',
        href: '/galaxy?focus=rigel&select=star-type:b',
        note: 'B8Ia blue supergiant in Orion.',
      },
      {
        name: 'Regulus',
        href: '/galaxy?focus=regulus&select=star-type:b',
        note: 'Rapidly rotating B7V star in Leo.',
      },
    ],
  },
  {
    id: 'a',
    spectralClass: 'A',
    title: 'A-Type White Stars',
    summary:
      'Brilliant white stars (7,500–10,000 K) dominated by strong hydrogen Balmer absorption lines and extensive debris disks.',
    effectiveTempRange: '7,500–10,000 K',
    massRangeMsun: '1.4–2.1 M☉',
    radiusRangeRsun: '1.4–1.8 R☉',
    luminosityRangeLsun: '5–25 L☉',
    habitableZoneAu: '2.2–5.0 AU',
    chromaticity: 'Light Blue-White',
    href: `${STAR_TYPES_GUIDE_PATH}/a`,
    canonicalRadiusRsun: 1.8,
    canonicalTempK: 8500,
    chromaticityHex: '#cad7ff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Sirius A',
        href: '/galaxy?focus=sirius&select=star-type:a',
        note: 'A1V primary of the Sirius binary system at 2.6 pc.',
      },
      {
        name: 'Vega',
        href: '/galaxy?focus=vega&select=star-type:a',
        note: 'A0V standard photometric calibration baseline.',
      },
    ],
  },
  {
    id: 'f',
    spectralClass: 'F',
    title: 'F-Type Yellow-White Stars',
    summary:
      'Yellow-white stars (6,000–7,500 K) with strengthening ionized calcium lines and intermediate main-sequence stability.',
    effectiveTempRange: '6,000–7,500 K',
    massRangeMsun: '1.04–1.4 M☉',
    radiusRangeRsun: '1.15–1.4 R☉',
    luminosityRangeLsun: '1.5–5.0 L☉',
    habitableZoneAu: '1.2–2.2 AU',
    chromaticity: 'Yellow-White',
    href: `${STAR_TYPES_GUIDE_PATH}/f`,
    canonicalRadiusRsun: 1.3,
    canonicalTempK: 6750,
    chromaticityHex: '#f8f7ff',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Procyon A',
        href: '/galaxy?focus=procyon&select=star-type:f',
        note: 'F5IV-V subgiant in Canis Minor at 3.5 pc.',
      },
      {
        name: 'Gamma Virginis',
        href: '/galaxy?focus=gamma-virginis&select=star-type:f',
        note: 'Binary F0V stellar pair.',
      },
    ],
  },
  {
    id: 'g',
    spectralClass: 'G',
    title: 'G-Type Solar-Type Stars',
    summary:
      'Solar-type yellow stars (5,200–6,000 K) fusing hydrogen stably in their cores with lifetimes of ~10 billion years.',
    effectiveTempRange: '5,200–6,000 K',
    massRangeMsun: '0.8–1.04 M☉',
    radiusRangeRsun: '0.96–1.15 R☉',
    luminosityRangeLsun: '0.6–1.5 L☉',
    habitableZoneAu: '0.95–1.4 AU',
    chromaticity: 'Yellow / Warm White',
    href: `${STAR_TYPES_GUIDE_PATH}/g`,
    canonicalRadiusRsun: 1.0,
    canonicalTempK: 5778,
    chromaticityHex: '#fff4ea',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Sol', // guard-disable-line G-literals -- educational reference target (DEC-R032)
        href: '/galaxy?focus=sol&select=star-type:g',
        note: 'The Solar System primary, classification G2V.',
      },
      {
        name: 'Tau Ceti', // guard-disable-line G-literals -- educational reference target (DEC-R032)
        href: '/galaxy?focus=tau-ceti&select=star-type:g',
        note: 'Nearby single G8.5V dwarf with an extensive debris disk and planetary system.',
      },
      {
        name: 'Alpha Centauri A',
        href: '/galaxy?focus=alpha-centauri-a&select=star-type:g',
        note: 'Primary component of the Alpha Centauri triple system, G2V.',
      },
    ],
  },
  {
    id: 'k',
    spectralClass: 'K',
    title: 'K-Type Orange Dwarfs & Giants',
    summary:
      'Long-lived orange stars (3,700–5,200 K) prized for stellar stability, mild flare environments, and extended habitable zones.',
    effectiveTempRange: '3,700–5,200 K',
    massRangeMsun: '0.45–0.8 M☉',
    radiusRangeRsun: '0.7–0.96 R☉',
    luminosityRangeLsun: '0.08–0.6 L☉',
    habitableZoneAu: '0.3–0.95 AU',
    chromaticity: 'Orange / Warm Amber',
    href: `${STAR_TYPES_GUIDE_PATH}/k`,
    canonicalRadiusRsun: 0.8,
    canonicalTempK: 4500,
    chromaticityHex: '#ffd2a1',
    interiorLayers: ['Core', 'Radiative Zone', 'Convective Envelope'],
    examples: [
      {
        name: 'Alpha Centauri B',
        href: '/galaxy?focus=alpha-centauri-b&select=star-type:k',
        note: 'Secondary component of Alpha Centauri, K1V dwarf.',
      },
      {
        name: 'Epsilon Eridani',
        href: '/galaxy?focus=epsilon-eridani&select=star-type:k',
        note: 'Young K2V dwarf with confirmed debris ring and exoplanets.',
      },
    ],
  },
  {
    id: 'm',
    spectralClass: 'M',
    title: 'M-Type Red Dwarfs & Giants',
    summary:
      'Cool red stars (< 3,700 K) that make up over 75% of all stars in the Solar neighborhood, with trillions of years of main-sequence life.',
    effectiveTempRange: '2,400–3,700 K',
    massRangeMsun: '0.08–0.45 M☉',
    radiusRangeRsun: '< 0.7 R☉',
    luminosityRangeLsun: '< 0.08 L☉',
    habitableZoneAu: '0.05–0.3 AU',
    chromaticity: 'Red / Deep Amber',
    href: `${STAR_TYPES_GUIDE_PATH}/m`,
    canonicalRadiusRsun: 0.35,
    canonicalTempK: 3200,
    chromaticityHex: '#ffcc6f',
    interiorLayers: ['Fully Convective Interior'],
    examples: [
      {
        name: 'Proxima Centauri',
        href: '/galaxy?focus=proxima-centauri&select=star-type:m',
        note: 'Nearest star to the Sun (M5.5Ve flare dwarf) hosting terrestrial worlds.',
      },
      {
        name: "Barnard's Star",
        href: '/galaxy?focus=barnards-star&select=star-type:m',
        note: 'High proper motion M4V dwarf in Ophiuchus.',
      },
    ],
  },
  {
    id: 'l',
    spectralClass: 'L/T/Y',
    title: 'Substellar Brown Dwarfs (L, T, Y Classes)',
    summary:
      'Substellar objects below the hydrogen-fusion mass limit (~0.075 M☉), cooling slowly across deep infrared wavelengths.',
    effectiveTempRange: '500–2,400 K',
    massRangeMsun: '0.013–0.075 M☉',
    radiusRangeRsun: '0.08–0.14 R☉',
    luminosityRangeLsun: '< 0.0001 L☉',
    habitableZoneAu: '0.005–0.05 AU',
    chromaticity: 'Infrared / Deep Magenta',
    href: `${STAR_TYPES_GUIDE_PATH}/l`,
    canonicalRadiusRsun: 0.1,
    canonicalTempK: 1800,
    chromaticityHex: '#ff6b3d',
    interiorLayers: ['Fully Convective Interior'],
    examples: [
      {
        name: 'Luhman 16',
        href: '/galaxy?focus=luhman-16&select=star-type:l',
        note: 'Nearest known brown dwarf binary system (L7.5 / T0.5) at 2.0 pc.',
      },
    ],
  },
  {
    id: 'd',
    spectralClass: 'D',
    title: 'White Dwarfs (Degenerate Remnants)',
    summary:
      'Dense electron-degenerate stellar cores left behind after low- to intermediate-mass stars shed their outer envelopes.',
    effectiveTempRange: '4,000–150,000 K',
    massRangeMsun: '0.17–1.33 M☉',
    radiusRangeRsun: '0.008–0.02 R☉',
    luminosityRangeLsun: '0.0001–100 L☉',
    habitableZoneAu: '0.005–0.03 AU',
    chromaticity: 'White / Ultra-Blue',
    href: `${STAR_TYPES_GUIDE_PATH}/d`,
    canonicalRadiusRsun: 0.012,
    canonicalTempK: 15000,
    chromaticityHex: '#e6f0ff',
    interiorLayers: ['Degenerate Carbon-Oxygen Core'],
    examples: [
      {
        name: 'Sirius B',
        href: '/galaxy?focus=sirius&select=star-type:d',
        note: 'Nearest known white dwarf (DA2) orbiting Sirius A.',
      },
    ],
  },
];
