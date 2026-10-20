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
export const OFFICIAL_IAU_STAR_NAMES: Record<
  string,
  { properName: string; hip?: number; hd?: number; aliases?: string[] }
> = {
  // Northern & Southern Landmark Stars
  'hip-32349': {
    properName: 'Sirius',
    hip: 32349,
    hd: 48915,
    aliases: ['Sirius', 'Sirius A', 'Sirius B', 'Alpha Canis Majoris', 'Dog Star'],
  },
  'hip-30438': {
    properName: 'Canopus',
    hip: 30438,
    hd: 45348,
    aliases: ['Canopus', 'Alpha Carinae'],
  },
  'hip-71683': {
    properName: 'Rigil Kentaurus (Alpha Centauri A)',
    hip: 71683,
    hd: 128620,
    aliases: ['Alpha Centauri', 'Alpha Centauri A', 'Rigil Kentaurus', 'Rigil Kent', 'Alpha Cen A'],
  },
  'hip-71681': {
    properName: 'Toliman (Alpha Centauri B)',
    hip: 71681,
    hd: 128621,
    aliases: ['Toliman', 'Alpha Centauri B', 'Alpha Cen B'],
  },
  'hip-70890': {
    properName: 'Proxima Centauri',
    hip: 70890,
    aliases: ['Proxima Centauri', 'Proxima', 'Alpha Centauri C', 'V645 Centauri'],
  },
  'hip-69673': { properName: 'Arcturus', hip: 69673, hd: 124897, aliases: ['Arcturus', 'Alpha Bootis'] },
  'hip-91262': { properName: 'Vega', hip: 91262, hd: 172167, aliases: ['Vega', 'Alpha Lyrae'] },
  'hip-24608': { properName: 'Capella', hip: 24608, hd: 34029, aliases: ['Capella', 'Alpha Aurigae'] },
  'hip-24436': { properName: 'Rigel', hip: 24436, hd: 34085, aliases: ['Rigel', 'Beta Orionis'] },
  'hip-37279': {
    properName: 'Procyon',
    hip: 37279,
    hd: 61421,
    aliases: ['Procyon', 'Procyon A', 'Alpha Canis Minoris'],
  },
  'hip-27989': { properName: 'Betelgeuse', hip: 27989, hd: 39801, aliases: ['Betelgeuse', 'Alpha Orionis'] },
  'hip-7588': { properName: 'Achernar', hip: 7588, hd: 10144, aliases: ['Achernar', 'Alpha Eridani'] },
  'hip-68702': { properName: 'Hadar', hip: 68702, hd: 122451, aliases: ['Hadar', 'Beta Centauri', 'Agena'] },
  'hip-97649': { properName: 'Altair', hip: 97649, hd: 187642, aliases: ['Altair', 'Alpha Aquilae'] },
  'hip-65474': { properName: 'Spica', hip: 65474, hd: 116658, aliases: ['Spica', 'Alpha Virginis'] },
  'hip-80763': { properName: 'Antares', hip: 80763, hd: 148478, aliases: ['Antares', 'Alpha Scorpii'] },
  'hip-37826': { properName: 'Pollux', hip: 37826, hd: 62509, aliases: ['Pollux', 'Beta Geminorum'] },
  'hip-113368': {
    properName: 'Fomalhaut',
    hip: 113368,
    hd: 216956,
    aliases: ['Fomalhaut', 'Alpha Piscis Austrini'],
  },
  'hip-102098': { properName: 'Deneb', hip: 102098, hd: 197345, aliases: ['Deneb', 'Alpha Cygni'] },
  'hip-62434': { properName: 'Mimosa', hip: 62434, hd: 111123, aliases: ['Mimosa', 'Beta Crucis', 'Becrux'] },
  'hip-49669': { properName: 'Regulus', hip: 49669, hd: 87901, aliases: ['Regulus', 'Alpha Leonis'] },
  'hip-60718': { properName: 'Acrux', hip: 60718, hd: 108248, aliases: ['Acrux', 'Alpha Crucis'] },
  'hip-21421': { properName: 'Aldebaran', hip: 21421, hd: 29139, aliases: ['Aldebaran', 'Alpha Tauri'] },
  'hip-11767': {
    properName: 'Polaris (North Star)',
    hip: 11767,
    hd: 8890,
    aliases: ['Polaris', 'North Star', 'Pole Star', 'Alpha Ursae Minoris'],
  },
  'hip-36850': { properName: 'Castor', hip: 36850, hd: 60179, aliases: ['Castor', 'Alpha Geminorum'] },
  'hip-26727': { properName: 'Bellatrix', hip: 26727, hd: 35468, aliases: ['Bellatrix', 'Gamma Orionis'] },
  'hip-26311': { properName: 'Alnilam', hip: 26311, hd: 37128, aliases: ['Alnilam', 'Epsilon Orionis'] },
  'hip-25336': { properName: 'Alnitak', hip: 25336, hd: 37742, aliases: ['Alnitak', 'Zeta Orionis'] },
  'hip-25930': { properName: 'Mintaka', hip: 25930, hd: 36486, aliases: ['Mintaka', 'Delta Orionis'] },
  'hip-27366': { properName: 'Saiph', hip: 27366, hd: 38771, aliases: ['Saiph', 'Kappa Orionis'] },
  'hip-54061': { properName: 'Dubhe', hip: 54061, hd: 95689, aliases: ['Dubhe', 'Alpha Ursae Majoris'] },
  'hip-53910': { properName: 'Merak', hip: 53910, hd: 95418, aliases: ['Merak', 'Beta Ursae Majoris'] },
  'hip-58001': { properName: 'Phecda', hip: 58001, hd: 103287, aliases: ['Phecda', 'Gamma Ursae Majoris'] },
  'hip-59774': { properName: 'Megrez', hip: 59774, hd: 106591, aliases: ['Megrez', 'Delta Ursae Majoris'] },
  'hip-62956': { properName: 'Alioth', hip: 62956, hd: 112185, aliases: ['Alioth', 'Epsilon Ursae Majoris'] },
  'hip-65378': { properName: 'Mizar', hip: 65378, hd: 116656, aliases: ['Mizar', 'Zeta Ursae Majoris'] },
  'hip-65477': { properName: 'Alcor', hip: 65477, hd: 116842, aliases: ['Alcor', '80 Ursae Majoris'] },
  'hip-67301': { properName: 'Alkaid', hip: 67301, hd: 120315, aliases: ['Alkaid', 'Eta Ursae Majoris'] },
  'hip-90496': { properName: 'Kaus Australis', hip: 90496, hd: 169916 },
  'hip-86032': { properName: 'Shaula', hip: 86032, hd: 159532 },
  'hip-15863': { properName: 'Mirfak', hip: 15863, hd: 20902, aliases: ['Mirfak', 'Alpha Persei'] },
  'hip-14576': {
    properName: 'Algol',
    hip: 14576,
    hd: 19356,
    aliases: ['Algol', 'Beta Persei', 'Demon Star'],
  },
  'hip-10886': {
    properName: 'Mira',
    hip: 10886,
    hd: 14386,
    aliases: ['Mira', 'Omicron Ceti'],
  },
  'hip-110991': {
    properName: 'Delta Cephei',
    hip: 110991,
    hd: 213306,
    aliases: ['Delta Cephei', 'Del Cep'],
  },
  'hip-100453': { properName: 'Alnair', hip: 100453, hd: 193924 },
  'hip-85927': { properName: 'Rasalhague', hip: 85927, hd: 159561 },
  'hip-109268': { properName: 'Peacock', hip: 109268, hd: 207098 },
  'hip-107315': { properName: 'Enif', hip: 107315, hd: 206778 },
  'hip-72607': { properName: 'Kochab', hip: 72607, hd: 131873 },
  'hip-1067': { properName: 'Alpheratz', hip: 1067, hd: 358 },
  'hip-5447': { properName: 'Mirach', hip: 5447, hd: 6860 },
  'hip-9640': { properName: 'Almach', hip: 9640, hd: 12533 },
  'hip-10826': { properName: 'Hamal', hip: 10826, hd: 12929 },
  'hip-14135': {
    properName: 'Menkar',
    hip: 14135,
    hd: 18884,
    aliases: ['Menkar', 'Alpha Ceti', 'Ceti Alpha'],
  },
  'hip-3419': { properName: 'Diphda', hip: 3419, hd: 4128, aliases: ['Diphda', 'Beta Ceti', 'Deneb Kaitos'] },

  // Nearby Solar Neighbourhood & Benchmark Exoplanet Hosts
  'hip-16537': {
    properName: 'Epsilon Eridani (Ran)',
    hip: 16537,
    hd: 22049,
    aliases: ['Epsilon Eridani', 'Ran', 'Eps Eri', 'Gliese 144', 'GJ 144'],
  },
  'hip-8102': {
    properName: 'Tau Ceti',
    hip: 8102,
    hd: 10700,
    aliases: ['Tau Ceti', 'Tau Cet', '52 Ceti', 'Gliese 71', 'GJ 71'],
  },
  'hip-19849': {
    properName: '40 Eridani (Keid)',
    hip: 19849,
    hd: 26965,
    aliases: ['40 Eridani', '40 Eridani A', 'Keid', 'Omicron-2 Eridani', 'Gliese 166 A', 'GJ 166 A'],
  },
  'hip-15510': {
    properName: '82 G. Eridani',
    hip: 15510,
    hd: 20794,
    aliases: ['82 G. Eridani', '82 Eridani', 'e Eridani', 'HD 20794', 'Gliese 139', 'GJ 139'],
  },
  'hip-17378': {
    properName: 'Delta Eridani (Rana)',
    hip: 17378,
    hd: 23249,
    aliases: ['Delta Eridani', 'Rana', 'Del Eri', 'Gliese 150', 'GJ 150'],
  },
  'hip-3821': {
    properName: 'Eta Cassiopeiae (Achird)',
    hip: 3821,
    hd: 4614,
    aliases: ['Eta Cassiopeiae', 'Achird', 'Eta Cas', 'Gliese 34 A', 'GJ 34 A'],
  },
  'hip-99240': {
    properName: 'Delta Pavonis',
    hip: 99240,
    hd: 190248,
    aliases: ['Delta Pavonis', 'Del Pav', 'Gliese 780', 'GJ 780'],
  },
  'hip-108870': {
    properName: 'Epsilon Indi',
    hip: 108870,
    hd: 209100,
    aliases: ['Epsilon Indi', 'Eps Ind', 'Gliese 845', 'GJ 845'],
  },
  'hip-15371': {
    properName: 'Zeta Reticuli (Zeta-2 Reticuli)',
    hip: 15371,
    hd: 20807,
    aliases: ['Zeta Reticuli', 'Zeta-2 Reticuli', 'Zeta-1 Reticuli', 'Zet Ret'],
  },
  'hip-15330': {
    properName: 'Zeta-1 Reticuli',
    hip: 15330,
    hd: 20766,
    aliases: ['Zeta-1 Reticuli', 'Zeta Reticuli'],
  },
  'hip-95477': {
    properName: 'Chi-1 Sagittarii',
    hip: 95477,
    hd: 182369,
    aliases: ['Chi-1 Sagittarii', 'Chi Sagittarii', '47 Sagittarii'],
  },
  'hip-104214': {
    properName: '61 Cygni A',
    hip: 104214,
    hd: 201091,
    aliases: ['61 Cygni', '61 Cygni A', 'Bessel Star', 'Gliese 820 A', 'GJ 820 A'],
  },
  'hip-104217': {
    properName: '61 Cygni B',
    hip: 104217,
    hd: 201092,
    aliases: ['61 Cygni B', '61 Cygni', 'Gliese 820 B', 'GJ 820 B'],
  },
  'hip-84405': {
    properName: '36 Ophiuchi',
    hip: 84405,
    hd: 155886,
    aliases: ['36 Ophiuchi', '36 Oph', 'Gliese 663', 'GJ 663'],
  },
  'hip-113357': {
    properName: '51 Pegasi (Helvetios)',
    hip: 113357,
    hd: 217014,
    aliases: ['51 Pegasi', 'Helvetios', '51 Peg', 'GJ 9798'],
  },
  'hip-43587': {
    properName: '55 Cancri (Copernicus)',
    hip: 43587,
    hd: 75732,
    aliases: ['55 Cancri', 'Copernicus', '55 Cnc', 'Rho-1 Cancri'],
  },
  'hip-86796': {
    properName: 'Mu Arae (Cervantes)',
    hip: 86796,
    hd: 160691,
    aliases: ['Mu Arae', 'Cervantes', 'Mu Ara', 'HD 160691'],
  },
  'hip-7513': {
    properName: 'Upsilon Andromedae (Titawin)',
    hip: 7513,
    hd: 9826,
    aliases: ['Upsilon Andromedae', 'Titawin', 'Ups And', '50 Andromedae'],
  },
  'hip-114189': {
    properName: 'HR 8799',
    hip: 114189,
    hd: 218396,
    aliases: ['HR 8799', 'HD 218396', 'V342 Pegasi'],
  },
  'hip-27321': {
    properName: 'Beta Pictoris',
    hip: 27321,
    hd: 39060,
    aliases: ['Beta Pictoris', 'Bet Pic'],
  },

  // Red Dwarfs & Nearby Flare Stars (RECONS 5 pc Census)
  'hip-87937': {
    properName: "Barnard's Star",
    hip: 87937,
    aliases: ["Barnard's Star", 'Barnard', 'Velox Barnardi', 'Gliese 699', 'GJ 699'],
  },
  'hip-54035': {
    properName: 'Lalande 21185',
    hip: 54035,
    hd: 95735,
    aliases: ['Lalande 21185', 'Gliese 411', 'GJ 411', 'HD 95735'],
  },
  'hip-36208': {
    properName: "Luyten's Star",
    hip: 36208,
    aliases: ["Luyten's Star", 'Luyten', 'Gliese 273', 'GJ 273', 'Gl 273'],
  },
  'hip-57548': {
    properName: 'Ross 128',
    hip: 57548,
    aliases: ['Ross 128', 'FI Virginis', 'Gliese 447', 'GJ 447', 'Gl 447'],
  },
  'hip-92403': {
    properName: 'Ross 154',
    hip: 92403,
    aliases: ['Ross 154', 'V1216 Sagittarii', 'Gliese 729', 'GJ 729', 'Gl 729'],
  },
  'hip-114046': {
    properName: 'Lacaille 9352',
    hip: 114046,
    hd: 217987,
    aliases: ['Lacaille 9352', 'Gliese 887', 'GJ 887', 'Gl 887'],
  },
  'hip-105090': {
    properName: 'Lacaille 8760 (AX Microscopii)',
    hip: 105090,
    hd: 202560,
    aliases: ['Lacaille 8760', 'AX Microscopii', 'Gliese 825', 'GJ 825', 'Gl 825'],
  },
  'hip-24186': {
    properName: "Kapteyn's Star",
    hip: 24186,
    hd: 33793,
    aliases: ["Kapteyn's Star", 'Kapteyn', 'VZ Pictoris', 'Gliese 191', 'GJ 191', 'Gl 191'],
  },
  'hip-80824': {
    properName: 'Wolf 1061 (Gliese 628)',
    hip: 80824,
    aliases: ['Wolf 1061', 'Gliese 628', 'GJ 628', 'Gl 628', 'V2306 Ophiuchi'],
  },
  'hip-91768': {
    properName: 'Struve 2398 A',
    hip: 91768,
    hd: 173739,
    aliases: ['Struve 2398', 'Struve 2398 A', 'Gliese 725 A', 'GJ 725 A', 'Gl 725A'],
  },
  'hip-91772': {
    properName: 'Struve 2398 B',
    hip: 91772,
    hd: 173740,
    aliases: ['Struve 2398 B', 'Struve 2398', 'Gliese 725 B', 'GJ 725 B', 'Gl 725B'],
  },
  'hip-1475': {
    properName: 'Groombridge 34 (GX Andromedae)',
    hip: 1475,
    hd: 1326,
    aliases: ['Groombridge 34', 'GX Andromedae', 'GQ Andromedae', 'Gliese 15 A', 'GJ 15 A', 'Gl 15A'],
  },
  'hip-49908': {
    properName: 'Groombridge 1618',
    hip: 49908,
    hd: 88230,
    aliases: ['Groombridge 1618', 'Gliese 380', 'GJ 380', 'Gl 380'],
  },
  'hip-5643': {
    properName: 'YZ Ceti',
    hip: 5643,
    aliases: ['YZ Ceti', 'Gliese 54.1', 'GJ 54.1', 'Gl 54.1'],
  },
  'hip-57544': {
    properName: 'Gliese 445 (AC +79 3888)',
    hip: 57544,
    aliases: ['Gliese 445', 'GJ 445', 'Gl 445', 'AC +79 3888', 'AC+79 3888'],
  },
  // Gliese-indexed nearby red dwarfs without HIP numbers in HYG
  'gl-Gl 406': {
    properName: 'Wolf 359 (CN Leonis)',
    aliases: ['Wolf 359', 'CN Leonis', 'Gliese 406', 'GJ 406', 'Gl 406'],
  },
  'gl-Gl 905': {
    properName: 'Ross 248 (HH Andromedae)',
    aliases: ['Ross 248', 'HH Andromedae', 'Gliese 905', 'GJ 905', 'Gl 905'],
  },
  'gl-Gl 65A': {
    properName: 'Luyten 726-8 A (BL Ceti)',
    aliases: ['Luyten 726-8', 'Luyten 726-8 A', 'BL Ceti', 'UV Ceti', 'Gliese 65 A', 'GJ 65 A'],
  },
  'gl-Gl 65B': {
    properName: 'UV Ceti (Luyten 726-8 B)',
    aliases: ['UV Ceti', 'Luyten 726-8 B', 'Luyten 726-8', 'Gliese 65 B', 'GJ 65 B'],
  },
  'gl-Gl 866A': {
    properName: 'EZ Aquarii (Luyten 789-6)',
    aliases: ['EZ Aquarii', 'Luyten 789-6', 'Gliese 866', 'GJ 866', 'Gl 866A'],
  },
};

/**
 * RECONS Ground-Truth Census for Systems within 10 parsecs & Landmark Transiting Exoplanet Hosts.
 * Supplementing brown dwarfs, low-mass multiples, and Kepler/TESS/JWST hosts absent in historical naked-eye catalogs.
 */
export const RECONS_10PC_SUPPLEMENT: Array<{
  id: string;
  name: string;
  properName: string;
  ra: number;
  dec: number;
  dist: number;
  mag: number;
  absmag: number;
  spect: string;
  starCount: number;
  components?: string[];
  aliases?: string[];
  description: string;
}> = [
  {
    id: 'luhman-16',
    name: 'Luhman 16 (WISE 1049-5319)',
    properName: 'Luhman 16',
    ra: 10.824,
    dec: -53.319,
    dist: 1.998, // 6.51 light years - 3rd closest system to Sol
    mag: 14.2,
    absmag: 15.2,
    spect: 'L7.5 / T0.5',
    starCount: 2,
    components: ['Luhman 16A', 'Luhman 16B'],
    aliases: ['Luhman 16', 'WISE 1049-5319', 'WISE J104915.57-531906.1'],
    description: 'Binary brown dwarf system in Vela; closest known brown dwarfs to the Sun.',
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855-0714',
    properName: 'WISE 0855-0714',
    ra: 8.922,
    dec: -7.24,
    dist: 2.28, // 7.4 light years - 4th closest system to Sol
    mag: 25.0,
    absmag: 25.7,
    spect: 'Y2',
    starCount: 1,
    aliases: ['WISE 0855-0714', 'WISE 0855', 'WISE J085510.83-071442.5'],
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
    aliases: ["Teegarden's Star", 'Teegarden', 'SO J025300.5+165258', 'GJ 1053'],
    description: 'Ultra-cool red dwarf in Aries hosting multiple Earth-mass habitable zone exoplanets.',
  },
  {
    id: 'dx-cancri',
    name: 'DX Cancri (GJ 1111)',
    properName: 'DX Cancri',
    ra: 8.497,
    dec: 26.776,
    dist: 3.58, // 11.68 light years
    mag: 14.81,
    absmag: 17.04,
    spect: 'M6.5V',
    starCount: 1,
    aliases: ['DX Cancri', 'GJ 1111', 'Gliese 1111', 'G 51-15'],
    description: 'Nearby red dwarf flare star in the constellation Cancer within 12 light-years of Sol.',
  },
  {
    id: 'gliese-667-c',
    name: 'Gliese 667 C (GJ 667 C)',
    properName: 'Gliese 667 C',
    ra: 17.316,
    dec: -34.996,
    dist: 7.24, // 23.6 light years
    mag: 10.22,
    absmag: 10.92,
    spect: 'M1.5V',
    starCount: 1,
    aliases: ['Gliese 667 C', 'GJ 667 C', 'Gl 667 C', 'HR 6426 C'],
    description: 'Tertiary red dwarf component of the Gliese 667 triple star system in Scorpius, hosting super-Earth exoplanet Gliese 667 C c.',
  },
  {
    id: 'trappist-1',
    name: 'TRAPPIST-1',
    properName: 'TRAPPIST-1',
    ra: 23.108,
    dec: -5.041,
    dist: 12.47, // 40.7 light years
    mag: 18.8,
    absmag: 18.4,
    spect: 'M8V',
    starCount: 1,
    aliases: ['TRAPPIST-1', '2MASS J23062928-0502285'],
    description: 'Ultra-cool red dwarf in Aquarius hosting seven temperate terrestrial exoplanets.',
  },
  {
    id: 'lhs-475',
    name: 'LHS 475 (TOI-910)',
    properName: 'LHS 475',
    ra: 19.349,
    dec: -82.56,
    dist: 12.48, // 40.7 light years
    mag: 12.7,
    absmag: 12.22,
    spect: 'M3.5V',
    starCount: 1,
    aliases: ['LHS 475', 'TOI-910', 'GJ 9662'],
    description: 'Red dwarf in Octans where JWST confirmed its first transiting rocky exoplanet LHS 475 b.',
  },
  {
    id: 'lhs-1140',
    name: 'LHS 1140 (GJ 3053)',
    properName: 'LHS 1140',
    ra: 0.788,
    dec: -15.271,
    dist: 14.99, // 48.9 light years
    mag: 14.18,
    absmag: 13.3,
    spect: 'M4.5V',
    starCount: 1,
    aliases: ['LHS 1140', 'GJ 3053', 'Gliese 3053'],
    description: 'Nearby red dwarf in Cetus hosting temperate ocean/eyeball super-Earth candidate LHS 1140 b.',
  },
  {
    id: 'toi-700',
    name: 'TOI-700',
    properName: 'TOI-700',
    ra: 6.473,
    dec: -65.579,
    dist: 31.13, // 101.4 light years
    mag: 13.15,
    absmag: 10.68,
    spect: 'M2V',
    starCount: 1,
    aliases: ['TOI-700', '2MASS J06282325-6534456'],
    description: 'Quiet M-dwarf in Dorado hosting TESS habitable-zone Earth-sized planets TOI-700 d and TOI-700 e.',
  },
  {
    id: 'k2-18',
    name: 'K2-18 (EPIC 201912552)',
    properName: 'K2-18',
    ra: 11.504,
    dec: 7.588,
    dist: 38.07, // 124 light years
    mag: 13.5,
    absmag: 10.6,
    spect: 'M2.8V',
    starCount: 1,
    aliases: ['K2-18', 'EPIC 201912552'],
    description: 'Red dwarf in Leo hosting sub-Neptune Hycean candidate K2-18 b characterized by JWST.',
  },
  {
    id: 'kepler-186',
    name: 'Kepler-186',
    properName: 'Kepler-186',
    ra: 19.91,
    dec: 43.955,
    dist: 178.5, // 582 light years
    mag: 14.62,
    absmag: 8.36,
    spect: 'M1V',
    starCount: 1,
    aliases: ['Kepler-186', 'KOI-571', 'KIC 8120608'],
    description: 'M-dwarf in Cygnus hosting Kepler-186 f, the first validated Earth-sized planet in the habitable zone.',
  },
  {
    id: 'wasp-39',
    name: 'WASP-39 (Malmok)',
    properName: 'WASP-39',
    ra: 14.489,
    dec: -3.444,
    dist: 214.0, // 700 light years
    mag: 12.11,
    absmag: 5.45,
    spect: 'G8V',
    starCount: 1,
    aliases: ['WASP-39', 'Malmok'],
    description: 'G-type star in Virgo hosting hot Saturn WASP-39 b (Bocaprins), where JWST made the first exoplanet CO2 and SO2 detections.',
  },
  {
    id: 'wasp-96',
    name: 'WASP-96',
    properName: 'WASP-96',
    ra: 0.069,
    dec: -47.36,
    dist: 352.0, // 1,150 light years
    mag: 12.2,
    absmag: 4.46,
    spect: 'G8V',
    starCount: 1,
    aliases: ['WASP-96', 'Yansolan Host'],
    description: 'G-type star in Phoenix whose hot gas giant WASP-96 b was featured in the JWST Early Release Observations.',
  },
  {
    id: 'tabbys-star',
    name: "Tabby's Star (KIC 8462852 / Boyajian's Star)",
    properName: "Tabby's Star",
    ra: 20.104,
    dec: 44.457,
    dist: 451.0, // 1,470 light years
    mag: 11.7,
    absmag: 3.43,
    spect: 'F3V',
    starCount: 1,
    aliases: ["Tabby's Star", "Boyajian's Star", 'KIC 8462852', 'WTF Star'],
    description: 'F-type main-sequence star in Cygnus exhibiting irregular aperiodic dimming up to 22% from circumstellar dust.',
  },
  {
    id: 'kepler-452',
    name: 'Kepler-452',
    properName: 'Kepler-452',
    ra: 19.733,
    dec: 44.278,
    dist: 552.0, // 1,800 light years
    mag: 13.42,
    absmag: 4.71,
    spect: 'G2V',
    starCount: 1,
    aliases: ['Kepler-452', 'KOI-7016', 'KIC 8311864'],
    description: 'Solar-type G2V star in Cygnus hosting habitable-zone super-Earth candidate Kepler-452 b.',
  },
  {
    id: 'psr-b1257-12',
    name: 'PSR B1257+12 (Lich)',
    properName: 'PSR B1257+12',
    ra: 13.001,
    dec: 12.682,
    dist: 710.0, // 2,315 light years
    mag: 24.3,
    absmag: 15.0,
    spect: 'PSR',
    starCount: 1,
    aliases: ['PSR B1257+12', 'PSR 1257+12', 'PSR J1300+1240', 'Lich'],
    description: 'Millisecond pulsar in Virgo hosting the first confirmed extrasolar planets discovered in 1992 (Draugr, Poltergeist, Phobetor).',
  },
];

/**
 * IAU NameExoWorlds official common nomenclature for exoplanets and host stars.
 */
export const IAU_NAME_EXOWORLDS: Record<string, { starName: string; planetName: string; culturalOrigin: string }> = {
  '51 Pegasi b': { starName: 'Helvetios', planetName: 'Dimidium', culturalOrigin: 'Switzerland / Latin' },
  'HD 209458 b': { starName: 'Solaris', planetName: 'Osiris', culturalOrigin: 'Egyptian Mythology' },
  '55 Cancri e': { starName: 'Copernicus', planetName: 'Janssen', culturalOrigin: 'Netherlands' },
  '55 Cancri b': { starName: 'Copernicus', planetName: 'Galileo', culturalOrigin: 'Italy' },
  '55 Cancri c': { starName: 'Copernicus', planetName: 'Brahe', culturalOrigin: 'Denmark' },
  '55 Cancri d': { starName: 'Copernicus', planetName: 'Lipperhey', culturalOrigin: 'Netherlands' },
  '55 Cancri f': { starName: 'Copernicus', planetName: 'Harriot', culturalOrigin: 'United Kingdom' },
  'PSR B1257+12 b': { starName: 'Lich', planetName: 'Draugr', culturalOrigin: 'Norse Mythology' },
  'PSR B1257+12 c': { starName: 'Lich', planetName: 'Poltergeist', culturalOrigin: 'Folklore' },
  'PSR B1257+12 d': { starName: 'Lich', planetName: 'Phobetor', culturalOrigin: 'Greek Mythology' },
  'PSR 1257+12 A': { starName: 'Lich', planetName: 'Draugr', culturalOrigin: 'Norse Mythology' },
  'PSR 1257+12 B': { starName: 'Lich', planetName: 'Poltergeist', culturalOrigin: 'Folklore' },
  'PSR 1257+12 C': { starName: 'Lich', planetName: 'Phobetor', culturalOrigin: 'Greek Mythology' },
  'mu Arae b': { starName: 'Cervantes', planetName: 'Quijote', culturalOrigin: 'Spain / Literature' },
  'mu Arae c': { starName: 'Cervantes', planetName: 'Dulcinea', culturalOrigin: 'Spain / Literature' },
  'mu Arae d': { starName: 'Cervantes', planetName: 'Rocinante', culturalOrigin: 'Spain / Literature' },
  'mu Arae e': { starName: 'Cervantes', planetName: 'Sancho', culturalOrigin: 'Spain / Literature' },
  'Mu Arae b': { starName: 'Cervantes', planetName: 'Quijote', culturalOrigin: 'Spain / Literature' },
  'Mu Arae c': { starName: 'Cervantes', planetName: 'Dulcinea', culturalOrigin: 'Spain / Literature' },
  'Mu Arae d': { starName: 'Cervantes', planetName: 'Rocinante', culturalOrigin: 'Spain / Literature' },
  'Mu Arae e': { starName: 'Cervantes', planetName: 'Sancho', culturalOrigin: 'Spain / Literature' },
  'upsilon Andromedae b': { starName: 'Titawin', planetName: 'Saffar', culturalOrigin: 'Morocco / Arab Astronomy' },
  'upsilon Andromedae c': { starName: 'Titawin', planetName: 'Samh', culturalOrigin: 'Morocco / Arab Astronomy' },
  'upsilon Andromedae d': { starName: 'Titawin', planetName: 'Majriti', culturalOrigin: 'Morocco / Arab Astronomy' },
  'Upsilon Andromedae b': { starName: 'Titawin', planetName: 'Saffar', culturalOrigin: 'Morocco / Arab Astronomy' },
  'Upsilon Andromedae c': { starName: 'Titawin', planetName: 'Samh', culturalOrigin: 'Morocco / Arab Astronomy' },
  'Upsilon Andromedae d': { starName: 'Titawin', planetName: 'Majriti', culturalOrigin: 'Morocco / Arab Astronomy' },
  'HD 149026 b': { starName: 'Ogma', planetName: 'Smertrios', culturalOrigin: 'Celtic Mythology' },
  'epsilon Eridani b': { starName: 'Ran', planetName: 'AEgir', culturalOrigin: 'Norse Mythology' },
  'Epsilon Eridani b': { starName: 'Ran', planetName: 'AEgir', culturalOrigin: 'Norse Mythology' },
  'Fomalhaut b': { starName: 'Fomalhaut', planetName: 'Dagon', culturalOrigin: 'Levantine / Semitic' },
  'GJ 1214 b': { starName: 'Orkaria', planetName: 'Enaiposha', culturalOrigin: 'Kenya / Maasai' },
  'Gliese 1214 b': { starName: 'Orkaria', planetName: 'Enaiposha', culturalOrigin: 'Kenya / Maasai' },
  'GJ 436 b': { starName: 'Noquisi', planetName: 'Awohali', culturalOrigin: 'Cherokee' },
  'WASP-39 b': { starName: 'Malmok', planetName: 'Bocaprins', culturalOrigin: 'Aruba' },
  'WASP-96 b': { starName: 'Nikawiy', planetName: 'Yansolan', culturalOrigin: 'Indigenous Americas' },
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
    designations: ['Hyades', 'Melotte 25', 'Collinder 50', 'Caldwell 41', 'C 0424+157'],
    description: 'The nearest open star cluster to the Solar System, sharing a common trajectory through space.',
  },
  {
    id: 'coma-star-cluster',
    name: 'Coma Star Cluster',
    type: 'OpenCluster',
    x: -8.2, y: 3.4, z: 85.5, dist: 86.0,
    radiusPc: 4.8, ageMyr: 450, memberCount: 270,
    designations: ['Coma Berenices Cluster', 'Melotte 111', 'Collinder 256'],
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
    name: 'Pleiades (Seven Sisters / M45)',
    type: 'OpenCluster',
    x: 122.8, y: 49.6, z: -34.2, dist: 135.5,
    radiusPc: 2.6, ageMyr: 115, memberCount: 1000,
    designations: ['Pleiades', 'Seven Sisters', 'M45', 'M 045', 'Messier 45', 'Melotte 22', 'Collinder 42'],
    description: 'Luminous young open cluster just beyond the 100-pc boundary, prominent in night-sky lore.',
  },
  {
    id: 'praesepe',
    name: 'Praesepe (Beehive Cluster / M44)',
    type: 'OpenCluster',
    x: 137.4, y: 104.2, z: 75.3, dist: 187.0,
    radiusPc: 3.5, ageMyr: 600, memberCount: 1000,
    designations: ['Praesepe', 'Beehive Cluster', 'M44', 'M 044', 'Messier 44', 'NGC 2632', 'Melotte 88'],
    description: 'One of the nearest open clusters, sharing similar age and proper motion to the Hyades.',
  },
  {
    id: 'ic-2602',
    name: 'IC 2602 (Southern Pleiades)',
    type: 'OpenCluster',
    x: -125.1, y: -74.3, z: -18.2, dist: 147.0,
    radiusPc: 2.1, ageMyr: 30, memberCount: 120,
    designations: ['IC 2602', 'Southern Pleiades', 'Theta Carinae Cluster', 'Caldwell 102'],
    description: 'Bright young open cluster surrounding Theta Carinae in the southern sky.',
  },
  {
    id: 'ic-2391',
    name: 'IC 2391 (Omicron Velorum Cluster)',
    type: 'OpenCluster',
    x: -118.2, y: -108.5, z: -22.1, dist: 152.0,
    radiusPc: 2.4, ageMyr: 50, memberCount: 60,
    designations: ['IC 2391', 'Omicron Velorum Cluster', 'Caldwell 85', 'Melotte 91'],
    description: 'Compact open cluster in Vela visible to the naked eye.',
  },
  {
    id: 'alpha-persei-cluster',
    name: 'Alpha Persei Cluster (Melotte 20)',
    type: 'OpenCluster',
    x: 152.4, y: 64.8, z: -25.6, dist: 172.0,
    radiusPc: 4.2, ageMyr: 70, memberCount: 300,
    designations: ['Alpha Persei Cluster', 'Melotte 20', 'Collinder 39'],
    description: 'Young OB stellar association surrounding Mirfak in Perseus.',
  },

  // Globular Clusters (Prominent Milky Way Landmarks)
  {
    id: 'm4-globular',
    name: 'Messier 4 (M4 / NGC 6121)',
    type: 'GlobularCluster',
    x: 1500.0, y: -800.0, z: 600.0, dist: 1900.0,
    radiusPc: 11.5, ageMyr: 12200, memberCount: 100000,
    designations: ['Messier 4', 'M4', 'M 004', 'NGC 6121'],
    description: 'The closest globular cluster to the Solar System, situated in Scorpius near Antares.',
  },
  {
    id: 'ngc-6397',
    name: 'NGC 6397 (Caldwell 86)',
    type: 'GlobularCluster',
    x: 1800.0, y: -1200.0, z: -450.0, dist: 2300.0,
    radiusPc: 9.8, ageMyr: 12800, memberCount: 400000,
    designations: ['NGC 6397', 'Caldwell 86'],
    description: 'One of the oldest known globular clusters in the Milky Way with a core-collapsed structure.',
  },
  {
    id: '47-tucanae',
    name: '47 Tucanae (NGC 104)',
    type: 'GlobularCluster',
    x: 1900.0, y: -2600.0, z: -3100.0, dist: 4450.0,
    radiusPc: 18.5, ageMyr: 13000, memberCount: 2000000,
    designations: ['47 Tucanae', '47 Tuc', 'NGC 104', 'Caldwell 106'],
    description: 'The second brightest and most massive globular cluster in the Milky Way, located in Tucana.',
  },
  {
    id: 'omega-centauri',
    name: 'Omega Centauri (NGC 5139)',
    type: 'GlobularCluster',
    x: 4200.0, y: -2500.0, z: 1100.0, dist: 5200.0,
    radiusPc: 26.0, ageMyr: 11500, memberCount: 10000000,
    designations: ['Omega Centauri', 'NGC 5139', 'Caldwell 80'],
    description: 'The largest and most massive globular cluster in the Milky Way; remnant nucleus of a dwarf galaxy.',
  },
  {
    id: 'm13-hercules',
    name: 'Messier 13 (Great Hercules Cluster / M13)',
    type: 'GlobularCluster',
    x: 3200.0, y: 5500.0, z: 4200.0, dist: 7100.0,
    radiusPc: 22.0, ageMyr: 11650, memberCount: 300000,
    designations: ['Messier 13', 'M13', 'M 013', 'Great Hercules Cluster', 'Hercules Globular Cluster', 'NGC 6205'],
    description: 'The premier northern sky globular cluster in the constellation Hercules; target of the 1974 Arecibo Message.',
  },

  // Supernova Remnants, Emission Nebulae & Planetary Nebulae
  {
    id: 'orion-nebula',
    name: 'Orion Nebula (M42 / NGC 1976)',
    type: 'EmissionNebula',
    x: -360.0, y: -180.0, z: -100.0, dist: 412.0,
    radiusPc: 3.7, ageMyr: 2.0,
    designations: ['Orion Nebula', 'M42', 'M 042', 'Messier 42', 'NGC 1976'],
    description: 'The closest massive star-forming H II region to Earth, visible to the naked eye in Orion’s Sword.',
  },
  {
    id: 'ring-nebula',
    name: 'Ring Nebula (M57 / NGC 6720)',
    type: 'PlanetaryNebula',
    x: 340.0, y: 580.0, z: 390.0, dist: 787.0,
    radiusPc: 0.4, ageMyr: 0.004,
    designations: ['Ring Nebula', 'M57', 'M 057', 'Messier 57', 'NGC 6720'],
    description: 'Iconic bipolar planetary nebula in Lyra ionized by a central white dwarf.',
  },
  {
    id: 'lagoon-nebula',
    name: 'Lagoon Nebula (M8 / NGC 6523)',
    type: 'EmissionNebula',
    x: 1220.0, y: -150.0, z: -480.0, dist: 1320.0,
    radiusPc: 17.0, ageMyr: 2.0,
    designations: ['Lagoon Nebula', 'M8', 'M 008', 'Messier 8', 'NGC 6523'],
    description: 'Giant interstellar H II emission nebula and star-forming region in Sagittarius.',
  },
  {
    id: 'eagle-nebula',
    name: 'Eagle Nebula (M16 / Pillars of Creation / NGC 6611)',
    type: 'EmissionNebula',
    x: 1580.0, y: 420.0, z: -490.0, dist: 1740.0,
    radiusPc: 11.0, ageMyr: 1.8,
    designations: ['Eagle Nebula', 'M16', 'M 016', 'Messier 16', 'Pillars of Creation', 'NGC 6611'],
    description: 'Active star-forming H II region in Serpens home to the iconic Pillars of Creation.',
  },
  {
    id: 'carina-nebula',
    name: 'Carina Nebula (NGC 3372 / Eta Carinae Nebula)',
    type: 'EmissionNebula',
    x: -780.0, y: -2150.0, z: -1020.0, dist: 2500.0,
    radiusPc: 45.0, ageMyr: 3.0,
    designations: ['Carina Nebula', 'NGC 3372', 'Eta Carinae Nebula', 'Cosmic Cliffs', 'Caldwell 92'],
    description: 'One of the largest diffuse emission nebulae in our sky, containing Eta Carinae and the Cosmic Cliffs.',
  },
  {
    id: 'vela-snr',
    name: 'Vela Supernova Remnant',
    type: 'SupernovaRemnant',
    x: -210.0, y: -180.0, z: -50.0, dist: 287.0,
    radiusPc: 18.0, ageMyr: 0.011,
    designations: ['Vela Supernova Remnant', 'Vela SNR', 'Gum 16', 'SNR G263.9-03.3'],
    description: 'A massive expanding filamentary remnant of a stellar explosion occurring ~11,000 years ago.',
  },
  {
    id: 'cygnus-loop',
    name: 'Cygnus Loop (Veil Nebula)',
    type: 'SupernovaRemnant',
    x: 480.0, y: 520.0, z: -180.0, dist: 735.0,
    radiusPc: 16.0, ageMyr: 0.02,
    designations: ['Cygnus Loop', 'Veil Nebula', 'NGC 6960', 'NGC 6992', 'Caldwell 33', 'Caldwell 34'],
    description: 'Spectacular optical emission nebula marking a core-collapse supernova remnant in Cygnus.',
  },
  {
    id: 'crab-nebula',
    name: 'Crab Nebula (M1 / NGC 1952)',
    type: 'SupernovaRemnant',
    x: -1950.0, y: 450.0, z: -210.0, dist: 2000.0,
    radiusPc: 1.7, ageMyr: 0.001,
    designations: ['Crab Nebula', 'M1', 'M 001', 'Messier 1', 'NGC 1952', 'Taurus A', 'SNR G184.6-05.8'],
    description: 'Pulsar wind plerion remnant created by the historical supernova of 1054 recorded by Chinese astronomers.',
  },
  {
    id: 'helix-nebula',
    name: 'Helix Nebula (NGC 7293)',
    type: 'PlanetaryNebula',
    x: 65.0, y: 120.0, z: -170.0, dist: 200.0,
    radiusPc: 0.8, ageMyr: 0.01,
    designations: ['Helix Nebula', 'NGC 7293', 'Caldwell 63', 'Eye of God'],
    description: 'The closest planetary nebula to Earth, showing a dying low-mass star shedding its outer gas shell.',
  },
  {
    id: 'dumbbell-nebula',
    name: 'Dumbbell Nebula (M27 / NGC 6853)',
    type: 'PlanetaryNebula',
    x: 280.0, y: 290.0, z: 70.0, dist: 410.0,
    radiusPc: 1.1, ageMyr: 0.015,
    designations: ['Dumbbell Nebula', 'M27', 'M 027', 'Messier 27', 'NGC 6853'],
    description: 'The first planetary nebula discovered in history, notable for its bright hourglass morphology in Vulpecula.',
  },
  // Complex of Local Interstellar Clouds (CLIC <= 15 pc), Local Bubble & Nearby Molecular Clouds
  {
    id: 'local-interstellar-cloud',
    name: 'Local Interstellar Cloud (LIC / Local Fluff)',
    type: 'InterstellarMedium',
    x: 0.1, y: -0.2, z: 0.3, dist: 0.4,
    radiusPc: 4.6,
    designations: ['Local Interstellar Cloud', 'LIC', 'Local Fluff'],
    description: 'Partially ionised warm interstellar cloud (~7,000 K) in the Complex of Local Interstellar Clouds (CLIC) through which Sol is currently passing.',
  },
  {
    id: 'g-cloud',
    name: 'G-Cloud (Galactic Center Cloud)',
    type: 'InterstellarMedium',
    x: -0.7, y: -0.6, z: -1.5, dist: 1.8,
    radiusPc: 3.5,
    designations: ['G-Cloud', 'Galactic Cloud', 'CLIC G-Cloud'],
    description: 'Neighboring warm interstellar cloud (~5,500 K) immediately adjacent to the LIC toward the Galactic Centre, enveloping the Alpha Centauri system.',
  },
  {
    id: 'blue-cloud',
    name: 'Blue Cloud (Sirius Dog Star Cloud)',
    type: 'InterstellarMedium',
    x: -0.4, y: 2.0, z: -0.6, dist: 2.2,
    radiusPc: 2.0,
    designations: ['Blue Cloud', 'Sirius Cloud', 'CLIC Blue Cloud'],
    description: 'Compact warm diffuse cloud in the Complex of Local Interstellar Clouds situated along the line of sight to Sirius and Epsilon Canis Majoris.',
  },
  {
    id: 'aquilae-cloud',
    name: 'Aquilae Cloud',
    type: 'InterstellarMedium',
    x: 1.6, y: -3.1, z: 0.5, dist: 3.5,
    radiusPc: 3.2,
    designations: ['Aquilae Cloud', 'Aql Cloud', 'CLIC Aquilae'],
    description: 'Warm local interstellar cloud in the CLIC extending toward the Aquila and Altair sector.',
  },
  {
    id: 'mic-cloud',
    name: 'Microscopium Cloud (Mic Cloud)',
    type: 'InterstellarMedium',
    x: 2.6, y: -2.6, z: -2.1, dist: 4.2,
    radiusPc: 3.8,
    designations: ['Microscopium Cloud', 'Mic Cloud', 'CLIC Mic'],
    description: 'Filamentary warm cloud (~9,900 K) heated by shock interaction at the interface between the Local Interstellar Cloud and the G-Cloud.',
  },
  {
    id: 'leo-cloud',
    name: 'Leo Cold Cloud (Local Leo Ribbon)',
    type: 'InterstellarMedium',
    x: -6.7, y: 2.8, z: 1.9, dist: 7.5,
    radiusPc: 2.8,
    designations: ['Leo Cloud', 'Local Leo Cold Cloud', 'LLCC', 'CLIC Leo'],
    description: 'Unusually cold (~20 K), dense neutral hydrogen ribbon embedded within the hot Local Bubble cavity at ~7.5 parsecs.',
  },
  {
    id: 'dor-cloud',
    name: 'Dorado Cloud (Dor Cloud)',
    type: 'InterstellarMedium',
    x: 0.5, y: 3.9, z: -6.9, dist: 8.0,
    radiusPc: 3.5,
    designations: ['Dorado Cloud', 'Dor Cloud', 'CLIC Dor'],
    description: 'Southern warm interstellar cloud in the Complex of Local Interstellar Clouds toward Dorado.',
  },
  {
    id: 'eri-cloud',
    name: 'Eridanus Cloud (Eri Cloud)',
    type: 'InterstellarMedium',
    x: 5.3, y: 6.9, z: -2.3, dist: 9.0,
    radiusPc: 4.0,
    designations: ['Eridanus Cloud', 'Eri Cloud', 'CLIC Eri'],
    description: 'Warm local interstellar gas cloud in the Eridanus sector of the CLIC.',
  },
  {
    id: 'vela-cloud',
    name: 'Vela Cloud (CLIC Vela)',
    type: 'InterstellarMedium',
    x: -5.2, y: 5.2, z: -7.4, dist: 10.5,
    radiusPc: 4.5,
    designations: ['Vela Cloud', 'CLIC Vela'],
    description: 'Fast-moving warm interstellar cloud in the southern Complex of Local Interstellar Clouds.',
  },
  {
    id: 'local-bubble',
    name: 'Local Bubble (Local Hot Bubble / LHB)',
    type: 'InterstellarMedium',
    x: -5.0, y: -12.0, z: 7.5, dist: 15.0,
    radiusPc: 95.0,
    designations: ['Local Bubble', 'Local Hot Bubble', 'LHB', "Gould's Belt Cavity"],
    description: 'Low-density (~0.001 cm⁻³) interstellar cavity spanning ~200 pc across the Orion Spur, excavated by multiple Pleiades/Sco-Cen supernova explosions over the past 14 million years.',
  },
  {
    id: 'corona-australis-cloud',
    name: 'Corona Australis Molecular Cloud',
    type: 'InterstellarMedium',
    x: 26.9, y: -100.2, z: -78.2, dist: 130.0,
    radiusPc: 8.5,
    designations: ['Corona Australis Molecular Cloud', 'CrA Cloud', 'Coronet Cluster Cloud'],
    description: 'Compact, high-density molecular cloud complex hosting the young Coronet protostellar cluster at ~130 pc.',
  },
  {
    id: 'rho-ophiuchi-cloud',
    name: 'Rho Ophiuchi Cloud Complex',
    type: 'InterstellarMedium',
    x: -48.5, y: -115.6, z: -57.2, dist: 138.0,
    radiusPc: 14.0,
    designations: ['Rho Ophiuchi Cloud Complex', 'Rho Ophiuchi', 'Lynds 1688', 'Ophiuchus Molecular Cloud'],
    description: 'Dense dark nebula and active stellar nursery at the Upper Scorpius boundary of the Local Bubble, ~138 pc from Sol.',
  },
  {
    id: 'taurus-molecular-cloud',
    name: 'Taurus Molecular Cloud (TMC-1)',
    type: 'InterstellarMedium',
    x: 48.2, y: 116.3, z: 61.4, dist: 140.0,
    radiusPc: 16.0,
    designations: ['Taurus Molecular Cloud', 'TMC', 'TMC-1', 'Lynds 1527'],
    description: 'The nearest large molecular cloud complex and low-mass star-forming nursery on the rim of the Local Bubble.',
  },
  {
    id: 'pipe-nebula',
    name: 'Pipe Nebula (Barnard 59 / 65–67 / 78)',
    type: 'InterstellarMedium',
    x: -22.0, y: -127.8, z: -64.7, dist: 145.0,
    radiusPc: 14.0,
    designations: ['Pipe Nebula', 'Barnard 78', 'Barnard 59', 'LDN 1773'],
    description: 'Vast pipe-shaped dark molecular cloud complex in southern Ophiuchus silhouetted against the Galactic Bulge.',
  },
  {
    id: 'lupus-molecular-cloud',
    name: 'Lupus Molecular Cloud Complex',
    type: 'InterstellarMedium',
    x: -68.0, y: -101.5, z: -95.4, dist: 155.0,
    radiusPc: 18.0,
    designations: ['Lupus Molecular Cloud', 'Lupus Cloud Complex', 'Lupus I-IV'],
    description: 'Chain of star-forming dark molecular clouds (Lupus I–IV) bordering the Scorpius-Centaurus OB association.',
  },
  {
    id: 'coalsack-nebula',
    name: 'Coalsack Nebula (Caldwell 99)',
    type: 'InterstellarMedium',
    x: -81.4, y: -17.2, z: -159.6, dist: 180.0,
    radiusPc: 15.0,
    designations: ['Coalsack Nebula', 'Southern Coalsack', 'Caldwell 99', 'TGU H1867'],
    description: 'The most prominent naked-eye dark absorption nebula in the southern Milky Way, silhouetted against Crux.',
  },
  {
    id: 'chamaeleon-cloud-complex',
    name: 'Chamaeleon Cloud Complex',
    type: 'InterstellarMedium',
    x: -41.1, y: 9.8, z: -183.2, dist: 188.0,
    radiusPc: 16.5,
    designations: ['Chamaeleon Cloud Complex', 'Chamaeleon I', 'Chamaeleon Dark Clouds'],
    description: 'High-latitude southern molecular cloud complex rich in T Tauri protostars and reflection nebulae.',
  },
  {
    id: 'sagittarius-a-star',
    name: 'Sagittarius A* (Galactic Center)',
    type: 'DeepSkyLandmark',
    x: 8178.0, y: 0.0, z: 0.0, dist: 8178.0,
    radiusPc: 0.01,
    designations: ['Sagittarius A*', 'Sgr A*', 'Sagittarius A', 'Galactic Center', 'Milky Way Supermassive Black Hole'],
    description: 'Supermassive black hole (4.15 million solar masses) at the dynamical center of the Milky Way galaxy.',
  },

  // Pulsars & Neutron Stars
  {
    id: 'geminga',
    name: 'Geminga (PSR J0633+1746)',
    type: 'Pulsar',
    x: -128.5, y: 182.4, z: 63.1, dist: 250.0,
    ageMyr: 0.34,
    designations: ['Geminga', 'PSR J0633+1746', '2CG 195+04'],
    description: 'Radio-quiet gamma-ray pulsar and neutron star created by an ancient local supernova.',
  },
  {
    id: 'psr-j0108-1431',
    name: 'PSR J0108-1431',
    type: 'Pulsar',
    x: 48.2, y: -92.5, z: -68.3, dist: 130.0,
    ageMyr: 166.0,
    designations: ['PSR J0108-1431', 'PSR B0106-14'],
    description: 'One of the oldest and closest known isolated radio pulsars to Earth.',
  },
  {
    id: 'vela-pulsar',
    name: 'Vela Pulsar (PSR B0833-45)',
    type: 'Pulsar',
    x: -212.0, y: -184.0, z: -52.0, dist: 290.0,
    ageMyr: 0.011,
    designations: ['Vela Pulsar', 'PSR B0833-45', 'PSR J0835-4510'],
    description: 'Rapidly rotating neutron star (period: 89 ms) powering the central filaments of the Vela SNR.',
  },
  {
    id: 'crab-pulsar',
    name: 'Crab Pulsar (PSR B0531+21)',
    type: 'Pulsar',
    x: -1950.0, y: 450.0, z: -210.0, dist: 2000.0,
    ageMyr: 0.001,
    designations: ['Crab Pulsar', 'PSR B0531+21', 'PSR J0534+2200'],
    description: 'Young central neutron star (period: 33 ms) formed in the 1054 CE supernova at the heart of the Crab Nebula.',
  },
];

/**
 * Full Solar System Bodies (Layer 4):
 * Major planets, dwarf planets, moons, Near-Earth Asteroids, Trojans, Centaurs, Comets, and Deep-Space Probes.
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
    id: 'earth', name: 'Earth (Terra)', classification: 'Planet', parentBodyId: 'sol',
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
    id: 'mimas', name: 'Mimas (Saturn I)', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 198.2, massKg: 3.7493e19, gm: 2.503, albedo: 0.962, rotationalPeriodHours: 22.618,
    orbit: { semiMajorAxis: 0.00124, eccentricity: 0.0196, inclination: 1.574, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 0.942, epoch: 'J2000' },
    tags: ['MajorMoon', 'HerschelCrater'],
  },
  {
    id: 'tethys', name: 'Tethys (Saturn III)', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 531.1, massKg: 6.1745e20, gm: 41.21, albedo: 1.229, rotationalPeriodHours: 45.307,
    orbit: { semiMajorAxis: 0.00197, eccentricity: 0.0001, inclination: 1.12, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 1.888, epoch: 'J2000' },
    tags: ['MajorMoon', 'IthacaChasma'],
  },
  {
    id: 'dione', name: 'Dione (Saturn IV)', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 561.4, massKg: 1.0955e21, gm: 73.11, albedo: 0.998, rotationalPeriodHours: 65.686,
    orbit: { semiMajorAxis: 0.00252, eccentricity: 0.0022, inclination: 0.019, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 2.737, epoch: 'J2000' },
    tags: ['MajorMoon'],
  },
  {
    id: 'rhea', name: 'Rhea (Saturn V)', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 763.8, massKg: 2.3065e21, gm: 153.94, albedo: 0.949, rotationalPeriodHours: 108.42,
    orbit: { semiMajorAxis: 0.00352, eccentricity: 0.00125, inclination: 0.345, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 4.518, epoch: 'J2000' },
    tags: ['MajorMoon'],
  },
  {
    id: 'iapetus', name: 'Iapetus (Saturn VIII)', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 734.5, massKg: 1.8056e21, gm: 120.5, albedo: 0.35, rotationalPeriodHours: 1903.7,
    orbit: { semiMajorAxis: 0.0238, eccentricity: 0.0286, inclination: 15.47, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 79.3215, epoch: 'J2000' },
    tags: ['MajorMoon', 'TwoToneAlbedo', 'EquatorialRidge'],
  },
  {
    id: 'phoebe', name: 'Phoebe (Saturn IX)', classification: 'Moon', parentBodyId: 'saturn',
    meanRadiusKm: 106.5, massKg: 8.292e18, gm: 0.553, albedo: 0.081, rotationalPeriodHours: 9.2735,
    orbit: { semiMajorAxis: 0.08658, eccentricity: 0.156, inclination: 173.04, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 550.56, epoch: 'J2000' },
    tags: ['IrregularMoon', 'RetrogradeMoon', 'CapturedCentaur'],
  },
  {
    id: 'uranus', name: 'Uranus', classification: 'Planet', parentBodyId: 'sol',
    meanRadiusKm: 25362.0, massKg: 8.681e25, gm: 5793939.3, albedo: 0.488, rotationalPeriodHours: -17.24,
    orbit: { semiMajorAxis: 19.2184, eccentricity: 0.0463, inclination: 0.773, ascendingNode: 74.006, argumentOfPeriapsis: 96.998, meanAnomaly: 142.238, periodDays: 30685.4, epoch: 'J2000' },
    tags: ['IceGiant', 'OuterSystem'],
  },
  {
    id: 'miranda', name: 'Miranda (Uranus V)', classification: 'Moon', parentBodyId: 'uranus',
    meanRadiusKm: 235.8, massKg: 6.4e19, gm: 4.3, albedo: 0.32, rotationalPeriodHours: 33.923,
    orbit: { semiMajorAxis: 0.000865, eccentricity: 0.0013, inclination: 4.232, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 1.413, epoch: 'J2000' },
    tags: ['UranianMoon', 'VeronaRupes'],
  },
  {
    id: 'ariel', name: 'Ariel (Uranus I)', classification: 'Moon', parentBodyId: 'uranus',
    meanRadiusKm: 578.9, massKg: 1.251e21, gm: 83.5, albedo: 0.39, rotationalPeriodHours: 60.489,
    orbit: { semiMajorAxis: 0.001277, eccentricity: 0.0012, inclination: 0.26, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 2.52, epoch: 'J2000' },
    tags: ['UranianMoon'],
  },
  {
    id: 'umbriel', name: 'Umbriel (Uranus II)', classification: 'Moon', parentBodyId: 'uranus',
    meanRadiusKm: 584.7, massKg: 1.275e21, gm: 85.1, albedo: 0.21, rotationalPeriodHours: 99.46,
    orbit: { semiMajorAxis: 0.001778, eccentricity: 0.0039, inclination: 0.128, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 4.144, epoch: 'J2000' },
    tags: ['UranianMoon'],
  },
  {
    id: 'titania', name: 'Titania (Uranus III)', classification: 'Moon', parentBodyId: 'uranus',
    meanRadiusKm: 788.4, massKg: 3.4e21, gm: 226.9, albedo: 0.27, rotationalPeriodHours: 208.94,
    orbit: { semiMajorAxis: 0.002914, eccentricity: 0.0011, inclination: 0.34, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 8.706, epoch: 'J2000' },
    tags: ['UranianMoon'],
  },
  {
    id: 'oberon', name: 'Oberon (Uranus IV)', classification: 'Moon', parentBodyId: 'uranus',
    meanRadiusKm: 761.4, massKg: 3.076e21, gm: 205.3, albedo: 0.23, rotationalPeriodHours: 323.12,
    orbit: { semiMajorAxis: 0.0039, eccentricity: 0.0014, inclination: 0.058, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 13.463, epoch: 'J2000' },
    tags: ['UranianMoon'],
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

  // Dwarf Planets & Major Trans-Neptunian Objects
  {
    id: 'ceres', name: '1 Ceres', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 469.73, massKg: 9.3835e20, gm: 62.63, albedo: 0.09, rotationalPeriodHours: 9.074,
    orbit: { semiMajorAxis: 2.7675, eccentricity: 0.0758, inclination: 10.593, ascendingNode: 80.305, argumentOfPeriapsis: 73.597, meanAnomaly: 77.372, periodDays: 1681.63, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'MainBelt'],
  },
  {
    id: 'pluto', name: '134340 Pluto', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 1188.3, massKg: 1.303e22, gm: 871.0, albedo: 0.52, rotationalPeriodHours: -153.29,
    orbit: { semiMajorAxis: 39.482, eccentricity: 0.2488, inclination: 17.16, ascendingNode: 110.299, argumentOfPeriapsis: 113.834, meanAnomaly: 14.882, periodDays: 90560.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'KuiperBelt'],
  },
  {
    id: 'charon', name: 'Charon (Pluto I)', classification: 'Moon', parentBodyId: 'pluto',
    meanRadiusKm: 606.0, massKg: 1.586e21, albedo: 0.37, rotationalPeriodHours: 153.29,
    orbit: { semiMajorAxis: 0.000131, eccentricity: 0.0002, inclination: 0.0, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomaly: 0, periodDays: 6.387, epoch: 'J2000' },
    tags: ['TidallyLockedMoon'],
  },
  {
    id: 'haumea', name: '136108 Haumea', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 780.0, massKg: 4.006e21, albedo: 0.66, rotationalPeriodHours: 3.915,
    orbit: { semiMajorAxis: 43.218, eccentricity: 0.1912, inclination: 28.19, ascendingNode: 122.09, argumentOfPeriapsis: 239.05, meanAnomaly: 218.7, periodDays: 103774.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'KuiperBelt', 'FastRotator'],
  },
  {
    id: 'makemake', name: '136472 Makemake', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 715.0, massKg: 3.1e21, albedo: 0.77, rotationalPeriodHours: 22.83,
    orbit: { semiMajorAxis: 45.79, eccentricity: 0.159, inclination: 28.96, ascendingNode: 79.61, argumentOfPeriapsis: 295.43, meanAnomaly: 165.5, periodDays: 112897.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'KuiperBelt'],
  },
  {
    id: 'eris', name: '136199 Eris', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 1163.0, massKg: 1.66e22, albedo: 0.96, rotationalPeriodHours: 25.9,
    orbit: { semiMajorAxis: 67.781, eccentricity: 0.44068, inclination: 44.04, ascendingNode: 35.95, argumentOfPeriapsis: 151.64, meanAnomaly: 205.9, periodDays: 203830.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'ScatteredDisc', 'MostMassiveDwarfPlanet'],
  },
  {
    id: 'sedna', name: '90377 Sedna', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 497.5, massKg: 1.0e21, albedo: 0.32, rotationalPeriodHours: 10.273,
    orbit: { semiMajorAxis: 506.8, eccentricity: 0.8549, inclination: 11.93, ascendingNode: 144.4, argumentOfPeriapsis: 311.3, meanAnomaly: 358.1, periodDays: 4166000.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'Sednoid', 'InnerOortCloud'],
  },
  {
    id: 'quaoar', name: '50000 Quaoar', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 545.0, massKg: 1.2e21, albedo: 0.12, rotationalPeriodHours: 17.6788,
    orbit: { semiMajorAxis: 43.69, eccentricity: 0.041, inclination: 7.989, ascendingNode: 188.9, argumentOfPeriapsis: 147.8, meanAnomaly: 301.1, periodDays: 105490.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'KuiperBelt', 'RingSystem'],
  },
  {
    id: 'orcus', name: '90482 Orcus', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 458.5, massKg: 6.348e20, albedo: 0.23, rotationalPeriodHours: 13.188,
    orbit: { semiMajorAxis: 39.174, eccentricity: 0.227, inclination: 20.59, ascendingNode: 268.8, argumentOfPeriapsis: 72.3, meanAnomaly: 181.7, periodDays: 89530.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'Plutino', 'KuiperBelt'],
  },
  {
    id: 'gonggong', name: '225088 Gonggong', classification: 'DwarfPlanet', parentBodyId: 'sol',
    meanRadiusKm: 615.0, massKg: 1.75e21, albedo: 0.14, rotationalPeriodHours: 22.4,
    orbit: { semiMajorAxis: 67.485, eccentricity: 0.499, inclination: 30.62, ascendingNode: 336.8, argumentOfPeriapsis: 207.7, meanAnomaly: 106.5, periodDays: 202500.0, epoch: 'J2000' },
    tags: ['DwarfPlanet', 'ScatteredDisc'],
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
    tags: ['ApolloAsteroid', 'PHA', 'SampleReturn', 'OSIRIS-REx'],
  },
  {
    id: '162173-ryugu', name: '162173 Ryugu', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 0.435, massKg: 4.5e11, albedo: 0.045, rotationalPeriodHours: 7.63,
    orbit: { semiMajorAxis: 1.189, eccentricity: 0.1902, inclination: 5.884, ascendingNode: 251.6, argumentOfPeriapsis: 211.4, meanAnomaly: 67.2, periodDays: 473.9, epoch: 'J2000' },
    tags: ['ApolloAsteroid', 'PHA', 'SampleReturn', 'Hayabusa2'],
  },
  {
    id: '25143-itokawa', name: '25143 Itokawa', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 0.165, massKg: 3.51e10, albedo: 0.53, rotationalPeriodHours: 12.132,
    orbit: { semiMajorAxis: 1.324, eccentricity: 0.280, inclination: 1.621, ascendingNode: 69.08, argumentOfPeriapsis: 162.82, meanAnomaly: 115.4, periodDays: 556.38, epoch: 'J2000' },
    tags: ['ApolloAsteroid', 'PHA', 'SampleReturn', 'Hayabusa'],
  },
  {
    id: '65803-didymos', name: '65803 Didymos (Dimorphos)', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 0.39, massKg: 5.27e11, albedo: 0.15, rotationalPeriodHours: 2.26,
    orbit: { semiMajorAxis: 1.644, eccentricity: 0.384, inclination: 3.408, ascendingNode: 73.2, argumentOfPeriapsis: 319.3, meanAnomaly: 160.1, periodDays: 770.0, epoch: 'J2000' },
    tags: ['ApolloAsteroid', 'PHA', 'BinaryAsteroid', 'DARTMission'],
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
    id: '486958-arrokoth', name: '486958 Arrokoth (Ultima Thule / 2014 MU69)', classification: 'AsteroidMainBelt', parentBodyId: 'sol',
    meanRadiusKm: 18.0, massKg: 1.0e15, albedo: 0.06, rotationalPeriodHours: 15.92,
    orbit: { semiMajorAxis: 44.58, eccentricity: 0.0418, inclination: 2.45, ascendingNode: 307.2, argumentOfPeriapsis: 177.3, meanAnomaly: 301.5, periodDays: 108821.0, epoch: 'J2000' },
    tags: ['KuiperBelt', 'ColdClassical', 'ContactBinary', 'NewHorizons'],
  },

  // Historic Comets & Interstellar Visitors
  {
    id: '1p-halley', name: "1P/Halley (Halley's Comet)", classification: 'Comet', parentBodyId: 'sol',
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
  {
    id: 'c-1995-o1-hale-bopp', name: 'C/1995 O1 (Hale-Bopp)', classification: 'Comet', parentBodyId: 'sol',
    meanRadiusKm: 30.0, massKg: 1.3e16, albedo: 0.04, rotationalPeriodHours: 11.35,
    orbit: { semiMajorAxis: 186.0, eccentricity: 0.995, inclination: 89.43, ascendingNode: 282.47, argumentOfPeriapsis: 130.59, meanAnomaly: 0.0, periodDays: 925000.0, epoch: 'J2000' },
    tags: ['Comet', 'GreatComet1997', 'LongPeriodComet'],
  },
  {
    id: '1i-oumuamua', name: "1I/'Oumuamua (1I/2017 U1)", classification: 'Comet', parentBodyId: 'sol',
    meanRadiusKm: 0.115, massKg: 4.0e9, albedo: 0.1, rotationalPeriodHours: 7.34,
    orbit: { semiMajorAxis: -1.272, eccentricity: 1.201, inclination: 122.74, ascendingNode: 24.6, argumentOfPeriapsis: 241.8, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['InterstellarObject', 'HyperbolicTrajectory', 'Oumuamua'],
  },
  {
    id: '2i-borisov', name: '2I/Borisov (C/2019 Q4)', classification: 'Comet', parentBodyId: 'sol',
    meanRadiusKm: 0.4, massKg: 2.0e11, albedo: 0.04, rotationalPeriodHours: 10.0,
    orbit: { semiMajorAxis: -0.851, eccentricity: 3.357, inclination: 44.05, ascendingNode: 308.15, argumentOfPeriapsis: 209.12, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['InterstellarObject', 'InterstellarComet', 'HyperbolicTrajectory'],
  },
  {
    id: '3i-atlas', name: '3I/ATLAS (C/2025 N1)', classification: 'Comet', parentBodyId: 'sol',
    meanRadiusKm: 0.8, massKg: 1.5e12, albedo: 0.05, rotationalPeriodHours: 12.0,
    orbit: { semiMajorAxis: -0.62, eccentricity: 3.85, inclination: 175.1, ascendingNode: 282.5, argumentOfPeriapsis: 128.0, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['InterstellarObject', 'InterstellarComet', 'HyperbolicTrajectory'],
  },

  // Deep-Space & Interstellar Escape Probes
  {
    id: 'voyager-1', name: 'Voyager 1 (Interstellar Probe)', classification: 'AsteroidDistant', parentBodyId: 'sol',
    meanRadiusKm: 0.002, massKg: 721.9, albedo: 0.5,
    orbit: { semiMajorAxis: -3.2, eccentricity: 3.7, inclination: 35.7, ascendingNode: 178.0, argumentOfPeriapsis: 338.0, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['Spacecraft', 'InterstellarProbe', 'Heliopause', 'GoldenRecord', 'Gliese445Flyby'],
  },
  {
    id: 'voyager-2', name: 'Voyager 2 (Interstellar Probe)', classification: 'AsteroidDistant', parentBodyId: 'sol',
    meanRadiusKm: 0.002, massKg: 721.9, albedo: 0.5,
    orbit: { semiMajorAxis: -4.0, eccentricity: 6.3, inclination: 79.0, ascendingNode: 101.0, argumentOfPeriapsis: 130.0, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['Spacecraft', 'InterstellarProbe', 'GrandTour', 'GoldenRecord', 'Ross248Flyby', 'SiriusFlyby'],
  },
  {
    id: 'pioneer-10', name: 'Pioneer 10 (Interstellar Probe)', classification: 'AsteroidDistant', parentBodyId: 'sol',
    meanRadiusKm: 0.0015, massKg: 258.0, albedo: 0.4,
    orbit: { semiMajorAxis: -6.9, eccentricity: 2.04, inclination: 3.0, ascendingNode: 75.0, argumentOfPeriapsis: 342.0, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['Spacecraft', 'InterstellarProbe', 'PioneerPlaque', 'AldebaranTrajectory'],
  },
  {
    id: 'pioneer-11', name: 'Pioneer 11 (Interstellar Probe)', classification: 'AsteroidDistant', parentBodyId: 'sol',
    meanRadiusKm: 0.0015, massKg: 259.0, albedo: 0.4,
    orbit: { semiMajorAxis: -8.1, eccentricity: 2.15, inclination: 16.6, ascendingNode: 152.0, argumentOfPeriapsis: 358.0, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['Spacecraft', 'InterstellarProbe', 'PioneerPlaque', 'ScutumTrajectory'],
  },
  {
    id: 'new-horizons', name: 'New Horizons (Kuiper Belt & Interstellar Probe)', classification: 'AsteroidDistant', parentBodyId: 'sol',
    meanRadiusKm: 0.0015, massKg: 478.0, albedo: 0.5,
    orbit: { semiMajorAxis: -4.6, eccentricity: 1.54, inclination: 2.4, ascendingNode: 110.0, argumentOfPeriapsis: 113.0, meanAnomaly: 0.0, periodDays: 0.0, epoch: 'J2000' },
    tags: ['Spacecraft', 'InterstellarProbe', 'PlutoFlyby', 'ArrokothFlyby'],
  },
  {
    id: 'jwst', name: 'James Webb Space Telescope (JWST)', classification: 'AsteroidNEO', parentBodyId: 'sol',
    meanRadiusKm: 0.01, massKg: 6500.0, albedo: 0.8,
    orbit: { semiMajorAxis: 1.01, eccentricity: 0.0167, inclination: 0.5, ascendingNode: 0.0, argumentOfPeriapsis: 0.0, meanAnomaly: 0.0, periodDays: 365.25, epoch: 'J2000' },
    tags: ['Spacecraft', 'SpaceObservatory', 'SunEarthL2', 'JWST', 'Webb'],
  },
];

/**
 * Authoritative scientific catalog of known circumstellar debris disks, asteroid belts,
 * and Kuiper belts resolved by ALMA, Herschel, JWST, and Spitzer (DEC-035).
 */
export const CIRCUMSTELLAR_DISKS_CATALOG: Record<
  string,
  Array<{
    id: string;
    name: string;
    kind: 'asteroid-belt' | 'kuiper-belt' | 'debris-disk';
    innerRadiusAu: number;
    outerRadiusAu: number;
    semiMajorAxisAu: number;
    tempK?: number;
    composition: string;
    confidence?: 'confirmed' | 'candidate';
  }>
> = {
  'Sol': [
    {
      id: 'main-asteroid-belt',
      name: 'Main Asteroid Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 2.1,
      outerRadiusAu: 3.3,
      semiMajorAxisAu: 2.7,
      tempK: 165,
      composition: 'Silicate, carbonaceous & metallic planetesimals (C/S/M-type)',
    },
    {
      id: 'kuiper-belt',
      name: 'Kuiper Belt',
      kind: 'kuiper-belt',
      innerRadiusAu: 30.0,
      outerRadiusAu: 50.0,
      semiMajorAxisAu: 40.0,
      tempK: 44,
      composition: 'Volatiles, water ice, methane & trans-Neptunian planetesimals',
    },
  ],
  'Epsilon Eridani': [
    {
      id: 'epsilon-eridani-inner-belt',
      name: 'Epsilon Eridani Inner Asteroid Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 2.5,
      outerRadiusAu: 3.5,
      semiMajorAxisAu: 3.0,
      tempK: 150,
      composition: 'Warm silicate & rocky planetesimal dust',
    },
    {
      id: 'epsilon-eridani-intermediate-belt',
      name: 'Epsilon Eridani Intermediate Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 18.0,
      outerRadiusAu: 22.0,
      semiMajorAxisAu: 20.0,
      tempK: 65,
      composition: 'Ice-line rocky & carbonaceous planetesimals',
    },
    {
      id: 'epsilon-eridani-outer-belt',
      name: 'Epsilon Eridani Outer Kuiper Belt',
      kind: 'kuiper-belt',
      innerRadiusAu: 35.0,
      outerRadiusAu: 100.0,
      semiMajorAxisAu: 64.0,
      tempK: 35,
      composition: 'Cold cometary water ice & volatile debris disk (ALMA)',
    },
  ],
  'Tau Ceti': [
    {
      id: 'tau-ceti-debris-disk',
      name: 'Tau Ceti Outer Debris Disk',
      kind: 'debris-disk',
      innerRadiusAu: 6.0,
      outerRadiusAu: 55.0,
      semiMajorAxisAu: 30.0,
      tempK: 60,
      composition: 'Massive cold cometary & icy planetesimal belt (~10× Sol Kuiper Belt, ALMA)',
    },
  ],
  '82 G. Eridani': [
    {
      id: '82-g-eridani-inner-belt',
      name: '82 G. Eridani Warm Dust Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 0.1,
      outerRadiusAu: 0.5,
      semiMajorAxisAu: 0.3,
      tempK: 420,
      composition: 'Hot exozodiacal silicate dust',
    },
    {
      id: '82-g-eridani-outer-belt',
      name: '82 G. Eridani Outer Planetesimal Belt',
      kind: 'debris-disk',
      innerRadiusAu: 15.0,
      outerRadiusAu: 30.0,
      semiMajorAxisAu: 22.0,
      tempK: 55,
      composition: 'Cold icy & rocky debris disk (Herschel DUNES)',
    },
  ],
  'Fomalhaut': [
    {
      id: 'fomalhaut-inner-belt',
      name: 'Fomalhaut Inner Warm Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 1.0,
      outerRadiusAu: 3.0,
      semiMajorAxisAu: 2.0,
      tempK: 350,
      composition: 'Warm inner silicate dust ring',
    },
    {
      id: 'fomalhaut-intermediate-belt',
      name: 'Fomalhaut Intermediate Asteroid Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 8.0,
      outerRadiusAu: 12.0,
      semiMajorAxisAu: 10.0,
      tempK: 170,
      composition: 'Collisionally active planetesimal belt (JWST MIRI)',
    },
    {
      id: 'fomalhaut-outer-belt',
      name: 'Fomalhaut Great Dust Belt',
      kind: 'kuiper-belt',
      innerRadiusAu: 133.0,
      outerRadiusAu: 158.0,
      semiMajorAxisAu: 145.0,
      tempK: 48,
      composition: 'Eccentric cold icy planetesimal ring (ALMA / JWST)',
    },
  ],
  'Vega': [
    {
      id: 'vega-inner-belt',
      name: 'Vega Inner Asteroid Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 10.0,
      outerRadiusAu: 18.0,
      semiMajorAxisAu: 14.0,
      tempK: 170,
      composition: 'Warm silicate planetesimal belt',
    },
    {
      id: 'vega-outer-disk',
      name: 'Vega Outer Debris Disk',
      kind: 'debris-disk',
      innerRadiusAu: 85.0,
      outerRadiusAu: 170.0,
      semiMajorAxisAu: 120.0,
      tempK: 50,
      composition: 'Smooth broad icy debris disk (JWST / ALMA)',
    },
  ],
  'Beta Pictoris': [
    {
      id: 'beta-pictoris-inner-belt',
      name: 'Beta Pictoris Warped Inner Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 5.0,
      outerRadiusAu: 30.0,
      semiMajorAxisAu: 16.0,
      tempK: 130,
      composition: 'Silicate, carbon-rich & CO gas planetesimal belt',
    },
    {
      id: 'beta-pictoris-outer-disk',
      name: 'Beta Pictoris Outer Debris Disk',
      kind: 'debris-disk',
      innerRadiusAu: 30.0,
      outerRadiusAu: 400.0,
      semiMajorAxisAu: 150.0,
      tempK: 55,
      composition: 'Extended edge-on icy & rocky debris disk',
    },
  ],
  'HR 8799': [
    {
      id: 'hr-8799-inner-belt',
      name: 'HR 8799 Inner Asteroid Belt',
      kind: 'asteroid-belt',
      innerRadiusAu: 6.0,
      outerRadiusAu: 15.0,
      semiMajorAxisAu: 10.0,
      tempK: 150,
      composition: 'Warm rocky planetesimals interior to HR 8799 e',
    },
    {
      id: 'hr-8799-outer-belt',
      name: 'HR 8799 Outer Kuiper Belt',
      kind: 'kuiper-belt',
      innerRadiusAu: 90.0,
      outerRadiusAu: 300.0,
      semiMajorAxisAu: 165.0,
      tempK: 35,
      composition: 'Cold volatile planetesimal disk exterior to HR 8799 b (ALMA)',
    },
  ],
  'Proxima Centauri': [
    {
      id: 'proxima-centauri-cold-belt',
      name: 'Proxima Centauri Outer Dust Belt',
      kind: 'kuiper-belt',
      innerRadiusAu: 1.5,
      outerRadiusAu: 4.0,
      semiMajorAxisAu: 2.7,
      tempK: 30,
      composition: 'Cold outer dust & ice belt (ALMA)',
      confidence: 'candidate',
    },
  ],
  'Sirius': [
    {
      id: 'sirius-debris-disk',
      name: 'Sirius Circumstellar Dust Ring',
      kind: 'debris-disk',
      innerRadiusAu: 15.0,
      outerRadiusAu: 40.0,
      semiMajorAxisAu: 25.0,
      tempK: 95,
      composition: 'Tenuous circumstellar silicate dust ring',
    },
  ],
  'Procyon': [
    {
      id: 'procyon-debris-disk',
      name: 'Procyon Outer Dust Belt',
      kind: 'debris-disk',
      innerRadiusAu: 20.0,
      outerRadiusAu: 60.0,
      semiMajorAxisAu: 38.0,
      tempK: 65,
      composition: 'Cold outer planetesimal dust ring',
    },
  ],
  'Pollux': [
    {
      id: 'pollux-debris-disk',
      name: 'Pollux Planetesimal Belt',
      kind: 'debris-disk',
      innerRadiusAu: 12.0,
      outerRadiusAu: 35.0,
      semiMajorAxisAu: 22.0,
      tempK: 85,
      composition: 'Subgiant outer planetesimal belt',
    },
  ],
};

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
    { file: 'circumstellar_disks.json', data: CIRCUMSTELLAR_DISKS_CATALOG },
  ];

  for (const s of supplements) {
    const dest = path.join(rawDir, s.file);
    fs.writeFileSync(dest, JSON.stringify(s.data, null, 2), 'utf-8');
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
