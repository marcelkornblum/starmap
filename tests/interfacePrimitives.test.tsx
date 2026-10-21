import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  Datum,
  DataTable,
  Heading,
  Kbd,
  Badge,
} from '../src/components/interface/information';
import { Button } from '../src/components/interface/controls/Button/Button';

describe('Stage 2 UI Primitives Sweep - Batch 1', () => {
  describe('Datum (Enhanced)', () => {
    it('renders data-datum="true" and forwards valueTestId to the value wrapper', () => {
      const html = renderToString(
        createElement(Datum, {
          label: 'Surface Gravity',
          value: '9.8',
          unit: 'm/s²',
          status: 'nominal',
          valueTestId: 'details-planet-telemetry-gravity',
        })
      );

      expect(html).toContain('data-datum="true"');
      expect(html).toContain('data-status="nominal"');
      expect(html).toContain('Surface Gravity');
      expect(html).toContain('data-testid="details-planet-telemetry-gravity"');
      expect(html).toContain('9.8');
      expect(html).toContain('m/s²');
    });

    it('renders inline ConfidencePip when confidence is provided', () => {
      const html = renderToString(
        createElement(Datum, {
          label: 'Semi-Major Axis',
          value: '1.42',
          unit: 'AU',
          confidence: 'confirmed',
          valueTestId: 'details-planet-telemetry-axis',
        })
      );

      expect(html).toContain('data-datum="true"');
      expect(html).toContain('data-testid="details-planet-telemetry-axis"');
      expect(html).toContain('data-testid="confidence-pip-wrapper"');
      expect(html).toContain('data-confidence="confirmed"');
    });

    it('wraps React element values cleanly with valueTestId', () => {
      const badgeElem = createElement(Badge, { status: 'nominal' }, 'Terrestrial');
      const html = renderToString(
        createElement(Datum, {
          label: 'Classification',
          value: badgeElem,
          valueTestId: 'details-planet-telemetry-composition',
        })
      );

      expect(html).toContain('data-datum="true"');
      expect(html).toContain('data-testid="details-planet-telemetry-composition"');
      expect(html).toContain('Classification');
      expect(html).toContain('Terrestrial');
      expect(html).toContain('data-status="nominal"');
    });
  });

  describe('DataTable', () => {
    it('renders structured table with Root, Head, Body, Row, HeaderCell, and Cell', () => {
      const html = renderToString(
        createElement(
          DataTable,
          { caption: 'Orbital Ephemeris', id: 'ephemeris-table' },
          createElement(
            DataTable.Head,
            null,
            createElement(
              DataTable.Row,
              null,
              createElement(DataTable.HeaderCell, null, 'Target'),
              createElement(DataTable.HeaderCell, { align: 'end', unit: 'AU' }, 'Distance')
            )
          ),
          createElement(
            DataTable.Body,
            null,
            createElement(
              DataTable.Row,
              { selected: true, interactive: true },
              createElement(DataTable.Cell, null, 'Kepler-452b'),
              createElement(DataTable.Cell, { numeric: true, 'data-testid': 'cell-dist' }, '1.04')
            )
          )
        )
      );

      expect(html).toContain('data-data-table="true"');
      expect(html).toContain('Orbital Ephemeris');
      expect(html).toContain('Target');
      expect(html).toContain('Distance');
      expect(html).toContain('AU');
      expect(html).toContain('data-align="end"');
      expect(html).toContain('data-selected="true"');
      expect(html).toContain('data-interactive="true"');
      expect(html).toContain('Kepler-452b');
      expect(html).toContain('data-numeric="true"');
      expect(html).toContain('data-testid="cell-dist"');
      expect(html).toContain('1.04');
    });
  });

  describe('Heading', () => {
    it('renders clean DOM heading element with resolved size when no decoration is passed', () => {
      const htmlDefault = renderToString(
        createElement(Heading, { id: 'sec-title' }, 'System Architecture')
      );
      expect(htmlDefault).toContain('<h2');
      expect(htmlDefault).toContain('id="sec-title"');
      expect(htmlDefault).toContain('data-heading="true"');
      expect(htmlDefault).toContain('data-size="section"');
      expect(htmlDefault).toContain('System Architecture');

      const htmlH1 = renderToString(
        createElement(Heading, { as: 'h1' }, 'Starmap Catalog')
      );
      expect(htmlH1).toContain('<h1');
      expect(htmlH1).toContain('data-size="title"');

      const htmlOverride = renderToString(
        createElement(Heading, { as: 'h1', size: 'hero' }, 'Kepler-186')
      );
      expect(htmlOverride).toContain('data-size="hero"');

      const htmlH3 = renderToString(
        createElement(Heading, { as: 'h3' }, 'Subsystem')
      );
      expect(htmlH3).toContain('<h3');
      expect(htmlH3).toContain('data-size="lead"');

      const htmlH4 = renderToString(
        createElement(Heading, { as: 'h4' }, 'Sensor Telemetry')
      );
      expect(htmlH4).toContain('<h4');
      expect(htmlH4).toContain('data-size="eyebrow"');
    });

    it('renders headingGroup wrapper when eyebrow, subtitle, or badge are passed', () => {
      const badge = createElement(Badge, { status: 'nominal' }, 'Active');
      const html = renderToString(
        createElement(
          Heading,
          {
            as: 'h2',
            eyebrow: 'Cartographic Dossier',
            subtitle: 'Direct imaging and astrometric telemetry',
            badge,
            id: 'dossier-heading',
          },
          'Sol System'
        )
      );

      expect(html).toContain('data-heading-group="true"');
      expect(html).toContain('Cartographic Dossier');
      expect(html).toContain('<h2');
      expect(html).toContain('id="dossier-heading"');
      expect(html).toContain('Sol System');
      expect(html).toContain('Active');
      expect(html).toContain('Direct imaging and astrometric telemetry');
    });
  });

  describe('Kbd', () => {
    it('renders <kbd> with data-kbd="true" and forwarded attributes', () => {
      const html = renderToString(
        createElement(Kbd, { 'aria-label': 'Command key' }, '⌘K')
      );
      expect(html).toContain('<kbd');
      expect(html).toContain('data-kbd="true"');
      expect(html).toContain('aria-label="Command key"');
      expect(html).toContain('⌘K');
    });
  });

  describe('Button (Enhanced href support)', () => {
    it('renders <button> element when href is not specified', () => {
      const html = renderToString(
        createElement(Button, { variant: 'primary', size: 'sm' }, 'Calibrate')
      );
      expect(html).toContain('<button');
      expect(html).toContain('type="button"');
      expect(html).toContain('data-variant="primary"');
      expect(html).toContain('data-size="sm"');
      expect(html).toContain('Calibrate');
    });

    it('renders <a> element when href is specified', () => {
      const html = renderToString(
        createElement(
          Button,
          {
            variant: 'subtle',
            size: 'md',
            href: '/system/sol',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          'View Sol'
        )
      );
      expect(html).toContain('<a');
      expect(html).not.toContain('<button');
      expect(html).toContain('href="/system/sol"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('data-variant="subtle"');
      expect(html).toContain('data-size="md"');
      expect(html).toContain('View Sol');
    });
  });

  describe('Badge (Enhanced href support)', () => {
    it('renders <span> element when href is not specified', () => {
      const html = renderToString(
        createElement(
          Badge,
          { status: 'info', confidence: 'confirmed', category: 'star' },
          'G-Type Star'
        )
      );
      expect(html).toContain('<span');
      expect(html).toContain('data-status="info"');
      expect(html).toContain('data-confidence="confirmed"');
      expect(html).toContain('data-category="star"');
      expect(html).toContain('G-Type Star');
    });

    it('renders <a> element when href is specified', () => {
      const html = renderToString(
        createElement(
          Badge,
          {
            status: 'nominal',
            href: '/explore/stars',
            target: '_self',
          },
          'Main Sequence'
        )
      );
      expect(html).toContain('<a');
      expect(html).toContain('href="/explore/stars"');
      expect(html).toContain('target="_self"');
      expect(html).toContain('data-status="nominal"');
      expect(html).toContain('Main Sequence');
    });
  });
});
