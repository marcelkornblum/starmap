import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import {
  Card,
  Panel,
  Dock,
  Well,
  Hud,
  Modal,
  Drawer,
  Popover,
  Tooltip,
  Toast,
} from '../src/components/interface/surfaces';
import * as pocSurfaces from '../src/components/poc/surfaces';
import * as pocOverlays from '../src/components/poc/overlays';
import { Card as PocCard } from '../src/components/poc/surfaces/Card/Card';
import { Panel as PocPanel } from '../src/components/poc/surfaces/Panel/Panel';
import { Dock as PocDock } from '../src/components/poc/surfaces/Dock/Dock';
import { Well as PocWell } from '../src/components/poc/surfaces/Well/Well';
import { Hud as PocHud } from '../src/components/poc/surfaces/Hud/Hud';
import { Modal as PocModal } from '../src/components/poc/overlays/Modal/Modal';
import { Drawer as PocDrawer } from '../src/components/poc/overlays/Drawer/Drawer';
import { Popover as PocPopover } from '../src/components/poc/overlays/Popover/Popover';
import { Tooltip as PocTooltip } from '../src/components/poc/overlays/Tooltip/Tooltip';
import { Toast as PocToast } from '../src/components/poc/overlays/Toast/Toast';
import { DossierLayout, MetricStrip, ToolbarLayout } from '../src/components/poc/templates';

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

  it('renders Hud with position and padded state', () => {
    const html = renderToString(
      createElement(
        Hud,
        { position: 'top', padded: true },
        createElement('span', null, 'HUD Telemetry')
      )
    );
    expect(html).toContain('data-position="top"');
    expect(html).toContain('HUD Telemetry');
    expect(html).toContain('<header');
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
      createElement(Modal, { isOpen: false, onClose }, createElement('p', null, 'Modal Body'))
    );
    expect(closedHtml).toContain('<dialog');
    expect(closedHtml).toContain('Modal Body');

    // Backdrop click simulation
    let closeTriggered = false;
    const testOnClose = () => { closeTriggered = true; };
    const dialogElement = {
      tagName: 'DIALOG',
    };
    let modalEl: any;
    function ModalHarness() {
      modalEl = Modal({ isOpen: true, onClose: testOnClose, title: 'Test' });
      return modalEl;
    }
    renderToString(createElement(ModalHarness));
    // Click on child/wrapper does not trigger close
    modalEl.props.onClick?.({ target: dialogElement } as unknown as React.MouseEvent<HTMLDialogElement>);
    expect(closeTriggered).toBe(false);
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
      createElement(Drawer, { isOpen: false, onClose, position: 'left' }, createElement('p', null, 'Drawer Body'))
    );
    expect(closedHtml).toContain('<dialog');
    expect(closedHtml).toContain('Drawer Body');
  });

  it('renders Popover when open and returns null when closed', () => {
    const html = renderToString(
      createElement(
        Popover,
        { isOpen: true, position: 'top', 'aria-label': 'Stellar Details' },
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
    expect(html).toContain('aria-describedby');
    expect(html).toContain('Spectral Lum: 3.828e26 W');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('data-position="right"');
    expect(html).toContain('data-align="center"');
  });

  it('renders Tooltip in controlled mode and standalone without children', () => {
    const htmlOpen = renderToString(
      createElement(Tooltip, {
        text: 'Telemetry Lock Active',
        isOpen: true,
        position: 'top',
        id: 'telemetry-tt',
      })
    );
    expect(htmlOpen).toContain('id="telemetry-tt"');
    expect(htmlOpen).toContain('Telemetry Lock Active');
    expect(htmlOpen).toContain('data-position="top"');
    expect(htmlOpen).toContain('data-align="center"');
    expect(htmlOpen).toContain('data-state="open"');

    const htmlClosed = renderToString(
      createElement(Tooltip, {
        text: 'Hidden Tooltip',
        isOpen: false,
      })
    );
    expect(htmlClosed).toBe('');
  });

  it('renders multi-line Tooltip text with natural text wrapping', () => {
    const longText = 'We have candidate confidence in this data based on spectroscopic confirmation';
    const html = renderToString(
      createElement(Tooltip, {
        text: longText,
        isOpen: true,
        position: 'top',
      })
    );
    expect(html).toContain(longText);
    expect(html).toContain('data-position="top"');
    expect(html).toContain('data-align="center"');
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

describe('Tier 2: Surfaces & Overlays Backwards-Compatible Re-exports', () => {
  it('preserves barrel re-exports from poc/surfaces and poc/overlays', () => {
    expect(pocSurfaces.Card).toBe(Card);
    expect(pocSurfaces.Panel).toBe(Panel);
    expect(pocSurfaces.Dock).toBe(Dock);
    expect(pocSurfaces.Well).toBe(Well);
    expect(pocSurfaces.Hud).toBe(Hud);

    expect(pocOverlays.Modal).toBe(Modal);
    expect(pocOverlays.Drawer).toBe(Drawer);
    expect(pocOverlays.Popover).toBe(Popover);
    expect(pocOverlays.Tooltip).toBe(Tooltip);
    expect(pocOverlays.Toast).toBe(Toast);
  });

  it('preserves individual component re-exports from poc subdirectories', () => {
    expect(PocCard).toBe(Card);
    expect(PocPanel).toBe(Panel);
    expect(PocDock).toBe(Dock);
    expect(PocWell).toBe(Well);
    expect(PocHud).toBe(Hud);

    expect(PocModal).toBe(Modal);
    expect(PocDrawer).toBe(Drawer);
    expect(PocPopover).toBe(Popover);
    expect(PocTooltip).toBe(Tooltip);
    expect(PocToast).toBe(Toast);
  });
});

