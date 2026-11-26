import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import type {
  OrbitalSchematicBand,
  OrbitalSchematicSummary,
  OrbitalSchematicTrackRow,
} from '../../../services/details/detailsHierarchyTypes';
import { buildOrbitalSchematicBands } from '../../../services/details/orbitalSchematicBuilder';
import { LEGEND_GUIDE_PATH } from '../../../content/guide';
import { resolveAppHref } from '../../../utils/url';
import { useOptionalSpatialEntityStoreApi } from '../../canvas/entity/SpatialEntityContext';
import {
  Button,
  CELESTIAL_SYMBOL_META,
  CelestialSymbol,
  Cluster,
  CollapsibleSection,
} from '../../interface';
import styles from './OrbitalSchematicPanel.module.css';
import symbologyStyles from './schematicSymbology.module.css';

export interface OrbitalSchematicPanelProps {
  readonly elements: OrbitalSchematicSummary | null;
  readonly onHoverEntity?: (entityId: string | null) => void;
}

interface BandSegment {
  readonly key: string;
  readonly inHabitableZone: boolean;
  readonly bands: OrbitalSchematicBand[];
}

function bandKey(band: OrbitalSchematicBand): string {
  return band.type === 'row' ? `row:${band.row.id}` : `zone:${band.zone.id}`;
}

function groupBandsByHabitableZone(
  bands: readonly OrbitalSchematicBand[],
): readonly BandSegment[] {
  const segments: BandSegment[] = [];
  for (const band of bands) {
    const prev = segments[segments.length - 1];
    if (prev && prev.inHabitableZone === band.inHabitableZone) {
      prev.bands.push(band);
    } else {
      segments.push({
        key: `${band.inHabitableZone ? 'hz' : 'plain'}:${bandKey(band)}`,
        inHabitableZone: band.inHabitableZone,
        bands: [band],
      });
    }
  }
  return segments;
}

interface TrackRowProps {
  readonly row: OrbitalSchematicTrackRow;
  readonly onHoverEntity: (entityId: string) => void;
  readonly onClearHoverEntity: (entityId: string) => void;
}

const OrbitalSchematicRow = memo(function OrbitalSchematicRow({
  row,
  onHoverEntity,
  onClearHoverEntity,
}: TrackRowProps): React.ReactElement {
  const typeLabel = CELESTIAL_SYMBOL_META[row.reticleType]?.label ?? row.reticleType;
  return (
    <a
      href={resolveAppHref(row.href)}
      className={styles.trackRow}
      aria-label={`${row.name}, ${typeLabel}`}
      data-testid="orbital-schematic-row"
      data-entity-id={row.id}
      data-kind={row.kind}
      data-tier={row.tier}
      data-line-style={row.lineStyle}
      data-in-habitable-zone={row.inHabitableZone ? 'true' : undefined}
      data-focused={row.isFocused ? 'true' : undefined}
      data-selected={row.isSelected ? 'true' : undefined}
      onMouseEnter={() => onHoverEntity(row.id)}
      onMouseLeave={() => onClearHoverEntity(row.id)}
      onFocus={() => onHoverEntity(row.id)}
      onBlur={() => onClearHoverEntity(row.id)}
    >
      <span
        className={styles.symbolSlot}
        data-symbol-slot="true"
        aria-hidden="true"
      >
        <CelestialSymbol type={row.reticleType} size="lg" showTooltip={false} />
      </span>
      <span className={styles.trackLineSlot} aria-hidden="true">
        <span
          className={symbologyStyles.trackLine}
          data-line-style={row.lineStyle}
          aria-hidden="true"
        />
      </span>
      <span className={styles.trackName} data-testid="orbital-schematic-row-name">
        {row.name}
      </span>
    </a>
  );
});

interface ZoneBandProps {
  readonly band: Extract<OrbitalSchematicBand, { readonly type: 'zone' }>;
  readonly onHoverEntity: (entityId: string) => void;
  readonly onClearHoverEntity: (entityId: string) => void;
}

const OrbitalSchematicZoneBand = memo(function OrbitalSchematicZoneBand({
  band,
  onHoverEntity,
  onClearHoverEntity,
}: ZoneBandProps): React.ReactElement {
  const { zone, rows, titleInsertIndex } = band;
  const beforeRows = rows.slice(0, titleInsertIndex);
  const afterRows = rows.slice(titleInsertIndex);
  const titleId = `orbital-schematic-zone-title-${zone.id}`;

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={symbologyStyles.zoneBand}
      data-testid="orbital-schematic-zone"
      data-zone-id={zone.id}
      data-region-kind={zone.kind}
      data-focused={zone.isFocused ? 'true' : undefined}
      data-selected={zone.isSelected ? 'true' : undefined}
    >
      {beforeRows.map((row) => (
        <OrbitalSchematicRow
          key={row.id}
          row={row}
          onHoverEntity={onHoverEntity}
          onClearHoverEntity={onClearHoverEntity}
        />
      ))}
      {zone.href ? (
        <a
          id={titleId}
          href={resolveAppHref(zone.href)}
          className={styles.zoneTitleLink}
          data-testid="orbital-schematic-zone-title"
          onMouseEnter={() => onHoverEntity(zone.id)}
          onMouseLeave={() => onClearHoverEntity(zone.id)}
          onFocus={() => onHoverEntity(zone.id)}
          onBlur={() => onClearHoverEntity(zone.id)}
        >
          {zone.name}
        </a>
      ) : (
        <span
          id={titleId}
          className={styles.zoneTitleLabel}
          data-testid="orbital-schematic-zone-title"
        >
          {zone.name}
        </span>
      )}
      {afterRows.map((row) => (
        <OrbitalSchematicRow
          key={row.id}
          row={row}
          onHoverEntity={onHoverEntity}
          onClearHoverEntity={onClearHoverEntity}
        />
      ))}
    </div>
  );
});

interface OrbitalSchematicBodyProps {
  readonly elements: OrbitalSchematicSummary;
  readonly onHoverEntity: (entityId: string) => void;
  readonly onClearHoverEntity: (entityId: string) => void;
}

const OrbitalSchematicBody = memo(function OrbitalSchematicBody({
  elements,
  onHoverEntity,
  onClearHoverEntity,
}: OrbitalSchematicBodyProps): React.ReactElement {
  const [showMinorBodies, setShowMinorBodies] = useState(false);

  const bands = useMemo(
    () => buildOrbitalSchematicBands(elements, showMinorBodies),
    [elements, showMinorBodies],
  );
  const segments = useMemo(() => groupBandsByHabitableZone(bands), [bands]);

  const renderBand = (band: OrbitalSchematicBand): React.ReactElement =>
    band.type === 'row' ? (
      <OrbitalSchematicRow
        key={band.row.id}
        row={band.row}
        onHoverEntity={onHoverEntity}
        onClearHoverEntity={onClearHoverEntity}
      />
    ) : (
      <OrbitalSchematicZoneBand
        key={band.zone.id}
        band={band}
        onHoverEntity={onHoverEntity}
        onClearHoverEntity={onClearHoverEntity}
      />
    );

  return (
    <CollapsibleSection
      title="Orbiting Bodies"
      headingId="orbital-schematic-heading"
      headingAs="h4"
      data-testid="orbital-schematic-panel"
      data-parent-id={elements.parentId}
      data-parent-kind={elements.parentKind}
      data-system-id={elements.systemId}
      toggleTestId="orbital-schematic-toggle"
      actions={
        <Cluster gap="tight" align="center">
          {elements.hasMinorToggle ? (
            <Button
              variant="subtle"
              size="sm"
              aria-pressed={showMinorBodies}
              onClick={() => setShowMinorBodies((v) => !v)}
              data-testid="orbital-schematic-minor-toggle"
            >
              {showMinorBodies
                ? 'Hide minor bodies'
                : `Show minor bodies (${elements.minorBodyCount})`}
            </Button>
          ) : null}
          <a
            href={resolveAppHref(LEGEND_GUIDE_PATH)}
            className={styles.legendLink}
            data-testid="orbital-schematic-legend-link"
          >
            Legend
          </a>
        </Cluster>
      }
    >
      <div className={styles.stage} data-testid="orbital-schematic-stage">
        {segments.map((segment) =>
          segment.inHabitableZone ? (
            <div
              key={segment.key}
              className={symbologyStyles.hzGroup}
              data-testid="orbital-schematic-hz-group"
              data-in-habitable-zone="true"
            >
              {segment.bands.map(renderBand)}
            </div>
          ) : (
            segment.bands.map(renderBand)
          ),
        )}
      </div>
    </CollapsibleSection>
  );
});

export const OrbitalSchematicPanel = memo(function OrbitalSchematicPanel({
  elements,
  onHoverEntity,
}: OrbitalSchematicPanelProps): React.ReactElement | null {
  const storeApi = useOptionalSpatialEntityStoreApi();
  const localHoveredIdRef = useRef<string | null>(null);

  const handleHoverEntity = useCallback(
    (id: string) => {
      localHoveredIdRef.current = id;
      storeApi?.getState().setHovered(id);
      onHoverEntity?.(id);
    },
    [storeApi, onHoverEntity],
  );

  const handleClearHoverEntity = useCallback(
    (entityId: string) => {
      const currentHoveredId = storeApi
        ? storeApi.getState().hoveredId
        : localHoveredIdRef.current;
      if (currentHoveredId !== entityId) {
        return;
      }
      localHoveredIdRef.current = null;
      storeApi?.getState().setHovered(null);
      onHoverEntity?.(null);
    },
    [storeApi, onHoverEntity],
  );

  if (!elements || (elements.rows.length === 0 && elements.zones.length === 0)) {
    return null;
  }

  return (
    <OrbitalSchematicBody
      key={elements.parentId}
      elements={elements}
      onHoverEntity={handleHoverEntity}
      onClearHoverEntity={handleClearHoverEntity}
    />
  );
});

OrbitalSchematicPanel.displayName = 'OrbitalSchematicPanel';
