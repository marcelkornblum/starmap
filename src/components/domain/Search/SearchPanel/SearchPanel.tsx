import type { FormEvent, ReactNode } from 'react';
import { Heading } from '../../../interface';
import { useOptionalRouter } from '../../../../hooks/useSpaLocation';
import { buildSearchViewHref } from '../../../../services/search/searchUrls';
import { resolveAppHref } from '../../../../utils/url';
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
  const { query, filter, submitSearch, isFocused, setIsFocused } = useSearchContext();
  const router = useOptionalRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submitSearch?.(query, filter);
    if (scope !== 'search' && query.trim().length > 0) {
      const href = buildSearchViewHref(query, filter, '/search');
      setIsFocused?.(false);
      const resolved = resolveAppHref(href) ?? href;
      if (router && typeof router.navigate === 'function') {
        void router.navigate({ href: resolved });
      } else if (router?.history?.push) {
        router.history.push(resolved);
      }
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
            </div>
          </>
        )}
      </form>
    </section>
  );
};
