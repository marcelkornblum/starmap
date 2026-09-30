import fs from 'node:fs';
import path from 'node:path';
import csv from 'csv-parser';
import type { StarmapNode } from '../src/types/astro';
import { equatorialToCartesian } from '../src/utils/astroMath';

/**
 * Parses and harmonizes a raw CSV record from hygdata_v3 into a strict StarmapNode.
 * Returns null if the star record is invalid or missing distance coordinates.
 *
 * @param row Raw key-value mapping from CSV row
 * @returns Valid StarmapNode or null if skipped
 */
export function parseHygRow(row: Record<string, string>): StarmapNode | null {
  const id = parseInt(row.id, 10);
  if (isNaN(id)) {
    return null;
  }

  const dist = parseFloat(row.dist);
  const ra = parseFloat(row.ra);
  const dec = parseFloat(row.dec);

  // Skip rows with missing, NaN, or invalid coordinates (Sol at dist=0 is valid)
  if (isNaN(dist) || isNaN(ra) || isNaN(dec) || dist < 0) {
    return null;
  }

  // Derive human-readable primary display name
  const properName = row.proper && row.proper.trim().length > 0 ? row.proper.trim() : undefined;
  let name = properName;

  if (!name) {
    if (row.bf && row.bf.trim().length > 0) {
      name = row.bf.trim();
    } else if (row.bayer && row.con && row.bayer.trim().length > 0) {
      name = `${row.bayer.trim()} ${row.con.trim()}`;
    } else if (row.gl && row.gl.trim().length > 0) {
      name = row.gl.trim();
    } else if (row.hip && row.hip.trim().length > 0) {
      name = `HIP ${row.hip.trim()}`;
    } else if (row.hd && row.hd.trim().length > 0) {
      name = `HD ${row.hd.trim()}`;
    } else if (row.hr && row.hr.trim().length > 0) {
      name = `HR ${row.hr.trim()}`;
    } else {
      name = `HYG ${id}`;
    }
  }

  // Pre-calculate Cartesian XYZ coordinates using equatorialToCartesian utility
  const [x, y, z] = equatorialToCartesian(ra, dec, dist);

  const hip = row.hip && row.hip.trim().length > 0 ? parseInt(row.hip, 10) : null;
  const hd = row.hd && row.hd.trim().length > 0 ? parseInt(row.hd, 10) : null;
  const hr = row.hr && row.hr.trim().length > 0 ? parseInt(row.hr, 10) : null;
  const flam = row.flam && row.flam.trim().length > 0 ? parseInt(row.flam, 10) : null;
  const gl = row.gl && row.gl.trim().length > 0 ? row.gl.trim() : null;
  const bayer = row.bayer && row.bayer.trim().length > 0 ? row.bayer.trim() : null;
  const con = row.con && row.con.trim().length > 0 ? row.con.trim() : null;
  const spect = row.spect && row.spect.trim().length > 0 ? row.spect.trim() : undefined;
  const ci = row.ci && row.ci.trim().length > 0 && !isNaN(parseFloat(row.ci)) ? parseFloat(row.ci) : null;
  const lum = row.lum && row.lum.trim().length > 0 && !isNaN(parseFloat(row.lum)) ? parseFloat(row.lum) : undefined;
  const mag = row.mag && !isNaN(parseFloat(row.mag)) ? parseFloat(row.mag) : 0;
  const absmag = row.absmag && !isNaN(parseFloat(row.absmag)) ? parseFloat(row.absmag) : 0;

  return {
    id,
    name,
    properName,
    hip,
    hd,
    hr,
    gl,
    bayer,
    flam,
    con,
    ra,
    dec,
    dist,
    mag,
    absmag,
    spect,
    ci,
    x,
    y,
    z,
    lum,
  };
}

export interface PipelineSummary {
  totalRows: number;
  validStars: number;
  skippedRows: number;
  outputPath: string;
}

/**
 * Streams raw HYG CSV dataset, harmonizes into StarmapNode records,
 * and streams directly into minified JSON output file.
 *
 * @param inputCsvPath Absolute or relative path to raw CSV file
 * @param outputJsonPath Absolute or relative path to destination JSON file
 * @returns Summary of processed records
 */
export async function buildStarDataPipeline(
  inputCsvPath: string,
  outputJsonPath: string,
): Promise<PipelineSummary> {
  const resolvedInput = path.resolve(inputCsvPath);
  const resolvedOutput = path.resolve(outputJsonPath);

  // Ensure output directory exists
  const outDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let validStars = 0;
    let skippedRows = 0;

    const readStream = fs.createReadStream(resolvedInput);
    const writeStream = fs.createWriteStream(resolvedOutput, { encoding: 'utf-8' });

    // Begin JSON array
    writeStream.write('[');
    let isFirst = true;

    readStream
      .pipe(csv())
      .on('data', (row: Record<string, string>) => {
        totalRows++;
        const node = parseHygRow(row);
        if (!node) {
          skippedRows++;
          return;
        }

        const serialized = JSON.stringify(node);
        if (!isFirst) {
          writeStream.write(',');
        } else {
          isFirst = false;
        }
        writeStream.write(serialized);
        validStars++;
      })
      .on('end', () => {
        // End JSON array
        writeStream.write(']');
        writeStream.end();
      })
      .on('error', (err) => {
        reject(err);
      });

    writeStream.on('finish', () => {
      resolve({
        totalRows,
        validStars,
        skippedRows,
        outputPath: resolvedOutput,
      });
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}

// CLI entrypoint when executed directly via tsx
const isDirectExecution = process.argv[1]?.endsWith('build-data.ts');
if (isDirectExecution) {
  const inputCsv = process.env.INPUT_CSV || 'data/hygdata_v3.csv';
  const outputJson = process.env.OUTPUT_JSON || 'public/data/stars.json';

  console.log(`Starting Data Pipeline: Ingesting ${inputCsv}...`);
  const startTime = Date.now();

  buildStarDataPipeline(inputCsv, outputJson)
    .then((summary) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Pipeline complete in ${elapsed}s:`);
      console.log(`  - Total CSV rows read: ${summary.totalRows}`);
      console.log(`  - Valid stars exported: ${summary.validStars}`);
      console.log(`  - Skipped invalid rows: ${summary.skippedRows}`);
      console.log(`  - Output: ${summary.outputPath}`);
    })
    .catch((err) => {
      console.error('Data Pipeline failed:', err);
      process.exit(1);
    });
}
