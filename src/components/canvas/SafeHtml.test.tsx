import React from 'react';
import { createPortal } from 'react-dom';
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import ReactThreeTest from '@react-three/test-renderer';
import { act, render, screen } from '@testing-library/react';
import { SafeHtml, SafeHtmlPortalOutlet } from './SafeHtml';
import {
  deletePortalEntry,
  getPortalIdsSnapshot,
  setPortalEntry,
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

  it('hides container behind camera by default but keeps it visible when frustumCulled={false}', async () => {
    let activeCamera: THREE.Camera | null = null;
    const CameraCapturer: React.FC = () => {
      activeCamera = useThree((s) => s.camera);
      return null;
    };

    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);

    const renderer = await ReactThreeTest.create(
      <>
        <CameraCapturer />
        <SafeHtml data-testid="culled-html" position={[0, 0, 0]}>
          <span>Culled</span>
        </SafeHtml>
        <SafeHtml data-testid="unculled-html" position={[0, 0, 0]} frustumCulled={false}>
          <span>Unculled</span>
        </SafeHtml>
      </>,
    );

    expect(activeCamera).not.toBeNull();
    activeCamera!.position.set(0, 0, -10);
    activeCamera!.lookAt(0, 0, -20);
    activeCamera!.updateMatrixWorld(true);

    await renderer.advanceFrames(1, 16);

    const culledWrapper = screen.getByTestId('culled-html').parentElement;
    const unculledWrapper = screen.getByTestId('unculled-html').parentElement;
    expect(culledWrapper?.style.display).toBe('none');
    expect(unculledWrapper?.style.display).toBe('');

    await renderer.unmount();
    unmountOutlet();
  });

  it('assigns distinct portal IDs across dynamically mounted sibling subtrees and preserves surviving portals on sibling unmount', async () => {
    let setMountedIds: ((ids: string[]) => void) | null = null;

    const DynamicSiblings: React.FC = () => {
      const [ids, setIds] = React.useState<string[]>(['alpha']);
      setMountedIds = setIds;
      return (
        <>
          {ids.map((id, index) => (
            <group key={id} position={[index, 0, 0]}>
              <SafeHtml data-testid={`dynamic-label-${id}`} position={[0, 0, 0]}>
                <span>{`Label ${id}`}</span>
              </SafeHtml>
            </group>
          ))}
        </>
      );
    };

    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const renderer = await ReactThreeTest.create(<DynamicSiblings />);

    expect(screen.getByTestId('dynamic-label-alpha')).toBeInTheDocument();

    await ReactThreeTest.act(async () => {
      setMountedIds?.(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);
    });

    expect(getPortalIdsSnapshot()).toHaveLength(5);
    expect(new Set(getPortalIdsSnapshot()).size).toBe(5);
    for (const id of ['alpha', 'beta', 'gamma', 'delta', 'epsilon']) {
      expect(screen.getByTestId(`dynamic-label-${id}`)).toBeInTheDocument();
    }

    await ReactThreeTest.act(async () => {
      setMountedIds?.(['beta', 'gamma', 'delta', 'epsilon']);
    });

    expect(getPortalIdsSnapshot()).toHaveLength(4);
    expect(screen.queryByTestId('dynamic-label-alpha')).toBeNull();
    for (const id of ['beta', 'gamma', 'delta', 'epsilon']) {
      expect(screen.getByTestId(`dynamic-label-${id}`)).toBeInTheDocument();
    }

    await renderer.unmount();
    unmountOutlet();
  });

  it('re-mounts portal content into a replacement container when deletePortalEntry and setPortalEntry occur synchronously for an existing slot', () => {
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const containerOne = document.createElement('div');
    const containerTwo = document.createElement('div');
    document.body.appendChild(containerOne);
    document.body.appendChild(containerTwo);

    act(() => {
      setPortalEntry(
        'slot-remount-test',
        createPortal(<span>Mounted Label</span>, containerOne, 'slot-remount-test'),
      );
    });
    expect(containerOne.textContent).toContain('Mounted Label');

    act(() => {
      deletePortalEntry('slot-remount-test');
      setPortalEntry(
        'slot-remount-test',
        createPortal(<span>Mounted Label</span>, containerTwo, 'slot-remount-test'),
      );
    });
    expect(containerTwo.textContent).toContain('Mounted Label');

    act(() => {
      deletePortalEntry('slot-remount-test');
    });
    containerOne.remove();
    containerTwo.remove();
    unmountOutlet();
  });
});
