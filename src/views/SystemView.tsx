import type React from 'react';
import { SearchResultItem } from '../components/domain';
import { Search } from '../components/search';

export const SystemView: React.FC = () => {
  return (
    <main data-testid="system-view-root">
      <Search.Root limitPerCategory={3}>
        <Search.Panel />
        <Search.Results
          searchViewPath="/search"
          renderItem={(result) => (
            <SearchResultItem key={result.id} result={result} />
          )}
        />
      </Search.Root>
    </main>
  );
};
