import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Drawer } from './Drawer';

describe('<Drawer />', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.show = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('renders a dialog element with role="dialog", position attribute, and valid CSS module structure', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} position="left" title="Target Filter">
        Filter Content
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName.toLowerCase()).toBe('dialog');
    expect(dialog.getAttribute('data-position')).toBe('left');
    expect(screen.getByRole('heading', { name: 'Target Filter' })).toBeInTheDocument();
    expect(screen.getByText('Filter Content')).toBeInTheDocument();

    const contentContainer = dialog.firstElementChild as HTMLElement;
    expect(contentContainer.className).toMatch(/drawerContent/);

    const header = contentContainer.firstElementChild as HTMLElement;
    expect(header.tagName.toLowerCase()).toBe('header');
    expect(header.className).toMatch(/headerRow/);

    const body = contentContainer.lastElementChild as HTMLElement;
    expect(body.className).toMatch(/body/);

    expect(screen.getByTestId('drawer-close-button')).toBeInTheDocument();
  });

  it('renders optional headerExtra alongside title and close button', () => {
    render(
      <Drawer
        isOpen={true}
        onClose={vi.fn()}
        title="Telemetry"
        headerExtra={<span data-testid="drawer-extra-badge">LIVE</span>}
      >
        Body Content
      </Drawer>
    );

    expect(screen.getByRole('heading', { name: 'Telemetry' })).toBeInTheDocument();
    expect(screen.getByTestId('drawer-extra-badge')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-close-button')).toBeInTheDocument();
  });

  it('renders header with headerExtra and close button even when title is omitted', () => {
    render(
      <Drawer
        isOpen={true}
        onClose={vi.fn()}
        headerExtra={<span data-testid="drawer-extra-only">ACTIONS</span>}
      >
        Body Content
      </Drawer>
    );

    expect(screen.getByTestId('drawer-extra-only')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-close-button')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Navigation">
        Links
      </Drawer>
    );

    const closeBtn = screen.getByTestId('drawer-close-button');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles dialog cancel event', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Options">
        Settings
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking directly on the dialog backdrop', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Backdrop Test">
        Inside content
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('invokes dialog showModal and close methods on isOpen transition', () => {
    const { rerender } = render(
      <Drawer isOpen={true} onClose={vi.fn()} title="Controlled">
        Body
      </Drawer>
    );

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

    rerender(
      <Drawer isOpen={false} onClose={vi.fn()} title="Controlled">
        Body
      </Drawer>
    );

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it('dismisses right drawer on horizontal swipe right > 48px', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} position="right" title="Right Drawer">
        Body
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 160, clientY: 205 }] });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('ignores non-dismissing swipes on right drawer (wrong direction, short distance, vertical-dominant)', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} position="right" title="Right Drawer">
        Body
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');

    // Wrong direction (swipe left)
    fireEvent.touchStart(dialog, { touches: [{ clientX: 200, clientY: 200 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 120, clientY: 200 }] });

    // Too short (<= 48px)
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 148, clientY: 200 }] });

    // Vertical-dominant (deltaX=60, deltaY=80 -> 60 <= 80*1.5)
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 160, clientY: 280 }] });

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('dismisses left drawer on horizontal swipe left > 48px and ignores swipe right', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} position="left" title="Left Drawer">
        Body
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');

    // Wrong direction (swipe right)
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 180, clientY: 200 }] });
    expect(handleClose).not.toHaveBeenCalled();

    // Swipe left
    fireEvent.touchStart(dialog, { touches: [{ clientX: 200, clientY: 200 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 140, clientY: 205 }] });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
