import type { MouseEvent, ReactNode } from 'react';
import { SEARCH_CATEGORIES } from '../../../../types/search';
import { buildSearchViewHref } from '../../../../services/search/searchUrls';
import type { SearchResultItem } from '../../../../services/search/searchTypes';
import { Button, Heading, Stack } from '../../../interface';
import { SearchResultItem as SearchResultItemRow } from '../../SearchResultItem';
import { useSearchContext } from '../SearchContext';
import styles from './SearchResults.module.css';

export interface SearchResultsProps {
  readonly heading?: string;
  readonly searchViewPath?: string;
  readonly renderItem?: (result: SearchResultItem) => ReactNode;
  readonly alwaysOpen?: boolean;
}

export const SearchResults = ({
  heading = 'Search Results',
  searchViewPath,
  renderItem,
  alwaysOpen,
}: SearchResultsProps) => {
  const {
    query,
    status,
    errorMessage,
    results,
    isFocused,
    setIsFocused,
    onSelectResult,
  } = useSearchContext();

  if (query.trim().length === 0) {
    return null;
  }

  const isOpen = Boolean(alwaysOpen || isFocused);

  const handleResultsClick = (event: MouseEvent<HTMLElement>): void => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target as Element | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (anchor) {
      setIsFocused?.(false);
    }
  };

  return (
    <section
      aria-labelledby="search-results-heading"
      data-testid="search-results-panel"
      data-status={status}
      data-open={isOpen ? 'true' : 'false'}
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
            {Boolean(searchViewPath) && group.totalMatches > group.items.length ? (
              <div className={styles.categoryFooter}>
                <Button
                  href={buildSearchViewHref(query, category.key, searchViewPath)}
                  variant="default"
                  size="sm"
                  data-testid={`search-category-link-${category.key}`}
                >
                  {`View all (${group.totalMatches})`}
                </Button>
              </div>
            ) : null}
          </section>
        );
      })}
    </section>
  );
};
