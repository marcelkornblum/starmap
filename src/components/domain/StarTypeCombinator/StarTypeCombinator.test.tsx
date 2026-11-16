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

    const permalink = screen.getByTestId('combinator-permalink');
    expect(permalink.getAttribute('href')).toContain('/guide/star-types/G2V');
  });

  it('updates classification and recomputes parameters when buttons are clicked', () => {
    render(<StarTypeCombinator initialClass="G" initialSubdivision="2" initialLuminosity="V" />);

    const classSlice = screen.getByTestId('combinator-slice-class');
    const mButton = within(classSlice).getByRole('button', { name: 'M' });
    fireEvent.click(mButton);

    const subSlice = screen.getByTestId('combinator-slice-subdivision');
    const fiveButton = within(subSlice).getByRole('button', { name: '5' });
    fireEvent.click(fiveButton);

    expect(screen.getByText('Classification: M5V')).toBeInTheDocument();
    const permalink = screen.getByTestId('combinator-permalink');
    expect(permalink.getAttribute('href')).toContain('/guide/star-types/M5V');
  });
});
