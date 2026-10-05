import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSpatialEntityStore, type SpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import {
  activateEntity,
  focusEntity,
  clearInteraction,
} from '../src/components/canvas/entity/interactionActions';

describe('Entity interaction actions', () => {
  let store: SpatialEntityStore;

  beforeEach(() => {
    store = createSpatialEntityStore();
  });

  describe('activateEntity (single click)', () => {
    it('focuses and selects an unselected entity without consulting cyclic selection', () => {
      const cycle = vi.fn(() => 'neighbour');
      activateEntity(store, 'sirius', cycle);
      expect(store.getState().selectedId).toBe('sirius');
      expect(store.getState().focusedId).toBe('sirius');
      expect(cycle).not.toHaveBeenCalled();
    });

    it('does not treat a hovered-but-unselected entity as already selected', () => {
      const cycle = vi.fn(() => 'neighbour');
      store.getState().setHovered('sirius');
      activateEntity(store, 'sirius', cycle);
      expect(store.getState().selectedId).toBe('sirius');
      expect(store.getState().focusedId).toBe('sirius');
      expect(cycle).not.toHaveBeenCalled();
    });

    it('advances cyclic selection only when re-activating the selected entity', () => {
      const cycle = vi.fn(() => 'neighbour');
      store.getState().setSelected('sirius');
      store.getState().setFocused('sirius');
      activateEntity(store, 'sirius', cycle);
      expect(cycle).toHaveBeenCalledWith('sirius');
      expect(store.getState().selectedId).toBe('neighbour');
      expect(store.getState().focusedId).toBe('neighbour');
    });

    it('deselects the entity when re-activated with no overlapping neighbours', () => {
      store.getState().setSelected('sirius');
      store.getState().setFocused('sirius');
      activateEntity(store, 'sirius');
      expect(store.getState().selectedId).toBeNull();
      expect(store.getState().focusedId).toBeNull();
    });
  });

  describe('focusEntity (double click)', () => {
    it('selects and focuses the entity after the preceding click sequence', () => {
      // Browser sequence for a double-click: click, click, dblclick
      activateEntity(store, 'sirius');
      activateEntity(store, 'sirius');
      focusEntity(store, 'sirius');
      expect(store.getState().selectedId).toBe('sirius');
      expect(store.getState().focusedId).toBe('sirius');
    });

    it('restores the double-clicked entity even if the second click cycled away', () => {
      activateEntity(store, 'sirius');
      activateEntity(store, 'sirius', () => 'neighbour');
      focusEntity(store, 'sirius');
      expect(store.getState().selectedId).toBe('sirius');
      expect(store.getState().focusedId).toBe('sirius');
    });

    it('is idempotent when the entity is already focused', () => {
      focusEntity(store, 'sirius');
      focusEntity(store, 'sirius');
      expect(store.getState().selectedId).toBe('sirius');
      expect(store.getState().focusedId).toBe('sirius');
    });
  });

  describe('clearInteraction (pointer missed)', () => {
    it('clears selection, focus, and hover', () => {
      focusEntity(store, 'sirius');
      store.getState().setHovered('sirius');
      clearInteraction(store);
      expect(store.getState().selectedId).toBeNull();
      expect(store.getState().focusedId).toBeNull();
      expect(store.getState().hoveredId).toBeNull();
    });
  });
});
