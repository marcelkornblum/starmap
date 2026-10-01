import { describe, it, expect } from 'vitest';
import { isValidElement } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { App } from '../src/App';
import { router } from '../src/router';

describe('App Root Component', () => {
  it('renders RouterProvider configured with application router', () => {
    const vnode = App({});
    expect(isValidElement(vnode)).toBe(true);
    if (isValidElement<{ router: typeof router }>(vnode)) {
      expect(vnode.type).toBe(RouterProvider);
      expect(vnode.props.router).toBe(router);
    }
  });
});

