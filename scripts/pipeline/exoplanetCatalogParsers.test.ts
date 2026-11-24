import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  EARTH_MASSES_PER_JUPITER,
  EARTH_RADII_PER_JUPITER,
  computeEsi,
  makeOrbit,
  parseEuCatalog,
  parseNasaCatalog,
  parseOecCatalog,
  splitPlanetName,
} from './exoplanetCatalogParsers';

describe('exoplanetCatalogParsers', () => {
  it('exports physical Jupiter-to-Earth conversion constants', () => {
    expect(EARTH_MASSES_PER_JUPITER).toBeCloseTo(317.828, 3);
    expect(EARTH_RADII_PER_JUPITER).toBeCloseTo(11.209, 3);
  });

  it('computes ESI within [0, 1] and returns undefined when inputs are missing', () => {
    expect(computeEsi(1.0, 288)).toBeCloseTo(1.0, 6);
    expect(computeEsi(undefined, 288)).toBeUndefined();
    expect(computeEsi(1.0, Number.NaN)).toBeUndefined();
    const hot = computeEsi(2.0, 1200);
    expect(hot).toBeDefined();
    expect(hot!).toBeGreaterThanOrEqual(0);
    expect(hot!).toBeLessThan(1);
  });

  it('splits planet names into host and letter and handles invalid strings', () => {
    expect(splitPlanetName('Kepler-186 f')).toEqual({ hostName: 'Kepler-186', letter: 'f' });
    expect(splitPlanetName('  51 Peg b  ')).toEqual({ hostName: '51 Peg', letter: 'b' });
    expect(splitPlanetName('SingleToken')).toBeNull();
    expect(splitPlanetName(undefined)).toBeNull();
  });

  it('builds KeplerianOrbit substituting 0 for NaN inputs', () => {
    expect(makeOrbit(1.0, Number.NaN, 5.0, Number.NaN, 10.0, 365.25)).toEqual({
      semiMajorAxis: 1.0,
      eccentricity: 0,
      inclination: 5.0,
      ascendingNode: 0,
      argumentOfPeriapsis: 10.0,
      meanAnomaly: 0,
      periodDays: 365.25,
    });
  });

  it('parses OEC, NASA, and EU CSV rows and registers normalized planet records', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starmap-parsers-'));
    try {
      const oecPath = path.join(tempDir, 'oec.csv');
      fs.writeFileSync(
        oecPath,
        [
          'name,binaryflag,mass,radius,period,semimajoraxis,eccentricity,periastron,longitude,ascendingnode,inclination,temperature,age,discoverymethod,discoveryyear,lastupdate,system_rightascension,system_declination,system_distance,hoststar_mass,hoststar_radius,hoststar_metallicity,hoststar_temperature,hoststar_age,list',
          'OEC Test b,0,1.0,1.0,365.25,1.0,0.01,,,,,288,,Transit,2020,,12 00 00,+10 00 00,50.0,1.0,1.0,0.0,5778,4.6,Confirmed planets',
        ].join('\n'),
        'utf-8',
      );
      const oecSpy = vi.fn();
      parseOecCatalog(oecPath, false, oecSpy);
      expect(oecSpy).toHaveBeenCalledTimes(1);
      expect(oecSpy.mock.calls[0]?.[2]?.massMearth).toBeCloseTo(317.83, 2);
      expect(oecSpy.mock.calls[0]?.[2]?.radiusRearth).toBeCloseTo(11.21, 2);
      expect(oecSpy.mock.calls[0]?.[6]).toBe(true);

      const nasaPath = path.join(tempDir, 'nasa.csv');
      fs.writeFileSync(
        nasaPath,
        [
          'pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_bmasse,pl_rade,pl_eqt,ra,dec,sy_dist,sy_vmag,st_spectype,st_teff,st_rad,st_mass,st_lum',
          'NASA Test b,NASA Test,Transit,2022,12.5,0.1,3.17828,1.1209,300,180.0,-20.0,40.0,11.5,G5V,5500,0.95,0.92,-0.1',
        ].join('\n'),
        'utf-8',
      );
      const nasaSpy = vi.fn();
      parseNasaCatalog(nasaPath, nasaSpy);
      expect(nasaSpy).toHaveBeenCalledTimes(1);
      expect(nasaSpy.mock.calls[0]?.[2]?.massMjup).toBeCloseTo(0.01, 4);
      expect(nasaSpy.mock.calls[0]?.[2]?.radiusRjup).toBeCloseTo(0.1, 4);

      const euPath = path.join(tempDir, 'eu.csv');
      fs.writeFileSync(
        euPath,
        [
          'name,planet_status,mass,radius,orbital_period,semi_major_axis,eccentricity,inclination,discovered,detection_type,ra,dec,star_distance,mag_v,star_sp_type,star_teff,star_name',
          'EU Test b,Candidate,0.5,0.5,20.0,0.15,0.02,89,2023,Primary Transit,90.0,15.0,120.0,12.8,K0V,5000,EU Test',
        ].join('\n'),
        'utf-8',
      );
      const euSpy = vi.fn();
      parseEuCatalog(euPath, true, euSpy);
      expect(euSpy).toHaveBeenCalledTimes(1);
      expect(euSpy.mock.calls[0]?.[2]?.confidence).toBe('candidate');
      expect(euSpy.mock.calls[0]?.[6]).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
