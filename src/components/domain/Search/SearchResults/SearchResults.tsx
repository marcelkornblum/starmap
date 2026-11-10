import type { MouseEvent, ReactNode } from 'react';
import {
  SEARCH_CATEGORIES,
  buildSearchViewHref,
  type SearchResultItem,
} from '../../../../services/searchService';
import { Heading, Stack } from '../../../interface';
import { SearchResultItem as SearchResultItemRow } from '../../SearchResultItem';
import { useSearchContext } from '../SearchContext';
import styles from './SearchResults.module.css';

export interface SearchResultsProps {
  readonly heading?: string;
  readonly searchViewPath?: string;
  readonly renderItem?: (result: SearchResultItem) => ReactNode;
}

export const SearchResults = ({
  heading = 'Search Results',
  searchViewPath,
  renderItem,
}: SearchResultsProps) => {
  const { query, filter, status, errorMessage, results, onSelectResult, dismissSearch } =
    useSearchContext();

  if (query.trim().length === 0) {
    return null;
  }

  const handleResultsClick = (event: MouseEvent<HTMLElement>): void => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (anchor) {
      dismissSearch?.();
    }
  };

  return (
    <section
      aria-labelledby="search-results-heading"
      data-testid="search-results-panel"
      data-status={status}
      className={styles.resultsPanel}
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleResultsClick}
    >
      <Heading
        as="h2"
        id="search-results-heading"
        size="eyebrow"
        visuallyHidden
      >
        {heading}
      </Heading>
      {searchViewPath ? (
        <p>
          <a
            href={buildSearchViewHref(query, filter, searchViewPath)}
            data-testid="search-view-link"
          >
            View all search results
          </a>
        </p>
      ) : null}
      {status === 'loading' ? <p>Searching...</p> : null}
      {status === 'error' && errorMessage ? (
        <p role="alert">{errorMessage}</p>
      ) : null}
      {SEARCH_CATEGORIES.map((category) => {
        const group = results.groups[category.key];
        if (group.items.length === 0) {
          return null;
        }
        return (
          <section
            key={category.key}
            aria-label={category.heading}
            data-category={category.key}
            data-testid={`search-results-group-${category.key}`}
          >
            <Heading as="h3" size="eyebrow">
              {category.heading}
            </Heading>
            {searchViewPath ? (
              <p>
                <a
                  href={buildSearchViewHref(query, category.key, searchViewPath)}
                  data-testid={`search-category-link-${category.key}`}
                >
                  {`View all ${category.heading}`}
                </a>
              </p>
            ) : null}
            <Stack as="ul" gap="tight">
              {group.items.map((item) =>
                renderItem ? (
                  renderItem(item)
                ) : (
                  <SearchResultItemRow
                    key={item.id}
                    result={item}
                    onSelect={onSelectResult}
                  />
                ),
              )}
            </Stack>
          </section>
        );
      })}
    </section>
  );
};
