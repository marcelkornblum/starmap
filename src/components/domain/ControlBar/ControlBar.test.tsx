// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ControlBar } from './ControlBar';
import { useSettingsStore } from '../../../stores/useSettingsStore';

describe('ControlBar Domain Component', () => {
  beforeEach(() => {
    act(() => {
      useSettingsStore.setState({
        projection: '3d',
        enableOrthographicProjection: false,
        showOrbits: true,
        showGrid: true,
        showLabels: true,
      });
    });
  });

  it('renders with appropriate scope and accessible heading', () => {
    const { rerender } = render(<ControlBar scope="galaxy" />);

    const bar = screen.getByTestId('control-bar');
    expect(bar.tagName).toBe('SECTION');
    expect(bar.getAttribute('data-scope')).toBe('galaxy');
    expect(bar.getAttribute('data-mobile-expanded')).toBe('false');

    const heading = screen.getByRole('heading', { level: 2, name: /controls/i });
    expect(heading).toBeDefined();

    rerender(<ControlBar scope="system" />);
    expect(screen.getByTestId('control-bar').getAttribute('data-scope')).toBe('system');

    rerender(<ControlBar scope="planet" />);
    expect(screen.getByTestId('control-bar').getAttribute('data-scope')).toBe('planet');
  });

  it('toggles mobile expansion state when clicking mobile toggle button', () => {
    render(<ControlBar scope="galaxy" />);

    const bar = screen.getByTestId('control-bar');
    const mobileToggle = screen.getByTestId('control-bar-mobile-toggle');

    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false');
    expect(mobileToggle.getAttribute('aria-label')).toBe('Expand controls');
    expect(bar.getAttribute('data-mobile-expanded')).toBe('false');

    fireEvent.click(mobileToggle);

    expect(mobileToggle.getAttribute('aria-expanded')).toBe('true');
    expect(mobileToggle.getAttribute('aria-label')).toBe('Minimise controls');
    expect(bar.getAttribute('data-mobile-expanded')).toBe('true');

    fireEvent.click(mobileToggle);

    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false');
    expect(mobileToggle.getAttribute('aria-label')).toBe('Expand controls');
    expect(bar.getAttribute('data-mobile-expanded')).toBe('false');
  });

  it('controls play and pause simulation state via click and space key', () => {
    render(<ControlBar scope="galaxy" />);

    const playPauseBtn = screen.getByTestId('control-bar-play-pause');
    expect(playPauseBtn.textContent).toContain('Play');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(playPauseBtn);

    expect(playPauseBtn.textContent).toContain('Pause');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(playPauseBtn);

    expect(playPauseBtn.textContent).toContain('Play');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('false');

    // Space key triggers shortcut
    fireEvent.keyDown(window, { code: 'Space' });

    expect(playPauseBtn.textContent).toContain('Pause');
    expect(playPauseBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('interacts with time speed slider and datetime input', () => {
    render(<ControlBar scope="galaxy" />);

    const slider = screen.getByRole('slider', { name: /simulation speed scrubber/i });
    expect(slider).toBeDefined();

    fireEvent.change(slider, { target: { value: '42' } });
    expect((slider as HTMLInputElement).value).toBe('42');

    const datetimePicker = screen.getByLabelText(/simulation date and time/i);
    expect(datetimePicker).toBeDefined();

    fireEvent.change(datetimePicker, { target: { value: '2026-11-05T00:00' } });
    expect((datetimePicker as HTMLInputElement).value).toBe('2026-11-05T00:00');
  });

  it('switches between 3D and Top-Down projections and syncs with settings store', () => {
    render(<ControlBar scope="galaxy" />);

    const btn3D = screen.getByTestId('control-bar-projection-3d');
    const btnTopDown = screen.getByTestId('control-bar-projection-top-down');

    expect(btn3D.getAttribute('aria-pressed')).toBe('true');
    expect(btnTopDown.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(btnTopDown);

    expect(useSettingsStore.getState().projection).toBe('top-down');
    expect(useSettingsStore.getState().enableOrthographicProjection).toBe(true);

    fireEvent.click(btn3D);

    expect(useSettingsStore.getState().projection).toBe('3d');
    expect(useSettingsStore.getState().enableOrthographicProjection).toBe(false);
  });

  it('toggles Orbits, Grid, and Labels settings', () => {
    render(<ControlBar scope="galaxy" />);

    const orbitsToggle = screen.getByTestId('control-bar-toggle-orbits');
    const gridToggle = screen.getByTestId('control-bar-toggle-grid');
    const labelsToggle = screen.getByTestId('control-bar-toggle-labels');

    expect(useSettingsStore.getState().showOrbits).toBe(true);
    fireEvent.click(orbitsToggle);
    expect(useSettingsStore.getState().showOrbits).toBe(false);

    expect(useSettingsStore.getState().showGrid).toBe(true);
    fireEvent.click(gridToggle);
    expect(useSettingsStore.getState().showGrid).toBe(false);

    expect(useSettingsStore.getState().showLabels).toBe(true);
    fireEvent.click(labelsToggle);
    expect(useSettingsStore.getState().showLabels).toBe(false);
  });

  it('renders all keyboard shortcut cheatsheet badges', () => {
    render(<ControlBar scope="galaxy" />);

    const list = screen.getByTestId('control-bar-shortcuts-list');
    expect(list).toBeDefined();

    const items = screen.getAllByTestId('control-bar-shortcut-item');
    expect(items.length).toBe(4);

    expect(items[0].textContent).toContain('/');
    expect(items[0].textContent).toContain('Search');

    expect(items[1].textContent).toContain('Space');
    expect(items[1].textContent).toContain('Play/Pause');

    expect(items[2].textContent).toContain('R');
    expect(items[2].textContent).toContain('Reset View');

    expect(items[3].textContent).toContain('Esc');
    expect(items[3].textContent).toContain('Clear Focus');
  });
});
