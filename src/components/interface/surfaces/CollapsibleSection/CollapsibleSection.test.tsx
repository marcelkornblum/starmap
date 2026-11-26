import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CollapsibleSection } from './CollapsibleSection';

describe('<CollapsibleSection />', () => {
  it('renders heading, expanded trigger, and body by default', () => {
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
    expect(section.getAttribute('data-collapsed')).toBeNull();

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

  it('toggles body visibility, aria-expanded, and data-collapsed on click', () => {
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
    expect(screen.getByTestId('test-hazards-body')).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(section.getAttribute('data-collapsed')).toBe('true');
    expect(screen.queryByTestId('test-hazards-body')).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(section.getAttribute('data-collapsed')).toBeNull();
    expect(screen.getByTestId('test-hazards-body')).toBeInTheDocument();
  });

  it('respects defaultOpen={false} and renders trailing actions', () => {
    render(
      <CollapsibleSection
        title="Canon Layers"
        headingId="test-canon-heading"
        defaultOpen={false}
        toggleTestId="test-canon-toggle"
        data-testid="test-canon-section"
        actions={<span data-testid="test-canon-count">3</span>}
      >
        <div data-testid="test-canon-body">Layer list</div>
      </CollapsibleSection>,
    );

    const section = screen.getByTestId('test-canon-section');
    const trigger = screen.getByTestId('test-canon-toggle');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(section.getAttribute('data-collapsed')).toBe('true');
    expect(screen.queryByTestId('test-canon-body')).toBeNull();
    expect(screen.getByTestId('test-canon-count')).toHaveTextContent('3');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(section.getAttribute('data-collapsed')).toBeNull();
    expect(screen.getByTestId('test-canon-body')).toBeInTheDocument();
  });
});
