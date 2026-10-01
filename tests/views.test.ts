import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { GalaxyView } from '../src/views/GalaxyView';
import { SystemView } from '../src/views/SystemView';
import { PlanetView } from '../src/views/PlanetView';
import { ReferenceView } from '../src/views/ReferenceView';
import { SceneProvider } from '../src/components/canvas/SceneBridge';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useRouter: vi.fn(() => ({ state: { location: { pathname: '/galaxy' } } })),
    useParams: vi.fn(() => ({ systemId: 'sol', planetId: 'earth' })),
  };
});

interface ReactVNode {
  props?: {
    children?: ReactVNode | ReactVNode[] | string | null;
    onClick?: () => void;
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
});
