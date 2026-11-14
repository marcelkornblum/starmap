import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MetricsListView } from './MetricsListView';

describe('<MetricsListView />', () => {
  it('renders root, breadcrumbs, section nav, heading, and all 13 metric items', () => {
    render(<MetricsListView />);

    const root = screen.getByTestId('metrics-list-view-root');
    expect(root).toBeTruthy();

    const breadcrumbs = screen.getByTestId('view-breadcrumbs');
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.textContent).toContain('Guide');
    expect(breadcrumbs.textContent).toContain('Telemetry Metrics');

    const sectionNav = screen.getByTestId('guide-section-nav');
    expect(sectionNav).toBeTruthy();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Telemetry Metrics');

    const list = screen.getByTestId('metrics-guide-list');
    expect(list).toBeTruthy();

    const items = screen.getAllByTestId('metrics-guide-item');
    expect(items.length).toBe(13);

    const smaItem = items.find((item) => item.getAttribute('data-metric-id') === 'semi-major-axis');
    expect(smaItem).toBeTruthy();
    if (smaItem) {
      const link = within(smaItem).getByTestId('metrics-guide-link');
      expect(link.getAttribute('href')).toBe('/guide/metrics/semi-major-axis');
      expect(link.textContent).toContain('Semi-Major Axis');
      expect(link.textContent).toContain('Familiar Scale');

      const preview = within(smaItem).getByTestId('guide-3d-preview');
      expect(preview.getAttribute('data-preview-kind')).toBe('metric');

      const conversion = within(smaItem).getByTestId('metric-familiar-conversion');
      expect(conversion.textContent).toContain('light-minutes');
    }
  });
});
