/**
 * DEC-027 / Phase 3.3A-1: Guide Navigation & Route Helpers
 * URL parsing, query parameter extraction, and section navigation models for /guide/*.
 */

import {
  STAR_TYPES_GUIDE_PATH,
  PLANET_TYPES_GUIDE_PATH,
  METRICS_GUIDE_PATH,
  HAZARDS_GUIDE_PATH,
} from '../../content/guide';

export type GuideSectionId = 'star-types' | 'planet-types' | 'metrics' | 'hazards';

export interface GuideSectionNavItem {
  readonly id: GuideSectionId;
  readonly label: string;
  readonly href: string;
}

export const GUIDE_SECTION_NAV_ITEMS: readonly GuideSectionNavItem[] = [
  { id: 'star-types', label: 'Star Types', href: STAR_TYPES_GUIDE_PATH },
  { id: 'planet-types', label: 'Planet Types', href: PLANET_TYPES_GUIDE_PATH },
  { id: 'metrics', label: 'Telemetry Metrics', href: METRICS_GUIDE_PATH },
  { id: 'hazards', label: 'Environmental Hazards', href: HAZARDS_GUIDE_PATH },
];

/**
 * Extracts a focus celestial entity ID from a URL search query string.
 * Accommodates empty strings, leading/trailing whitespace, and URI decoding.
 */
export const extractFocusIdFromSearch = (search: string): string => {
  const match = /[?&]focus=([^&#]+)/i.exec(search.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};
