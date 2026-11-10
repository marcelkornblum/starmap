import type { ChangeEvent } from 'react';
import { Button, Input } from '../../../interface';
import { useSearchContext } from '../SearchContext';
import styles from './SearchInput.module.css';

export interface SearchInputProps {
  readonly id?: string;
  readonly label?: string;
}

export const SearchInput = ({
  id = 'starmap-search-input',
  label = 'Search query',
}: SearchInputProps) => {
  const { query, setQuery, isFocused, setIsFocused } = useSearchContext();

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setIsFocused?.(true);
    setQuery(event.target.value);
  };

  const handleFocus = (): void => {
    setIsFocused?.(true);
  };

  const handleClearQuery = (): void => {
    setQuery('');
  };

  return (
    <div
      className={styles.inputRow}
      data-search-focused={isFocused ? 'true' : 'false'}
    >
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <Input
          id={id}
          name="query"
          type="search"
          sizeVariant="sm"
          placeholder="Search stars, planets, layers..."
          value={query}
          onFocus={handleFocus}
          onChange={handleQueryChange}
        />
      </div>
      <div className={styles.expandedControl}>
        <Button
          type="button"
          size="sm"
          variant="subtle"
          data-testid="search-clear-button"
          onClick={handleClearQuery}
        >
          Clear search
        </Button>
      </div>
    </div>
  );
};
