import { describe, it, expect, vi } from 'vitest';
import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useLazyRef } from '../src/hooks/useLazyRef';

describe('useLazyRef', () => {
  it('initializes ref value once using the provided factory', () => {
    const factory = vi.fn(() => ({ count: 42 }));

    const TestComponent: React.FC = () => {
      const ref = useLazyRef(factory);
      return createElement('div', null, `Count: ${ref.current.count}`);
    };

    const html = renderToString(createElement(TestComponent));
    expect(html).toBe('<div>Count: 42</div>');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('allows mutating ref.current across renders', () => {
    const holder: { ref?: { current: { value: string } } } = {};

    const TestComponent: React.FC = () => {
      const ref = useLazyRef(() => ({ value: 'alpha' }));
      // oxlint-disable-next-line react/immutability
      holder.ref = ref;
      return createElement('div', null, ref.current.value);
    };

    const html1 = renderToString(createElement(TestComponent));
    expect(html1).toBe('<div>alpha</div>');
    expect(holder.ref).toBeDefined();

    if (holder.ref) {
      holder.ref.current.value = 'beta';
      expect(holder.ref.current.value).toBe('beta');
    }
  });
});
