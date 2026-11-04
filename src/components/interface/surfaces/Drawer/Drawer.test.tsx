// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders a dialog element with role="dialog" and position attribute', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} position="left" title="Target Filter">
        Filter Content
      </Drawer>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName.toLowerCase()).toBe('dialog');
    expect(dialog.getAttribute('data-position')).toBe('left');
    expect(screen.getByRole('heading', { name: 'Target Filter' })).toBeDefined();
    expect(screen.getByText('Filter Content')).toBeDefined();
  });

  it('calls onClose when the close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Navigation">
        Links
      </Drawer>
    );

    const closeBtn = screen.getByRole('button', { name: 'Close drawer' });
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
});
