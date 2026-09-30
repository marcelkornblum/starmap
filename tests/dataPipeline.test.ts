import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseHygRow, buildStarDataPipeline } from '../scripts/build-data';
import type { StarmapNode } from '../src/types/astro';

describe('Data Pipeline - parseHygRow', () => {
  it('correctly maps Sol at origin', () => {
    const rawRow: Record<string, string> = {
      id: '0',
      proper: 'Sol',
      ra: '0.000000',
      dec: '0.000000',
      dist: '0.0000',
      mag: '-26.700',
      absmag: '4.850',
      spect: 'G2V',
      ci: '0.656',
      lum: '1',
    };

    const node = parseHygRow(rawRow);
    expect(node).not.toBeNull();
    expect(node?.id).toBe(0);
    expect(node?.name).toBe('Sol');
    expect(node?.dist).toBe(0);
    expect(node?.x).toBe(0);
    expect(node?.y).toBe(0);
    expect(node?.z).toBe(0);
    expect(node?.spect).toBe('G2V');
    expect(node?.lum).toBe(1);
  });

  it('correctly maps Sirius with proper name and calculated coordinates', () => {
    const rawRow: Record<string, string> = {
      id: '32263',
      hip: '32349',
      hd: '48915',
      hr: '2491',
      gl: 'Gl 244A',
      bf: '9Alp CMa',
      proper: 'Sirius',
      ra: '6.752481',
      dec: '-16.716116',
      dist: '2.6371',
      mag: '-1.440',
      absmag: '1.454',
      spect: 'A0m...',
      ci: '0.009',
      bayer: 'Alp',
      flam: '9',
      con: 'CMa',
      lum: '22.8244',
    };

    const node = parseHygRow(rawRow);
    expect(node).not.toBeNull();
    expect(node?.name).toBe('Sirius');
    expect(node?.properName).toBe('Sirius');
    expect(node?.hip).toBe(32349);
    expect(node?.hd).toBe(48915);
    expect(node?.hr).toBe(2491);
    expect(node?.con).toBe('CMa');
    expect(node?.bayer).toBe('Alp');
    expect(node?.flam).toBe(9);
    expect(node?.x).toBeCloseTo(-0.494, 2);
    expect(node?.y).toBeCloseTo(2.477, 2);
    expect(node?.z).toBeCloseTo(-0.758, 2);
  });

  it('skips rows with missing or NaN coordinates or invalid ID', () => {
    expect(parseHygRow({ id: 'abc', ra: '1', dec: '1', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: 'NaN', dec: '1', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: '1', dec: 'NaN', dist: '10' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: '1', dec: '1', dist: 'NaN' })).toBeNull();
    expect(parseHygRow({ id: '1', ra: '1', dec: '1', dist: '-5' })).toBeNull();
  });

  it('falls back through naming hierarchy when proper name is omitted', () => {
    // 1. bf designation
    const n1 = parseHygRow({ id: '1', ra: '0', dec: '0', dist: '10', bf: '1Alp UMi' });
    expect(n1?.name).toBe('1Alp UMi');

    // 2. bayer + con
    const n2 = parseHygRow({ id: '2', ra: '0', dec: '0', dist: '10', bayer: 'Bet', con: 'Ori' });
    expect(n2?.name).toBe('Bet Ori');

    // 3. gl
    const n3 = parseHygRow({ id: '3', ra: '0', dec: '0', dist: '10', gl: 'Gl 551' });
    expect(n3?.name).toBe('Gl 551');

    // 4. hip
    const n4 = parseHygRow({ id: '4', ra: '0', dec: '0', dist: '10', hip: '12345' });
    expect(n4?.name).toBe('HIP 12345');

    // 5. fallback HYG id
    const n5 = parseHygRow({ id: '999', ra: '0', dec: '0', dist: '10' });
    expect(n5?.name).toBe('HYG 999');
  });
});

describe('Data Pipeline - buildStarDataPipeline (Streaming)', () => {
  const tempCsvPath = path.resolve('tests/fixtures/sample_test.csv');
  const tempJsonPath = path.resolve('tests/fixtures/sample_output.json');

  afterAll(() => {
    if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
  });

  it('streams CSV input and produces valid minified JSON array', async () => {
    const csvContent =
      'id,proper,ra,dec,dist,mag,absmag,spect,ci,lum\n' +
      '0,Sol,0.0,0.0,0.0,-26.7,4.85,G2V,0.656,1.0\n' +
      '1,,1.0,10.0,50.0,6.5,2.0,A0,0.1,5.0\n' +
      '2,InvalidStar,1.0,10.0,NaN,5.0,2.0,M0,1.2,0.5\n';

    fs.writeFileSync(tempCsvPath, csvContent, 'utf-8');

    const summary = await buildStarDataPipeline(tempCsvPath, tempJsonPath);

    expect(summary.totalRows).toBe(3);
    expect(summary.validStars).toBe(2);
    expect(summary.skippedRows).toBe(1);

    const generated = fs.readFileSync(tempJsonPath, 'utf-8');
    const parsed: StarmapNode[] = JSON.parse(generated);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Sol');
    expect(parsed[1].name).toBe('HYG 1');
  });
});
