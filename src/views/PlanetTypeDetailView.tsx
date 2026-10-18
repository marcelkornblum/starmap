import type React from 'react';
import { Breadcrumbs } from '../components/domain';
import { PLANET_TYPES_GUIDE_PATH } from '../services/searchService';

export interface PlanetTypeDetailViewProps {
  readonly planetType?: string;
  readonly locationPathname?: string;
}

export const extractPlanetTypeFromPathname = (pathname: string): string => {
  const match = /^\/guide\/planet-types\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const PlanetTypeDetailView: React.FC<PlanetTypeDetailViewProps> = ({
  planetType: propPlanetType,
  locationPathname,
}) => {
  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
  const resolvedPlanetType =
    propPlanetType ?? extractPlanetTypeFromPathname(pathname);

  return (
    <main
      data-testid="planet-type-detail-view-root"
      data-planet-type={resolvedPlanetType}
    >
      <Breadcrumbs
        items={[
          { label: 'Galaxy', href: '/galaxy' },
          { label: 'Guide' },
          { label: 'Planet Types', href: PLANET_TYPES_GUIDE_PATH },
          { label: resolvedPlanetType || 'Planet Type' },
        ]}
      />
      <h1>
        {resolvedPlanetType
          ? `Planet Type: ${resolvedPlanetType}`
          : 'Planet Type'}
      </h1>
      <p>
        <a
          href={PLANET_TYPES_GUIDE_PATH}
          data-testid="planet-types-list-link"
        >
          All Planet Types
        </a>
      </p>
    </main>
  );
};
