import type { FormEvent, ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useLayerIndex } from '../../../../hooks/useLayerData';
import {
  parseLayerQueryParam,
  pickRandomLayerOverviewHref,
} from '../../../../services/layerCardService';
import { Button, Heading } from '../../../interface';
import { useSearchContext } from '../SearchContext';
import { SearchInput } from '../SearchInput';
import { SearchCategoryFilterSelect } from '../SearchCategoryFilterSelect';
import styles from './SearchPanel.module.css';

export interface SearchPanelProps {
  readonly heading?: string;
  readonly children?: ReactNode;
  readonly scope?: 'galaxy' | 'system' | 'planet' | 'search';
}

export const SearchPanel = ({
  heading = 'Search',
  children,
  scope,
}: SearchPanelProps) => {
  const { isFocused, setIsFocused } = useSearchContext();
  const layerIndex = useLayerIndex();
  const router = useRouter({ warn: false });

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  const handleExplore = (): void => {
    if (typeof window === 'undefined') {
      return;
    }
    if (setIsFocused) {
      setIsFocused(false);
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const currentLayer = new URLSearchParams(window.location.search).get('layer');
    const nextHref = pickRandomLayerOverviewHref(
      currentLayer,
      Math.random,
      layerIndex,
    );
    const parsedNext = parseLayerQueryParam(
      new URLSearchParams(nextHref.split('?')[1] ?? '').get('layer'),
    );
    if (router?.state && parsedNext?.layerSlug) {
      void router.navigate({
        to: '/galaxy',
        search: (prev) => ({
          ...prev,
          select: `layer:${parsedNext.layerSlug}`,
          layer: parsedNext.layerSlug,
        }),
      });
    }
  };

  const isExpanded = scope === 'search' || Boolean(isFocused);

  return (
    <section
      aria-labelledby="search-panel-heading"
      data-testid="search-panel"
      data-scope={scope}
      data-search-focused={isExpanded ? 'true' : 'false'}
      className={styles.searchPanel}
    >
      <Heading
        as="h2"
        id="search-panel-heading"
        visuallyHidden
      >
        {heading}
      </Heading>
      <form
        role="search"
        className={styles.searchForm}
        onSubmit={handleSubmit}
      >
        {children ?? (
          <>
            <SearchInput />
            <div
              className={styles.expandedDrawer}
              data-testid="search-expanded-drawer"
            >
              <SearchCategoryFilterSelect />
              <Button
                type="button"
                size="sm"
                variant="default"
                data-testid="search-explore-button"
                onClick={handleExplore}
              >
                Explore
              </Button>
            </div>
          </>
        )}
      </form>
    </section>
  );
};
