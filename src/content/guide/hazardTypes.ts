/**
 * DEC-R032 / AUD-071: Hazard Types Guide Catalog
 * Curated astrophysical environmental hazards for stellar systems and planetary bodies.
 */

import { HAZARDS_GUIDE_PATH, type HazardGuideEntry } from './types';

export const HAZARD_GUIDE_ENTRIES: readonly HazardGuideEntry[] = [
  {
    id: 'flare-star',
    title: 'Stellar flare activity',
    severity: 'warning',
    domain: 'stellar',
    domainLabel: 'Stellar System Hazard',
    thresholdCriteria: 'Chromospheric emission lines (dMe/Ve) or UV Ceti type flare variability',
    summary: 'Host star exhibits stochastic, high-amplitude magnetic reconnection flares releasing intense ultraviolet and soft X-ray bursts.',
    physicalMechanism: 'Twisting and reconnection of localized magnetic flux tubes in fully convective stellar envelopes drives explosive plasma acceleration.',
    operationalImpact: 'Rapid atmospheric erosion, catastrophic radio blackout, and lethal surface ionizing dosage for unshielded assets.',
    mitigationNotes: 'Deploy sub-surface habitations, active magnetic deflector shields, and orbital flare-warning early intercept arrays.',
    href: `${HAZARDS_GUIDE_PATH}/flare-star`,
    examples: [
      { name: 'Proxima Centauri', href: '/system/proxima-centauri', note: 'Active M5.5Ve flare star host to Proxima b.' },
      { name: 'TRAPPIST-1', href: '/system/trappist-1', note: 'Ultra-cool M-dwarf with frequent coronal mass ejections.' },
    ],
  },
  {
    id: 'ionising-radiation',
    title: 'Intense ionising radiation',
    severity: 'critical',
    domain: 'stellar',
    domainLabel: 'Stellar System Hazard',
    thresholdCriteria: 'Hot O/B/D stars, degenerate remnants (pulsars/white dwarfs), L ≥ 25 L☉, or Teff ≥ 10,000 K',
    summary: 'High bolometric output in far-UV, extreme-UV, and hard X-ray bands creating a lethal radiation belt across circumstellar space.',
    physicalMechanism: 'Extreme photospheric surface temperatures and relativistic particle winds generate severe flux densities of ionizing photons.',
    operationalImpact: 'Destroys atmospheric ozone layers, induces severe electronic single-event upsets, and limits human EVA durations.',
    mitigationNotes: 'Heavy hydrogenous polyethylene radiation shielding, subterranean infrastructure, and standoff orbital margins.',
    href: `${HAZARDS_GUIDE_PATH}/ionising-radiation`,
    examples: [
      { name: 'Sirius B', href: '/system/sirius', note: 'Hot white dwarf with extreme UV luminosity.' },
      { name: 'Vega', href: '/system/vega', note: 'Luminous A0V star with intense ultraviolet radiation flux.' },
    ],
  },
  {
    id: 'variable-flux',
    title: 'Variable stellar flux',
    severity: 'warning',
    domain: 'stellar',
    domainLabel: 'Stellar System Hazard',
    thresholdCriteria: 'Catalogued variable star status (Mira, Cepheid, BY Dra) or significant cyclical bolometric luminosity fluctuations',
    summary: 'Periodic or quasi-periodic fluctuations in stellar bolometric luminosity alter planetary insolation over months to years.',
    physicalMechanism: 'Stellar pulsations driven by the kappa-mechanism (opacity gating in partial ionization zones) or giant starspot rotation.',
    operationalImpact: 'Extreme cyclical climate destabilization, severe thermal stresses on surface structures, and fluctuating solar array output.',
    mitigationNotes: 'Thermal inertia buffering systems, modular variable-gain power converters, and planetary insulation domes.',
    href: `${HAZARDS_GUIDE_PATH}/variable-flux`,
    examples: [
      { name: 'Betelgeuse', href: '/system/betelgeuse', note: 'Semiregular pulsating red supergiant with dramatic brightness swings.' },
      { name: 'Mira (Omicron Ceti)', href: '/system/mira', note: 'Archetypal pulsating variable star with large magnitude swings.' },
    ],
  },
  {
    id: 'extreme-heat',
    title: 'Extreme thermal regime',
    severity: 'critical',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Planetary equilibrium temperature Teq > 373 K (above the boiling point of water at 1 atm)',
    summary: 'Surface equilibrium temperatures exceed the boiling point of liquid water, prohibiting stable open hydrospheres.',
    physicalMechanism: 'Proximity to the host star drives runaway greenhouse processes or direct solar irradiation exceeding volatile stability limits.',
    operationalImpact: 'Thermal degradation of standard structural alloys, rapid boil-off of volatiles, and extreme heat-rejection requirements.',
    mitigationNotes: 'Active cryogenic cooling loops, reflective sunshades, subterranean cavern installations, and heat-pump rejection networks.',
    href: `${HAZARDS_GUIDE_PATH}/extreme-heat`,
    examples: [
      { name: 'Venus', href: '/system/sol', note: 'Runaway greenhouse world with surface temperature exceeding 735 K.' },
      { name: 'Mercury', href: '/system/sol', note: 'Airless innermost planet with daytime peak temperatures of 700 K.' },
    ],
  },
  {
    id: 'cryogenic-cold',
    title: 'Cryogenic surface regime',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Planetary equilibrium temperature Teq < 180 K (freezing volatiles and water ice into rock-hard crusts)',
    summary: 'Surface temperatures drop far below freezing, causing water, methane, and ammonia to precipitate and solidify.',
    physicalMechanism: 'Distant orbits receiving low stellar insolation, resulting in radiative equilibrium dominated by deep-space background temperatures.',
    operationalImpact: 'Embrittlement of structural steels and plastics, freezing of hydraulic fluids, and severe power consumption for heating.',
    mitigationNotes: 'Nuclear radioisotope thermoelectric generators (RTGs), thermal insulation aerogels, and heated vacuum-insulated conduits.',
    href: `${HAZARDS_GUIDE_PATH}/cryogenic-cold`,
    examples: [
      { name: 'Titan', href: '/system/sol', note: 'Hydrocarbon lakes and cryogenic 94 K surface temperature.' },
      { name: 'Pluto', href: '/system/sol', note: 'Nitrogen-ice plains at a frigid 44 K equilibrium temperature.' },
    ],
  },
  {
    id: 'high-gravity',
    title: 'High surface gravity',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Surface gravitational acceleration g > 1.2 g (Earth standard 9.80665 m/s²)',
    summary: 'Surface gravitational acceleration exceeds 1.2 g, significantly increasing structural mechanical loads and escape velocity.',
    physicalMechanism: 'High planetary mass relative to radius (large rocky core or massive super-Earth mantle) yields elevated surface gravity.',
    operationalImpact: 'Excessive hydrostatic strain on biological systems, higher propulsion mass ratios for ascent, and heavier structural foundations.',
    mitigationNotes: 'Exoskeletal mobility assistance, high-thrust chemical or nuclear-thermal launch vehicles, and reinforced stress framing.',
    href: `${HAZARDS_GUIDE_PATH}/high-gravity`,
    examples: [
      { name: 'Tau Ceti e', href: '/system/gaia-2452378776434477184', note: 'Massive super-Earth candidate with surface gravity exceeding 1.4 g.' },
      { name: 'Proxima Centauri c', href: '/system/proxima-centauri', note: 'Super-Earth with surface acceleration exceeding 2.1 g.' },
    ],
  },
  {
    id: 'tidal-locking',
    title: 'Tidal locking',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Orbital period P ≤ 30 days or semi-major axis a ≤ 0.15 AU (synchronous rotation with orbital period)',
    summary: 'Rotational period is synchronised with the orbital period, creating permanent substellar daylight and antistellar nighttime hemispheres.',
    physicalMechanism: 'Gravitational tidal torques from the host star dissipate orbital energy, driving planetary spin into a 1:1 spin-orbit resonance.',
    operationalImpact: 'Extreme temperature divergence between hemispheres, supersonic terminator wind currents, and atmospheric collapse on the dark side.',
    mitigationNotes: 'Establish settlements along the temperate twilight terminator band; construct high-capacity atmospheric recirculation ducts.',
    href: `${HAZARDS_GUIDE_PATH}/tidal-locking`,
    examples: [
      { name: 'Proxima Centauri b', href: '/system/proxima-centauri', note: 'Tidally locked in an 11.2-day orbit around its host red dwarf.' },
      { name: 'TRAPPIST-1 e', href: '/system/trappist-1', note: 'Synchronously rotating Earth-sized world in the habitable zone.' },
    ],
  },
  {
    id: 'high-eccentricity',
    title: 'Eccentric orbital seasons',
    severity: 'warning',
    domain: 'planetary',
    domainLabel: 'Planetary Hazard',
    thresholdCriteria: 'Orbital eccentricity e > 0.20 (driving extreme variation in periastron vs apoastron solar flux)',
    summary: 'High orbital eccentricity produces wild cyclical swings in insolation between periastron and apoastron.',
    physicalMechanism: 'Non-circular elliptical orbit causes seasonal solar irradiance variations proportional to 1/r², driving extreme seasonal shifts.',
    operationalImpact: 'Flash climate shifts, violent cyclical seasonal storms, and freeze-thaw cycles that severely challenge long-term surface stability.',
    mitigationNotes: 'Deploy automated climate-regulation reflectors, flexible thermal radiators, and migratory seasonal base habitats.',
    href: `${HAZARDS_GUIDE_PATH}/high-eccentricity`,
    examples: [
      { name: '16 Cygni B b', href: '/system/16-cygni', note: 'Gas giant with an extreme orbital eccentricity of 0.68.' },
      { name: 'HD 80606 b', href: '/system/hd-80606', note: 'Eccentric hot Jupiter experiencing violent periastron heating.' },
    ],
  },
];

/**
 * Pure unit function resolving a HazardGuideEntry from a raw slug.
 */
export const resolveHazardGuideEntry = (
  rawSlug?: string,
): HazardGuideEntry | undefined => {
  if (!rawSlug) return undefined;
  const trimmed = rawSlug.trim().toLowerCase();
  return HAZARD_GUIDE_ENTRIES.find((h) => h.id === trimmed);
};
