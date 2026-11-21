import { useEffect, useSyncExternalStore } from 'react';
import type {
  GuideSectionKey,
  ReferenceBaselinesDataset,
  ResolvedGuideExampleItem,
} from '../types/guideData';
import {
  fetchGuideExamples,
  getCachedGuideExamplesForEntry,
  getGuideExamplesVersion,
  subscribeGuideExamples,
} from '../data/guideExamplesRepository';
import {
  fetchReferenceBaselines,
  getCachedReferenceBaselines,
  getReferenceBaselinesVersion,
  subscribeReferenceBaselines,
} from '../data/referenceBaselinesRepository';

export function useHydratedGuideExamples(): void {
  useSyncExternalStore(
    subscribeGuideExamples,
    getGuideExamplesVersion,
    getGuideExamplesVersion,
  );

  useEffect(() => {
    void fetchGuideExamples().catch(() => undefined);
  }, []);
}

export function useGuideExamples(
  section: GuideSectionKey,
  entryId: string,
): readonly ResolvedGuideExampleItem[] {
  useHydratedGuideExamples();
  return getCachedGuideExamplesForEntry(section, entryId);
}

export function useReferenceBaselines(): ReferenceBaselinesDataset | undefined {
  useSyncExternalStore(
    subscribeReferenceBaselines,
    getReferenceBaselinesVersion,
    getReferenceBaselinesVersion,
  );

  useEffect(() => {
    void fetchReferenceBaselines().catch(() => undefined);
  }, []);

  return getCachedReferenceBaselines();
}
