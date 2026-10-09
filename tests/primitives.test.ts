import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  Stack,
  Cluster,
  Sidebar,
  Switcher,
  Grid,
  Center,
  Cover,
  Frame,
  Reel,
  Box,
  Imposter,
  Icon,
} from '../src/components/interface/layout';
import { Datum, Badge, ConfidencePip, Unit, Quantity } from '../src/components/interface/data';
import { Metric } from '../src/components/poc/primitives/data';
import {
  Button,
  Input,
  Toggle,
  Slider,
  Select,
} from '../src/components/interface/control';

describe('Tier 1: Layout Primitives (Every Layout)', () => {
  it('renders Stack with default and custom props', () => {
    const htmlDefault = renderToString(
      createElement(Stack, null, createElement('div', null, 'Item 1'), createElement('div', null, 'Item 2'))
    );
    expect(htmlDefault).toContain('data-gap="default"');
    expect(htmlDefault).toContain('data-align="stretch"');

    const htmlCustom = renderToString(
      createElement(
        Stack,
        { as: 'section', gap: 'tight', align: 'center', className: 'custom-stack' },
        createElement('div', null, 'Child')
      )
    );
    expect(htmlCustom).toContain('<section');
    expect(htmlCustom).toContain('data-gap="tight"');
    expect(htmlCustom).toContain('data-align="center"');
    expect(htmlCustom).toContain('custom-stack');
  });

  it('renders Cluster with flex-wrap and alignment tokens', () => {
    const html = renderToString(
      createElement(
        Cluster,
        { gap: 'loose', align: 'start', justify: 'between' },
        createElement('span', null, 'Tag A'),
        createElement('span', null, 'Tag B')
      )
    );
    expect(html).toContain('data-gap="loose"');
    expect(html).toContain('data-align="start"');
    expect(html).toContain('data-justify="between"');
  });

  it('renders Sidebar with layout variants', () => {
    const html = renderToString(
      createElement(
        Sidebar,
        { side: 'end', sideWidth: 'lg', contentMin: '60%', noStretch: true },
        createElement('div', null, 'Content'),
        createElement('div', null, 'Side')
      )
    );
    expect(html).toContain('data-side="end"');
    expect(html).toContain('data-width="lg"');
    expect(html).toContain('data-content-min="60%"');
    expect(html).toContain('data-no-stretch="true"');
  });

  it('renders Switcher with threshold and limit', () => {
    const html = renderToString(
      createElement(
        Switcher,
        { threshold: 'lg', limit: 3, gap: 'fib-4' },
        createElement('div', null, '1'),
        createElement('div', null, '2')
      )
    );
    expect(html).toContain('data-threshold="lg"');
    expect(html).toContain('data-limit="3"');
    expect(html).toContain('data-gap="fib-4"');
  });

  it('renders Grid with minWidth auto-fit', () => {
    const html = renderToString(
      createElement(
        Grid,
        { minWidth: 'sm', gap: 'fib-5' },
        createElement('div', null, 'Cell')
      )
    );
    expect(html).toContain('data-min="sm"');
    expect(html).toContain('data-gap="fib-5"');
  });

  it('renders Center with container bounds', () => {
    const html = renderToString(
      createElement(
        Center,
        { max: 'lg', andText: true, intrinsic: true, gutter: 'loose' },
        createElement('p', null, 'Centred')
      )
    );
    expect(html).toContain('data-max="lg"');
    expect(html).toContain('data-and-text="true"');
    expect(html).toContain('data-intrinsic="true"');
    expect(html).toContain('data-gutter="loose"');
  });

  it('renders Cover with header, principal child, and footer', () => {
    const html = renderToString(
      createElement(
        Cover,
        {
          minHeight: 'full',
          gap: 'fib-6',
          header: createElement('header', null, 'Nav'),
          footer: createElement('footer', null, 'Status'),
        },
        createElement('main', null, 'Mission')
      )
    );
    expect(html).toContain('data-min-height="full"');
    expect(html).toContain('Nav');
    expect(html).toContain('data-principal="true"');
    expect(html).toContain('Mission');
    expect(html).toContain('Status');
  });

  it('renders Frame with aspect ratio locking', () => {
    const html = renderToString(
      createElement(
        Frame,
        { ratio: '1:1' },
        createElement('img', { src: 'star.png', alt: 'Star' })
      )
    );
    expect(html).toContain('data-ratio="1:1"');
    expect(html).toContain('<img');
  });

  it('renders Reel horizontal scrolling with snap', () => {
    const html = renderToString(
      createElement(
        Reel,
        { itemWidth: 'sm', snap: true, gap: 'tight' },
        createElement('div', null, 'Item 1'),
        createElement('div', null, 'Item 2')
      )
    );
    expect(html).toContain('data-item-width="sm"');
    expect(html).toContain('data-snap="true"');
    expect(html).toContain('data-gap="tight"');
  });

  it('renders Box container with token slots', () => {
    const html = renderToString(
      createElement(
        Box,
        { padding: 'loose', border: 'accent', background: 'dock' },
        'Box content'
      )
    );
    expect(html).toContain('data-padding="loose"');
    expect(html).toContain('data-border="accent"');
    expect(html).toContain('data-background="dock"');
  });

  it('renders Imposter positioned overlay', () => {
    const html = renderToString(
      createElement(
        Imposter,
        { fixed: true, position: 'top-right', margin: 'tight' },
        'HUD Widget'
      )
    );
    expect(html).toContain('data-fixed="true"');
    expect(html).toContain('data-position="top-right"');
    expect(html).toContain('data-margin="tight"');
  });

  it('renders Icon container with SVG size token', () => {
    const html = renderToString(
      createElement(
        Icon,
        { size: 'lg' },
        createElement('svg', null, createElement('circle', null))
      )
    );
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('aria-hidden="true"');
  });
});

describe('Tier 1: Data Primitives', () => {
  it('renders Datum with tabular numerals and status', () => {
    const html = renderToString(
      createElement(Datum, {
        label: 'Eccentricity',
        value: '0.0167',
        unit: 'e',
        status: 'nominal',
        size: 'sm',
      })
    );
    expect(html).toContain('Eccentricity');
    expect(html).toContain('0.0167');
    expect(html).toContain('e');
    expect(html).toContain('data-status="nominal"');
    expect(html).toContain('data-size="sm"');
  });

  it('renders Metric tile with trend and hero value', () => {
    const html = renderToString(
      createElement(Metric, {
        label: 'Semi-Major Axis',
        value: '1.000',
        unit: 'AU',
        trend: '+0.001 AU drift',
        status: 'info',
      })
    );
    expect(html).toContain('Semi-Major Axis');
    expect(html).toContain('1.000');
    expect(html).toContain('AU');
    expect(html).toContain('+0.001 AU drift');
    expect(html).toContain('data-status="info"');
  });

  it('renders Badge chip with status, category, and confidence metadata', () => {
    const htmlStatus = renderToString(
      createElement(Badge, { status: 'critical' }, 'Offline')
    );
    expect(htmlStatus).toContain('data-status="critical"');
    expect(htmlStatus).toContain('Offline');

    const htmlConfidence = renderToString(
      createElement(Badge, { confidence: 'confirmed', category: 'planet' }, 'Kepler-452b')
    );
    expect(htmlConfidence).toContain('data-confidence="confirmed"');
    expect(htmlConfidence).toContain('data-category="planet"');
  });

  it('renders ConfidencePip dot with confidence level and glow metadata', () => {
    const html = renderToString(
      createElement(ConfidencePip, { confidence: 'confirmed', size: 'md' })
    );
    expect(html).toContain('data-testid="confidence-pip-wrapper"');
    expect(html).toContain('data-confidence="confirmed"');
    expect(html).toContain('data-size="md"');
    expect(html).toContain('data-testid="confidence-pip-dot"');
  });

  it('renders Unit primitive with data-unit and optional parentheses', () => {
    const htmlDefault = renderToString(createElement(Unit, null, 'AU'));
    expect(htmlDefault).toContain('data-unit="true"');
    expect(htmlDefault).toContain('AU');
    expect(htmlDefault).not.toContain('(AU)');

    const htmlParens = renderToString(createElement(Unit, { inParens: true }, 'AU'));
    expect(htmlParens).toContain('data-unit="true"');
    expect(htmlParens).toContain('(AU)');

    const htmlEmpty = renderToString(createElement(Unit, null, ''));
    expect(htmlEmpty).toBe('');

    // Pre-instantiated Unit passed to Datum should not double-wrap
    const htmlPreInstantiated = renderToString(
      createElement(Datum, {
        label: 'Velocity',
        value: '-220',
        unit: createElement(Unit, null, 'km/s'),
      })
    );
    expect(htmlPreInstantiated).toContain('km/s');
    expect((htmlPreInstantiated.match(/data-unit="true"/g) || []).length).toBe(1);
  });

  it('renders Quantity primitive with value, unit, and non-wrapping contract', () => {
    const html = renderToString(
      createElement(Quantity, {
        value: '365.3',
        unit: 'd',
      })
    );
    expect(html).toContain('data-quantity="true"');
    expect(html).toContain('365.3');
    expect(html).toContain('data-unit="true"');
    expect(html).toContain('d');
    expect(html).not.toContain('data-no-gap="true"');

    // Degree symbol automatically sets data-no-gap="true"
    const htmlDegree = renderToString(
      createElement(Quantity, {
        value: '45.2',
        unit: '°',
      })
    );
    expect(htmlDegree).toContain('data-quantity="true"');
    expect(htmlDegree).toContain('data-no-gap="true"');
    expect(htmlDegree).toContain('45.2');
    expect(htmlDegree).toContain('°');

    // Pre-instantiated Unit inside Quantity
    const htmlCustomUnit = renderToString(
      createElement(Quantity, {
        value: '1.496e8',
        unit: createElement(Unit, null, 'km'),
      })
    );
    expect(htmlCustomUnit).toContain('data-quantity="true"');
    expect(htmlCustomUnit).toContain('1.496e8');
    expect(htmlCustomUnit).toContain('km');
    expect((htmlCustomUnit.match(/data-unit="true"/g) || []).length).toBe(1);
  });
});

describe('Tier 1: Control Primitives', () => {
  it('renders Button with variants, sizes, and states', () => {
    const html = renderToString(
      createElement(
        Button,
        { variant: 'primary', size: 'lg', disabled: true },
        'Engage'
      )
    );
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Engage');

    const htmlHighlight = renderToString(
      createElement(
        Button,
        { variant: 'primary', size: 'md' },
        'Focus Target'
      )
    );
    expect(htmlHighlight).toContain('data-variant="primary"');
    expect(htmlHighlight).toContain('data-size="md"');
    expect(htmlHighlight).toContain('Focus Target');
  });

  it('renders Input with tabular formatting and status', () => {
    const html = renderToString(
      createElement(Input, {
        placeholder: 'Search target...',
        status: 'error',
        tabular: true,
        sizeVariant: 'sm',
      })
    );
    expect(html).toContain('placeholder="Search target..."');
    expect(html).toContain('data-status="error"');
    expect(html).toContain('data-tabular="true"');
    expect(html).toContain('data-size="sm"');
  });

  it('renders Toggle switch with ARIA attributes and keyboard support', () => {
    const handleChange = vi.fn();
    const element = createElement(Toggle, {
      checked: true,
      onChange: handleChange,
      label: 'Orbit Lines',
    });
    const html = renderToString(element);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('Orbit Lines');

    // Test click and toggle handlers
    const rendered = Toggle({ checked: false, onChange: handleChange, label: 'Test' });
    rendered.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    expect(handleChange).toHaveBeenCalledWith(true);

    // Disabled toggle
    const disabledToggle = Toggle({ checked: false, onChange: handleChange, disabled: true });
    disabledToggle.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    expect(handleChange).toHaveBeenCalledTimes(1); // not called again

    const htmlDisabled = renderToString(
      createElement(Toggle, {
        checked: false,
        disabled: true,
        onChange: handleChange,
        label: 'Offline Track',
      })
    );
    expect(htmlDisabled).toContain('data-disabled="true"');
    expect(htmlDisabled).toContain('disabled=""');
  });

  it('renders Slider range input with label and readout', () => {
    const handleChange = vi.fn();
    const html = renderToString(
      createElement(Slider, {
        value: 12,
        min: 0,
        max: 20,
        step: 1,
        onChange: handleChange,
        label: 'Magnitude Threshold',
      })
    );
    expect(html).toContain('type="range"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="20"');
    expect(html).toContain('value="12"');
    expect(html).toContain('Magnitude Threshold');

    // Test input change inside React render context
    let inputOnChange: ((e: React.ChangeEvent<HTMLInputElement>) => void) | undefined;
    function SliderHarness() {
      const el = Slider({ value: 12, min: 0, max: 20, onChange: handleChange });
      inputOnChange = el.props.children[1]?.props.onChange;
      return el;
    }
    renderToString(createElement(SliderHarness));
    inputOnChange?.({ target: { value: '15' } } as React.ChangeEvent<HTMLInputElement>);
    expect(handleChange).toHaveBeenCalledWith(15);
  });

  it('renders Select dropdown with options', () => {
    const handleChange = vi.fn();
    const html = renderToString(
      createElement(Select, {
        value: 'sol',
        onChange: handleChange,
        options: [
          { value: 'sol', label: 'Sol' },
          { value: 'alpha-cen', label: 'Alpha Centauri' },
        ],
      })
    );
    expect(html).toContain('<select');
    expect(html).toContain('value="sol"');
    expect(html).toContain('Alpha Centauri');

    // Test select change
    const rendered = Select({
      value: 'sol',
      onChange: handleChange,
      options: [{ value: 'sol', label: 'Sol' }],
    });
    rendered.props.onChange?.({ target: { value: 'alpha-cen' } } as React.ChangeEvent<HTMLSelectElement>);
    expect(handleChange).toHaveBeenCalledWith('alpha-cen');
  });

  it('exports canonical controls and layouts from interface/controls and interface/layouts', async () => {
    const controls = await import('../src/components/interface/controls');
    const layouts = await import('../src/components/interface/layouts');
    const oldControl = await import('../src/components/interface/control');
    const oldLayout = await import('../src/components/interface/layout');

    expect(controls.Button).toBeDefined();
    expect(controls.Button).toBe(oldControl.Button);
    expect(layouts.Stack).toBeDefined();
    expect(layouts.Stack).toBe(oldLayout.Stack);
  });
});
