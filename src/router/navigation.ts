import { useNavigate, useRouter } from '@tanstack/react-router';
import type { StarmapSearchParams } from './index';

export type ViewParameters = Partial<StarmapSearchParams>;

export interface StarmapNavigator {
  toGalaxy: (params?: ViewParameters) => Promise<void>;
  toSystem: (systemId: string, params?: ViewParameters) => Promise<void>;
  toPlanet: (planetId: string, params?: ViewParameters) => Promise<void>;
  toReference: (params?: ViewParameters) => Promise<void>;
  updateParams: (params: Partial<StarmapSearchParams>) => Promise<void>;
  currentPath: string;
}

/**
 * Strict, type-safe navigation hook that enforces architectural history boundaries:
 * Major view transitions (Galaxy -> System -> Planet -> Reference) trigger a 'push' state.
 * Intra-view adjustments (panning coordinates, filters, toggles) trigger a 'replace' state
 * to prevent browser history bloat.
 */
export function useStarmapNav(): StarmapNavigator {
  const navigate = useNavigate();
  const router = useRouter();

  const toGalaxy = async (params?: ViewParameters): Promise<void> => {
    await navigate({
      to: '/galaxy',
      search: (prev: StarmapSearchParams) => ({ ...prev, ...params }),
      replace: false, // Major view transition: PUSH
    });
  };

  const toSystem = async (systemId: string, params?: ViewParameters): Promise<void> => {
    await navigate({
      to: '/system/$systemId',
      params: { systemId },
      search: (prev: StarmapSearchParams) => ({ ...prev, ...params }),
      replace: false, // Major view transition: PUSH
    });
  };

  const toPlanet = async (planetId: string, params?: ViewParameters): Promise<void> => {
    await navigate({
      to: '/planet/$planetId',
      params: { planetId },
      search: (prev: StarmapSearchParams) => ({ ...prev, ...params }),
      replace: false, // Major view transition: PUSH
    });
  };

  const toReference = async (params?: ViewParameters): Promise<void> => {
    await navigate({
      to: '/reference',
      search: (prev: StarmapSearchParams) => ({ ...prev, ...params }),
      replace: false, // Major view transition: PUSH
    });
  };

  const updateParams = async (params: Partial<StarmapSearchParams>): Promise<void> => {
    await navigate({
      to: '.',
      search: (prev: StarmapSearchParams) => ({
        ...prev,
        ...params,
      }),
      replace: true, // Intra-view adjustment: REPLACE
    });
  };

  return {
    toGalaxy,
    toSystem,
    toPlanet,
    toReference,
    updateParams,
    currentPath: router.state.location.pathname,
  };
}
