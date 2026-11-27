import type { ChangeEvent } from 'react';
import { escalateSearchBackgroundWarmup } from '../../../../data/searchBackgroundWarmup';
import { Button, Icon, Input } from '../../../interface';
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
  const { query, setQuery, isFocused, setIsFocused, searchInputRef } = useSearchContext();

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setIsFocused?.(true);
    if (event.target.value.trim().length > 0) {
      escalateSearchBackgroundWarmup();
    }
    setQuery(event.target.value);
  };

  const handleFocus = (): void => {
    setIsFocused?.(true);
    escalateSearchBackgroundWarmup();
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
          ref={searchInputRef}
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
      <span
        className={styles.clearControl}
        data-has-query={query.length > 0 ? 'true' : 'false'}
      >
        <Button
          type="button"
          size="sm"
          variant="default"
          aria-label="Clear search"
          data-testid="search-clear-button"
          onClick={handleClearQuery}
        >
          <Icon size="sm">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 3L9 9M9 3L3 9" />
            </svg>
          </Icon>
        </Button>
      </span>
      <span className={styles.submitControl}>
        <Button
          type="submit"
          size="sm"
          variant={query.trim().length > 0 ? 'primary' : 'subtle'}
          aria-label="Search"
          data-testid="search-submit-button"
        >
          <Icon size="sm">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="5.25" cy="5.25" r="3.5" />
              <path d="M8 8L10.5 10.5" />
            </svg>
          </Icon>
        </Button>
      </span>
    </div>
  );
};
