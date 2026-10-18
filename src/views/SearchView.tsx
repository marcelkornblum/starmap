import type React from 'react';
import { Breadcrumbs, SearchResultItem } from '../components/domain';
import { Search } from '../components/search';

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
        <Search.Panel />
        <Search.Results
          renderItem={(result) => (
            <SearchResultItem key={result.id} result={result} />
          )}
        />
      </Search.Root>
    </main>
  );
};
