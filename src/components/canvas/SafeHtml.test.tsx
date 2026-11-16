import React from 'react';
import { describe, it, expect } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { render, screen } from '@testing-library/react';
import { SafeHtml, SafeHtmlPortalOutlet } from './SafeHtml';

describe('SafeHtml & View Lifecycle Safeguards', () => {
  it('renders SafeHtml and cleans up cleanly on unmount without leaking DOM nodes', async () => {
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <SafeHtml data-testid="safe-html-overlay" position={[1, 2, 3]} className="test-class">
        <span>Overlay Content</span>
      </SafeHtml>,
    );

    expect(renderer.scene.children).toHaveLength(1);
    expect(renderer.scene.children[0].type).toBe('Group');

    // SafeHtml renders portal through SafeHtmlPortalOutlet to DOM
    expect(screen.getByTestId('safe-html-overlay')).toBeInTheDocument();
    expect(screen.getByText('Overlay Content')).toBeInTheDocument();

    await renderer.unmount();
    unmountOutlet();

    expect(screen.queryByTestId('safe-html-overlay')).toBeNull();
  });

  it('clears initial display:none on frame advance under React.StrictMode layout-effect remounts', async () => {
    const { unmount: unmountOutlet } = render(
      <React.StrictMode>
        <SafeHtmlPortalOutlet />
      </React.StrictMode>,
    );

    const renderer = await ReactThreeTest.create(
      <React.StrictMode>
        <SafeHtml data-testid="strict-safe-html" position={[0, 0, 0]}>
          <span>Focused Star Label</span>
        </SafeHtml>
      </React.StrictMode>,
    );

    await renderer.advanceFrames(2, 16);

    const overlayEl = screen.getByTestId('strict-safe-html');
    const wrapperDiv = overlayEl.parentElement;
    expect(wrapperDiv).not.toBeNull();
    expect(wrapperDiv?.style.display).toBe('');

    await renderer.unmount();
    unmountOutlet();
  });
});
