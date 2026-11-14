import {
  SEARCH_CATEGORIES,
  isSearchCategoryFilter,
} from '../../../../services/searchService';
import { Select } from '../../../interface';
import { useSearchContext } from '../SearchContext';
import styles from './SearchCategoryFilterSelect.module.css';

export interface SearchCategoryFilterProps {
  readonly id?: string;
  readonly label?: string;
}

export const SearchCategoryFilterSelect = ({
  id = 'starmap-search-filter',
  label = 'Filter',
}: SearchCategoryFilterProps) => {
  const { filter, setFilter } = useSearchContext();

  return (
    <div className={styles.filterField}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <Select
        id={id}
        name="searchCategory"
        sizeVariant="sm"
        value={filter}
        options={[
          { value: 'all', label: 'All Categories' },
          ...SEARCH_CATEGORIES.map((category) => ({
            value: category.key,
            label: category.heading,
          })),
        ]}
        onChange={(nextValue) => {
          if (isSearchCategoryFilter(nextValue)) {
            setFilter(nextValue);
          }
        }}
      />
    </div>
  );
};
