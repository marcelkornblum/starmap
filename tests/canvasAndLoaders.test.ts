import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { SafeHtml } from '../src/components/canvas/SafeHtml';

describe('SafeHtml & View Lifecycle Safeguards', () => {
  it('renders SafeHtml and SafeHtmlPortalOutlet in SSR cleanly without leaking DOM nodes', () => {
    const html = renderToString(
      createElement(
        SafeHtml,
        { 'data-testid': 'safe-html-overlay', position: [1, 2, 3], className: 'test-class' },
        createElement('span', null, 'Overlay Content'),
      ),
    );
    expect(html).toContain('<group');
    expect(html).not.toContain('<div');
    expect(html).not.toContain('Overlay Content');
  });
});
