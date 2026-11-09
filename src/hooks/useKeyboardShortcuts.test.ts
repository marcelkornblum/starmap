// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useKeyboardShortcuts,
  isTypingInInputElement,
} from './useKeyboardShortcuts';
import { useCameraStore } from '../stores/useCameraStore';
import { useUIStore } from '../stores/useUIStore';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly identifies whether an element is an input or editable field', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const divEditable = document.createElement('div');
    divEditable.contentEditable = 'true';
    const divNormal = document.createElement('div');

    expect(isTypingInInputElement(input)).toBe(true);
    expect(isTypingInInputElement(textarea)).toBe(true);
    expect(isTypingInInputElement(select)).toBe(true);
    expect(isTypingInInputElement(divEditable)).toBe(true);
    expect(isTypingInInputElement(divNormal)).toBe(false);
    expect(isTypingInInputElement(null)).toBe(false);
  });

  it('focuses the search input when "/" is pressed outside input fields', () => {
    const searchInput = document.createElement('input');
    searchInput.setAttribute('data-testid', 'search-input');
    document.body.appendChild(searchInput);

    const onSearchFocus = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSearchFocus }));

    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true });
    window.dispatchEvent(event);

    expect(onSearchFocus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(searchInput);
  });

  it('does not trigger search focus when "/" is typed inside an input', () => {
    const activeInput = document.createElement('input');
    document.body.appendChild(activeInput);
    activeInput.focus();

    const onSearchFocus = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSearchFocus }));

    const event = new KeyboardEvent('keydown', {
      key: '/',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: activeInput });
    window.dispatchEvent(event);

    expect(onSearchFocus).not.toHaveBeenCalled();
  });

  it('toggles play/pause when Space is pressed outside inputs', () => {
    const onTogglePlay = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onTogglePlay }));

    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true });
    window.dispatchEvent(event);

    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('clicks control-bar-play-pause button when Space is pressed and onTogglePlay is not provided', () => {
    const playBtn = document.createElement('button');
    playBtn.setAttribute('data-testid', 'control-bar-play-pause');
    const clickSpy = vi.fn();
    playBtn.addEventListener('click', clickSpy);
    document.body.appendChild(playBtn);

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true });
    window.dispatchEvent(event);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('does not toggle play when Space is typed inside a textarea', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const onTogglePlay = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onTogglePlay }));

    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea });
    window.dispatchEvent(event);

    expect(onTogglePlay).not.toHaveBeenCalled();
  });

  it('triggers camera recenter when "r" or "R" is pressed', () => {
    const onRecenter = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRecenter }));

    const initialTick = useCameraStore.getState().recenterTick;

    const eventLower = new KeyboardEvent('keydown', { key: 'r', bubbles: true });
    window.dispatchEvent(eventLower);

    expect(useCameraStore.getState().recenterTick).toBe(initialTick + 1);
    expect(onRecenter).toHaveBeenCalledTimes(1);

    const eventUpper = new KeyboardEvent('keydown', { key: 'R', bubbles: true });
    window.dispatchEvent(eventUpper);

    expect(useCameraStore.getState().recenterTick).toBe(initialTick + 2);
    expect(onRecenter).toHaveBeenCalledTimes(2);
  });

  it('does not trigger recenter when typing "r" inside an input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    renderHook(() => useKeyboardShortcuts());
    const initialTick = useCameraStore.getState().recenterTick;

    const event = new KeyboardEvent('keydown', { key: 'r', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(useCameraStore.getState().recenterTick).toBe(initialTick);
  });

  it('closes active drawer when Escape is pressed and a drawer is open', () => {
    useUIStore.getState().setActiveDrawer('bodies');
    expect(useUIStore.getState().activeDrawer).toBe('bodies');

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(event);

    expect(useUIStore.getState().activeDrawer).toBeNull();
  });

  it('calls onClearFocus or clears focus and selection when Escape is pressed with no open drawer', () => {
    const onClearFocus = vi.fn();

    renderHook(() => useKeyboardShortcuts({ onClearFocus }));

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(event);

    expect(onClearFocus).toHaveBeenCalledTimes(1);
  });
});
