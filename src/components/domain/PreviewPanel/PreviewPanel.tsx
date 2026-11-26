import React, { memo, useId, useMemo } from 'react';
import { useSpaLinkClick } from '../../../hooks/spaNavigation';
import type { FocusedPreviewSummary } from '../../../services/details/detailsNavigationTypes';
import { resolveAppHref } from '../../../utils/url';
import { CELESTIAL_SYMBOL_META, Heading } from '../../interface';
import { renderGlyphContent } from '../../interface/information/CelestialSymbol/celestialSymbolGlyphs';
import {
  SVG_HEIGHT,
  SVG_WIDTH,
  buildPreviewProjection,
} from './previewPanelHelpers';
import styles from './PreviewPanel.module.css';

export interface PreviewPanelProps {
  readonly preview: FocusedPreviewSummary | null;
  readonly headingAs?: 'h2' | 'h3' | 'h4';
}

const PRIMARY_RETICLE_SIZE = 13;
const BODY_RETICLE_SIZE = 11;

export const PreviewPanel = memo(function PreviewPanel({
  preview,
  headingAs = 'h2',
}: PreviewPanelProps): React.ReactElement | null {
  const headingId = useId();
  const handleSpaLinkClick = useSpaLinkClick();
  const projection = useMemo(
    () => (preview ? buildPreviewProjection(preview) : null),
    [preview],
  );

  if (!preview || !projection) {
    return null;
  }

  const { primarySymbolType } = projection;
  const primaryMeta = CELESTIAL_SYMBOL_META[primarySymbolType];
  const primaryCategory = primaryMeta?.badgeCategory;
  const primaryStatus = !primaryCategory
    ? (primaryMeta?.badgeStatus ?? 'neutral')
    : undefined;
  const { detailsHref } = preview;
  const primaryHalf = PRIMARY_RETICLE_SIZE / 2;
  const bodyHalf = BODY_RETICLE_SIZE / 2;

  const svgGraphic = (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className={styles.previewSvg}
      role="img"
      aria-label={`${preview.targetName} orientation preview`}
    >
      <polygon
        points={projection.parentRing.polygonPoints}
        className={styles.parentPlaneRing}
        strokeDasharray="3 3"
      />

      <polygon
        points={projection.targetRing.polygonPoints}
        className={styles.targetPlaneDisc}
        data-testid="preview-target-plane-front"
      />

      {projection.concentricRings.map((ring, idx) => (
        <polygon
          key={idx}
          points={ring.polygonPoints}
          className={styles.concentricRing}
        />
      ))}

      <g data-testid="preview-primary-reticle">
        <circle
          cx={projection.origin.x}
          cy={projection.origin.y}
          r={primaryHalf + 0.5}
          className={styles.reticleBackdrop}
        />
        <svg
          x={projection.origin.x - primaryHalf}
          y={projection.origin.y - primaryHalf}
          width={PRIMARY_RETICLE_SIZE}
          height={PRIMARY_RETICLE_SIZE}
          viewBox="-12 -12 24 24"
          className={styles.primaryReticle}
          data-category={primaryCategory}
          data-status={primaryStatus}
          data-celestial-symbol={primarySymbolType}
          aria-hidden={detailsHref ? 'true' : undefined}
          aria-label={detailsHref ? undefined : preview.targetName}
        >
          {renderGlyphContent(primarySymbolType)}
        </svg>
      </g>

      {projection.bodies.map((body) => {
        const meta = CELESTIAL_SYMBOL_META[body.symbolType];
        const category = meta?.badgeCategory;
        const status = body.inHabitableZone
          ? 'nominal'
          : !category
            ? (meta?.badgeStatus ?? 'neutral')
            : undefined;

        return (
          <g key={body.id} data-testid="preview-body-dot" data-symbol-type={body.symbolType}>
            <circle
              cx={body.point.x}
              cy={body.point.y}
              r={bodyHalf}
              className={styles.reticleBackdrop}
            />
            <svg
              x={body.point.x - bodyHalf}
              y={body.point.y - bodyHalf}
              width={BODY_RETICLE_SIZE}
              height={BODY_RETICLE_SIZE}
              viewBox="-12 -12 24 24"
              className={styles.bodyReticle}
              data-category={category}
              data-status={status}
              data-celestial-symbol={body.symbolType}
              aria-hidden={detailsHref ? 'true' : undefined}
              aria-label={detailsHref ? undefined : `${body.name} (${meta?.label ?? body.symbolType})`}
            >
              {renderGlyphContent(body.symbolType)}
            </svg>
          </g>
        );
      })}
    </svg>
  );

  return (
    <section
      className={styles.previewPanel}
      aria-labelledby={headingId}
      data-testid="preview-panel"
      data-target-id={preview.targetId}
      data-focused-kind={preview.focusedKind}
      data-preview-mode={preview.previewMode}
      data-camera-mode="fixed"
    >
      <Heading as={headingAs} id={headingId} visuallyHidden>
        Focus Preview
      </Heading>

      <div
        className={styles.canvasSlot}
        data-testid="preview-canvas-slot"
        data-preview-mode={preview.previewMode}
        data-target-id={preview.targetId}
      >
        {detailsHref ? (
          <a
            href={resolveAppHref(detailsHref)}
            className={styles.previewLink}
            onClick={(e) => handleSpaLinkClick(e, detailsHref)}
            aria-label={`Inspect ${preview.targetName}`}
            data-testid="preview-details-link"
          >
            {svgGraphic}
          </a>
        ) : (
          svgGraphic
        )}
      </div>
    </section>
  );
});

PreviewPanel.displayName = 'PreviewPanel';
