import type { ChangeEvent } from 'react';
import { Button, Input } from '../interface';
import { useSearchContext } from './SearchContext';
import styles from './Search.module.css';

export interface SearchInputProps {
  readonly id?: string;
  readonly label?: string;
}

export const SearchInput = ({
  id = 'starmap-search-input',
  label = 'Search query',
}: SearchInputProps) => {
  const { query, setQuery } = useSearchContext();

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setQuery(event.target.value);
  };

  const handleClearQuery = (): void => {
    setQuery('');
  };

  return (
    <div className={styles.inputRow}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <Input
        id={id}
        name="query"
        type="search"
        sizeVariant="sm"
        placeholder="Search stars, planets, layers..."
        value={query}
        onChange={handleQueryChange}
        className={styles.searchInput}
      />
      <Button
        type="button"
        size="sm"
        variant="subtle"
        data-testid="search-clear-button"
        onClick={handleClearQuery}
        className={styles.expandedControl}
      >
        Clear search
      </Button>
    </div>
  );
};
