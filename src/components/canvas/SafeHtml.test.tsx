import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { render, screen } from '@testing-library/react';
import { SafeHtml, SafeHtmlPortalOutlet } from './SafeHtml';
import {
  getPortalIdsSnapshot,
  subscribePortalIds,
  subscribePortalSlot,
} from './safeHtmlPortalStore';

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

  it('updates portal A children in O(1) without re-rendering SafeHtmlPortalOutlet or sibling portal B', async () => {
    const portalBRender = vi.fn();
    let setPortalALabel: ((next: string) => void) | null = null;

    const PortalAContainer: React.FC = () => {
      const [label, setLabel] = React.useState('Portal A v1');
      setPortalALabel = setLabel;
      return (
        <SafeHtml data-testid="portal-a" position={[0, 0, 0]}>
          <span>{label}</span>
        </SafeHtml>
      );
    };

    const PortalBContent: React.FC<{ label: string }> = ({ label }) => {
      portalBRender();
      return <span>{label}</span>;
    };

    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <>
        <PortalAContainer />
        <SafeHtml data-testid="portal-b" position={[1, 0, 0]}>
          <PortalBContent label="Portal B static" />
        </SafeHtml>
      </>,
    );

    expect(screen.getByText('Portal A v1')).toBeInTheDocument();
    expect(screen.getByText('Portal B static')).toBeInTheDocument();

    const idsSnapshotBefore = getPortalIdsSnapshot();
    expect(idsSnapshotBefore).toHaveLength(2);
    const [portalAId, portalBId] = idsSnapshotBefore;

    const outletListener = vi.fn();
    const slotAListener = vi.fn();
    const slotBListener = vi.fn();
    const unsubOutlet = subscribePortalIds(outletListener);
    const unsubSlotA = subscribePortalSlot(portalAId, slotAListener);
    const unsubSlotB = subscribePortalSlot(portalBId, slotBListener);

    portalBRender.mockClear();

    await ReactThreeTest.act(async () => {
      setPortalALabel?.('Portal A v2');
    });

    expect(screen.getByText('Portal A v2')).toBeInTheDocument();
    expect(screen.getByText('Portal B static')).toBeInTheDocument();
    expect(getPortalIdsSnapshot()).toBe(idsSnapshotBefore);
    expect(outletListener).not.toHaveBeenCalled();
    expect(slotAListener).toHaveBeenCalledTimes(1);
    expect(slotBListener).not.toHaveBeenCalled();
    expect(portalBRender).not.toHaveBeenCalled();

    unsubOutlet();
    unsubSlotA();
    unsubSlotB();
    await renderer.unmount();
    unmountOutlet();
  });
});
