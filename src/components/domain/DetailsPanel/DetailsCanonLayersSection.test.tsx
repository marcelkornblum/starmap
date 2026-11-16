import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailsCanonLayersSection } from './DetailsCanonLayersSection';
import type { FocusedCanonAnnotation } from '../../../services/details/detailsCanonTypes';

describe('<DetailsCanonLayersSection />', () => {
  it('returns null when canonAnnotations is empty or missing', () => {
    const { container, rerender } = render(<DetailsCanonLayersSection canonAnnotations={[]} />);
    expect(container.firstChild).toBeNull();

    rerender(<DetailsCanonLayersSection />);
    expect(container.firstChild).toBeNull();
  });

  it('renders section and items when annotations are present', () => {
    const annotations: FocusedCanonAnnotation[] = [
      {
        layerId: 'layer-1',
        layerTitle: 'Test Layer',
        kind: 'fictional-canon',
        targetId: 'sol',
        targetType: 'system',
        text: 'Historical earth solar system',
      },
    ];

    render(<DetailsCanonLayersSection canonAnnotations={annotations} />);
    expect(screen.getByTestId('details-canon-section')).toBeInTheDocument();
    expect(screen.getByTestId('details-canon-list')).toBeInTheDocument();
    expect(screen.getByTestId('details-canon-item')).toBeInTheDocument();
    expect(screen.getByTestId('details-canon-item-title')).toHaveTextContent('sol');
  });

  it('renders deferred items when annotations exceed 8 items', () => {
    const annotations: FocusedCanonAnnotation[] = Array.from({ length: 20 }, (_, i) => ({
      layerId: `layer-${i}`,
      layerTitle: `Layer ${i}`,
      kind: 'fictional-canon',
      targetId: `target-${i}`,
      targetType: 'system',
      text: `Text ${i}`,
    }));

    render(<DetailsCanonLayersSection canonAnnotations={annotations} />);
    expect(screen.getAllByTestId('details-canon-item')).toHaveLength(20);
  });
});
