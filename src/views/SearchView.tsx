import type React from 'react';
import { Breadcrumbs, Search, SearchResultItem } from '../components/domain';

export const SearchView: React.FC = () => {
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
