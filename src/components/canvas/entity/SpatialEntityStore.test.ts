import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createSpatialEntityStore } from './SpatialEntityStore';
import type { SpatialEntityDefinition } from '../../../types/spatial';

describe('SpatialEntityStore (FSM & Registry)', () => {
  let store: ReturnType<typeof createSpatialEntityStore>;

  beforeEach(() => {
    store = createSpatialEntityStore();
  });

  it('registers and unregisters entities cleanly', () => {
    const entity: SpatialEntityDefinition = {
      id: 'sol',
      name: 'Sol',
      position: [0, 0, 0],
      classification: 'star',
    };

    store.getState().registerEntity(entity);
    expect(store.getState().entities['sol']).toBeDefined();
    expect(store.getState().entities['sol'].name).toBe('Sol');

    store.getState().unregisterEntity('sol');
    expect(store.getState().entities['sol']).toBeUndefined();
  });

  it('manages 4-tier interaction FSM (passive, active, selected, focused)', () => {
    const entity: SpatialEntityDefinition = {
      id: 'sirius',
      name: 'Sirius',
      position: [2.6, 0.5, -1.2],
      classification: 'star',
    };
    store.getState().registerEntity(entity);

    expect(store.getState().getEntityState('sirius')).toBe('passive');

    store.getState().setHovered('sirius');
    expect(store.getState().getEntityState('sirius')).toBe('selected');

    store.getState().setSelected('sirius');
    expect(store.getState().getEntityState('sirius')).toBe('selected');

    store.getState().setFocused('sirius');
    expect(store.getState().getEntityState('sirius')).toBe('focused');

    store.getState().setFocused(null);
    expect(store.getState().getEntityState('sirius')).toBe('selected');

    store.getState().setSelected(null);
    store.getState().setHovered(null);
    expect(store.getState().getEntityState('sirius')).toBe('passive');
  });

  it('sets selection and focus idempotently', () => {
    store.getState().setSelected('sol');
    expect(store.getState().selectedId).toBe('sol');
    store.getState().setSelected('sol');
    expect(store.getState().selectedId).toBe('sol');
    store.getState().setSelected(null);
    expect(store.getState().selectedId).toBeNull();

    store.getState().setFocused('sol');
    expect(store.getState().focusedId).toBe('sol');
    store.getState().setFocused('sol');
    expect(store.getState().focusedId).toBe('sol');
    store.getState().setFocused(null);
    expect(store.getState().focusedId).toBeNull();
  });

  it('derives entity tier via deriveEntityTier in getEntityState', () => {
    const entity: SpatialEntityDefinition = {
      id: 'vega',
      name: 'Vega',
      position: [7.7, 0, 0],
      classification: 'star',
    };
    store.getState().registerEntity(entity);
    expect(store.getState().getEntityState('vega')).toBe('passive');

    store.getState().setEntityInAperture('vega', true);
    expect(store.getState().getEntityState('vega')).toBe('active');

    store.getState().setSelected('vega');
    expect(store.getState().getEntityState('vega')).toBe('selected');

    store.getState().setFocused('vega');
    expect(store.getState().getEntityState('vega')).toBe('focused');
  });

  it('queries entities within a spatial aperture radius', () => {
    store.getState().registerEntity({ id: 'a', name: 'A', position: [0, 0, 0] });
    store.getState().registerEntity({ id: 'b', name: 'B', position: [5, 0, 0] });
    store.getState().registerEntity({ id: 'c', name: 'C', position: [20, 0, 0] });

    const center = new THREE.Vector3(0, 0, 0);
    const inAperture = store.getState().getEntitiesInAperture(center, 10);
    expect(inAperture.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('supports multi-entity selection via setSelectedIds and queries entities by state', () => {
    store.getState().registerEntity({ id: 'sol', name: 'Sol', position: [0, 0, 0] });
    store.getState().registerEntity({ id: 'tau-ceti', name: 'Tau Ceti', position: [-3.1, -0.4, -2.0] });
    store.getState().registerEntity({ id: 'keid', name: 'Keid', position: [-2.5, -3.6, -2.4] });

    store.getState().setSelectedIds(['sol', 'tau-ceti']);
    expect(store.getState().selectedId).toBe('sol');
    expect(store.getState().getEntitiesByState('selected').map((e) => e.id)).toEqual(['sol', 'tau-ceti']);

    store.getState().setSelectedIds(['sol', 'tau-ceti']);
    expect(store.getState().getEntitiesByState('selected').map((e) => e.id)).toEqual(['sol', 'tau-ceti']);

    store.getState().setFocused('tau-ceti');
    expect(store.getState().getEntitiesByState('focused').map((e) => e.id)).toEqual(['tau-ceti']);
    expect(store.getState().getEntitiesByState('selected').map((e) => e.id)).toEqual(['sol']);

    store.getState().setSelectedIds([]);
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().getEntitiesByState('selected')).toEqual([]);
  });
});
