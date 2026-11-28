import { useEffect, useState } from 'react';
import { useUIStore } from '../stores/useUIStore';

/**
 * Delays secondary HUD panels during cross-scale camera transitions until
 * `useUIStore.isCameraTransitioning` settles to `false`.
 */
export function usePanelsReadyAfterTransition(): boolean {
  const [panelsReady, setPanelsReady] = useState(
    () => !useUIStore.getState().isCameraTransitioning,
  );

  useEffect(() => {
    if (panelsReady) return;
    let cancelled = false;
    if (!useUIStore.getState().isCameraTransitioning) {
      queueMicrotask(() => {
        if (!cancelled) {
          setPanelsReady(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    const unsubscribe = useUIStore.subscribe((state) => {
      if (!state.isCameraTransitioning && !cancelled) {
        unsubscribe();
        setPanelsReady(true);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [panelsReady]);

  return panelsReady;
}
