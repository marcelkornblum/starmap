type GuideViewsPreloader = () => Promise<unknown> | void;

let registeredPreloader: GuideViewsPreloader | null = null;
let inflightPreload: Promise<void> | null = null;

/**
 * Registers the guide list views preloader from the router module so
 * UI/layout modules never statically import route view chunks.
 */
export function registerGuideViewsPreloader(preloader: GuideViewsPreloader): void {
  registeredPreloader = preloader;
  inflightPreload = null;
}

/**
 * Warms all 5 Guide section list view chunks in the background.
 * Deduplicates concurrent/repeated calls and resets on failure to allow retries.
 */
export function preloadGuideListViews(): Promise<void> {
  if (!registeredPreloader) {
    return Promise.resolve();
  }
  if (!inflightPreload) {
    inflightPreload = Promise.resolve()
      .then(() => registeredPreloader?.())
      .then(() => undefined)
      .catch(() => {
        inflightPreload = null;
      });
  }
  return inflightPreload;
}

/**
 * Resets preloader state for unit tests.
 */
export function resetGuideViewsPreloaderForTests(): void {
  registeredPreloader = null;
  inflightPreload = null;
}
