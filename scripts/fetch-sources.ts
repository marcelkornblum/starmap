import fs from 'node:fs';
import path from 'node:path';
import { DATA_SOURCES_REGISTRY } from './sources.config';

// =============================================================================
// COMPREHENSIVE SCIENTIFIC REFERENCE DATASETS ACROSS ALL 4 LAYERS
// =============================================================================

/**
 * IAU Working Group on Star Names (WGSN) official gazetteer.
 * Maps HIP numbers, Bayer/Flamsteed designations, and HD numbers to recognized proper names.
 */
export const OFFICIAL_IAU_STAR_NAMES: Record<string, { properName: string; hip?: number; hd?: number }> = {
  // Northern & Southern Landmark Stars
  'hip-32349': { properName: 'Sirius', hip: 32349, hd: 48915 },
  'hip-30438': { properName: 'Canopus', hip: 30438, hd: 45348 },
  'hip-71683': { properName: 'Rigil Kentaurus', hip: 71683, hd: 128620 },
  'hip-71681': { properName: 'Toliman', hip: 71681, hd: 128621 },
  'hip-70890': { properName: 'Proxima Centauri', hip: 70890 },
  'hip-69673': { properName: 'Arcturus', hip: 69673, hd: 124897 },
  'hip-91262': { properName: 'Vega', hip: 91262, hd: 172167 },
  'hip-24608': { properName: 'Capella', hip: 24608, hd: 34029 },
  'hip-24436': { properName: 'Rigel', hip: 24436, hd: 34085 },
  'hip-37826': { properName: 'Procyon', hip: 37826, hd: 61421 },
  'hip-27989': { properName: 'Betelgeuse', hip: 27989, hd: 39801 },
  'hip-7588': { properName: 'Achernar', hip: 7588, hd: 10144 },
  'hip-68702': { properName: 'Hadar', hip: 68702, hd: 122451 },
  'hip-97649': { properName: 'Altair', hip: 97649, hd: 187642 },
  'hip-65474': { properName: 'Spica', hip: 65474, hd: 116658 },
  'hip-80763': { properName: 'Antares', hip: 80763, hd: 148478 },
  'hip-37279': { properName: 'Pollux', hip: 37279, hd: 62509 },
  'hip-113368': { properName: 'Fomalhaut', hip: 113368, hd: 216956 },
  'hip-102098': { properName: 'Deneb', hip: 102098, hd: 197345 },
  'hip-62434': { properName: 'Mimosa', hip: 62434, hd: 111123 },
  'hip-49669': { properName: 'Regulus', hip: 49669, hd: 87901 },
  'hip-60718': { properName: 'Acrux', hip: 60718, hd: 108248 },
  'hip-21421': { properName: 'Aldebaran', hip: 21421, hd: 29139 },
  'hip-11767': { properName: 'Polaris', hip: 11767, hd: 8890 },
  'hip-36850': { properName: 'Castor', hip: 36850, hd: 60179 },
  'hip-26727': { properName: 'Bellatrix', hip: 26727, hd: 35468 },
  'hip-26311': { properName: 'Alnilam', hip: 26311, hd: 37128 },
  'hip-25336': { properName: 'Alnitak', hip: 25336, hd: 37742 },
  'hip-25930': { properName: 'Mintaka', hip: 25930, hd: 36486 },
  'hip-27366': { properName: 'Saiph', hip: 27366, hd: 38771 },
  'hip-54061': { properName: 'Dubhe', hip: 54061, hd: 95689 },
  'hip-53910': { properName: 'Merak', hip: 53910, hd: 95418 },
  'hip-58001': { properName: 'Phecda', hip: 58001, hd: 103287 },
  'hip-59774': { properName: 'Megrez', hip: 59774, hd: 106591 },
  'hip-62956': { properName: 'Alioth', hip: 62956, hd: 112185 },
  'hip-65378': { properName: 'Mizar', hip: 65378, hd: 116656 },
  'hip-67301': { properName: 'Alkaid', hip: 67301, hd: 120315 },
  'hip-90496': { properName: 'Kaus Australis', hip: 90496, hd: 169916 },
  'hip-86032': { properName: 'Shaula', hip: 86032, hd: 159532 },
  'hip-11212': { properName: 'Mirfak', hip: 11212, hd: 14578 },
  'hip-14576': { properName: 'Algol', hip: 14576, hd: 19356 },
  'hip-100453': { properName: 'Alnair', hip: 100453, hd: 193924 },
  'hip-85927': { properName: 'Rasalhague', hip: 85927, hd: 159561 },
  'hip-109268': { properName: 'Peacock', hip: 109268, hd: 207098 },
  'hip-107315': { properName: 'Enif', hip: 107315, hd: 206778 },
  'hip-72607': { properName: 'Kochab', hip: 72607, hd: 131873 },
  'hip-1067': { properName: 'Alpheratz', hip: 1067, hd: 358 },
  'hip-5447': { properName: 'Mirach', hip: 5447, hd: 6860 },
  'hip-9640': { properName: 'Almach', hip: 9640, hd: 12533 },
  'hip-10826': { properName: 'Hamal', hip: 10826, hd: 12929 },
  'hip-15863': { properName: 'Menkar', hip: 15863, hd: 20794 },
  'hip-8102': { properName: 'Diphda', hip: 8102, hd: 10700 },
  'hip-16537': { properName: 'Epsilon Eridani', hip: 16537, hd: 22049 },
  'hip-8160': { properName: 'Tau Ceti', hip: 8160, hd: 10700 },
  'hip-87937': { properName: "Barnard's Star", hip: 87937 },
  'hip-54035': { properName: 'Lalande 21185', hip: 54035, hd: 95735 },
  'hip-57544': { properName: 'Wolf 359', hip: 57544 },
  'hip-86162': { properName: 'Ross 128', hip: 86162 },
};

/**
 * RECONS Ground-Truth Census for Systems within 10 parsecs.
 * Supplementing brown dwarfs and low-mass multiples absent in historical naked-eye catalogs.
 */
export const RECONS_10PC_SUPPLEMENT = [
  {
    id: 'luhman-16',
    name: 'Luhman 16 (WISE 1049-5319)',
    properName: 'Luhman 16',
    ra: 10.824,
    dec: -53.319,
    dist: 2.002, // 6.5 light years - 3rd closest system to Sol
    mag: 14.2,
    absmag: 15.2,
    spect: 'L7.5 / T0.5',
    starCount: 2,
    components: ['Luhman 16A', 'Luhman 16B'],
    description: 'Binary brown dwarf system in Vela; closest known brown dwarfs to the Sun.',
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855-0714',
    properName: 'WISE 0855',
    ra: 8.922,
    dec: -7.24,
    dist: 2.28, // 7.4 light years - 4th closest system to Sol
    mag: 25.0,
    absmag: 25.7,
    spect: 'Y2',
    starCount: 1,
    description: 'Sub-brown dwarf / rogue planetary mass object with water ice cloud atmospheric signatures.',
  },
  {
    id: 'teegarden-star',
    name: "Teegarden's Star",
    properName: "Teegarden's Star",
    ra: 2.885,
    dec: 16.865,
    dist: 3.83, // 12.5 light years
    mag: 15.08,
    absmag: 14.65,
    spect: 'M7.0V',
    starCount: 1,
    description: 'Ultra-cool red dwarf in Aries hosting multiple Earth-mass habitable zone exoplanets.',
  },
  {
    id: 'trappist-1',
    name: 'TRAPPIST-1',
    properName: 'TRAPPIST-1',
    ra: 23.108,
    dec: -5.041,
    dist: 12.47, // 40.7 light years
    mag: 18.8,
    absmag: 15.82,
    spect: 'M8V',
    starCount: 1,
    description: 'Ultra-cool red dwarf in Aquarius hosting seven temperate terrestrial exoplanets.',
  },
];

/**
 * IAU NameExoWorlds official common nomenclature for exoplanets and host stars.
 */
export const IAU_NAME_EXOWORLDS: Record<string, { starName: string; planetName: string; culturalOrigin: string }> = {
  '51 Pegasi b': { starName: 'Helvetios', planetName: 'Dimidium', culturalOrigin: 'Switzerland / Latin' },
  'HD 209458 b': { starName: 'Copernicus', planetName: 'Osiris', culturalOrigin: 'Egyptian Mythology' },
  '55 Cancri e': { starName: 'Copernicus', planetName: 'Janssen', culturalOrigin: 'Netherlands' },
  '55 Cancri b': { starName: 'Copernicus', planetName: 'Galileo', culturalOrigin: 'Italy' },
  '55 Cancri c': { starName: 'Copernicus', planetName: 'Brahe', culturalOrigin: 'Denmark' },
  '55 Cancri d': { starName: 'Copernicus', planetName: 'Lipperhey', culturalOrigin: 'Netherlands' },
  '55 Cancri f': { starName: 'Copernicus', planetName: 'Harriot', culturalOrigin: 'United Kingdom' },
  'PSR B1257+12 b': { starName: 'Lich', planetName: 'Draugr', culturalOrigin: 'Norse Mythology' },
  'PSR B1257+12 c': { starName: 'Lich', planetName: 'Poltergeist', culturalOrigin: 'Folklore' },
  'PSR B1257+12 d': { starName: 'Lich', planetName: 'Phobetor', culturalOrigin: 'Greek Mythology' },
  'mu Arae b': { starName: 'Cervantes', planetName: 'Quijote', culturalOrigin: 'Spain / Literature' },
  'mu Arae c': { starName: 'Cervantes', planetName: 'Dulcinea', culturalOrigin: 'Spain / Literature' },
  'mu Arae d': { starName: 'Cervantes', planetName: 'Rocinante', culturalOrigin: 'Spain / Literature' },
  'mu Arae e': { starName: 'Cervantes', planetName: 'Sancho', culturalOrigin: 'Spain / Literature' },
  'upsilon Andromedae b': { starName: 'Titawin', planetName: 'Saffar', culturalOrigin: 'Morocco / Arab Astronomy' },
  'upsilon Andromedae c': { starName: 'Titawin', planetName: 'Samh', culturalOrigin: 'Morocco / Arab Astronomy' },
  'upsilon Andromedae d': { starName: 'Titawin', planetName: 'Majriti', culturalOrigin: 'Morocco / Arab Astronomy' },
  'HD 149026 b': { starName: 'Ogma', planetName: 'Smertrios', culturalOrigin: 'Celtic Mythology' },
  'epsilon Eridani b': { starName: 'Ran', planetName: 'AEgir', culturalOrigin: 'Norse Mythology' },
  'Fomalhaut b': { starName: 'Fomalhaut', planetName: 'Dagon', culturalOrigin: 'Levantine / Semitic' },
  'HD 102195 b': { starName: 'Flegetonte', planetName: 'Lete', culturalOrigin: 'Italy / Greek Mythology' },
  'WASP-17 b': { starName: 'Ditsö̀', planetName: 'Ditsö̀rã́', culturalOrigin: 'Costa Rica / Bribri' },
};

/**
 * AAVSO / GCVS Variable Star Index entries for local neighborhood variables.
 */
export const AAVSO_VARIABLE_CATALOG: Record<string, { varType: string; periodDays?: number; minMag?: number; maxMag?: number }> = {
  Sirius: { varType: 'V*', periodDays: 18262.5 }, // Sirius A/B astrometric binary
  Betelgeuse: { varType: 'SRC (Semiregular Supergiant)', periodDays: 420, minMag: 1.6, maxMag: 0.0 },
  Algol: { varType: 'EA (Algol-type Eclipsing)', periodDays: 2.867, minMag: 3.4, maxMag: 2.1 },
  'Delta Cephei': { varType: 'DCEP (Classical Cepheid Prototype)', periodDays: 5.366, minMag: 4.4, maxMag: 3.5 },
  Mira: { varType: 'M (Mira Pulsating Variable)', periodDays: 332.0, minMag: 10.1, maxMag: 2.0 },
  'RR Lyrae': { varType: 'RRAB (RR Lyrae Prototype)', periodDays: 0.567, minMag: 8.1, maxMag: 7.1 },
  'Proxima Centauri': { varType: 'UV (Flare Star / UV Ceti type)', periodDays: 82.5, minMag: 11.1, maxMag: 10.7 },
  'Polaris': { varType: 'DCEPS (Cepheid)', periodDays: 3.97, minMag: 2.02, maxMag: 1.98 },
};

/**
 * Full Galactic Deep-Sky Structures Catalog (Open clusters, globulars, SNRs, pulsars, nebulae).
 */
export const FULL_GALACTIC_STRUCTURES = [
  // Open Clusters & Moving Groups (Local Bubble & Neighbors)
  {
    id: 'hyades',
    name: 'Hyades Cluster',
    type: 'OpenCluster',
    x: 43.1, y: 17.5, z: 12.8, dist: 47.5,
    radiusPc: 5.7, ageMyr: 625, memberCount: 724,
    designations: ['Melotte 25', 'Collinder 50', 'C 0424+157'],
    description: 'The nearest open star cluster to the Solar System, sharing a common trajectory through space.',
  },
  {
    id: 'coma-star-cluster',
    name: 'Coma Star Cluster',
    type: 'OpenCluster',
    x: -8.2, y: 3.4, z: 85.5, dist: 86.0,
    radiusPc: 4.8, ageMyr: 450, memberCount: 270,
    designations: ['Melotte 111', 'Collinder 256'],
    description: 'A loose, prominent open cluster located high above the galactic plane in Coma Berenices.',
  },
  {
    id: 'ursa-major-moving-group',
    name: 'Ursa Major Moving Group',
    type: 'MovingGroup',
    x: -3.8, y: 19.2, z: 15.6, dist: 25.1,
    radiusPc: 8.5, ageMyr: 414, memberCount: 140,
    designations: ['Collinder 285', 'UMa Stream'],
    description: 'A co-moving stellar kinematic group containing the core stars of the Big Dipper.',
  },
  {
    id: 'pleiades',
    name: 'Pleiades (Seven Sisters)',
    type: 'OpenCluster',
    x: 122.8, y: 49.6, z: -34.2, dist: 135.5,
    radiusPc: 2.6, ageMyr: 115, memberCount: 1000,
    designations: ['M45', 'Melotte 22', 'Collinder 42'],
    description: 'Luminous young open cluster just beyond the 100-pc boundary, prominent in night-sky lore.',
  },
  {
    id: 'praesepe',
    name: 'Praesepe (Beehive Cluster)',
    type: 'OpenCluster',
    x: 137.4, y: 104.2, z: 75.3, dist: 187.0,
    radiusPc: 3.5, ageMyr: 600, memberCount: 1000,
    designations: ['M44', 'NGC 2632', 'Melotte 88'],
    description: 'One of the nearest open clusters, sharing similar age and proper motion to the Hyades.',
  },
  {
    id: 'ic-2602',
    name: 'IC 2602 (Southern Pleiades)',
    type: 'OpenCluster',
    x: -125.1, y: -74.3, z: -18.2, dist: 147.0,
    radiusPc: 2.1, ageMyr: 30, memberCount: 120,
    designations: ['Theta Carinae Cluster', 'Caldwell 102'],
    description: 'Bright young open cluster surrounding Theta Carinae in the southern sky.',
  },
  {
    id: 'ic-2391',
    name: 'IC 2391 (Omicron Velorum Cluster)',
    type: 'OpenCluster',
    x: -118.2, y: -108.5, z: -22.1, dist: 152.0,
    radiusPc: 2.4, ageMyr: 50, memberCount: 60,
    designations: ['Caldwell 85', 'Melotte 91'],
    description: 'Compact open cluster in Vela visible to the naked eye.',
  },
  {
    id: 'alpha-persei-cluster',
    name: 'Alpha Persei Cluster',
    type: 'OpenCluster',
    x: 152.4, y: 64.8, z: -25.6, dist: 172.0,
    radiusPc: 4.2, ageMyr: 70, memberCount: 300,
    designations: ['Melotte 20', 'Collinder 39'],
    description: 'Young OB stellar association surrounding Mirfak in Perseus.',
  },

  // Globular Clusters (Prominent Milky Way Landmarks)
  {
    id: 'm4-globular',
    name: 'Messier 4 (M4)',
    type: 'GlobularCluster',
    x: 1500.0, y: -800.0, z: 600.0, dist: 1900.0, // ~1.9 kpc - closest globular to Earth
    radiusPc: 11.5, ageMyr: 12200, memberCount: 100000,
    designations: ['NGC 6121'],
    description: 'The closest globular cluster to the Solar System, situated in Scorpius near Antares.',
  },
  {
    id: 'ngc-6397',
    name: 'NGC 6397',
    type: 'GlobularCluster',
    x: 1800.0, y: -1200.0, z: -450.0, dist: 2300.0, // ~2.3 kpc - 2nd closest globular
    radiusPc: 9.8, ageMyr: 12800, memberCount: 400000,
    designations: ['Caldwell 86'],
    description: 'One of the oldest known globular clusters in the Milky Way with a core-collapsed structure.',
  },
  {
    id: 'omega-centauri',
    name: 'Omega Centauri',
    type: 'GlobularCluster',
    x: 4200.0, y: -2500.0, z: 1100.0, dist: 5200.0,
    radiusPc: 26.0, ageMyr: 11500, memberCount: 10000000,
    designations: ['NGC 5139', 'Caldwell 80'],
    description: 'The largest and most massive globular cluster in the Milky Way; remnant nucleus of a dwarf galaxy.',
  },
  {
    id: 'm13-hercules',
    name: 'Messier 13 (Great Hercules Cluster)',
    type: 'GlobularCluster',
    x: 3200.0, y: 5500.0, z: 4200.0, dist: 7100.0,
    radiusPc: 22.0, ageMyr: 11650, memberCount: 300000,
    designations: ['NGC 6205'],
    description: 'The premier northern sky globular cluster in the constellation Hercules.',
  },

  // Supernova Remnants & Nebulae
  {
    id: 'vela-snr',
    name: 'Vela Supernova Remnant',
    type: 'SupernovaRemnant',
    x: -210.0, y: -180.0, z: -50.0, dist: 287.0,
    radiusPc: 18.0, ageMyr: 0.011, // ~11,000 years old
    designations: ['Gum 16', 'SNR G263.9-03.3'],
    description: 'A massive expanding filamentary remnant of a stellar explosion occurring ~11,000 years ago.',
  },
  {
    id: 'cygnus-loop',
    name: 'Cygnus Loop (Veil Nebula)',
    type: 'SupernovaRemnant',
    x: 480.0, y: 520.0, z: -180.0, dist: 735.0,
    radiusPc: 16.0, ageMyr: 0.02, // ~20,000 years old
    designations: ['NGC 6960', 'NGC 6992', 'Caldwell 33', 'Caldwell 34'],
    description: 'Spectacular optical emission nebula marking a core-collapse supernova remnant in Cygnus.',
  },
  {
    id: 'crab-nebula',
    name: 'Crab Nebula (M1)',
    type: 'SupernovaRemnant',
    x: -1950.0, y: 450.0, z: -210.0, dist: 2000.0,
    radiusPc: 1.7, ageMyr: 0.001, // 1054 CE supernova (972 years)
    designations: ['NGC 1952', 'Taurus A', 'SNR G184.6-05.8'],
    description: 'Pulsar wind plerion remnant created by the historical supernova of 1054 recorded by Chinese astronomers.',
  },
  {
    id: 'helix-nebula',
    name: 'Helix Nebula',
    type: 'PlanetaryNebula',
    x: 65.0, y: 120.0, z: -170.0, dist: 200.0,
    radiusPc: 0.8, ageMyr: 0.01,
    designations: ['NGC 7293', 'Caldwell 63', 'Eye of God'],
    description: 'The closest planetary nebula to Earth, showing a dying low-mass star shedding its outer gas shell.',
  },
  {
    id: 'dumbbell-nebula',
    name: 'Dumbbell Nebula',
    type: 'PlanetaryNebula',
    x: 280.0, y: 290.0, z: 70.0, dist: 410.0,
    radiusPc: 1.1, ageMyr: 0.015,
    designations: ['M27', 'NGC 6853'],
    description: 'The first planetary nebula discovered in history, notable for its bright hourglass morphology in Vulpecula.',
  },
  {
    id: 'local-interstellar-cloud',
    name: 'Local Interstellar Cloud (LIC)',
    type: 'InterstellarMedium',
    x: 0.1, y: -0.2, z: 0.3, dist: 0.4,
    radiusPc: 9.2,
    designations: ['Local Fluff'],
    description: 'Warm diffuse gas cloud through which Sol is currently passing within the low-density Local Bubble.',
  },

  // Pulsars & Neutron Stars
  {
    id: 'geminga',
    name: 'Geminga',
    type: 'Pulsar',
    x: -128.5, y: 182.4, z: 63.1, dist: 250.0,
    ageMyr: 0.34,
    designations: ['PSR J0633+1746', '2CG 195+04'],
    description: 'Radio-quiet gamma-ray pulsar and neutron star created by an ancient local supernova.',
  },
  {
    id: 'psr-j0108-1431',
    name: 'PSR J0108-1431',
    type: 'Pulsar',
    x: 48.2, y: -92.5, z: -68.3, dist: 130.0,
    ageMyr: 166.0,
    designations: ['PSR B0106-14'],
    description: 'One of the oldest and closest known isolated radio pulsars to Earth.',
  },
  {
    id: 'vela-pulsar',
    name: 'Vela Pulsar',
    type: 'Pulsar',
    x: -212.0, y: -184.0, z: -52.0, dist: 290.0,
    ageMyr: 0.011,
    designations: ['PSR B0833-45', 'PSR J0835-4510'],
    description: 'Rapidly rotating neutron star (period: 89 ms) powering the central filaments of the Vela SNR.',
  },
];

/**
 * Full Solar System Bodies (Layer 4):
 * Major planets, dwarf planets, moons, Near-Earth Asteroids, Trojans, Centaurs, and historic Comets.
 */
export const FULL_SOLAR_SYSTEM_BODIES = [
  // Sun & Primary Planets
  {
    id: 'sol', name: 'Sol (Sun)', classification: 'Star',
    meanRadiusKm: 696340, massKg: 1.9885e30, gm: 132712440041.93938, albedo: 0.0, rotationalPeriodHours: 609.12,
    tags: ['PrimaryStar', 'HomeStar'],
  },
  {
    id: 'mercury', name: 'Mercury', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 2439.7, massKg: 3.3011e23, gm: 22031.868, albedo: 0.106, rotationalPeriodHours: 1407.6,
    orbit: { semiMajorAxis: 0.387098, eccentricity: 0.20563, inclination: 7.005, ascendingNode: 48.331, argumentOfPeriapsis: 29.124, meanAnomaly: 174.796, periodDays: 87.969, epoch: 'J2000' },
    tags: ['TerrestrialPlanet', 'InnerSystem'],
  },
  {
    id: 'venus', name: 'Venus', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 6051.8, massKg: 4.8675e24, gm: 324858.592, albedo: 0.689, rotationalPeriodHours: -5832.5,
    orbit: { semiMajorAxis: 0.723332, eccentricity: 0.006772, inclination: 3.39458, ascendingNode: 76.68, argumentOfPeriapsis: 54.884, meanAnomaly: 50.115, periodDays: 224.701, epoch: 'J2000' },
    tags: ['TerrestrialPlanet', 'InnerSystem'],
  },
  {
    id: 'earth', name: 'Earth', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 6371.0, massKg: 5.97237e24, gm: 398600.4418, albedo: 0.367, rotationalPeriodHours: 23.934,
    orbit: { semiMajorAxis: 1.00000261, eccentricity: 0.01671123, inclination: 0.00005, ascendingNode: -11.26, argumentOfPeriapsis: 114.2078, meanAnomaly: 358.617, periodDays: 365.256, epoch: 'J2000' },
    tags: ['TerrestrialPlanet', 'HabitableWorld', 'HomeWorld'],
  },
  {
    id: 'moon', name: 'The Moon (Luna)', classification: 'Moon', parentBodyId: 'earth',
    meanRadiusKm: 1737.4, massKg: 7.342e22, gm: 4902.8, albedo: 0.12, rotationalPeriodHours: 655.728,
    orbit: { semiMajorAxis: 0.00257, eccentricity: 0.0549, inclination: 5.145, ascendingNode: 125.08, argumentOfPeriapsis: 318.15, meanAnomaly: 135.0, periodDays: 27.32166, epoch: 'J2000' },
    tags: ['MajorMoon'],
  },
  {
    id: 'mars', name: 'Mars', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 3389.5, massKg: 6.4171e23, gm: 42828.375, albedo: 0.17, rotationalPeriodHours: 24.623,
    orbit: { semiMajorAxis: 1.523679, eccentricity: 0.0934, inclination: 1.85, ascendingNode: 49.562, argumentOfPeriapsis: 286.502, meanAnomaly: 19.373, periodDays: 686.98, epoch: 'J2000' },
    tags: ['TerrestrialPlanet', 'InnerSystem'],
  },
  {
    id: 'phobos', name: 'Phobos', classification: 'Moon', parentBodyId: 'mars',
    meanRadiusKm: 11.267, massKg: 1.0659e16, albedo: 0.071, rotationalPeriodHours: 7.654,
    orbit: { semiMajorAxis: 0.0000627, eccentricity: 0.0151, inclination: 1.093, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 0.3189, epoch: 'J2000' },
    tags: ['MartianMoon'],
  },
  {
    id: 'deimos', name: 'Deimos', classification: 'Moon', parentBodyId: 'mars',
    meanRadiusKm: 6.2, massKg: 1.4762e15, albedo: 0.068, rotationalPeriodHours: 30.312,
    orbit: { semiMajorAxis: 0.0001568, eccentricity: 0.00033, inclination: 0.93, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 1.263, epoch: 'J2000' },
    tags: ['MartianMoon'],
  },
  {
    id: 'jupiter', name: 'Jupiter', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 69911.0, massKg: 1.8982e27, gm: 126686534.921, albedo: 0.538, rotationalPeriodHours: 9.925,
    orbit: { semiMajorAxis: 5.2044, eccentricity: 0.0489, inclination: 1.303, ascendingNode: 100.464, argumentOfPeriapsis: 273.867, meanAnomaly: 20.02, periodDays: 4332.59, epoch: 'J2000' },
    tags: ['GasGiant', 'OuterSystem'],
  },
  {
    id: 'io', name: 'Io', classification: 'Moon', parentBodyId: 'jupiter',
    meanRadiusKm: 1821.6, massKg: 8.9319e22, gm: 5959.9, albedo: 0.63, rotationalPeriodHours: 42.456,
    orbit: { semiMajorAxis: 0.002819, eccentricity: 0.0041, inclination: 0.05, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 1.769, epoch: 'J2000' },
    tags: ['GalileanMoon', 'VolcanicWorld'],
  },
  {
    id: 'europa', name: 'Europa', classification: 'Moon', parentBodyId: 'jupiter',
    meanRadiusKm: 1560.8, massKg: 4.7998e22, gm: 3202.7, albedo: 0.67, rotationalPeriodHours: 85.224,
    orbit: { semiMajorAxis: 0.004485, eccentricity: 0.009, inclination: 0.47, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 3.551, epoch: 'J2000' },
    tags: ['GalileanMoon', 'OceanWorld'],
  },
  {
    id: 'ganymede', name: 'Ganymede', classification: 'Moon', parentBodyId: 'jupiter',
    meanRadiusKm: 2634.1, massKg: 1.4819e23, gm: 9887.8, albedo: 0.43, rotationalPeriodHours: 171.72,
    orbit: { semiMajorAxis: 0.007155, eccentricity: 0.0013, inclination: 0.20, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 7.155, epoch: 'J2000' },
    tags: ['GalileanMoon', 'LargestMoon'],
  },
  {
    id: 'callisto', name: 'Callisto', classification: 'Moon', parentBodyId: 'jupiter',
    meanRadiusKm: 2410.3, massKg: 1.0759e23, gm: 7179.3, albedo: 0.22, rotationalPeriodHours: 400.56,
    orbit: { semiMajorAxis: 0.012585, eccentricity: 0.0074, inclination: 0.28, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 16.689, epoch: 'J2000' },
    tags: ['GalileanMoon', 'CrateredWorld'],
  },
  {
    id: 'saturn', name: 'Saturn', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 58232.0, massKg: 5.6834e26, gm: 37931187.9, albedo: 0.499, rotationalPeriodHours: 10.656,
    orbit: { semiMajorAxis: 9.5826, eccentricity: 0.0565, inclination: 2.485, ascendingNode: 113.665, argumentOfPeriapsis: 339.392, meanAnomaly: 317.02, periodDays: 10759.22, epoch: 'J2000' },
    tags: ['GasGiant', 'OuterSystem', 'RingSystem'],
  },
  {
    id: 'titan', name: 'Titan', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 2574.7, massKg: 1.3452e23, gm: 8978.1, albedo: 0.22, rotationalPeriodHours: 382.68,
    orbit: { semiMajorAxis: 0.008167, eccentricity: 0.0288, inclination: 0.348, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 15.945, epoch: 'J2000' },
    tags: ['MajorMoon', 'DenseAtmosphere', 'MethaneLakes'],
  },
  {
    id: 'enceladus', name: 'Enceladus', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 252.1, massKg: 1.08e20, gm: 7.21, albedo: 0.99, rotationalPeriodHours: 32.88,
    orbit: { semiMajorAxis: 0.00159, eccentricity: 0.0047, inclination: 0.009, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 1.37, epoch: 'J2000' },
    tags: ['MajorMoon', 'GeyserWorld', 'OceanWorld'],
  },
  {
    id: 'uranus', name: 'Uranus', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 25362.0, massKg: 8.681e25, gm: 5793939.3, albedo: 0.488, rotationalPeriodHours: -17.24,
    orbit: { semiMajorAxis: 19.2184, eccentricity: 0.0463, inclination: 0.773, ascendingNode: 74.006, argumentOfPeriapsis: 96.998, meanAnomaly: 142.238, periodDays: 30685.4, epoch: 'J2000' },
    tags: ['IceGiant', 'OuterSystem'],
  },
  {
    id: 'neptune', name: 'Neptune', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 24622.0, massKg: 1.02413e26, gm: 6836529.0, albedo: 0.442, rotationalPeriodHours: 16.11,
    orbit: { semiMajorAxis: 30.1104, eccentricity: 0.009456, inclination: 1.77, ascendingNode: 131.784, argumentOfPeriapsis: 273.187, meanAnomaly: 256.228, periodDays: 60189.0, epoch: 'J2000' },
    tags: ['IceGiant', 'OuterSystem'],
  },
  {
    id: 'triton', name: 'Triton', classification: 'Moon', parentBodyId: 'neptune',
    meanRadiusKm: 1353.4, massKg: 2.14e22, gm: 1428.0, albedo: 0.76, rotationalPeriodHours: -141.04,
    orbit: { semiMajorAxis: 0.00237, eccentricity: 0.000016, inclination: 156.885, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 5.877, epoch: 'J2000' },
    tags: ['RetrogradeMoon', 'CapturedKBO'],
  },

  // Dwarf Planets
  {
    id: 'ceres', name: 'Ceres', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 469.73, massKg: 9.3835e20, gm: 62.63, albedo: 0.09, rotationalPeriodHours: 9.074,
    orbit: { semiMajorAxis: 2.7675, eccentricity: 0.0758, inclination: 10.593, ascendingNode: 80.305, argumentOfPeriapsis: 73.597, meanAnomaly: 77.372, periodDays: 1681.63, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'MainBelt'],
  },
  {
    id: 'pluto', name: 'Pluto', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 1188.3, massKg: 1.303e22, gm: 871.0, albedo: 0.52, rotationalPeriodHours: -153.29,
    orbit: { semiMajorAxis: 39.482, eccentricity: 0.2488, inclination: 17.16, ascendingNode: 110.299, argumentOfPeriapsis: 113.834, meanAnomaly: 14.882, periodDays: 90560.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'KuiperBelt'],
  },
  {
    id: 'charon', name: 'Charon', classification: 'Moon', parentBodyId: 'pluto',
    meanRadiusKm: 606.0, massKg: 1.586e21, albedo: 0.37, rotationalPeriodHours: 153.29,
    orbit: { semiMajorAxis: 0.000131, eccentricity: 0.0002, inclination: 0.0, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 6.387, epoch: 'J2000' },
    tags: ['TidallyLockedMoon'],
  },
  {
    id: 'haumea', name: 'Haumea', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 780.0, massKg: 4.006e21, albedo: 0.66, rotationalPeriodHours: 3.915,
    orbit: { semiMajorAxis: 43.218, eccentricity: 0.1912, inclination: 28.19, ascendingNode: 122.09, argumentOfPeriapsis: 239.05, meanAnomaly: 218.7, periodDays: 103774.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'KuiperBelt', 'FastRotator'],
  },
  {
    id: 'makemake', name: 'Makemake', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 715.0, massKg: 3.1e21, albedo: 0.77, rotationalPeriodHours: 22.83,
    orbit: { semiMajorAxis: 45.79, eccentricity: 0.159, inclination: 28.96, ascendingNode: 79.61, argumentOfPeriapsis: 295.43, meanAnomaly: 165.5, periodDays: 112897.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'KuiperBelt'],
  },
  {
    id: 'eris', name: 'Eris', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 1163.0, massKg: 1.66e22, albedo: 0.96, rotationalPeriodHours: 25.9,
    orbit: { semiMajorAxis: 67.781, eccentricity: 0.44068, inclination: 44.04, ascendingNode: 35.95, argumentOfPeriapsis: 151.64, meanAnomaly: 205.9, periodDays: 203830.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'ScatteredDisc', 'MostMassiveDwarfPlanet'],
  },

  // Prominent Asteroids, Trojans, Centaurs & NEOs
  {
    id: '2-pallas', name: '2 Pallas', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 256.0, massKg: 2.05e20, albedo: 0.159, rotationalPeriodHours: 7.813,
    orbit: { semiMajorAxis: 2.773, eccentricity: 0.231, inclination: 34.84, ascendingNode: 173.08, argumentOfPeriapsis: 310.05, meanAnomaly: 59.7, periodDays: 1686.0, epoch: 'J2000' },
    tags: ['MainBelt', 'HighInclination'],
  },
  {
    id: '4-vesta', name: '4 Vesta', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 262.7, massKg: 2.59e20, albedo: 0.423, rotationalPeriodHours: 5.342,
    orbit: { semiMajorAxis: 2.361, eccentricity: 0.0887, inclination: 7.14, ascendingNode: 103.81, argumentOfPeriapsis: 150.73, meanAnomaly: 20.86, periodDays: 1325.0, epoch: 'J2000' },
    tags: ['MainBelt', 'BrightestAsteroid'],
  },
  {
    id: '10-hygiea', name: '10 Hygiea', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 216.5, massKg: 8.32e19, albedo: 0.0717, rotationalPeriodHours: 13.825,
    orbit: { semiMajorAxis: 3.142, eccentricity: 0.112, inclination: 3.84, ascendingNode: 283.45, argumentOfPeriapsis: 312.31, meanAnomaly: 152.0, periodDays: 2034.0, epoch: 'J2000' },
    tags: ['MainBelt', 'Carbonaceous'],
  },
  {
    id: '16-psyche', name: '16 Psyche', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 111.5, massKg: 2.41e19, albedo: 0.12, rotationalPeriodHours: 4.196,
    orbit: { semiMajorAxis: 2.924, eccentricity: 0.134, inclination: 3.09, ascendingNode: 150.05, argumentOfPeriapsis: 228.8, meanAnomaly: 95.4, periodDays: 1827.0, epoch: 'J2000' },
    tags: ['MainBelt', 'MetallicCore', 'M-Type'],
  },
  {
    id: '433-eros', name: '433 Eros', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 8.42, massKg: 6.687e15, albedo: 0.25, rotationalPeriodHours: 5.27,
    orbit: { semiMajorAxis: 1.458, eccentricity: 0.223, inclination: 10.83, ascendingNode: 304.32, argumentOfPeriapsis: 178.82, meanAnomaly: 310.2, periodDays: 643.0, epoch: 'J2000' },
    tags: ['AmorAsteroid', 'NEO', 'FirstOrbitedAsteroid'],
  },
  {
    id: '99942-apophis', name: '99942 Apophis', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 0.17, massKg: 6.1e10, albedo: 0.23, rotationalPeriodHours: 30.56,
    orbit: { semiMajorAxis: 0.922, eccentricity: 0.191, inclination: 3.33, ascendingNode: 204.04, argumentOfPeriapsis: 126.4, meanAnomaly: 230.9, periodDays: 323.6, epoch: 'J2000' },
    tags: ['AtenAsteroid', 'PHA', 'NEO', 'CloseApproach2029'],
  },
  {
    id: '101955-bennu', name: '101955 Bennu', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 0.245, massKg: 7.329e10, albedo: 0.044, rotationalPeriodHours: 4.297,
    orbit: { semiMajorAxis: 1.126, eccentricity: 0.2037, inclination: 6.035, ascendingNode: 2.06, argumentOfPeriapsis: 66.22, meanAnomaly: 101.7, periodDays: 436.6, epoch: 'J2000' },
    tags: ['ApolloAsteroid', 'PHA', 'SampleReturn'],
  },
  {
    id: '162173-ryugu', name: '162173 Ryugu', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 0.435, massKg: 4.5e11, albedo: 0.045, rotationalPeriodHours: 7.63,
    orbit: { semiMajorAxis: 1.189, eccentricity: 0.1902, inclination: 5.884, ascendingNode: 251.6, argumentOfPeriapsis: 211.4, meanAnomaly: 67.2, periodDays: 473.9, epoch: 'J2000' },
    tags: ['ApolloAsteroid', 'PHA', 'SampleReturn'],
  },
  {
    id: '2060-chiron', name: '2060 Chiron', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 109.0, massKg: 4.0e18, albedo: 0.15, rotationalPeriodHours: 5.918,
    orbit: { semiMajorAxis: 13.67, eccentricity: 0.383, inclination: 6.93, ascendingNode: 209.3, argumentOfPeriapsis: 339.6, meanAnomaly: 71.4, periodDays: 18475.0, epoch: 'J2000' },
    tags: ['Centaur', 'CometaryActivity', 'Rings'],
  },
  {
    id: '624-hektor', name: '624 Hektor', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 112.5, massKg: 1.4e19, albedo: 0.025, rotationalPeriodHours: 6.924,
    orbit: { semiMajorAxis: 5.244, eccentricity: 0.023, inclination: 18.19, ascendingNode: 342.7, argumentOfPeriapsis: 180.4, meanAnomaly: 220.1, periodDays: 4387.0, epoch: 'J2000' },
    tags: ['JupiterTrojan', 'L4Leading', 'LargestTrojan'],
  },
  {
    id: '486958-arrokoth', name: '486958 Arrokoth', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 18.0, massKg: 1.0e15, albedo: 0.06, rotationalPeriodHours: 15.92,
    orbit: { semiMajorAxis: 44.58, eccentricity: 0.0418, inclination: 2.45, ascendingNode: 307.2, argumentOfPeriapsis: 177.3, meanAnomaly: 301.5, periodDays: 108821.0, epoch: 'J2000' },
    tags: ['KuiperBelt', 'ColdClassical', 'ContactBinary'],
  },

  // Historic Comets
  {
    id: '1p-halley', name: '1P/Halley', classification: 'Comet', parentBodyId: 'sol',
    meanRadiusKm: 5.5, massKg: 2.2e14, albedo: 0.04, rotationalPeriodHours: 52.8,
    orbit: { semiMajorAxis: 17.834, eccentricity: 0.967, inclination: 162.26, ascendingNode: 58.42, argumentOfPeriapsis: 111.33, meanAnomaly: 38.38, periodDays: 27500.0, epoch: 'J2000' },
    tags: ['Comet', 'HalleyType', 'Retrograde'],
  },
  {
    id: '2p-encke', name: '2P/Encke', classification: 'Comet', parentBodyId: 'sol',
    meanRadiusKm: 2.4, massKg: 3.0e13, albedo: 0.046, rotationalPeriodHours: 11.08,
    orbit: { semiMajorAxis: 2.215, eccentricity: 0.848, inclination: 11.78, ascendingNode: 334.56, argumentOfPeriapsis: 186.54, meanAnomaly: 120.4, periodDays: 1204.0, epoch: 'J2000' },
    tags: ['Comet', 'ShortestPeriodComet'],
  },
  {
    id: '67p-churyumov', name: '67P/Churyumov-Gerasimenko', classification: 'Comet', parentBodyId: 'sol',
    meanRadiusKm: 2.05, massKg: 9.982e12, albedo: 0.06, rotationalPeriodHours: 12.4,
    orbit: { semiMajorAxis: 3.463, eccentricity: 0.641, inclination: 7.04, ascendingNode: 50.14, argumentOfPeriapsis: 12.78, meanAnomaly: 65.2, periodDays: 2356.0, epoch: 'J2000' },
    tags: ['Comet', 'JupiterFamily', 'RosettaMission'],
  },
];

async function downloadFile(url: string, destPath: string): Promise<number> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'StarmapDataPipeline/2.0 (https://github.com/marcel/starmap)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP fetch failed [${response.status} ${response.statusText}] for ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

export interface FetchSummary {
  sourceId: string;
  name: string;
  status: 'cached' | 'downloaded' | 'initialized' | 'error';
  localPath: string;
  bytes: number;
  message?: string;
}

/**
 * Executes automated acquisition across all declarative sources.
 */
export async function fetchAllDataSources(force = false): Promise<FetchSummary[]> {
  const summaries: FetchSummary[] = [];

  for (const source of DATA_SOURCES_REGISTRY.sources) {
    if (!source.enabled) {
      continue;
    }

    const resolvedLocal = path.resolve(source.localCachePath);
    const exists = fs.existsSync(resolvedLocal);

    if (exists && !force) {
      const stats = fs.statSync(resolvedLocal);
      if (stats.size > 0) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'cached',
          localPath: resolvedLocal,
          bytes: stats.size,
          message: 'Local cache valid, skipping download.',
        });
        continue;
      }
    }

    // Handle declarative seed sources and supplementary scientific catalogs
    if (source.format === 'declarative-seed') {
      try {
        const dir = path.dirname(resolvedLocal);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        let seedContent = '';
        if (source.id.startsWith('galactic-structures') || source.id.includes('galactic')) {
          seedContent = JSON.stringify(FULL_GALACTIC_STRUCTURES, null, 2);
        } else if (source.id.startsWith('solar-system') || source.id.includes('solar-system')) {
          seedContent = JSON.stringify(FULL_SOLAR_SYSTEM_BODIES, null, 2);
        } else if (source.id === 'stellar-iau-wgsn') {
          seedContent = JSON.stringify(OFFICIAL_IAU_STAR_NAMES, null, 2);
        } else if (source.id === 'stellar-recons-10pc') {
          seedContent = JSON.stringify(RECONS_10PC_SUPPLEMENT, null, 2);
        } else if (source.id === 'exoplanet-iau-name-exoworlds') {
          seedContent = JSON.stringify(IAU_NAME_EXOWORLDS, null, 2);
        } else if (source.id === 'stellar-aavso-vsx') {
          seedContent = JSON.stringify(AAVSO_VARIABLE_CATALOG, null, 2);
        }

        fs.writeFileSync(resolvedLocal, seedContent, 'utf-8');
        const bytes = Buffer.byteLength(seedContent, 'utf-8');

        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'initialized',
          localPath: resolvedLocal,
          bytes,
          message: 'Initialized declarative scientific dataset.',
        });
      } catch (err: unknown) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'error',
          localPath: resolvedLocal,
          bytes: 0,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    // Handle remote download sources
    if (source.remoteUrl) {
      try {
        console.log(`Fetching ${source.name} from ${source.remoteUrl}...`);
        const bytes = await downloadFile(source.remoteUrl, resolvedLocal);

        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'downloaded',
          localPath: resolvedLocal,
          bytes,
          message: `Successfully downloaded ${(bytes / 1024 / 1024).toFixed(2)} MB.`,
        });
      } catch (err: unknown) {
        summaries.push({
          sourceId: source.id,
          name: source.name,
          status: 'error',
          localPath: resolvedLocal,
          bytes: 0,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Also ensure all auxiliary supplementary datasets are cached
  const rawDir = path.resolve('data/raw');
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

  const supplements = [
    { file: 'iau_star_names.json', data: OFFICIAL_IAU_STAR_NAMES },
    { file: 'recons_10pc.json', data: RECONS_10PC_SUPPLEMENT },
    { file: 'name_exoworlds.json', data: IAU_NAME_EXOWORLDS },
    { file: 'aavso_variables.json', data: AAVSO_VARIABLE_CATALOG },
    { file: 'galactic-structures.json', data: FULL_GALACTIC_STRUCTURES },
    { file: 'solar-system-bodies.json', data: FULL_SOLAR_SYSTEM_BODIES },
  ];

  for (const s of supplements) {
    const dest = path.join(rawDir, s.file);
    if (!fs.existsSync(dest) || force) {
      fs.writeFileSync(dest, JSON.stringify(s.data, null, 2), 'utf-8');
    }
  }

  return summaries;
}

// CLI entrypoint
const isDirectExecution = process.argv[1]?.endsWith('fetch-sources.ts');
if (isDirectExecution) {
  const force = process.argv.includes('--force');
  console.log(`Starting Data Source Acquisition (force=${force})...`);
  const startTime = Date.now();

  fetchAllDataSources(force)
    .then((results) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\nAcquisition completed in ${elapsed}s:`);
      for (const res of results) {
        const mb = (res.bytes / 1024 / 1024).toFixed(2);
        console.log(`  [${res.status.toUpperCase()}] ${res.name} (${mb} MB) -> ${res.localPath}`);
      }
    })
    .catch((err) => {
      console.error('Acquisition failed:', err);
      process.exit(1);
    });
}
