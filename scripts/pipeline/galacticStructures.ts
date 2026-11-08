import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { GalacticStructureRecord } from '../../src/types/astro';
import { equatorialToCartesian } from '../../src/utils/astroMath';
import {
  resolveDefaultStructureDescription,
  resolveStructureReticleType,
} from '../../src/utils/astroPrecalculation';
import { parseCsvRowsSync } from './csvParser';
import { FULL_GALACTIC_STRUCTURES } from './seedCatalogs';

export function loadAllGalacticStructures(): GalacticStructureRecord[] {
  const structures: GalacticStructureRecord[] = FULL_GALACTIC_STRUCTURES.map((seed) => ({
    ...seed,
    confidence: 'confirmed' as const,
    description: seed.description || resolveDefaultStructureDescription(seed.type),
    reticleType: resolveStructureReticleType(seed.type),
  }));

  const seenKeys = new Set<string>();
  const addSeen = (key: string) => {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (k) seenKeys.add(k);
  };

  for (const s of structures) {
    addSeen(s.id);
    for (const d of s.designations) addSeen(d);
  }

  // 1. Cantat-Gaudin Open Clusters (AUD-044)
  const cgPath = path.resolve('data/raw/cantat_gaudin_clusters.dat');
  if (fs.existsSync(cgPath)) {
    const lines = fs.readFileSync(cgPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const tokens = line.trim().split(/\s+/);
      const name = tokens[0];
      const ra = parseFloat(tokens[1]);
      const dec = parseFloat(tokens[2]);
      const nbStars = parseInt(tokens[6], 10);
      const plx = parseFloat(tokens[11]);
      const logAge = parseFloat(tokens[14]);
      const dmode = parseFloat(tokens[17]);

      const dist = !isNaN(dmode) && dmode > 0
        ? Math.round(dmode * 100) / 100
        : !isNaN(plx) && plx > 0
          ? Math.round((1000 / plx) * 100) / 100
          : NaN;

      if (isNaN(dist) || dist <= 0 || !name || isNaN(ra) || isNaN(dec)) continue;

      const structId = `cluster-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (seenKeys.has(name.toLowerCase().replace(/[^a-z0-9]/g, '')) || seenKeys.has(structId.replace(/[^a-z0-9]/g, ''))) {
        continue;
      }

      const [x, y, z] = equatorialToCartesian(ra / 15, dec, dist);
      addSeen(structId);
      addSeen(name);
      structures.push({
        id: structId,
        name: name.replace(/_/g, ' '),
        type: 'OpenCluster',
        x,
        y,
        z,
        dist,
        ageMyr: !isNaN(logAge) ? Math.round(Math.pow(10, logAge) / 1e6) : undefined,
        memberCount: !isNaN(nbStars) ? nbStars : undefined,
        designations: [name],
        description: resolveDefaultStructureDescription('OpenCluster'),
        confidence: 'confirmed',
        reticleType: resolveStructureReticleType('OpenCluster'),
      });
    }
  }

  // 2. Harris Globular Clusters
  const harrisPath = path.resolve('data/raw/harris_globulars.dat.gz');
  if (fs.existsSync(harrisPath)) {
    const content = zlib.gunzipSync(fs.readFileSync(harrisPath)).toString('utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.length < 50) continue;
      const id = line.substring(1, 10).trim();
      const name = line.substring(11, 22).trim() || id;
      const raH = parseFloat(line.substring(23, 25));
      const raM = parseFloat(line.substring(26, 28));
      const raS = parseFloat(line.substring(29, 33));
      const decSign = line.substring(34, 35) === '-' ? -1 : 1;
      const decD = parseFloat(line.substring(35, 37));
      const decM = parseFloat(line.substring(38, 40));
      const decS = parseFloat(line.substring(41, 43));
      const distKpc = parseFloat(line.substring(55, 61));
      const distPc = distKpc * 1000;

      if (!id || isNaN(raH) || isNaN(distPc) || distPc <= 0) continue;
      const structId = `globular-${id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (seenKeys.has(id.toLowerCase().replace(/[^a-z0-9]/g, '')) || seenKeys.has(name.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        continue;
      }

      const raHours = raH + raM / 60 + raS / 3600;
      const decDeg = decSign * (decD + decM / 60 + decS / 3600);
      const [x, y, z] = equatorialToCartesian(raHours, decDeg, distPc);

      addSeen(structId);
      addSeen(id);
      if (name) addSeen(name);

      structures.push({
        id: structId,
        name: name ? `${id} (${name})` : id,
        type: 'GlobularCluster',
        x,
        y,
        z,
        dist: distPc,
        designations: [id, ...(name && name !== id ? [name] : [])],
        description: resolveDefaultStructureDescription('GlobularCluster'),
        confidence: 'confirmed',
        reticleType: resolveStructureReticleType('GlobularCluster'),
      });
    }
  }

  // 3. Green's Supernova Remnants (DEC-R026: skipped - no real distance column in raw file)

  // 4. ATNF Pulsars (AUD-044)
  const atnfPath = path.resolve('data/raw/atnf_pulsars.dat');
  if (fs.existsSync(atnfPath)) {
    const lines = fs.readFileSync(atnfPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.length < 40) continue;
      const jname = line.substring(0, 12).trim();
      const raDeg = parseFloat(line.substring(24, 38).trim());
      const decDeg = parseFloat(line.substring(60, 76).trim());
      const distKpc = parseFloat(line.substring(114, 122).trim());

      if (isNaN(raDeg) || isNaN(decDeg) || isNaN(distKpc) || distKpc <= 0 || !jname) continue;

      const distPc = Math.round(distKpc * 1000 * 100) / 100;
      const structId = `pulsar-${jname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (seenKeys.has(jname.toLowerCase().replace(/[^a-z0-9]/g, '')) || seenKeys.has(structId.replace(/[^a-z0-9]/g, ''))) {
        continue;
      }

      const [x, y, z] = equatorialToCartesian(raDeg / 15, decDeg, distPc);
      addSeen(structId);
      addSeen(jname);

      structures.push({
        id: structId,
        name: `PSR ${jname}`,
        type: 'Pulsar',
        x,
        y,
        z,
        dist: distPc,
        designations: [jname, `PSR ${jname}`],
        description: resolveDefaultStructureDescription('Pulsar'),
        confidence: 'confirmed',
        reticleType: resolveStructureReticleType('Pulsar'),
      });
    }
  }

  // 5. Barnard Dark Nebulae (DEC-R026: skipped - no real distance column in raw file)

  // 6. OpenNGC Deep Sky Landmarks (DEC-R026)
  const ngcPath = path.resolve('data/raw/open_ngc.csv');
  if (fs.existsSync(ngcPath)) {
    const rows = parseCsvRowsSync(fs.readFileSync(ngcPath, 'utf-8'), ';');
    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      const name = parts[0]?.trim();
      const type = parts[1]?.trim();
      const raStr = parts[2]?.trim();
      const decStr = parts[3]?.trim();
      const commonNames = parts[28]?.trim() || '';
      const messier = parts[23]?.trim();

      if (!name || !raStr || !decStr || (!messier && !commonNames && type !== 'OCl' && type !== 'GCl' && type !== 'PN')) {
        continue;
      }

      const pax = parseFloat(parts[15] ?? '');
      const distPc = !isNaN(pax) && pax > 0 ? Math.round((1000 / pax) * 100) / 100 : NaN;
      if (isNaN(distPc) || distPc <= 0) continue;

      const [raH, raM, raS] = raStr.split(':').map(Number);
      const decParts = decStr.split(':').map(Number);
      const decSign = decStr.startsWith('-') ? -1 : 1;
      const decD = Math.abs(decParts[0]);
      const decM = decParts[1] || 0;
      const decS = decParts[2] || 0;
      if (isNaN(raH) || isNaN(decD)) continue;

      const structType: GalacticStructureRecord['type'] =
        type === 'OCl' ? 'OpenCluster' : type === 'GCl' ? 'GlobularCluster' : type === 'PN' ? 'PlanetaryNebula' : type === 'Neb' ? 'EmissionNebula' : 'DeepSkyLandmark';

      const messierNum = messier ? parseInt(messier, 10) : NaN;
      const messierDesignations = messier && !isNaN(messierNum)
        ? [`M${messierNum}`, `M ${messierNum}`, `Messier ${messierNum}`, `M ${messier}`]
        : messier ? [`M ${messier}`] : [];

      const structId = `ngc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const allDesigs = [name, ...messierDesignations, ...(commonNames ? [commonNames] : [])];
      if (allDesigs.some((d) => seenKeys.has(d.toLowerCase().replace(/[^a-z0-9]/g, '')))) continue;

      const raHours = raH + raM / 60 + (raS || 0) / 3600;
      const decDeg = decSign * (decD + decM / 60 + decS / 3600);
      const [x, y, z] = equatorialToCartesian(raHours, decDeg, distPc);

      addSeen(structId);
      for (const d of allDesigs) addSeen(d);

      structures.push({
        id: structId,
        name: commonNames ? `${name} (${commonNames})` : name,
        type: structType,
        x,
        y,
        z,
        dist: distPc,
        designations: allDesigs,
        description: resolveDefaultStructureDescription(structType),
        confidence: 'confirmed',
        reticleType: resolveStructureReticleType(structType),
      });
    }
  }

  return structures;
}
