import type React from 'react';
import { SearchResultItem } from '../components/domain';
import { Search } from '../components/search';

export const SearchView: React.FC = () => {
  return (
    <main data-testid="search-view-root">
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
