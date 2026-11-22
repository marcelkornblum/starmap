import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ExoplanetRecord, StarmapNode } from '../../src/types/astro';
import {
  checkHabitableCandidate,
  loadAllExoplanetCatalogsWithHosts,
  loadExoplanetCatalog,
  matchExoplanetsForStar,
} from './exoplanets';

describe('Exoplanet Harmonization & Cross-Matching', () => {
  it('evaluates habitable candidates by equilibrium temperature or stellar insolation', () => {
    const habitablePlanet: ExoplanetRecord = {
      id: 'test-planet-b',
      name: 'Test b',
      letter: 'b',
      equilibriumTempK: 250,
    };
    const scorchingPlanet: ExoplanetRecord = {
      id: 'test-planet-c',
      name: 'Test c',
      letter: 'c',
      equilibriumTempK: 1500,
    };
    expect(checkHabitableCandidate([habitablePlanet])).toBe(true);
    expect(checkHabitableCandidate([scorchingPlanet])).toBe(false);
  });

  it('cross-matches exoplanets against stellar nodes using normalized keys', () => {
    const hostMap = new Map<string, ExoplanetRecord[]>();
    const samplePlanet: ExoplanetRecord = {
      id: 'hd-154857-b',
      name: 'HD 154857 b',
      letter: 'b',
      discoveryYear: 2004,
    };
    hostMap.set('hd154857', [samplePlanet]);

    const starNode: StarmapNode = {
      id: 12345,
      name: 'HD 154857',
      hd: 154857,
      ra: 17.1,
      dec: -56.6,
      dist: 64.2,
      mag: 7.25,
      absmag: 3.2,
      x: 20,
      y: 40,
      z: -30,
    };
    const matched = matchExoplanetsForStar(starNode, hostMap);
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe('HD 154857 b');
  });

  it('loads and indexes exoplanets from raw CSV using normalized keys', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-exo-test-'));
    const tempExoCsv = path.join(tempDir, 'sample_exo.csv');
    const content =
      'name,binaryflag,mass,radius,period,semimajoraxis,eccentricity,periastron,longitude,ascendingnode,inclination,temperature\n' +
      'HD 154857 b,0,2.24,,408.6,1.291,0.46,57,,,,,336.0\n';
    fs.writeFileSync(tempExoCsv, content, 'utf-8');

    try {
      const hostMap = loadExoplanetCatalog(tempExoCsv);
      expect(hostMap.has('hd154857')).toBe(true);
      const planets = hostMap.get('hd154857');
      expect(planets).toHaveLength(1);
      expect(planets?.[0].name).toBe('HD 154857 b');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Host Metadata Parsing & Deduplication (loadAllExoplanetCatalogsWithHosts)', () => {
    it('parses NASA 21-col header columns, legacy 13-col rows, OEC sexagesimal RA/Dec (including -00), and EU confirmed vs unconfirmed rows', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-exo-hosts-'));
      const oecPath = path.join(tempDir, 'oec.csv');
      const nasaPath = path.join(tempDir, 'nasa.csv');
      const euPath = path.join(tempDir, 'eu.csv');

      fs.writeFileSync(
        oecPath,
        [
          'name,binaryflag,mass,radius,period,semimajoraxis,eccentricity,periastron,longitude,ascendingnode,inclination,temperature,age,discoverymethod,discoveryyear,lastupdate,system_rightascension,system_declination,system_distance,hoststar_mass,hoststar_radius,hoststar_metallicity,hoststar_temperature,hoststar_age,list',
          'OEC South b,0,1.2,1.0,10.5,0.08,0.01,,,,,900,,Transit,2020,,06 30 00,-00 15 30,220.5,0.95,0.92,0.0,5500,4.0,Confirmed planets',
          '51 Peg b,0,0.47,1.2,4.23,0.052,0.01,,,,,1200,,RV,1995,,22 57 28,+20 46 08,15.46,1.11,1.24,0.2,5793,6.1,Confirmed planets',
        ].join('\n'),
        'utf-8',
      );

      fs.writeFileSync(
        nasaPath,
        [
          'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,pl_insol,sy_dist,ra,dec,st_spectype,st_teff,st_rad,st_mass,st_lum,sy_vmag',
          'Kepler-186 f,Kepler-186,1,5,Transit,2014,129.944,0.432,1.4,1.17,188,0.29,178.5,298.6527,43.955,M1V,3755,0.52,0.54,-1.26,14.62',
          '51 Peg b,51 Peg,1,1,Radial Velocity,1995,4.2308,0.0527,150.0,13.0,1284,500,15.46,344.366,20.768,G2IV,5793,1.24,1.11,0.13,5.49',
        ].join('\n'),
        'utf-8',
      );

      fs.writeFileSync(
        euPath,
        [
          'name,planet_status,mass,radius,orbital_period,semi_major_axis,eccentricity,inclination,discovered,detection_type,ra,dec,star_distance,mag_v,star_sp_type,star_teff,star_name',
          'EU Confirmed b,Confirmed,0.8,1.1,25.0,0.15,0.05,89,2021,Primary Transit,120.5,-35.25,410.0,13.1,K2V,4900,EU Confirmed',
          'EU Candidate c,Candidate,2.0,1.3,50.0,0.3,0.1,88,2023,Primary Transit,140.0,12.5,520.0,15.0,G0V,5900,EU Candidate',
          'Kepler-186 f,Confirmed,1.5,1.2,129.9,0.43,0.04,89.9,2014,Primary Transit,298.0,43.0,180.0,15.5,M2V,3600,Kepler-186',
        ].join('\n'),
        'utf-8',
      );

      try {
        const { hostMap, canonicalHosts } = loadAllExoplanetCatalogsWithHosts(oecPath, nasaPath, euPath);

        const kepler = canonicalHosts.find((g) => g.host.hostName === 'Kepler-186');
        expect(kepler).toBeDefined();
        expect(kepler?.host.confirmed).toBe(true);
        expect(kepler?.host.raDeg).toBeCloseTo(298.6527, 4);
        expect(kepler?.host.decDeg).toBeCloseTo(43.955, 3);
        expect(kepler?.host.distPc).toBeCloseTo(178.5, 2);
        expect(kepler?.host.spect).toBe('M1V'); // NASA precedence over EU
        expect(kepler?.host.mag).toBeCloseTo(14.62, 2);
        expect(kepler?.host.teffK).toBe(3755);
        expect(kepler?.host.radiusRsun).toBeCloseTo(0.52, 2);
        expect(kepler?.host.massMsun).toBeCloseTo(0.54, 2);
        expect(kepler?.host.lumLsun).toBeCloseTo(Math.pow(10, -1.26), 4);

        const oecSouth = canonicalHosts.find((g) => g.host.hostName === 'OEC South');
        expect(oecSouth).toBeDefined();
        expect(oecSouth?.host.confirmed).toBe(true);
        expect(oecSouth?.host.raDeg).toBeCloseTo(97.5, 4); // 6.5h * 15
        expect(oecSouth?.host.decDeg).toBeCloseTo(-(15 / 60 + 30 / 3600), 5); // -00 15 30 negative!
        expect(oecSouth?.host.distPc).toBeCloseTo(220.5, 2);
        expect(oecSouth?.host.teffK).toBe(5500);
        expect(oecSouth?.host.radiusRsun).toBeCloseTo(0.92, 2);

        const euConfirmed = canonicalHosts.find((g) => g.host.hostName === 'EU Confirmed');
        expect(euConfirmed).toBeDefined();
        expect(euConfirmed?.host.confirmed).toBe(true);
        expect(euConfirmed?.host.raDeg).toBeCloseTo(120.5, 2);
        expect(euConfirmed?.host.decDeg).toBeCloseTo(-35.25, 2);
        expect(euConfirmed?.host.distPc).toBeCloseTo(410.0, 2);
        expect(euConfirmed?.host.mag).toBeCloseTo(13.1, 2);
        expect(euConfirmed?.host.spect).toBe('K2V');

        const euCandidate = canonicalHosts.find((g) => g.host.hostName === 'EU Candidate');
        expect(euCandidate).toBeDefined();
        expect(euCandidate?.host.confirmed).toBe(false);

        // IAU NameExoWorlds alias ("51 Peg" / "Helvetios") must appear only once in canonicalHosts
        const pegMatches = canonicalHosts.filter(
          (g) => g.host.canonicalKey === '51pegasi' || g.host.canonicalKey === '51peg' || g.host.canonicalKey === 'helvetios',
        );
        expect(pegMatches).toHaveLength(1);
        expect(hostMap.has('helvetios')).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('supports legacy 13-col NASA CSV without ra/dec and minimal EU fixture without planet_status', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-exo-legacy-'));
      const nasaPath = path.join(tempDir, 'nasa_legacy.csv');
      const euPath = path.join(tempDir, 'eu_minimal.csv');

      fs.writeFileSync(
        nasaPath,
        [
          'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,pl_insol,sy_dist',
          'Legacy Star b,Legacy Star,1,1,Transit,2020,10.0,0.09,5.0,1.5,400,5.0,55.0',
        ].join('\n'),
        'utf-8',
      );
      fs.writeFileSync(
        euPath,
        [
          'name,ra,dec,star_distance,star_name',
          'Minimal EU b,45.0,10.0,300.0,Minimal EU',
        ].join('\n'),
        'utf-8',
      );

      try {
        const { hostMap, canonicalHosts } = loadAllExoplanetCatalogsWithHosts('', nasaPath, euPath);
        expect(hostMap.get('legacystar')).toHaveLength(1);
        const legacyHost = canonicalHosts.find((g) => g.host.hostName === 'Legacy Star');
        expect(legacyHost?.host.confirmed).toBe(true);
        expect(legacyHost?.host.distPc).toBeCloseTo(55.0, 2);
        expect(Number.isFinite(legacyHost?.host.raDeg)).toBe(false);

        const minimalEu = canonicalHosts.find((g) => g.host.hostName === 'Minimal EU');
        expect(minimalEu?.host.confirmed).toBe(true);
        expect(minimalEu?.host.raDeg).toBeCloseTo(45.0, 2);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
