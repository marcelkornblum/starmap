import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchResults } from './SearchResults';
import { SearchContext } from '../SearchContext';
import { executeCatalogSearch } from '../../../../services/searchService';

const meta: Meta<typeof SearchResults> = {
  title: 'DOMAIN/Search/SearchResults',
  component: SearchResults,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SearchResults>;

export const Default: Story = {
  render: () => (
    <SearchContext.Provider
      value={{
        query: 'tau',
        filter: 'all',
        status: 'ready',
        errorMessage: null,
        results: executeCatalogSearch(
          [
            {
              i: 'tau-ceti',
              n: 'Tau Ceti',
              m: [3.5, 'G8V', 4, 1],
              a: 'tau ceti',
            },
          ],
          { query: 'tau', filter: 'all' },
        ),
        setQuery: () => undefined,
        setFilter: () => undefined,
        submitSearch: async () => undefined,
        isFocused: true,
      }}
    >
      <SearchResults />
    </SearchContext.Provider>
  ),
};
