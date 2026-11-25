import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Block } from './Block';

describe('<Block />', () => {
  it('renders a div by default with data-block="true" and default padding', () => {
    render(<Block data-testid="block">Block Content</Block>);

    const block = screen.getByTestId('block');
    expect(block.tagName).toBe('DIV');
    expect(block.textContent).toBe('Block Content');
    expect(block.getAttribute('data-block')).toBe('true');
    expect(block.getAttribute('data-padding')).toBe('default');
    expect(block.getAttribute('data-interactive')).toBeNull();
    expect(block.getAttribute('data-selected')).toBeNull();
    expect(block.getAttribute('data-tone')).toBeNull();
    expect(block.getAttribute('data-status')).toBeNull();
  });

  it('supports polymorphic semantic element rendering via the as prop', () => {
    const { rerender } = render(
      <Block as="li" data-testid="poly-block">
        List item
      </Block>,
    );
    expect(screen.getByTestId('poly-block').tagName).toBe('LI');

    rerender(
      <Block as="article" data-testid="poly-block">
        Article item
      </Block>,
    );
    expect(screen.getByTestId('poly-block').tagName).toBe('ARTICLE');

    rerender(
      <Block as="section" data-testid="poly-block">
        Section item
      </Block>,
    );
    expect(screen.getByTestId('poly-block').tagName).toBe('SECTION');
  });

  it('applies interactive, selected, tone, status, and padding data attributes', () => {
    const { rerender } = render(
      <Block
        interactive
        selected
        tone="sub"
        status="nominal"
        padding="tight"
        data-testid="state-block"
      >
        Active Block
      </Block>,
    );

    let block = screen.getByTestId('state-block');
    expect(block.getAttribute('data-interactive')).toBe('true');
    expect(block.getAttribute('data-selected')).toBe('true');
    expect(block.getAttribute('data-tone')).toBe('sub');
    expect(block.getAttribute('data-status')).toBe('nominal');
    expect(block.getAttribute('data-padding')).toBe('tight');

    rerender(
      <Block
        interactive={false}
        selected={false}
        tone="default"
        status="critical"
        padding="loose"
        data-testid="state-block"
      >
        Critical Block
      </Block>,
    );

    block = screen.getByTestId('state-block');
    expect(block.getAttribute('data-interactive')).toBeNull();
    expect(block.getAttribute('data-selected')).toBeNull();
    expect(block.getAttribute('data-tone')).toBe('default');
    expect(block.getAttribute('data-status')).toBe('critical');
    expect(block.getAttribute('data-padding')).toBe('loose');

    rerender(
      <Block status="caution" padding="none" data-testid="state-block">
        Caution Block
      </Block>,
    );
    block = screen.getByTestId('state-block');
    expect(block.getAttribute('data-status')).toBe('caution');
    expect(block.getAttribute('data-padding')).toBe('none');
  });

  it('forwards HTML attributes and event handlers while binding CSS Module class statically', () => {
    const onClick = vi.fn();
    render(
      <Block
        role="button"
        tabIndex={0}
        aria-label="Select Alpha Centauri"
        onClick={onClick}
        data-testid="interactive-block"
      >
        Alpha Centauri
      </Block>,
    );

    const block = screen.getByTestId('interactive-block');
    expect(block).toHaveAttribute('class');
    expect(block.className.length).toBeGreaterThan(0);
    expect(block.getAttribute('role')).toBe('button');
    expect(block.getAttribute('tabindex')).toBe('0');
    expect(block.getAttribute('aria-label')).toBe('Select Alpha Centauri');

    fireEvent.click(block);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
