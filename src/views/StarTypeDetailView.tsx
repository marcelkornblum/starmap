import type React from 'react';
import { STAR_TYPES_GUIDE_PATH } from '../services/searchService';

export interface StarTypeDetailViewProps {
  readonly starType?: string;
  readonly locationPathname?: string;
}

export const extractStarTypeFromPathname = (pathname: string): string => {
  const match = /^\/guide\/star-types\/([^/?#]+)/i.exec(pathname.trim());
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

export const StarTypeDetailView: React.FC<StarTypeDetailViewProps> = ({
  starType: propStarType,
  locationPathname,
}) => {
  const pathname =
    locationPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
  const resolvedStarType = propStarType ?? extractStarTypeFromPathname(pathname);

  return (
    <main
      data-testid="star-type-detail-view-root"
      data-star-type={resolvedStarType}
    >
      <h1>{resolvedStarType ? `Star Type: ${resolvedStarType}` : 'Star Type'}</h1>
      <p>
        <a href={STAR_TYPES_GUIDE_PATH} data-testid="star-types-list-link">
          All Star Types
        </a>
      </p>
    </main>
  );
};
