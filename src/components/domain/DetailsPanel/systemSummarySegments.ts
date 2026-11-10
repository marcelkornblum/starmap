import React, { Fragment, type ReactNode } from 'react';
import type { SystemSummarySegment } from '../../../services/detailsService';
import {
  buildPlanetTypeGuideHref,
  buildStarTypeGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import {
  CelestialBadge,
  SpectralBadge,
} from '../../interface';

export const renderSystemSummarySegments = (
  segments: readonly SystemSummarySegment[],
): ReactNode =>
  segments.map((seg, idx) => {
    if (seg.kind === 'spectral-badge') {
      return React.createElement(SpectralBadge, {
        key: idx,
        spectralType: seg.spectralType,
        href: buildStarTypeGuideHref(seg.spectralType),
        fallback: seg.spectralType,
        'data-testid': 'details-summary-spectral-link',
      });
    }
    if (seg.kind === 'planet-type-badge') {
      return React.createElement(CelestialBadge, {
        key: idx,
        type: seg.composition,
        href: buildPlanetTypeGuideHref(seg.composition),
        'data-testid': 'details-summary-planet-type-link',
      });
    }
    if (seg.kind === 'habitable-badge') {
      return React.createElement(CelestialBadge, {
        key: idx,
        type: 'habitable-zone',
        href: buildTagGalaxyHref('HabitableCandidate'),
        'data-testid': 'details-summary-habitable-link',
      });
    }
    return React.createElement(Fragment, { key: idx }, seg.text);
  });
