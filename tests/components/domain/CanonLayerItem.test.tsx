// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanonLayerItem } from '../../../src/components/domain/CanonLayerItem/CanonLayerItem';
import type { FocusedCanonAnnotation } from '../../../src/services/details/types';

describe('DEC-041: <CanonLayerItem /> Component', () => {
  const sampleAnnotation: FocusedCanonAnnotation = {
    layerId: 'layer-project-hail-mary',
    layerTitle: 'Project Hail Mary',
    layerHref: '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    href: '/system/tau-ceti?select=layer:project-hail-mary&layer=project-hail-mary:erid',
    kind: 'fictional-canon',
    targetId: 'erid',
    targetType: 'planet',
    inUniverseName: 'Erid',
    subtitle: '40 Eridani System',
    text: 'Homeworld of the Eridians.',
  };

  it('renders the canon name on the left as a link without duplicate layer title prefix', () => {
    render(<CanonLayerItem annotation={sampleAnnotation} />);

    const link = screen.getByTestId('details-canon-item-link');
    expect(link.getAttribute('href')).toBe(
      '/system/tau-ceti?select=layer:project-hail-mary&layer=project-hail-mary:erid',
    );

    const title = screen.getByTestId('details-canon-item-title');
    expect(title.textContent).toBe('Erid');
    expect(title.textContent).not.toContain('Project Hail Mary');
    expect(title.textContent).not.toContain('—');
  });

  it('renders the layer badge on the right with link to layer overview', () => {
    render(<CanonLayerItem annotation={sampleAnnotation} />);

    const badge = screen.getByTestId('details-canon-link');
    expect(badge.textContent).toBe('Project Hail Mary');
    expect(badge.getAttribute('href')).toBe(
      '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
    );
    expect(badge.getAttribute('data-status')).toBe('neutral');

    // Title precedes Badge in document order (title on left, badge on right)
    const title = screen.getByTestId('details-canon-item-title');
    const position = title.compareDocumentPosition(badge);
    expect((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
  });

  it('renders subtitle under the canon name with ZERO brackets', () => {
    render(<CanonLayerItem annotation={sampleAnnotation} />);

    const subtitle = screen.getByTestId('details-canon-item-subtitle');
    expect(subtitle.textContent).toBe('40 Eridani System');
    expect(subtitle.textContent).not.toContain('(');
    expect(subtitle.textContent).not.toContain(')');
    expect(subtitle.textContent).not.toContain('[');
    expect(subtitle.textContent).not.toContain(']');
  });

  it('omits subtitle element when annotation.subtitle is absent', () => {
    const withoutSubtitle: FocusedCanonAnnotation = {
      ...sampleAnnotation,
      subtitle: undefined,
    };
    render(<CanonLayerItem annotation={withoutSubtitle} />);

    expect(screen.queryByTestId('details-canon-item-subtitle')).toBeNull();
  });

  it('has ZERO accordion (<details> or <summary>) and no accordion testids', () => {
    const { container } = render(<CanonLayerItem annotation={sampleAnnotation} />);

    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
    expect(screen.queryByTestId('details-canon-accordion')).toBeNull();
    expect(screen.queryByTestId('details-canon-summary')).toBeNull();
    expect(screen.queryByTestId('details-canon-text')).toBeNull();
  });

  it('renders semantic attributes data-layer-id, data-layer-kind, and data-target-id', () => {
    render(<CanonLayerItem annotation={sampleAnnotation} />);

    const item = screen.getByTestId('details-canon-item');
    expect(item.getAttribute('data-layer-id')).toBe('layer-project-hail-mary');
    expect(item.getAttribute('data-layer-kind')).toBe('fictional-canon');
    expect(item.getAttribute('data-target-id')).toBe('erid');
  });

  it('renders info badge status for scientific overlays', () => {
    const scientificAnnotation: FocusedCanonAnnotation = {
      ...sampleAnnotation,
      kind: 'scientific-overlay',
      layerTitle: 'Recent Discoveries',
    };
    render(<CanonLayerItem annotation={scientificAnnotation} />);

    const badge = screen.getByTestId('details-canon-link');
    expect(badge.getAttribute('data-status')).toBe('info');
  });

  it('falls back to resolvedName or targetId when inUniverseName is absent (never layerTitle)', () => {
    const fallbackAnnotation: FocusedCanonAnnotation = {
      ...sampleAnnotation,
      inUniverseName: undefined,
      resolvedName: 'LHS 1140 b',
    };
    const { unmount } = render(<CanonLayerItem annotation={fallbackAnnotation} />);

    const title = screen.getByTestId('details-canon-item-title');
    expect(title.textContent).toBe('LHS 1140 b');
    unmount();

    const targetIdFallback: FocusedCanonAnnotation = {
      ...sampleAnnotation,
      inUniverseName: undefined,
      resolvedName: undefined,
      targetId: 'gaia-2452378776434477184',
    };
    render(<CanonLayerItem annotation={targetIdFallback} />);
    const targetTitle = screen.getByTestId('details-canon-item-title');
    expect(targetTitle.textContent).toBe('gaia-2452378776434477184');
    expect(targetTitle.textContent).not.toBe('Project Hail Mary');
  });
});
