import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { Card, Panel, Dock, Well } from '../src/components/surfaces';
import { Modal, Drawer, Popover, Tooltip, Toast } from '../src/components/overlays';
import { DossierLayout, MetricStrip, ToolbarLayout } from '../src/components/templates';

describe('Tier 2: Surfaces', () => {
  it('renders Card with status exception and padding', () => {
    const html = renderToString(
      createElement(
        Card,
        { status: 'critical', padding: 'tight', interactive: true },
        createElement('p', null, 'Card Content')
      )
    );
    expect(html).toContain('data-status="critical"');
    expect(html).toContain('data-padding="tight"');
    expect(html).toContain('data-interactive="true"');
    expect(html).toContain('Card Content');
  });

  it('renders Panel with header, body, and footer', () => {
    const html = renderToString(
      createElement(
        Panel,
        {
          header: createElement('span', null, 'Telemetry Panel'),
          footer: createElement('span', null, 'Live Feed'),
          padding: 'loose',
          status: 'nominal',
        },
        createElement('p', null, 'Panel Body')
      )
    );
    expect(html).toContain('Telemetry Panel');
    expect(html).toContain('Panel Body');
    expect(html).toContain('Live Feed');
    expect(html).toContain('data-padding="loose"');
    expect(html).toContain('data-status="nominal"');
  });

  it('renders Dock with position and padded state', () => {
    const html = renderToString(
      createElement(
        Dock,
        { position: 'bottom', padded: false },
        createElement('button', null, 'Control')
      )
    );
    expect(html).toContain('data-position="bottom"');
    expect(html).toContain('data-padded="false"');
    expect(html).toContain('Control');
  });

  it('renders Well with tabular numbers and padding', () => {
    const html = renderToString(
      createElement(
        Well,
        { tabular: true, padding: 'tight' },
        createElement('span', null, '123.456 AU')
      )
    );
    expect(html).toContain('data-tabular="true"');
    expect(html).toContain('data-padding="tight"');
    expect(html).toContain('123.456 AU');
  });
});

describe('Tier 2: Overlays', () => {
  it('renders Modal when open and handles close action', () => {
    const onClose = vi.fn();
    const html = renderToString(
      createElement(
        Modal,
        { isOpen: true, onClose, title: 'System Diagnostics' },
        createElement('p', null, 'Modal Body')
      )
    );
    expect(html).toContain('System Diagnostics');
    expect(html).toContain('Modal Body');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');

    const closedHtml = renderToString(
      createElement(Modal, { isOpen: false, onClose }, createElement('p', null, 'Hidden'))
    );
    expect(closedHtml).toBe('');
  });

  it('renders Drawer when open with position', () => {
    const onClose = vi.fn();
    const html = renderToString(
      createElement(
        Drawer,
        { isOpen: true, onClose, position: 'left', title: 'Cartography Drawer' },
        createElement('p', null, 'Drawer Body')
      )
    );
    expect(html).toContain('Cartography Drawer');
    expect(html).toContain('Drawer Body');
    expect(html).toContain('data-position="left"');
    expect(html).toContain('role="dialog"');

    const closedHtml = renderToString(
      createElement(Drawer, { isOpen: false, onClose, position: 'left' })
    );
    expect(closedHtml).toBe('');
  });

  it('renders Popover when open and returns null when closed', () => {
    const html = renderToString(
      createElement(
        Popover,
        { isOpen: true, position: 'top' },
        createElement('span', null, 'Stellar Details')
      )
    );
    expect(html).toContain('data-position="top"');
    expect(html).toContain('role="region"');
    expect(html).toContain('Stellar Details');

    const closedHtml = renderToString(
      createElement(Popover, { isOpen: false }, createElement('span', null, 'Hidden'))
    );
    expect(closedHtml).toBe('');
  });

  it('renders Tooltip wrapping children with tooltip text', () => {
    const html = renderToString(
      createElement(
        Tooltip,
        { text: 'Spectral Lum: 3.828e26 W', position: 'right' },
        createElement('button', null, 'Luminosity')
      )
    );
    expect(html).toContain('Luminosity');
    expect(html).toContain('Spectral Lum: 3.828e26 W');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('data-position="right"');
  });

  it('renders Toast notification with status and dismiss button', () => {
    const onClose = vi.fn();
    const html = renderToString(
      createElement(Toast, {
        title: 'Calibration Complete',
        message: 'All sensors online.',
        status: 'nominal',
        onClose,
      })
    );
    expect(html).toContain('Calibration Complete');
    expect(html).toContain('All sensors online.');
    expect(html).toContain('data-status="nominal"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});

describe('Tier 3: Templates', () => {
  it('renders DossierLayout with all slots', () => {
    const html = renderToString(
      createElement(
        DossierLayout,
        {
          header: createElement('header', null, 'Planet Dossier Header'),
          metrics: createElement('div', null, 'Planet Metrics'),
          actions: createElement('footer', null, 'Dossier Actions'),
        },
        createElement('main', null, 'Keplerian Elements Data')
      )
    );
    expect(html).toContain('Planet Dossier Header');
    expect(html).toContain('Planet Metrics');
    expect(html).toContain('Keplerian Elements Data');
    expect(html).toContain('Dossier Actions');
  });

  it('renders MetricStrip in Grid', () => {
    const html = renderToString(
      createElement(
        MetricStrip,
        { minWidth: 'md' },
        createElement('div', null, 'Metric 1'),
        createElement('div', null, 'Metric 2')
      )
    );
    expect(html).toContain('data-min="md"');
    expect(html).toContain('Metric 1');
    expect(html).toContain('Metric 2');
  });

  it('renders ToolbarLayout with start, center, and end slots', () => {
    const html = renderToString(
      createElement(ToolbarLayout, {
        start: createElement('span', null, 'Nav Tabs'),
        center: createElement('span', null, 'Search Title'),
        end: createElement('span', null, 'HUD Actions'),
      })
    );
    expect(html).toContain('Nav Tabs');
    expect(html).toContain('Search Title');
    expect(html).toContain('HUD Actions');
  });
});
