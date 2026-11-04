// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('<Modal />', () => {
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

  it('renders a dialog element with role="dialog" and accessible heading', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="System Confirmation">
        Confirm warp drive engagement?
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName.toLowerCase()).toBe('dialog');
    expect(screen.getByRole('heading', { name: 'System Confirmation' })).toBeDefined();
    expect(screen.getByText('Confirm warp drive engagement?')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Alert">
        Message
      </Modal>
    );

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles dialog cancel event', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Warning">
        Details
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking directly on dialog backdrop', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Backdrop Test">
        Inside content
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('invokes showModal and close on open state changes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="State Test">
        Body
      </Modal>
    );

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="State Test">
        Body
      </Modal>
    );

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});
