import { formatSlugFallbackTitle } from '../../utils/starNaming';
import { buildSystemDetailsHref } from './detailsNavigation';
import type { FocusedEntityDetails } from './detailsEntityTypes';
import type { PlanetaryBodiesSummary } from './detailsHierarchyTypes';
import type { BreadcrumbRouteLink } from './detailsNavigationTypes';

export const buildSystemViewBreadcrumbs = (
  details: FocusedEntityDetails | null,
  urlSystemSlug: string | null,
  _hasExplicitFocus?: boolean,
): readonly BreadcrumbRouteLink[] => {
  const sysName =
    details?.systemName ??
    (urlSystemSlug ? formatSlugFallbackTitle(urlSystemSlug) : 'System');

  return [
    { label: 'Galaxy', href: '/galaxy' },
    { label: sysName, reticleType: details?.reticleType ?? 'stellar-system' },
  ];
};

export const buildPlanetViewBreadcrumbs = (
  details: FocusedEntityDetails | null,
  planetaryElements: PlanetaryBodiesSummary | null,
  urlPlanetSlug: string | null,
  _hasExplicitFocus?: boolean,
): readonly BreadcrumbRouteLink[] => {
  const sysName =
    planetaryElements?.systemName ?? details?.systemName ?? 'System';
  const sysHref =
    planetaryElements?.systemHref ?? buildSystemDetailsHref(sysName);

  const planetName =
    planetaryElements?.planetName ??
    (details?.focusedKind === 'planet' ? details.name : undefined) ??
    (urlPlanetSlug ? formatSlugFallbackTitle(urlPlanetSlug) : 'Planet');

  return [
    { label: 'Galaxy', href: '/galaxy' },
    { label: sysName, href: sysHref, reticleType: 'stellar-system' },
    {
      label: planetName,
      reticleType: details?.reticleType ?? 'terrestrial',
    },
  ];
};
