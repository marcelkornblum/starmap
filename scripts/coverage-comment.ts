import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const COMMENT_MARKER = '<!-- pr-coverage-report -->';
export const LEGACY_MARKERS = ['<!-- Pytest Coverage Comment: test -->'];

export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface FileCoverageRecord {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export interface CoverageSummaryData {
  total: FileCoverageRecord;
  [filePath: string]: FileCoverageRecord;
}

export interface ModuleSummary {
  module: string;
  files: number;
  linesTot: number;
  linesCov: number;
  linesPct: number;
  branchesTot: number;
  branchesCov: number;
  branchesPct: number;
  funcsTot: number;
  funcsCov: number;
  funcsPct: number;
  stmtsTot: number;
  stmtsCov: number;
  stmtsPct: number;
}

export interface FileSummary {
  path: string;
  linesPct: number;
  branchesPct: number;
  funcsPct: number;
  stmtsPct: number;
  linesCov: number;
  linesTot: number;
}

export interface ThresholdConfig {
  lines?: number;
  statements?: number;
  branches?: number;
  functions?: number;
}

export function getStatusIndicator(pct: number, threshold = 80): string {
  if (pct >= threshold) return '🟢';
  if (pct >= 50) return '🟡';
  return '🔴';
}

export function getStatusLabel(pct: number, threshold = 80): string {
  if (pct >= threshold) return '🟢 Strong';
  if (pct >= 50) return '🟡 Moderate';
  return '🔴 Weak';
}

export function getBadgeColour(pct: number): string {
  if (pct >= 90) return 'brightgreen';
  if (pct >= 80) return 'green';
  if (pct >= 70) return 'yellowgreen';
  if (pct >= 60) return 'yellow';
  if (pct >= 50) return 'orange';
  return 'red';
}

export function computeModuleName(filePath: string, baseDir: string): string {
  const absSrc = path.resolve(baseDir);
  const absFile = path.resolve(filePath);
  const rel = path.relative(absSrc, absFile);

  const parts = rel.split(path.sep);
  if (parts[0] === 'components' && parts.length > 2) {
    return `src/components/${parts[1]}`;
  }
  if (parts[0] !== 'components' && parts.length > 1) {
    return `src/${parts[0]}`;
  }
  return 'src (root)';
}

export function computeRelativePath(filePath: string, repoRoot: string): string {
  return path.relative(path.resolve(repoRoot), path.resolve(filePath));
}

export function parseCoverageData(
  data: CoverageSummaryData,
  repoRoot: string
): {
  total: FileCoverageRecord;
  moduleSummaries: ModuleSummary[];
  filesList: FileSummary[];
} {
  const total = data.total ?? {
    lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
    statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
    functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
  };

  const srcDir = path.join(repoRoot, 'src');
  const modulesMap = new Map<string, ModuleSummary>();
  const filesList: FileSummary[] = [];

  for (const [filePath, stats] of Object.entries(data)) {
    if (filePath === 'total') continue;

    const totalLines = stats.lines?.total ?? 0;
    // Skip empty, barrel, or type-only files with 0 executable lines
    if (totalLines === 0) continue;

    const mod = computeModuleName(filePath, srcDir);
    let modRecord = modulesMap.get(mod);
    if (!modRecord) {
      modRecord = {
        module: mod,
        files: 0,
        linesTot: 0,
        linesCov: 0,
        linesPct: 0,
        branchesTot: 0,
        branchesCov: 0,
        branchesPct: 0,
        funcsTot: 0,
        funcsCov: 0,
        funcsPct: 0,
        stmtsTot: 0,
        stmtsCov: 0,
        stmtsPct: 0,
      };
      modulesMap.set(mod, modRecord);
    }

    modRecord.files += 1;
    modRecord.linesTot += totalLines;
    modRecord.linesCov += stats.lines?.covered ?? 0;
    modRecord.branchesTot += stats.branches?.total ?? 0;
    modRecord.branchesCov += stats.branches?.covered ?? 0;
    modRecord.funcsTot += stats.functions?.total ?? 0;
    modRecord.funcsCov += stats.functions?.covered ?? 0;
    modRecord.stmtsTot += stats.statements?.total ?? 0;
    modRecord.stmtsCov += stats.statements?.covered ?? 0;

    filesList.push({
      path: computeRelativePath(filePath, repoRoot),
      linesPct: stats.lines?.pct ?? 0,
      branchesPct: stats.branches?.pct ?? 0,
      funcsPct: stats.functions?.pct ?? 0,
      stmtsPct: stats.statements?.pct ?? 0,
      linesCov: stats.lines?.covered ?? 0,
      linesTot: totalLines,
    });
  }

  const moduleSummaries: ModuleSummary[] = [];
  for (const mod of modulesMap.values()) {
    mod.linesPct = mod.linesTot > 0 ? (mod.linesCov / mod.linesTot) * 100 : 0;
    mod.branchesPct = mod.branchesTot > 0 ? (mod.branchesCov / mod.branchesTot) * 100 : 0;
    mod.funcsPct = mod.funcsTot > 0 ? (mod.funcsCov / mod.funcsTot) * 100 : 0;
    mod.stmtsPct = mod.stmtsTot > 0 ? (mod.stmtsCov / mod.stmtsTot) * 100 : 0;
    moduleSummaries.push(mod);
  }

  // Sort modules weakest first so areas needing attention are immediately apparent
  moduleSummaries.sort((a, b) => a.linesPct - b.linesPct || a.module.localeCompare(b.module));
  // Sort files weakest first
  filesList.sort((a, b) => a.linesPct - b.linesPct || a.path.localeCompare(b.path));

  return { total, moduleSummaries, filesList };
}

export function generateCoverageMarkdown(
  total: FileCoverageRecord,
  moduleSummaries: ModuleSummary[],
  filesList: FileSummary[],
  ratchetThresholds: ThresholdConfig = { lines: 64, branches: 58, functions: 70, statements: 65 }
): string {
  const linesTotal = total.lines?.total ?? 0;
  const linesCov = total.lines?.covered ?? 0;
  const linesPct = total.lines?.pct ?? 0;

  const branchesTotal = total.branches?.total ?? 0;
  const branchesCov = total.branches?.covered ?? 0;
  const branchesPct = total.branches?.pct ?? 0;

  const stmtsTotal = total.statements?.total ?? 0;
  const stmtsCov = total.statements?.covered ?? 0;
  const stmtsPct = total.statements?.pct ?? 0;

  const funcsTotal = total.functions?.total ?? 0;
  const funcsCov = total.functions?.covered ?? 0;
  const funcsPct = total.functions?.pct ?? 0;

  const combTot = linesTotal + branchesTotal;
  const combCov = linesCov + branchesCov;
  const overallPct = combTot > 0 ? Math.round((combCov / combTot) * 100) : Math.round(linesPct);
  const badgeColour = getBadgeColour(overallPct);
  const badgeUrl = `https://img.shields.io/badge/Coverage-${overallPct}%25-${badgeColour}.svg`;

  const linesRatchet = ratchetThresholds.lines ?? 64;
  const stmtsRatchet = ratchetThresholds.statements ?? 65;
  const branchesRatchet = ratchetThresholds.branches ?? 58;
  const funcsRatchet = ratchetThresholds.functions ?? 70;

  const linesStatus = linesPct >= linesRatchet ? '🟢 Pass' : '🔴 Below Ratchet';
  const stmtsStatus = stmtsPct >= stmtsRatchet ? '🟢 Pass' : '🔴 Below Ratchet';
  const branchesStatus = branchesPct >= branchesRatchet ? '🟢 Pass' : '🔴 Below Ratchet';
  const funcsStatus = funcsPct >= funcsRatchet ? '🟢 Pass' : '🔴 Below Ratchet';

  const lines: string[] = [
    COMMENT_MARKER,
    `![Coverage](${badgeUrl})\n`,
    '### Test Coverage Summary\n',
    '| Metric | Covered / Total | Percentage | Ratchet Baseline | Status |',
    '| :--- | :---: | :---: | :---: | :---: |',
    `| **Lines** | ${linesCov.toLocaleString()} / ${linesTotal.toLocaleString()} | ${linesPct.toFixed(1)}% | ${linesRatchet}% | ${linesStatus} |`,
    `| **Statements** | ${stmtsCov.toLocaleString()} / ${stmtsTotal.toLocaleString()} | ${stmtsPct.toFixed(1)}% | ${stmtsRatchet}% | ${stmtsStatus} |`,
    `| **Branches** | ${branchesCov.toLocaleString()} / ${branchesTotal.toLocaleString()} | ${branchesPct.toFixed(1)}% | ${branchesRatchet}% | ${branchesStatus} |`,
    `| **Functions** | ${funcsCov.toLocaleString()} / ${funcsTotal.toLocaleString()} | ${funcsPct.toFixed(1)}% | ${funcsRatchet}% | ${funcsStatus} |`,
    '',
    '<details>',
    '<summary><b>Module Coverage Overview</b> (click to expand)</summary>\n',
    '| Status | Module | Files | Lines | Branches | Functions |',
    '| :---: | :--- | :---: | :---: | :---: | :---: |',
  ];

  for (const m of moduleSummaries) {
    const status = getStatusIndicator(m.linesPct);
    lines.push(
      `| ${status} | \`${m.module}\` | ${m.files} | ${m.linesPct.toFixed(1)}% | ${m.branchesPct.toFixed(1)}% | ${m.funcsPct.toFixed(1)}% |`
    );
  }

  lines.push('\n</details>\n');
  lines.push('<details>');
  lines.push('<summary><b>File-by-File Breakdown</b> (click to expand)</summary>\n');
  lines.push('| Status | File | Lines | Branches | Functions |');
  lines.push('| :---: | :--- | :---: | :---: | :---: |');

  for (const f of filesList) {
    const status = getStatusIndicator(f.linesPct);
    lines.push(
      `| ${status} | \`${f.path}\` | ${f.linesPct.toFixed(1)}% | ${f.branchesPct.toFixed(1)}% | ${f.funcsPct.toFixed(1)}% |`
    );
  }

  lines.push('\n</details>');

  return lines.join('\n');
}

export async function findExistingCoverageComment(
  repo: string,
  prNumber: string,
  token: string
): Promise<number | null> {
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments?per_page=100`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Starmap-Coverage-Automation',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const comments = (await response.json()) as Array<{ id: number; body?: string }>;
  if (!Array.isArray(comments)) return null;

  const markers = [COMMENT_MARKER, ...LEGACY_MARKERS];
  for (const c of comments) {
    const body = c.body ?? '';
    if (markers.some((m) => body.includes(m))) {
      return c.id;
    }
  }

  return null;
}

export async function postOrUpdateComment(
  repo: string,
  prNumber: string,
  token: string,
  body: string
): Promise<void> {
  const existingId = await findExistingCoverageComment(repo, prNumber, token);
  const headers = {
    'User-Agent': 'Starmap-Coverage-Automation',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (existingId) {
    console.log(`Found existing coverage comment ID ${existingId}. Updating...`);
    const patchUrl = `https://api.github.com/repos/${repo}/issues/comments/${existingId}`;
    const resp = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ body }),
    });
    if (!resp.ok) {
      throw new Error(`Failed to update comment ${existingId}: ${resp.status} ${resp.statusText}`);
    }
    console.log(`Successfully updated coverage comment ${existingId} on PR #${prNumber}.`);
  } else {
    console.log(`Posting new coverage comment to PR #${prNumber}...`);
    const postUrl = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
    const resp = await fetch(postUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body }),
    });
    if (!resp.ok) {
      throw new Error(`Failed to post new comment: ${resp.status} ${resp.statusText}`);
    }
    console.log(`Successfully posted coverage comment to PR #${prNumber}.`);
  }
}

export async function run(): Promise<number> {
  const summaryPath = process.env.COVERAGE_SUMMARY_PATH || 'coverage/coverage-summary.json';
  const repo = process.env.GITHUB_REPOSITORY || 'marcelkornblum/starmap';
  const prNumber = process.env.PR_NUMBER || '';
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const isDryRun = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1' || !prNumber;

  if (!fs.existsSync(summaryPath)) {
    console.error(`Error: coverage summary not found at '${summaryPath}'.`);
    return 1;
  }

  const raw = fs.readFileSync(summaryPath, 'utf8');
  const data = JSON.parse(raw) as CoverageSummaryData;
  const repoRoot = process.cwd();

  const { total, moduleSummaries, filesList } = parseCoverageData(data, repoRoot);
  const markdown = generateCoverageMarkdown(total, moduleSummaries, filesList);

  if (isDryRun) {
    console.log(`Coverage report generated (${markdown.length} characters):\n`);
    console.log(markdown);
    return 0;
  }

  if (!token) {
    console.warn('Warning: GITHUB_TOKEN not provided. Skipping PR comment posting.');
    console.log(markdown);
    return 0;
  }

  try {
    await postOrUpdateComment(repo, prNumber, token, markdown);
  } catch (err) {
    console.error('Error posting PR coverage comment:', err);
    return 1;
  }

  return 0;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  run().then((code) => {
    if (code !== 0) process.exit(code);
  });
}
