/**
 * Demand-mode adaptive DPR and entity cutoff controller.
 *
 * Tracks active-frame EWMA render duration while ignoring idle gaps (> 250ms)
 * so frameloop="demand" pauses never skew performance heuristics.
 */

export type AdaptiveQualityAction =
  | { readonly action: 'none' }
  | { readonly action: 'dpr'; readonly nextDpr: number }
  | { readonly action: 'cutoff'; readonly nextCutoffMultiplier: number };

export interface AdaptiveQualityControllerOptions {
  readonly initialDpr?: number;
  readonly maxDpr?: number;
  readonly initialCutoffMultiplier?: number;
}

const EWMA_ALPHA = 0.2;
const IDLE_GAP_THRESHOLD_MS = 250;
const DOWNGRADE_MIN_SAMPLES = 12;
const DPR_DOWNGRADE_THRESHOLD_MS = 36;
const CUTOFF_DOWNGRADE_THRESHOLD_MS = 45;
const RECOVERY_MIN_SAMPLES = 45;
const RECOVERY_THRESHOLD_MS = 20;
const QUALITY_STEP = 0.25;
const MIN_DPR = 1;
const MIN_CUTOFF_MULTIPLIER = 0.5;
const MAX_CUTOFF_MULTIPLIER = 1.0;

const NO_ACTION: AdaptiveQualityAction = Object.freeze({ action: 'none' });

function sanitizeDpr(value: number | undefined, fallback = MIN_DPR): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= MIN_DPR) {
    return value;
  }
  return fallback;
}

function sanitizeCutoffMultiplier(value: number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(MAX_CUTOFF_MULTIPLIER, Math.max(MIN_CUTOFF_MULTIPLIER, value));
  }
  return MAX_CUTOFF_MULTIPLIER;
}

export class AdaptiveQualityController {
  private currentDpr: number;
  private maxDpr: number;
  private cutoffMultiplier: number;
  private ewmaMs: number | null = null;
  private activeSamples = 0;

  constructor(options: AdaptiveQualityControllerOptions = {}) {
    const initialDpr = sanitizeDpr(options.initialDpr, MIN_DPR);
    const maxDpr = Math.max(initialDpr, sanitizeDpr(options.maxDpr, initialDpr));
    this.currentDpr = initialDpr;
    this.maxDpr = maxDpr;
    this.cutoffMultiplier = sanitizeCutoffMultiplier(options.initialCutoffMultiplier);
  }

  getCurrentDpr(): number {
    return this.currentDpr;
  }

  getMaxDpr(): number {
    return this.maxDpr;
  }

  getCutoffMultiplier(): number {
    return this.cutoffMultiplier;
  }

  getActiveSamples(): number {
    return this.activeSamples;
  }

  getEwmaMs(): number | null {
    return this.ewmaMs;
  }

  syncMaxDpr(nextMaxDpr: number): boolean {
    const sanitized = sanitizeDpr(nextMaxDpr, MIN_DPR);
    this.maxDpr = sanitized;
    if (this.currentDpr > sanitized) {
      this.currentDpr = sanitized;
      this.resetWindow();
      return true;
    }
    return false;
  }

  recordFrame(dtMs: number): AdaptiveQualityAction {
    if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > IDLE_GAP_THRESHOLD_MS) {
      return NO_ACTION;
    }

    if (this.ewmaMs === null) {
      this.ewmaMs = dtMs;
      this.activeSamples = 1;
    } else {
      this.ewmaMs = EWMA_ALPHA * dtMs + (1 - EWMA_ALPHA) * this.ewmaMs;
      this.activeSamples += 1;
    }

    if (this.activeSamples >= DOWNGRADE_MIN_SAMPLES && this.ewmaMs > DPR_DOWNGRADE_THRESHOLD_MS) {
      if (this.currentDpr > MIN_DPR) {
        const nextDpr = Math.max(MIN_DPR, Number((this.currentDpr - QUALITY_STEP).toFixed(4)));
        this.currentDpr = nextDpr;
        this.resetWindow();
        return { action: 'dpr', nextDpr };
      }

      if (
        this.ewmaMs > CUTOFF_DOWNGRADE_THRESHOLD_MS &&
        this.cutoffMultiplier > MIN_CUTOFF_MULTIPLIER
      ) {
        const nextCutoffMultiplier = Math.max(
          MIN_CUTOFF_MULTIPLIER,
          Number((this.cutoffMultiplier - QUALITY_STEP).toFixed(4)),
        );
        this.cutoffMultiplier = nextCutoffMultiplier;
        this.resetWindow();
        return { action: 'cutoff', nextCutoffMultiplier };
      }
    }

    if (this.activeSamples >= RECOVERY_MIN_SAMPLES && this.ewmaMs < RECOVERY_THRESHOLD_MS) {
      if (this.cutoffMultiplier < MAX_CUTOFF_MULTIPLIER) {
        const nextCutoffMultiplier = Math.min(
          MAX_CUTOFF_MULTIPLIER,
          Number((this.cutoffMultiplier + QUALITY_STEP).toFixed(4)),
        );
        this.cutoffMultiplier = nextCutoffMultiplier;
        this.resetWindow();
        return { action: 'cutoff', nextCutoffMultiplier };
      }

      if (this.currentDpr < this.maxDpr) {
        const nextDpr = Math.min(this.maxDpr, Number((this.currentDpr + QUALITY_STEP).toFixed(4)));
        this.currentDpr = nextDpr;
        this.resetWindow();
        return { action: 'dpr', nextDpr };
      }
    }

    return NO_ACTION;
  }

  private resetWindow(): void {
    this.ewmaMs = null;
    this.activeSamples = 0;
  }
}
