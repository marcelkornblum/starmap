import { useState, useRef, useEffect, useId, useMemo, type KeyboardEvent } from 'react';
import { Modal } from '../../overlays';
import { Input, Badge, Cluster } from '../../primitives';
import styles from './CommandPalette.module.css';

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'system' | 'star' | 'planet' | 'coordinate' | 'command';
  badge?: string;
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items?: CommandPaletteItem[];
  onSelectItem?: (item: CommandPaletteItem) => void;
  placeholder?: string;
}

interface CommandPaletteContentProps {
  items: CommandPaletteItem[];
  onSelectItem?: (item: CommandPaletteItem) => void;
  onClose: () => void;
  placeholder: string;
}

const CommandPaletteContent = ({
  items,
  onSelectItem,
  onClose,
  placeholder,
}: CommandPaletteContentProps) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter((item) =>
      item.title.toLowerCase().includes(lower) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(lower)) ||
      item.category.toLowerCase().includes(lower)
    );
  }, [items, query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[activeIndex];
      if (selected) {
        selected.onSelect?.();
        onSelectItem?.(selected);
        onClose();
      }
    }
  };

  const handleSelect = (item: CommandPaletteItem) => {
    item.onSelect?.();
    onSelectItem?.(item);
    onClose();
  };

  const activeItemId = filteredItems[activeIndex]
    ? `${listboxId}-option-${activeIndex}`
    : undefined;

  return (
    <div className={styles.paletteContainer}>
      <div className={styles.searchRow}>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={true}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeItemId}
          aria-label="Search celestial catalog"
        />
      </div>

      <ul
        id={listboxId}
        className={styles.resultsList}
        role="listbox"
        aria-label="Search suggestions"
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const isActive = index === activeIndex;
            const itemId = `${listboxId}-option-${index}`;
            return (
              <li
                id={itemId}
                key={item.id}
                className={styles.resultItem}
                role="option"
                aria-selected={isActive}
                data-active={isActive ? 'true' : undefined}
                onClick={() => handleSelect(item)}
              >
                <div className={styles.resultItemContent}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  {item.subtitle && (
                    <span className={styles.itemSubtitle}>{item.subtitle}</span>
                  )}
                </div>
                <Cluster gap="tight">
                  {item.badge && <Badge status="info">{item.badge}</Badge>}
                  <Badge>{item.category}</Badge>
                </Cluster>
              </li>
            );
          })
        ) : (
          <li className={styles.emptyNotice}>
            No celestial entities or coordinates match your query.
          </li>
        )}
      </ul>

      <div className={styles.shortcutHint}>
        <span>Navigate with <kbd className={styles.kbd}>↑</kbd> <kbd className={styles.kbd}>↓</kbd></span>
        <span>Select with <kbd className={styles.kbd}>↵</kbd></span>
        <span>Close with <kbd className={styles.kbd}>Esc</kbd></span>
      </div>
    </div>
  );
};

export const CommandPalette = ({
  isOpen,
  onClose,
  items = [],
  onSelectItem,
  placeholder = 'Search celestial entities or coordinates...',
}: CommandPaletteProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atlas Command Palette"
    >
      <CommandPaletteContent
        items={items}
        onSelectItem={onSelectItem}
        onClose={onClose}
        placeholder={placeholder}
      />
    </Modal>
  );
};
