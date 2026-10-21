import React from 'react';
import type { ActiveLayerCardModel } from '../../../services/layerCardService';
import {
  Badge,
  Button,
  Cluster,
  ConfidencePip,
  Heading,
  Quantity,
} from '../../interface';
import styles from './LayerCard.module.css';

export interface LayerCardProps {
  readonly card: ActiveLayerCardModel | null;
}

/**
 * Domain Component (<LayerCard />):
 * Non-modal HUD overlay displaying layer context in two modes:
 * 1. Overview Mode: Layer title, kind badge, description, item count, source link, and "Explore Layer" action.
 * 2. Item Mode: Active layer item details, step counter (X of Y), item title, prose text, observational confidence,
 *    thematic tags with filtered galaxy links, and step-by-step previous/next navigation with wrapping.
 */
export const LayerCard: React.FC<LayerCardProps> = ({ card }) => {
  if (!card) {
    return null;
  }

  if (card.mode === 'overview') {
    return (
      <aside
        data-testid="layer-card"
        data-layer-id={card.layerId}
        data-card-mode={card.mode}
        data-layer-kind={card.kind}
        className={styles.root}
        aria-label={`${card.title} Overview`}
      >
        <header className={styles.header}>
          <Cluster justify="between" align="center">
            <Badge
              status={card.kind === 'scientific-overlay' ? 'info' : 'neutral'}
              data-testid="layer-card-kind"
            >
              {card.kindLabel}
            </Badge>
            <Button
              href={card.closeHref}
              data-testid="layer-card-close"
              aria-label="Close layer card"
              size="sm"
              variant="subtle"
              className={styles.closeButton}
            >
              ×
            </Button>
          </Cluster>
        </header>

        <Heading as="h3" data-testid="layer-card-title" className={styles.title}>
          {card.title}
        </Heading>

        <p data-testid="layer-card-description" className={styles.description}>
          {card.description}
        </p>

        <Cluster justify="between" align="center">
          <Quantity
            data-testid="layer-card-count"
            className={styles.count}
            value={card.itemCount}
            unit={card.itemCount === 1 ? 'entry' : 'entries'}
          />
          {card.source?.url ? (
            <a
              href={card.source.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="layer-card-source"
              className={styles.sourceLink}
            >
              Source
            </a>
          ) : null}
        </Cluster>

        <footer className={styles.footer}>
          <Button
            href={card.startHref}
            data-testid="layer-card-start"
            size="sm"
            variant="primary"
            className={styles.actionButton}
          >
            {card.firstItemTitle
              ? `Explore: ${card.firstItemTitle} →`
              : 'Explore Layer →'}
          </Button>
        </footer>
      </aside>
    );
  }

  return (
    <aside
      data-testid="layer-card"
      data-layer-id={card.layerId}
      data-card-mode={card.mode}
      data-layer-kind={card.kind}
      className={styles.root}
      aria-label={`${card.itemTitle} (${card.layerTitle})`}
    >
      <header className={styles.header}>
        <Cluster justify="between" align="center">
          <Cluster gap="tight" align="center">
            <a
              href={card.overviewHref}
              data-testid="layer-card-overview-link"
              className={styles.overviewLink}
            >
              {card.layerTitle}
            </a>
            <span className={styles.divider}>/</span>
            <Quantity
              data-testid="layer-card-step"
              className={styles.step}
              value={card.stepIndex}
              unit={`of ${card.totalItems}`}
            />
          </Cluster>
          <Button
            href={card.closeHref}
            data-testid="layer-card-close"
            aria-label="Close layer card"
            size="sm"
            variant="subtle"
            className={styles.closeButton}
          >
            ×
          </Button>
        </Cluster>
      </header>

      <Heading as="h3" data-testid="layer-card-title" className={styles.title}>
        {card.itemTitle}
      </Heading>

      <p data-testid="layer-card-text" className={styles.text}>
        {card.text}
      </p>

      {card.confidence ? (
        <div className={styles.confidenceRow}>
          <Cluster gap="dense" align="center" data-testid="layer-card-confidence">
            <ConfidencePip confidence={card.confidence} size="sm" />
            <Badge
              confidence={
                card.confidence === 'confirmed'
                  ? 'confirmed'
                  : card.confidence === 'candidate'
                    ? 'candidate'
                    : 'projected'
              }
            >
              {card.confidence}
            </Badge>
          </Cluster>
        </div>
      ) : null}

      {card.tags.length > 0 ? (
        <div data-testid="layer-card-tags" className={styles.tagsRow}>
          <Cluster gap="tight">
            {card.tags.map((tag) => (
              <Badge key={tag.label} status="neutral">
                <a
                  href={tag.href}
                  data-testid="layer-card-tag-link"
                  className={styles.tagLink}
                >
                  {tag.label}
                </a>
              </Badge>
            ))}
          </Cluster>
        </div>
      ) : null}

      <footer className={styles.footer}>
        <Cluster justify="between" align="center">
          <Button
            href={card.prevHref}
            data-testid="layer-card-prev"
            size="sm"
            variant="subtle"
            className={styles.navButton}
          >
            ← {card.prevLabel}
          </Button>
          <Button
            href={card.nextHref}
            data-testid="layer-card-next"
            size="sm"
            variant="subtle"
            className={styles.navButton}
          >
            {card.nextLabel} →
          </Button>
        </Cluster>
      </footer>
    </aside>
  );
};
