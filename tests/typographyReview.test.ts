import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { TypographyReview } from '../src/components/poc/domain/TypographyReview/TypographyReview';

describe('TypographyReview Component', () => {
  it('renders panel with title, subtitle, badge, text description and data table', () => {
    const html = renderToString(
      createElement(TypographyReview, {
        titleText: 'CUSTOM CELESTIAL SURVEY',
        subtitleText: 'Epoch 2026.10 // High Precision',
        badgeText: 'VERIFIED',
        descriptionText: 'Comprehensive astrometric analysis of nearby terrestrial candidates.',
        selectedOrbitId: 'earth',
      })
    );

    // Title and Subtitle
    expect(html).toContain('CUSTOM CELESTIAL SURVEY');
    expect(html).toContain('Epoch 2026.10 // High Precision');

    // Badge
    expect(html).toContain('VERIFIED');

    // Description text
    expect(html).toContain('Comprehensive astrometric analysis of nearby terrestrial candidates.');

    // Well and OrbitTable
    expect(html).toContain('data-testid="typography-review-well"');
    expect(html).toContain('Earth (Sol III)');
    expect(html).toContain('data-selected="true"');

    // Metrics & Datums
    expect(html).toContain('Census');
    expect(html).toContain('1,280');
    expect(html).toContain('Galactic Longitude (l)');

    // Buttons (secondary, highlight, subtle)
    expect(html).toContain('Calibrate');
    expect(html).toContain('Telemetry Sync');
    expect(html).toContain('Propagate Target');
    expect(html).toContain('data-variant="primary"');

    // ConfidencePip dots in table, datums, and footer
    expect(html).toContain('data-testid="confidence-pip-wrapper"');
    expect(html).toContain('data-confidence="confirmed"');
  });

  it('forwards typographic variants as CUBE data attributes with zero inline styles', () => {
    const html = renderToString(
      createElement(TypographyReview, {
        interfaceFont: 'space-grotesk',
        dataFont: 'fira-code',
        copyFont: 'newsreader',
        typeRatio: 'perfect-fourth',
        titleSize: 'scale-3',
        titleWeight: 'bold',
        subtitleSize: 'scale-1',
        subtitleCase: 'uppercase',
        subtitleTracking: 'wider',
        descriptionSize: 'scale-0',
        descriptionLeading: 'prose',
        tableDataSize: 'scale-neg-1',
        tableHeaderSize: 'scale-neg-2',
        palette: 'carbon',
        theme: 'dark',
      })
    );

    expect(html).toContain('data-interface-font="space-grotesk"');
    expect(html).toContain('data-data-font="fira-code"');
    expect(html).toContain('data-copy-font="newsreader"');
    expect(html).toContain('data-type-ratio="perfect-fourth"');
    expect(html).toContain('data-title-size="scale-3"');
    expect(html).toContain('data-title-weight="bold"');
    expect(html).toContain('data-subtitle-size="scale-1"');
    expect(html).toContain('data-subtitle-case="uppercase"');
    expect(html).toContain('data-subtitle-tracking="wider"');
    expect(html).toContain('data-description-size="scale-0"');
    expect(html).toContain('data-description-leading="prose"');
    expect(html).toContain('data-table-data-size="scale-neg-1"');
    expect(html).toContain('data-table-header-size="scale-neg-2"');
    expect(html).toContain('data-palette="carbon"');
    expect(html).toContain('data-theme="dark"');

    // Strictly zero inline styles
    expect(html).not.toContain('style=');
  });

  it('renders theme switcher when enabled and omits when disabled', () => {
    const htmlWithSwitcher = renderToString(
      createElement(TypographyReview, { showThemeSwitcher: true })
    );
    expect(htmlWithSwitcher).toContain('aria-label="Theme mode switcher"');

    const htmlWithoutSwitcher = renderToString(
      createElement(TypographyReview, { showThemeSwitcher: false })
    );
    expect(htmlWithoutSwitcher).not.toContain('aria-label="Theme mode switcher"');
  });
});
