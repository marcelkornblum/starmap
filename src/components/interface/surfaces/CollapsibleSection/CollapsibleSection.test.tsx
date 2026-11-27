import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { CollapsibleSection } from './CollapsibleSection';

describe('<CollapsibleSection />', () => {
  it('renders heading, expanded trigger, aria-controls, and body by default', () => {
    render(
      <CollapsibleSection
        title="Telemetry"
        headingId="test-telemetry-heading"
        toggleTestId="test-telemetry-toggle"
        data-testid="test-telemetry-section"
      >
        <div data-testid="test-telemetry-body">Nominal metrics</div>
      </CollapsibleSection>,
    );

    const section = screen.getByTestId('test-telemetry-section');
    expect(section.tagName).toBe('SECTION');
    expect(section.getAttribute('aria-labelledby')).toBe('test-telemetry-heading');
    expect(section.getAttribute('data-expanded')).toBe('true');

    const heading = screen.getByRole('heading', { name: /telemetry/i });
    expect(heading.id).toBe('test-telemetry-heading');
    expect(heading.tagName).toBe('H4');

    const trigger = screen.getByTestId('test-telemetry-toggle');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    const body = screen.getByTestId('test-telemetry-body');
    expect(body).toBeInTheDocument();
    expect(body.parentElement?.id).toBe(controlsId);
  });

  it('generates an automatic headingId when headingId is omitted', () => {
    render(
      <CollapsibleSection
        title="Auto Heading"
        data-testid="auto-heading-section"
      >
        <div>Body</div>
      </CollapsibleSection>,
    );

    const section = screen.getByTestId('auto-heading-section');
    const heading = screen.getByRole('heading', { name: /auto heading/i });
    expect(heading.id).toBeTruthy();
    expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('toggles body visibility, aria-expanded, aria-controls, and data-expanded on click', () => {
    render(
      <CollapsibleSection
        title="Environmental Hazards"
        headingId="test-hazards-heading"
        headingAs="h3"
        toggleTestId="test-hazards-toggle"
        data-testid="test-hazards-section"
      >
        <div data-testid="test-hazards-body">Radiation warning</div>
      </CollapsibleSection>,
    );

    const section = screen.getByTestId('test-hazards-section');
    const heading = screen.getByRole('heading', { level: 3, name: /environmental hazards/i });
    expect(heading).toBeInTheDocument();

    const trigger = screen.getByTestId('test-hazards-toggle');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
    expect(screen.getByTestId('test-hazards-body')).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(section.getAttribute('data-expanded')).toBe('false');
    expect(screen.queryByTestId('test-hazards-body')).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
    expect(section.getAttribute('data-expanded')).toBe('true');
    expect(screen.getByTestId('test-hazards-body')).toBeInTheDocument();
  });

  it('toggles via keyboard Enter and Space keys', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection
        title="Keyboard Section"
        toggleTestId="keyboard-toggle"
        data-testid="keyboard-section"
      >
        <div data-testid="keyboard-body">Keyboard content</div>
      </CollapsibleSection>,
    );

    const section = screen.getByTestId('keyboard-section');
    const trigger = screen.getByTestId('keyboard-toggle');
    act(() => {
      trigger.focus();
    });

    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(section.getAttribute('data-expanded')).toBe('false');
    expect(screen.queryByTestId('keyboard-body')).toBeNull();

    await act(async () => {
      await user.keyboard(' ');
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
    expect(section.getAttribute('data-expanded')).toBe('true');
    expect(screen.getByTestId('keyboard-body')).toBeInTheDocument();
  });

  it('respects defaultOpen={false} and does not toggle when clicking inside actions', () => {
    const onActionClick = vi.fn();
    render(
      <CollapsibleSection
        title="References"
        headingId="test-references-heading"
        defaultOpen={false}
        toggleTestId="test-references-toggle"
        data-testid="test-references-section"
        actions={
          <button
            type="button"
            data-testid="test-references-action"
            onClick={onActionClick}
          >
            2 References
          </button>
        }
      >
        <div data-testid="test-references-body">Reference list</div>
      </CollapsibleSection>,
    );

    const section = screen.getByTestId('test-references-section');
    const trigger = screen.getByTestId('test-references-toggle');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(section.getAttribute('data-expanded')).toBe('false');
    expect(screen.queryByTestId('test-references-body')).toBeNull();
    expect(screen.getByTestId('test-references-action')).toHaveTextContent('2 References');

    fireEvent.click(screen.getByTestId('test-references-action'));
    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(section.getAttribute('data-expanded')).toBe('false');
    expect(screen.queryByTestId('test-references-body')).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
    expect(section.getAttribute('data-expanded')).toBe('true');
    expect(screen.getByTestId('test-references-body')).toBeInTheDocument();
  });

  it('supports controlled open and onOpenChange state', () => {
    const onOpenChange = vi.fn();
    const ControlledHarness = () => {
      const [open, setOpen] = useState(false);
      return (
        <CollapsibleSection
          title="Controlled Section"
          open={open}
          onOpenChange={(nextOpen) => {
            onOpenChange(nextOpen);
            setOpen(nextOpen);
          }}
          toggleTestId="controlled-toggle"
          data-testid="controlled-section"
        >
          <div data-testid="controlled-body">Controlled body</div>
        </CollapsibleSection>
      );
    };

    render(<ControlledHarness />);
    const section = screen.getByTestId('controlled-section');
    const trigger = screen.getByTestId('controlled-toggle');

    expect(section.getAttribute('data-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(screen.queryByTestId('controlled-body')).toBeNull();

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(section.getAttribute('data-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
    expect(screen.getByTestId('controlled-body')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(section.getAttribute('data-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
  });

  it('defines coarse-pointer hit-slop ::after expansion on .trigger in CSS module', () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, 'CollapsibleSection.module.css'), 'utf8');
    expect(css).toMatch(/--collapsible-hit-slop-block:\s*var\(--space-hit-slop-block\)/);
    expect(css).toMatch(/--collapsible-hit-slop-inline:\s*var\(--space-hit-slop-inline\)/);
    expect(css).toMatch(/\.trigger\s*\{[\s\S]*position:\s*relative/);
    expect(css).toMatch(/@media\s*\(\s*pointer:\s*coarse\s*\)/);
    expect(css).toMatch(/\.trigger::after/);
    expect(css).toMatch(/inset-block:\s*var\(--collapsible-hit-slop-block\)/);
    expect(css).toMatch(/inset-inline:\s*var\(--collapsible-hit-slop-inline\)/);
  });
});
