import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  expandBayerOrFlamsteed,
  expandGreekBayer,
  expandGouldOrConstellationSuffix,
  expandGlieseVariants,
  resolveStarProperName,
  resolveStarDisplayName,
  buildCleanKeys,
  collectStarLookupKeys,
  normalizeCleanKey,
  IAU_CONSTELLATION_NOMINATIVE_MAP,
  UNICODE_GREEK_TO_LATIN_MAP,
  SUPERSCRIPT_DIGIT_MAP,
  transliterateGreekAndSuperscripts,
} from '../src/utils/nomenclature';
import {
  isSearchableStarSystem,
  isCoreSearchStarSystem,
  isCoreSearchMinorBody,
  isCoreSearchStructure,
  buildSearchIndexEnvelope,
} from '../src/utils/compactDataCodec';
import {
  loadAllExoplanetCatalogs,
  matchExoplanetsForStar,
  loadHygCrossMatch,
} from '../scripts/build-data';
import type { StarmapNode } from '../src/types/astro';

describe('Step 1: Nomenclature Expansion & Substring-Deduplicated Clean Keys', () => {
  it('expands Greek Bayer and Flamsteed designations with Latin constellation genitives', () => {
    expect(expandBayerOrFlamsteed('Tau', 'Cet')).toBe('Tau Ceti');
    expect(expandBayerOrFlamsteed('Eps', 'Eri')).toBe('Epsilon Eridani');
    expect(expandBayerOrFlamsteed('Bet', 'Pic')).toBe('Beta Pictoris');
    expect(expandBayerOrFlamsteed('Alp', 'CMa')).toBe('Alpha Canis Majoris');
    expect(expandBayerOrFlamsteed('Kap-1', 'Cet')).toBe('Kappa-1 Ceti');
    expect(expandBayerOrFlamsteed('Omi-2', 'Eri')).toBe('Omicron-2 Eridani');
    expect(expandBayerOrFlamsteed('CustomBayer', 'Cet')).toBe('CustomBayer Ceti');
    expect(expandBayerOrFlamsteed(undefined, 'Eri', 40)).toBe('40 Eridani');
    expect(expandBayerOrFlamsteed(undefined, 'Cnc', 55)).toBe('55 Cancri');
    expect(expandBayerOrFlamsteed('Tau', undefined)).toBeUndefined();
    expect(expandBayerOrFlamsteed('Tau', 'UNKNOWN')).toBe('Tau UNKNOWN');
    expect(expandBayerOrFlamsteed(undefined, 'Eri', undefined)).toBeUndefined();
  });

  it('expands trailing IAU constellation abbreviations in Gould, Bayer, and exoplanet strings', () => {
    expect(expandGouldOrConstellationSuffix('')).toBe('');
    expect(expandGouldOrConstellationSuffix('   ')).toBe('');
    expect(expandGouldOrConstellationSuffix('82 G. Eri')).toBe('82 G. Eridani');
    expect(expandGouldOrConstellationSuffix('82 G. Eri b')).toBe('82 G. Eridani b');
    expect(expandGouldOrConstellationSuffix('96 G. Psc')).toBe('96 G. Piscium');
    expect(expandGouldOrConstellationSuffix('Tau Cet')).toBe('Tau Ceti');
    expect(expandGouldOrConstellationSuffix('tau Ceti e')).toBe('Tau Ceti e');
    expect(expandGouldOrConstellationSuffix('Eps Eri')).toBe('Epsilon Eridani');
    expect(expandGouldOrConstellationSuffix('eps Eridani b')).toBe('Epsilon Eridani b');
    expect(expandGouldOrConstellationSuffix('ups And b')).toBe('Upsilon Andromedae b');
    expect(expandGouldOrConstellationSuffix('kap-1 Cet')).toBe('Kappa-1 Ceti');
    expect(expandGouldOrConstellationSuffix('Sirius')).toBe('Sirius');
  });

  it('transliterates Unicode Greek Bayer characters and superscripts deterministically', () => {
    expect(expandGreekBayer('τ')).toBe('Tau');
    expect(expandGreekBayer('α')).toBe('Alpha');
    expect(expandGreekBayer('ε')).toBe('Epsilon');
    expect(expandGreekBayer('π³')).toBe('Pi-3');
    expect(expandGreekBayer('π-3')).toBe('Pi-3');
    expect(expandGreekBayer('ο²')).toBe('Omicron-2');
    expect(expandGreekBayer('Kap-1')).toBe('Kappa-1');
    expect(expandGreekBayer('Alp1')).toBe('Alpha1');

    expect(expandGouldOrConstellationSuffix('τ Cet')).toBe('Tau Ceti');
    expect(expandGouldOrConstellationSuffix('τ Ceti')).toBe('Tau Ceti');
    expect(expandGouldOrConstellationSuffix('τ Cet e')).toBe('Tau Ceti e');
    expect(expandGouldOrConstellationSuffix('α Cen')).toBe('Alpha Centauri');
    expect(expandGouldOrConstellationSuffix('ε Eri b')).toBe('Epsilon Eridani b');
    expect(expandGouldOrConstellationSuffix('π³ Ori')).toBe('Pi-3 Orionis');

    expect(normalizeCleanKey('τ Ceti')).toBe('tauceti');
    expect(normalizeCleanKey('α Centauri')).toBe('alphacentauri');
    expect(normalizeCleanKey('τ')).toBe('tau');
    expect(normalizeCleanKey('π³ Orionis')).toBe('pi3orionis');
  });

  it('handles two-word IAU constellation genitives and space-separated numbered Bayer designations', () => {
    // All 11 two-word IAU constellation genitives
    expect(expandGouldOrConstellationSuffix('alp Canis Majoris')).toBe('Alpha Canis Majoris');
    expect(expandGouldOrConstellationSuffix('bet Canis Minoris')).toBe('Beta Canis Minoris');
    expect(expandGouldOrConstellationSuffix('xi Ursae Majoris A')).toBe('Xi Ursae Majoris A');
    expect(expandGouldOrConstellationSuffix('del Ursae Minoris')).toBe('Delta Ursae Minoris');
    expect(expandGouldOrConstellationSuffix('ρ Coronae Borealis b')).toBe('Rho Coronae Borealis b');
    expect(expandGouldOrConstellationSuffix('alp Coronae Australis')).toBe('Alpha Coronae Australis');
    expect(expandGouldOrConstellationSuffix('alp Piscis Austrini')).toBe('Alpha Piscis Austrini');
    expect(expandGouldOrConstellationSuffix('bet Comae Berenices')).toBe('Beta Comae Berenices');
    expect(expandGouldOrConstellationSuffix('alp Canum Venaticorum')).toBe('Alpha Canum Venaticorum');
    expect(expandGouldOrConstellationSuffix('bet Leonis Minoris')).toBe('Beta Leonis Minoris');
    expect(expandGouldOrConstellationSuffix('alp Trianguli Australis')).toBe('Alpha Trianguli Australis');

    // Space-separated numbered Bayer designations with abbreviated or full constellation names
    expect(expandGouldOrConstellationSuffix('omi 2 Eri')).toBe('Omicron-2 Eridani');
    expect(expandGouldOrConstellationSuffix('omi 2 Eridani')).toBe('Omicron-2 Eridani');
    expect(expandGouldOrConstellationSuffix('pi 3 Ori')).toBe('Pi-3 Orionis');
    expect(expandGouldOrConstellationSuffix('kap 1 Sculptoris')).toBe('Kappa-1 Sculptoris');
    expect(expandGouldOrConstellationSuffix('π 3 Orionis')).toBe('Pi-3 Orionis');

    // Gould designations remain completely unchanged
    expect(expandGouldOrConstellationSuffix('82 G. Eri')).toBe('82 G. Eridani');
    expect(expandGouldOrConstellationSuffix('82 G. Eridani')).toBe('82 G. Eridani');
  });

  it('exports UNICODE_GREEK_TO_LATIN_MAP, SUPERSCRIPT_DIGIT_MAP, and transliterateGreekAndSuperscripts helper', () => {
    expect(UNICODE_GREEK_TO_LATIN_MAP['α']).toBe('alpha');
    expect(UNICODE_GREEK_TO_LATIN_MAP['τ']).toBe('tau');
    expect(UNICODE_GREEK_TO_LATIN_MAP['ς']).toBe('sigma');
    expect(UNICODE_GREEK_TO_LATIN_MAP['Ω']).toBe('Omega');
    expect(SUPERSCRIPT_DIGIT_MAP['¹']).toBe('1');
    expect(SUPERSCRIPT_DIGIT_MAP['³']).toBe('3');
    expect(transliterateGreekAndSuperscripts('π³')).toBe('pi3');
    expect(transliterateGreekAndSuperscripts('α Cen')).toBe('alpha Cen');
  });

  it('expands Gliese / GJ / Gl designations into all three canonical variants', () => {
    expect(expandGlieseVariants(undefined)).toEqual([]);
    expect(expandGlieseVariants('   ')).toEqual([]);
    expect(expandGlieseVariants('Gl 71')).toEqual(['Gl 71', 'GJ 71', 'Gliese 71']);
    expect(expandGlieseVariants('GJ 667C')).toEqual(['GJ 667C', 'Gl 667C', 'Gliese 667C']);
    expect(expandGlieseVariants('Gliese 581')).toEqual(['Gliese 581', 'Gl 581', 'GJ 581']);
    expect(expandGlieseVariants('NN 3622')).toEqual(['NN 3622', 'Gl 3622', 'GJ 3622', 'Gliese 3622']);
    expect(expandGlieseVariants('Sirius')).toEqual([]);
  });

  it('resolves canonical star proper names and primary display titles via dedicated hooks', () => {
    expect(
      resolveStarProperName({
        hygProperName: '82 G. Eri',
        iauProperName: 'Tau Cet',
        officialProperName: 'Sirius',
      }),
    ).toBe('Tau Ceti');
    expect(
      resolveStarProperName({
        hygProperName: '82 G. Eri',
      }),
    ).toBe('82 G. Eridani');
    expect(
      resolveStarProperName({
        officialProperName: 'Rigil Kentaurus',
      }),
    ).toBe('Rigil Kentaurus');
    expect(resolveStarProperName({})).toBeUndefined();

    expect(
      resolveStarDisplayName({
        properName: 'Vega',
        bayer: 'Alp',
        con: 'Lyr',
        sourceId: '123',
      }),
    ).toBe('Vega');
    expect(
      resolveStarDisplayName({
        bayer: 'Tau',
        con: 'Cet',
        sourceId: '123',
      }),
    ).toBe('Tau Ceti');
    expect(
      resolveStarDisplayName({
        gl: 'Gl 581',
        sourceId: '123',
      }),
    ).toBe('Gl 581');
    expect(
      resolveStarDisplayName({
        hip: 8102,
        sourceId: '123',
      }),
    ).toBe('HIP 8102');
    expect(
      resolveStarDisplayName({
        hd: 10700,
        sourceId: '123',
      }),
    ).toBe('HD 10700');
    expect(
      resolveStarDisplayName({
        sourceId: '2452378776434477184',
      }),
    ).toBe('Gaia DR3 2452378776434477184');
    expect(
      resolveStarDisplayName({
        sourceId: 'gaia-2452378776434477184',
      }),
    ).toBe('Gaia DR3 2452378776434477184');
    expect(
      resolveStarDisplayName({
        fallbackId: 'gaia-999',
      }),
    ).toBe('Gaia DR3 999');
    expect(
      resolveStarDisplayName({
        fallbackId: 'sol',
      }),
    ).toBe('sol');
    expect(resolveStarDisplayName({})).toBe('Unknown System');
  });

  it('deduplicates clean keys where shorter keys are contiguous substrings of longer keys', () => {
    expect(buildCleanKeys([null, undefined, '   ', '!!!'])).toBe('');
    const keys = buildCleanKeys([
      'Tau Ceti',
      'Tau Cet',
      'tau Cet',
      'HD 10700',
      'HD10700',
      'HIP 8102',
      'Gl 71',
      'GJ 71',
      'Gliese 71',
    ]);
    const parts = keys.split(' ');
    // "taucet" is a substring of "tauceti", so only "tauceti" is kept
    expect(parts).toContain('tauceti');
    expect(parts).not.toContain('taucet');
    // Distinct catalog keys are preserved
    expect(parts).toContain('hd10700');
    expect(parts).toContain('hip8102');
    expect(parts).toContain('gl71');
    expect(parts).toContain('gj71');
    expect(parts).toContain('gliese71');
  });

  it('collects all lookup keys for a star across proper, Bayer, Flamsteed, HD, HIP, HR, BF, Gliese, and aliases', () => {
    const lookupKeys = collectStarLookupKeys({
      properName: 'Ran',
      name: 'Eps Eri',
      bayer: 'Eps',
      flam: 18,
      con: 'Eri',
      bf: '18Eps Eri',
      hd: 22049,
      hip: 16537,
      hr: 1084,
      gl: 'Gl 144',
      aliases: ['Sadira'],
    });

    expect(lookupKeys).toContain('ran');
    expect(lookupKeys).toContain('epseri');
    expect(lookupKeys).toContain('epsiloneridani');
    expect(lookupKeys).toContain('18eri');
    expect(lookupKeys).toContain('18eridani');
    expect(lookupKeys).toContain('hd22049');
    expect(lookupKeys).toContain('hip16537');
    expect(lookupKeys).toContain('hr1084');
    expect(lookupKeys).toContain('gl144');
    expect(lookupKeys).toContain('gj144');
    expect(lookupKeys).toContain('gliese144');
    expect(lookupKeys).toContain('sadira');
    // Nominative constellation key from con: 'Eri'
    expect(lookupKeys).toContain('eridanus');

    // Star with Bayer and genitive in alias
    const betelgeuseKeys = collectStarLookupKeys({
      properName: 'Betelgeuse',
      name: 'Alpha Orionis',
      con: 'Ori',
      aliases: ['Alpha Orionis', 'Betelgeuse'],
    });
    expect(betelgeuseKeys).toContain('orion');

    // Star with two-word genitive in alias
    const dubheKeys = collectStarLookupKeys({
      properName: 'Dubhe',
      aliases: ['Alpha Ursae Majoris', 'Dubhe'],
    });
    expect(dubheKeys).toContain('ursamajor');
  });

  it('provides IAU_CONSTELLATION_NOMINATIVE_MAP for 88 IAU constellations', () => {
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.ori).toBe('Orion');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.uma).toBe('Ursa Major');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.cas).toBe('Cassiopeia');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.cen).toBe('Centaurus');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.cru).toBe('Crux');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.cma).toBe('Canis Major');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.cyg).toBe('Cygnus');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.lyr).toBe('Lyra');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.aql).toBe('Aquila');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.sco).toBe('Scorpius');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.tau).toBe('Taurus');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.gem).toBe('Gemini');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.leo).toBe('Leo');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.vir).toBe('Virgo');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.sgr).toBe('Sagittarius');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.boo).toBe('Bootes');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.aur).toBe('Auriga');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.eri).toBe('Eridanus');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.car).toBe('Carina');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.peg).toBe('Pegasus');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.and).toBe('Andromeda');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.psa).toBe('Piscis Austrinus');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.cmi).toBe('Canis Minor');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.cet).toBe('Cetus');
    expect(IAU_CONSTELLATION_NOMINATIVE_MAP.oph).toBe('Ophiuchus');
  });

  it('evaluates search index tier eligibility predicates in compactDataCodec', () => {
    const faintGaiaSystem = {
      id: 'gaia-999',
      name: 'Gaia DR3 999',
      x: 50,
      y: 0,
      z: 0,
      dist: 50,
      mag: 14,
      absmag: 10,
      starCount: 1,
      planetCount: 0,
      hasHabitableCandidate: false,
      sectorId: 'sec_2_0_0',
    };
    expect(isSearchableStarSystem(faintGaiaSystem)).toBe(false);
    expect(isCoreSearchStarSystem(faintGaiaSystem)).toBe(false);

    const exoplanetHost = { ...faintGaiaSystem, planetCount: 2 };
    expect(isSearchableStarSystem(exoplanetHost)).toBe(true);
    expect(isCoreSearchStarSystem(exoplanetHost)).toBe(true);

    expect(
      isCoreSearchMinorBody({
        id: 'voyager-1',
        name: 'Voyager 1',
        classification: 'AsteroidDistant',
        parentBodyId: 'sol',
        meanRadiusKm: 0.002,
      }),
    ).toBe(true);
    expect(
      isCoreSearchMinorBody({
        id: 'pha-99999',
        name: '1999 RQ36',
        classification: 'AsteroidNEO',
        parentBodyId: 'sol',
        meanRadiusKm: 0.25,
      }),
    ).toBe(false);

    expect(
      isCoreSearchStructure({
        id: 'ngc-1976',
        name: 'NGC 1976 (Orion Nebula)',
        type: 'EmissionNebula',
        x: 0,
        y: 0,
        z: 0,
        dist: 412,
        designations: ['M42'],
        description: 'Orion Nebula',
      }),
    ).toBe(true);
    expect(
      isCoreSearchStructure({
        id: 'cluster-anon',
        name: 'Anon 1',
        type: 'OpenCluster',
        x: 0,
        y: 0,
        z: 0,
        dist: 500,
        designations: [],
        description: 'Anonymous cluster',
        theoreticalFlags: 1,
      }),
    ).toBe(false);

    const env = buildSearchIndexEnvelope('test-tier', 'Test Tier', [{ i: 'sol', n: 'Sol' }], '2026-10-17T00:00:00Z');
    expect(env.i).toBe('test-tier');
    expect(env.c).toBe(1);
  });
});

describe('Step 1: Multi-Key Exoplanet Cross-Matching & Retracted Inclusion', () => {
  it('merges planets across multiple host aliases (e.g. "tau Ceti" in OEC and "tau Cet" in NASA) including retracted candidates', () => {
    const tmpOec = path.resolve('tests/fixtures/tmp_oec_tauceti.csv');
    const tmpNasa = path.resolve('tests/fixtures/tmp_nasa_tauceti.csv');
    const tmpEu = path.resolve('tests/fixtures/tmp_eu_tauceti.csv');

    fs.writeFileSync(
      tmpOec,
      'name,binaryflag,mass,radius,period,semimajoraxis,eccentricity,periastron,longitude,ascendingnode,inclination,temperature,age,discoverymethod,discoveryyear,lastupdate,system_rightascension,system_declination,system_distance,hoststar_mass,hoststar_radius,hoststar_metallicity,hoststar_temperature,hoststar_age,list\n' +
        'tau Ceti b,0,0.00629,,13.965,0.105,0.16,86,,,,,,RV,2012,17/11/28,01 44 04,-15 56 14,3.65,0.783,0.793,-0.55,5344,5.8,Retracted planet candidate\n' +
        'tau Ceti e,0,0.0124,,162.87,0.538,0.18,22.3,,,,,,RV,2012,17/11/28,01 44 04,-15 56 14,3.65,0.783,0.793,-0.55,5344,5.8,Confirmed planets\n',
      'utf-8',
    );

    fs.writeFileSync(
      tmpNasa,
      'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,pl_insol,sy_dist\n' +
        '"tau Cet g","tau Cet",1,3,"Radial Velocity",2017,20.0,0.133,1.75,1.18,639.65,27.98,3.60\n' +
        '"tau Cet f","tau Cet",1,3,"Radial Velocity",2017,636.13,1.334,3.93,1.81,201.97,0.27,3.60\n',
      'utf-8',
    );

    fs.writeFileSync(tmpEu, 'name\n', 'utf-8');

    try {
      const hostMap = loadAllExoplanetCatalogs(tmpOec, tmpNasa, tmpEu);
      const tauCetiStar: StarmapNode = {
        id: 8102,
        name: 'Tau Ceti',
        bayer: 'Tau',
        con: 'Cet',
        hip: 8102,
        hd: 10700,
        gl: 'Gl 71',
        ra: 1.734,
        dec: -15.937,
        dist: 3.652,
        mag: 3.5,
        absmag: 5.69,
        x: 3.156,
        y: 1.54,
        z: -1.003,
      };

      const matched = matchExoplanetsForStar(tauCetiStar, hostMap);
      const letters = matched.map((p) => p.letter).sort();
      expect(letters).toEqual(['b', 'e', 'f', 'g']);

      const planetE = matched.find((p) => p.letter === 'e');
      expect(planetE).toBeDefined();
      expect(planetE?.massMearth).toBeCloseTo(3.94, 1);
      expect(planetE?.equilibriumTempK).toBeGreaterThan(250);
      expect(planetE?.equilibriumTempK).toBeLessThan(310);
    } finally {
      if (fs.existsSync(tmpOec)) fs.unlinkSync(tmpOec);
      if (fs.existsSync(tmpNasa)) fs.unlinkSync(tmpNasa);
      if (fs.existsSync(tmpEu)) fs.unlinkSync(tmpEu);
    }
  });

  it('extracts gl (Gliese) in loadHygCrossMatch', () => {
    const tmpHyg = path.resolve('tests/fixtures/tmp_hyg_gl.csv');
    fs.writeFileSync(
      tmpHyg,
      'id,hip,hd,hr,gl,bf,proper,ra,dec,dist,pmra,pmdec,rv,mag,absmag,spect,ci,x,y,z,vx,vy,vz,rarad,decrad,pmrarad,pmdecrad,bayer,flam,con,comp,comp_primary,base,lum,var,var_min,var_max\n' +
        '8085,8102,10700,509,Gl 71,52Tau Cet,,1.734,-15.937,3.65,1721,-854,-16.4,3.5,5.68,G8V,0.72,3.15,1.54,-1.0,0,0,0,0,0,0,0,Tau,52,Cet,1,8085,,0.48,,,\n',
      'utf-8',
    );
    try {
      const { byHip } = loadHygCrossMatch(tmpHyg);
      const match = byHip.get(8102);
      expect(match).toBeDefined();
      expect(match?.gl).toBe('Gl 71');
      expect(match?.hd).toBe(10700);
      expect(match?.bayer).toBe('Tau');
      expect(match?.flam).toBe(52);
      expect(match?.con).toBe('Cet');
    } finally {
      if (fs.existsSync(tmpHyg)) fs.unlinkSync(tmpHyg);
    }
  });
});
