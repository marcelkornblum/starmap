import { useEffect, type FC } from 'react';
import { escalateSearchBackgroundWarmup } from '../data/searchBackgroundWarmup';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { Search } from '../components/domain/Search';
import { SearchResultItem } from '../components/domain/SearchResultItem';
import { Center, Stack } from '../components/interface';
import styles from './SearchView.module.css';

export const SearchView: FC = () => {
  useEffect(() => {
    escalateSearchBackgroundWarmup();
  }, []);

  return (
    <main className={styles.searchView} data-testid="search-view-root">
      <Stack gap="fib-4">
        <Breadcrumbs
          items={[
            { label: 'Galaxy', href: '/galaxy' },
            { label: 'Search' },
          ]}
        />
        <Center max="lg" gutter="none">
          <section className={styles.searchPanel}>
            <Search.Root>
              <Search.Panel scope="search" />
              <Search.Results
                alwaysOpen
                renderItem={(result) => (
                  <SearchResultItem key={result.id} result={result} />
                )}
              />
            </Search.Root>
          </section>
        </Center>
      </Stack>
    </main>
  );
};
