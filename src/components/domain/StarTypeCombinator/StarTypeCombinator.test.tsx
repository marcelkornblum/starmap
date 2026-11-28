import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StarTypeCombinator } from './StarTypeCombinator';

describe('<StarTypeCombinator />', () => {
  it('renders with default G2V classification and telemetry', () => {
    render(<StarTypeCombinator />);

    expect(screen.getByTestId('star-type-combinator')).toBeInTheDocument();
    expect(screen.getByText('Classification: G2V')).toBeInTheDocument();

    const telemetry = screen.getByTestId('combinator-computed-telemetry');
    expect(telemetry).toBeInTheDocument();
    expect(telemetry.textContent).not.toContain('var(--');

    const chromaticity = screen.getByTestId('combinator-chromaticity');
    expect(chromaticity).toHaveTextContent('Class G');
    expect(chromaticity.querySelector('[data-spectral-class="g"]')).not.toBeNull();

    const classSlice = screen.getByTestId('combinator-slice-class');
    const gButton = within(classSlice).getByRole('button', { name: 'G' });
    expect(gButton).toHaveAttribute('data-variant', 'subtle');
    expect(gButton).toHaveAttribute('data-selected', 'true');
    const oButton = within(classSlice).getByRole('button', { name: 'O' });
    expect(oButton).toHaveAttribute('data-variant', 'subtle');
    expect(oButton).not.toHaveAttribute('data-selected');

    const permalink = screen.getByTestId('combinator-permalink');
    expect(permalink.getAttribute('href')).toContain('/guide/star-types/G2V');
    expect(permalink).toHaveAttribute('data-variant', 'default');
    expect(permalink).toHaveAttribute('data-size', 'sm');
  });

  it('updates classification and recomputes parameters when buttons are clicked', () => {
    render(<StarTypeCombinator initialClass="G" initialSubdivision="2" initialLuminosity="V" />);

    const classSlice = screen.getByTestId('combinator-slice-class');
    const mButton = within(classSlice).getByRole('button', { name: 'M' });
    fireEvent.click(mButton);
    expect(mButton).toHaveAttribute('data-selected', 'true');

    const subSlice = screen.getByTestId('combinator-slice-subdivision');
    const fiveButton = within(subSlice).getByRole('button', { name: '5' });
    fireEvent.click(fiveButton);
    expect(fiveButton).toHaveAttribute('data-selected', 'true');

    expect(screen.getByText('Classification: M5V')).toBeInTheDocument();
    const chromaticity = screen.getByTestId('combinator-chromaticity');
    expect(chromaticity).toHaveTextContent('Class M');
    expect(chromaticity.querySelector('[data-spectral-class="m"]')).not.toBeNull();
    const permalink = screen.getByTestId('combinator-permalink');
    expect(permalink.getAttribute('href')).toContain('/guide/star-types/M5V');
  });
});
