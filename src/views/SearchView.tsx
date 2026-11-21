import { useEffect, type FC } from 'react';
import { escalateSearchBackgroundWarmup } from '../data/searchBackgroundWarmup';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { Search } from '../components/domain/Search';
import { SearchResultItem } from '../components/domain/SearchResultItem';

export const SearchView: FC = () => {
  useEffect(() => {
    escalateSearchBackgroundWarmup();
  }, []);

  return (
    <main data-testid="search-view-root">
      <Breadcrumbs
        items={[
          { label: 'Galaxy', href: '/galaxy' },
          { label: 'Search' },
        ]}
      />
      <Search.Root>
        <Search.Panel scope="search" />
        <Search.Results
          alwaysOpen
          renderItem={(result) => (
            <SearchResultItem key={result.id} result={result} />
          )}
        />
      </Search.Root>
    </main>
  );
};
