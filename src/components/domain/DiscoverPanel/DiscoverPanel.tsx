import React, { useMemo, useState, type ReactNode } from 'react';
import type { DatasetLayerIndexEntry } from '../../../types/datasetLayers';
import { useLayerIndex } from '../../../hooks/useLayerData';
import { useSpaLinkClick } from '../../../hooks/spaNavigation';
import { resolveAppHref } from '../../../utils/url';
import { Block, Button, Cluster, Heading, Input, Quantity, Stack } from '../../interface';
import {
  buildDiscoverLayerHref,
  filterAndGroupDiscoverLayers,
  isDiscoverLayerActive,
} from './discoverPanelHelpers';
import styles from './DiscoverPanel.module.css';

export interface DiscoverPanelProps {
  readonly layers?: readonly DatasetLayerIndexEntry[];
  readonly activeLayerSlug?: string | null;
  readonly onClose?: () => void;
  readonly onSelectLayer?: (layerSlug: string, href: string) => void;
}

interface DiscoverGroupProps {
  readonly title: string;
  readonly testId: string;
  readonly entries: readonly DatasetLayerIndexEntry[];
  readonly activeLayerSlug?: string | null;
  readonly onSelectLayer?: (layerSlug: string, href: string) => void;
  readonly handleSpaLinkClick: (
    event: React.MouseEvent<HTMLElement>,
    href?: string | null,
  ) => boolean;
}

const DiscoverGroup = React.memo(function DiscoverGroup({
  title,
  testId,
  entries,
  activeLayerSlug,
  onSelectLayer,
  handleSpaLinkClick,
}: DiscoverGroupProps): ReactNode {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.group} data-testid={testId}>
      <Heading as="h3" size="eyebrow">
        {title}
      </Heading>
      <Stack as="ul" gap="dense">
        {entries.map((entry) => {
          const { slug, href } = buildDiscoverLayerHref(entry.layerId);
          const isSelected = isDiscoverLayerActive(activeLayerSlug, entry.layerId, slug);

          return (
            <Block
              key={entry.layerId}
              as="li"
              interactive
              selected={isSelected}
              padding="tight"
              data-testid="discover-layer-item"
              data-layer-slug={slug}
            >
              <a
                href={resolveAppHref(href)}
                className={styles.itemLink}
                data-testid="discover-layer-link"
                onClick={(e) => {
                  onSelectLayer?.(slug, href);
                  handleSpaLinkClick(e, href);
                }}
              >
                <Stack gap="fib-1">
                  <Cluster justify="between" align="baseline" gap="tight">
                    <span className={styles.itemTitle}>{entry.title}</span>
                    <Quantity
                      value={entry.entryCount}
                      unit={entry.entryCount === 1 ? 'stop' : 'stops'}
                    />
                  </Cluster>
                  {entry.source?.creator ? (
                    <span className={styles.itemCreator}>{entry.source.creator}</span>
                  ) : null}
                  <p className={styles.itemDescription}>{entry.description}</p>
                </Stack>
              </a>
            </Block>
          );
        })}
      </Stack>
    </div>
  );
});

export const DiscoverPanel = React.memo(function DiscoverPanel({
  layers,
  activeLayerSlug,
  onClose,
  onSelectLayer,
}: DiscoverPanelProps): ReactNode {
  const storeLayers = useLayerIndex();
  const resolvedLayers = layers ?? storeLayers;
  const [query, setQuery] = useState('');
  const handleSpaLinkClick = useSpaLinkClick();

  const grouped = useMemo(
    () => filterAndGroupDiscoverLayers(resolvedLayers, query),
    [resolvedLayers, query],
  );

  const hasAnyResults =
    grouped.scientific.length > 0 ||
    grouped.canon.length > 0 ||
    grouped.custom.length > 0;

  return (
    <section
      className={styles.discoverPanel}
      aria-label="Discover curated highlights and universes"
      data-testid="discover-panel"
    >
      <header className={styles.header}>
        <Heading as="h2">Discover</Heading>
        {onClose ? (
          <Button
            variant="subtle"
            size="sm"
            onClick={onClose}
            aria-label="Close Discover"
            data-testid="discover-close-button"
          >
            ✕
          </Button>
        ) : null}
      </header>

      <div className={styles.filterRow}>
        <Input
          type="search"
          sizeVariant="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter highlights & universes…"
          aria-label="Filter highlights and universes"
          data-testid="discover-filter-input"
        />
      </div>

      <div className={styles.body}>
        {hasAnyResults ? (
          <Stack gap="default">
            <DiscoverGroup
              title="Scientific Highlights"
              testId="discover-scientific-group"
              entries={grouped.scientific}
              activeLayerSlug={activeLayerSlug}
              onSelectLayer={onSelectLayer}
              handleSpaLinkClick={handleSpaLinkClick}
            />
            <DiscoverGroup
              title="Fictional Universes"
              testId="discover-canon-group"
              entries={grouped.canon}
              activeLayerSlug={activeLayerSlug}
              onSelectLayer={onSelectLayer}
              handleSpaLinkClick={handleSpaLinkClick}
            />
            <DiscoverGroup
              title="Saved Collections"
              testId="discover-custom-group"
              entries={grouped.custom}
              activeLayerSlug={activeLayerSlug}
              onSelectLayer={onSelectLayer}
              handleSpaLinkClick={handleSpaLinkClick}
            />
          </Stack>
        ) : (
          <p className={styles.emptyState} data-testid="discover-empty">
            {query.trim()
              ? `No highlights or universes match "${query.trim()}".`
              : 'No highlights or universes available.'}
          </p>
        )}
      </div>
    </section>
  );
});

DiscoverPanel.displayName = 'DiscoverPanel';
