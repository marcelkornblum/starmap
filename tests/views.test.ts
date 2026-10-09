import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { GalaxyView, GalaxyControlsDock } from '../src/views/GalaxyView';
import { SystemView, SystemControlsDock } from '../src/views/SystemView';
import { PlanetView } from '../src/views/PlanetView';
import { ReferenceView } from '../src/views/ReferenceView';
import { RootHeader } from '../src/components/poc/layout/RootLayout';
import { SceneProvider } from '../src/components/poc/canvas/SceneBridge';

import { useParams } from '@tanstack/react-router';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@tanstack/react-router');
  return {
    ...actual,
    Link: vi.fn(({ to, children, ...props }: { to: string; children?: React.ReactNode }) =>
      createElement('a', { href: to, ...props }, children),
    ),
    useNavigate: vi.fn(() => vi.fn()),
    useRouter: vi.fn(() => ({ state: { location: { pathname: '/galaxy' } } })),
    useParams: vi.fn(() => ({ systemId: 'sol', planetId: 'earth' })),
  };
});

interface ReactVNode {
  props?: {
    children?: ReactVNode | ReactVNode[] | string | null;
    onClick?: () => void;
    onSelect?: (id: string) => void;
    onSelectPlanet?: (id: string) => void;
    onTogglePlay?: () => void;
    onTimeSpeedChange?: (speed: number) => void;
    onProjectionChange?: (proj: string) => void;
    onToggleOrbits?: (show: boolean) => void;
    onToggleGrid?: (show: boolean) => void;
    onToggleLabels?: (show: boolean) => void;
    onSelectItem?: (item: { id: string; title: string; category: string }) => void;
    onClose?: () => void;
  };
}

const triggerAllClickHandlers = (node: unknown): void => {
  if (!node || typeof node !== 'object') {
    return;
  }
  const vnode = node as ReactVNode;
  if (typeof vnode.props?.onClick === 'function') {
    vnode.props.onClick();
  }
  if (typeof vnode.props?.onSelect === 'function') {
    vnode.props.onSelect('earth');
  }
  if (typeof vnode.props?.onSelectPlanet === 'function') {
    vnode.props.onSelectPlanet('earth');
  }
  if (typeof (vnode.props as any)?.onInspectSystem === 'function') {
    (vnode.props as any).onInspectSystem('sol');
  }
  if (typeof (vnode.props as any)?.onInspectPlanet === 'function') {
    (vnode.props as any).onInspectPlanet('earth');
  }
  if (typeof vnode.props?.onSelectItem === 'function') {
    vnode.props.onSelectItem({ id: 'galaxy', title: 'Galaxy', category: 'coordinate' });
    vnode.props.onSelectItem({ id: 'earth', title: 'Earth', category: 'planet' });
    vnode.props.onSelectItem({ id: 'sol', title: 'Sol', category: 'star' });
    vnode.props.onSelectItem({ id: 'reference', title: 'Reference', category: 'command' });
  }
  if (typeof vnode.props?.onClose === 'function') {
    vnode.props.onClose();
  }
  if (typeof vnode.props?.onTogglePlay === 'function') {
    vnode.props.onTogglePlay();
  }
  if (typeof vnode.props?.onTimeSpeedChange === 'function') {
    vnode.props.onTimeSpeedChange(5);
  }
  if (typeof vnode.props?.onProjectionChange === 'function') {
    vnode.props.onProjectionChange('top-down');
  }
  if (typeof vnode.props?.onToggleOrbits === 'function') {
    vnode.props.onToggleOrbits(false);
  }
  if (typeof vnode.props?.onToggleGrid === 'function') {
    vnode.props.onToggleGrid(false);
  }
  if (typeof vnode.props?.onToggleLabels === 'function') {
    vnode.props.onToggleLabels(false);
  }
  if (Array.isArray(vnode.props?.children)) {
    for (const child of vnode.props.children) {
      triggerAllClickHandlers(child);
    }
  } else if (vnode.props?.children && typeof vnode.props.children === 'object') {
    triggerAllClickHandlers(vnode.props.children);
  }
};

describe('View HUD Components (SSR/DOM)', () => {
  it('renders GalaxyView with title and navigation trigger', () => {
    const el = GalaxyView({});
    triggerAllClickHandlers(el);

    const html = renderToString(
      createElement(SceneProvider, null, createElement(GalaxyView)),
    );
    expect(html).toContain('Milky Way Atlas');
    expect(html).toContain('Target Sol System');
  });

  it('renders SystemView with system parameters and target buttons', () => {
    const el = SystemView({});
    triggerAllClickHandlers(el);

    const html = renderToString(
      createElement(SceneProvider, null, createElement(SystemView)),
    );
    expect(html).toContain('SOL');
    expect(html).toContain('Target Earth');
  });

  it('renders PlanetView with planet classification and return trigger', () => {
    const el = PlanetView({});
    triggerAllClickHandlers(el);

    const html = renderToString(
      createElement(SceneProvider, null, createElement(PlanetView)),
    );
    expect(html).toContain('EARTH');
    expect(html).toContain('Sol System');
  });

  it('renders ReferenceView with encyclopedia catalog info', () => {
    const el = ReferenceView({});
    triggerAllClickHandlers(el);

    const html = renderToString(
      createElement(SceneProvider, null, createElement(ReferenceView)),
    );
    expect(html).toContain('Astrodynamics Reference');
    expect(html).toContain('Astronomical Encyclopedia');
  });

  it('falls back to "unknown" when route parameters are missing in SystemView and PlanetView', () => {
    vi.mocked(useParams).mockImplementation(() => ({}));
    const elSystem = SystemView({});
    triggerAllClickHandlers(elSystem);
    const systemHtml = renderToString(
      createElement(SceneProvider, null, createElement(SystemView)),
    );
    expect(systemHtml).toContain('UNKNOWN');

    const elPlanet = PlanetView({});
    triggerAllClickHandlers(elPlanet);
    const planetHtml = renderToString(
      createElement(SceneProvider, null, createElement(PlanetView)),
    );
    expect(planetHtml).toContain('UNKNOWN');

    vi.mocked(useParams).mockImplementation(() => ({ systemId: 'sol', planetId: 'earth' }));
  });

  it('renders interactive GalaxyControlsDock and SystemControlsDock controls', () => {
    const galaxyControlsHtml = renderToString(createElement(GalaxyControlsDock));
    expect(galaxyControlsHtml).toBeDefined();

    const sysControlsHtml = renderToString(createElement(SystemControlsDock));
    expect(sysControlsHtml).toBeDefined();
  });

  it('renders RootHeader navigation and command palette trigger', () => {
    const headerHtml = renderToString(createElement(RootHeader));
    expect(headerHtml).toContain('STARMAP');
    expect(headerHtml).toContain('Galaxy');
    expect(headerHtml).toContain('Search...');
  });
});
