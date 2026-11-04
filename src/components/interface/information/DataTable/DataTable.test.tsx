// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';
import { Unit } from '../Unit/Unit';

describe('<DataTable />', () => {
  it('renders root table container with caption and semantic table elements', () => {
    render(
      <DataTable caption="Planetary Ephemeris">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Target</DataTable.HeaderCell>
            <DataTable.HeaderCell unit="AU" align="end">
              Semi-Major Axis
            </DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          <DataTable.Row>
            <DataTable.Cell>TRAPPIST-1e</DataTable.Cell>
            <DataTable.Cell numeric>0.029</DataTable.Cell>
          </DataTable.Row>
        </DataTable.Body>
      </DataTable>
    );

    const table = screen.getByRole('table', { name: 'Planetary Ephemeris' });
    expect(table).toBeDefined();

    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders).toHaveLength(2);
    expect(columnHeaders[0].textContent).toContain('Target');
    expect(columnHeaders[1].textContent).toContain('Semi-Major Axis');
    expect(columnHeaders[1].getAttribute('data-align')).toBe('end');

    const cells = screen.getAllByRole('cell');
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toBe('TRAPPIST-1e');
    expect(cells[0].getAttribute('data-align')).toBe('start');
    expect(cells[1].textContent).toBe('0.029');
    expect(cells[1].getAttribute('data-numeric')).toBe('true');
    expect(cells[1].getAttribute('data-align')).toBe('end');
  });

  it('renders row states (selected and interactive)', () => {
    render(
      <DataTable>
        <DataTable.Body>
          <DataTable.Row selected interactive data-testid="active-row">
            <DataTable.Cell>Gliese 581g</DataTable.Cell>
          </DataTable.Row>
          <DataTable.Row data-testid="plain-row">
            <DataTable.Cell>Proxima b</DataTable.Cell>
          </DataTable.Row>
        </DataTable.Body>
      </DataTable>
    );

    const activeRow = screen.getByTestId('active-row');
    expect(activeRow.getAttribute('data-selected')).toBe('true');
    expect(activeRow.getAttribute('data-interactive')).toBe('true');

    const plainRow = screen.getByTestId('plain-row');
    expect(plainRow.getAttribute('data-selected')).toBeNull();
    expect(plainRow.getAttribute('data-interactive')).toBeNull();
  });

  it('renders HeaderCell with pre-rendered Unit component or string unit', () => {
    render(
      <DataTable>
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell unit="mas" data-testid="string-unit-th">
              Parallax
            </DataTable.HeaderCell>
            <DataTable.HeaderCell unit={<Unit inParens>km/s</Unit>} data-testid="element-unit-th">
              Radial Velocity
            </DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
      </DataTable>
    );

    const stringTh = screen.getByTestId('string-unit-th');
    expect(stringTh.textContent).toContain('Parallax');
    expect(stringTh.textContent).toContain('mas');

    const elementTh = screen.getByTestId('element-unit-th');
    expect(elementTh.textContent).toContain('Radial Velocity');
    expect(elementTh.textContent).toContain('(km/s)');
  });

  it('allows overriding align on numeric cells', () => {
    render(
      <DataTable>
        <DataTable.Body>
          <DataTable.Row>
            <DataTable.Cell numeric align="start" data-testid="aligned-cell">
              123.45
            </DataTable.Cell>
          </DataTable.Row>
        </DataTable.Body>
      </DataTable>
    );

    const cell = screen.getByTestId('aligned-cell');
    expect(cell.getAttribute('data-numeric')).toBe('true');
    expect(cell.getAttribute('data-align')).toBe('start');
  });
});
