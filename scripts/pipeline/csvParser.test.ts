import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import {
  parseCsvRowsSync,
  parseCsvRecordsSync,
  streamCsvFile,
} from './csvParser';

describe('csvParser', () => {
  const tempCsvFile = path.resolve('/tmp', `starmap-test-stream-${Date.now()}.csv`);

  afterEach(() => {
    if (fs.existsSync(tempCsvFile)) {
      fs.unlinkSync(tempCsvFile);
    }
  });

  describe('parseCsvRowsSync', () => {
    it('parses standard comma-separated rows', () => {
      const csv = 'pl_name,hostname,sy_dist\nProxima b,Proxima Centauri,1.30\nBarnard b,Barnard Star,1.83';
      const rows = parseCsvRowsSync(csv);

      expect(rows).toEqual([
        ['pl_name', 'hostname', 'sy_dist'],
        ['Proxima b', 'Proxima Centauri', '1.30'],
        ['Barnard b', 'Barnard Star', '1.83'],
      ]);
    });

    it('handles quoted fields containing commas', () => {
      const csv = 'id,method,note\n1,"Radial Velocity, Transit","Multi-method detection"\n2,"Microlensing",Simple';
      const rows = parseCsvRowsSync(csv);

      expect(rows[1]).toEqual(['1', 'Radial Velocity, Transit', 'Multi-method detection']);
      expect(rows[2]).toEqual(['2', 'Microlensing', 'Simple']);
    });

    it('handles escaped quotes within quoted fields', () => {
      const csv = 'id,quote\n1,"The star was called ""Lich"" officially"\n2,"Plain"';
      const rows = parseCsvRowsSync(csv);

      expect(rows[1][1]).toBe('The star was called "Lich" officially');
    });

    it('handles custom separators like semicolons', () => {
      const csv = 'name;type;val\nStarA;Giant;4.5\nStarB;Dwarf;12.1';
      const rows = parseCsvRowsSync(csv, ';');

      expect(rows).toEqual([
        ['name', 'type', 'val'],
        ['StarA', 'Giant', '4.5'],
        ['StarB', 'Dwarf', '12.1'],
      ]);
    });

    it('skips comment lines and blank lines', () => {
      const csv = '# Header comments\n# Another comment\ncol1,col2\n\nval1,val2\n\n';
      const rows = parseCsvRowsSync(csv);

      expect(rows).toEqual([
        ['col1', 'col2'],
        ['val1', 'val2'],
      ]);
    });
  });

  describe('parseCsvRecordsSync', () => {
    it('converts rows to key-value records mapped to header names', () => {
      const csv = 'pl_name,hostname,discoverymethod\nLHS 1140 b,LHS 1140,"Transit, Radial Velocity"\nTau Ceti g,Tau Ceti,Radial Velocity';
      const records = parseCsvRecordsSync(csv);

      expect(records).toHaveLength(2);
      expect(records[0]).toEqual({
        pl_name: 'LHS 1140 b',
        hostname: 'LHS 1140',
        discoverymethod: 'Transit, Radial Velocity',
      });
      expect(records[1]).toEqual({
        pl_name: 'Tau Ceti g',
        hostname: 'Tau Ceti',
        discoverymethod: 'Radial Velocity',
      });
    });

    it('returns empty array on empty content', () => {
      expect(parseCsvRecordsSync('')).toEqual([]);
      expect(parseCsvRecordsSync('# only comments\n')).toEqual([]);
    });
  });

  describe('streamCsvFile', () => {
    it('asynchronously streams records from a CSV file with support for custom separator', async () => {
      const content = 'a,b,c\n1,"hello, world",3\n4,test,6\n';
      fs.writeFileSync(tempCsvFile, content, 'utf8');

      const items: Array<Record<string, string>> = [];
      for await (const row of streamCsvFile(tempCsvFile)) {
        items.push(row);
      }

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ a: '1', b: 'hello, world', c: '3' });
      expect(items[1]).toEqual({ a: '4', b: 'test', c: '6' });
    });
  });
});
