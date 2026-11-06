// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

describe('<Select />', () => {
  const mockOptions = [
    { value: 'all', label: 'All Catalogues' },
    { value: 'gaia', label: 'Gaia DR3' },
    { value: 'hipparcos', label: 'Hipparcos' },
  ];

  it('renders a select element with options and labels', () => {
    render(
      <Select
        options={mockOptions}
        value="gaia"
        onChange={vi.fn()}
        aria-label="Catalogue Source"
      />
    );

    const select = screen.getByLabelText('Catalogue Source') as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.tagName.toLowerCase()).toBe('select');
    expect(select.getAttribute('data-size')).toBe('md');
    expect(select.value).toBe('gaia');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('All Catalogues');
    expect(options[1].textContent).toBe('Gaia DR3');
    expect(options[2].textContent).toBe('Hipparcos');
  });

  it('invokes onChange with newly selected value', () => {
    const handleChange = vi.fn();
    render(
      <Select
        options={mockOptions}
        value="all"
        onChange={handleChange}
        aria-label="Catalogue Source"
      />
    );

    const select = screen.getByLabelText('Catalogue Source');
    fireEvent.change(select, { target: { value: 'hipparcos' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('hipparcos');
  });

  it('reflects sizeVariant on data-size', () => {
    const { rerender } = render(
      <Select
        options={mockOptions}
        value="all"
        onChange={vi.fn()}
        sizeVariant="sm"
        aria-label="Catalogue"
      />
    );
    expect(screen.getByLabelText('Catalogue').getAttribute('data-size')).toBe('sm');

    rerender(
      <Select
        options={mockOptions}
        value="all"
        onChange={vi.fn()}
        sizeVariant="md"
        aria-label="Catalogue"
      />
    );
    expect(screen.getByLabelText('Catalogue').getAttribute('data-size')).toBe('md');
  });

  it('respects disabled state', () => {
    render(
      <Select
        options={mockOptions}
        value="gaia"
        onChange={vi.fn()}
        disabled
        aria-label="Catalogue"
      />
    );
    const select = screen.getByLabelText('Catalogue') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it('forwards native HTML attributes', () => {
    render(
      <Select
        options={mockOptions}
        value="gaia"
        onChange={vi.fn()}
        id="source-selector"
        name="source"
        aria-label="Source"
      />
    );
    const select = screen.getByLabelText('Source');
    expect(select.getAttribute('id')).toBe('source-selector');
    expect(select.getAttribute('name')).toBe('source');
  });

  it('merges custom className with scoped module class', () => {
    render(
      <Select
        options={mockOptions}
        value="gaia"
        onChange={vi.fn()}
        className="custom-select"
        aria-label="Catalogue"
      />
    );
    const select = screen.getByLabelText('Catalogue');
    expect(select.className).toContain('custom-select');
  });
});
