import { useEffect, type FC } from 'react';
import { escalateSearchBackgroundWarmup } from '../data/searchBackgroundWarmup';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { Search } from '../components/domain/Search';
import { SearchResultItem } from '../components/domain/SearchResultItem';
import { SpatialShell } from '../components/domain/SpatialShell';
import { Center, Stack } from '../components/interface';
import styles from './SearchView.module.css';

export const SearchView: FC = () => {
  useEffect(() => {
    escalateSearchBackgroundWarmup();
  }, []);

  return (
    <SpatialShell
      mode="document"
      testId="search-view-root"
      activeWorkspace="map"
    >
      <div className={styles.searchView}>
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
      </div>
    </SpatialShell>
  );
};
