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

  it('unregisters multiple entities in a single notification and does not emit when IDs are absent', () => {
    store.getState().registerEntities([
      { id: 'star-1', name: 'Alpha', position: [0, 0, 0] },
      { id: 'star-2', name: 'Beta', position: [1, 0, 0] },
      { id: 'star-3', name: 'Gamma', position: [2, 0, 0] },
    ]);
    store.getState().setApertureIds(new Set(['star-1', 'star-2', 'star-3']));

    let notifications = 0;
    const unsub = store.subscribe(() => {
      notifications++;
    });

    // Unregister non-existent IDs: 0 notifications
    store.getState().unregisterEntities(['unknown-1', 'unknown-2']);
    expect(notifications).toBe(0);

    // Unregister star-1 and star-2: exactly 1 notification
    store.getState().unregisterEntities(['star-1', 'star-2']);
    expect(notifications).toBe(1);

    expect(store.getState().entities['star-1']).toBeUndefined();
    expect(store.getState().entities['star-2']).toBeUndefined();
    expect(store.getState().entities['star-3']).toBeDefined();

    expect(store.getState().resolveEntityId('alpha')).toBeNull();
    expect(store.getState().resolveEntityId('beta')).toBeNull();
    expect(store.getState().resolveEntityId('gamma')).toBe('star-3');

    expect(store.getState().apertureIds.has('star-1')).toBe(false);
    expect(store.getState().apertureIds.has('star-2')).toBe(false);
    expect(store.getState().apertureIds.has('star-3')).toBe(true);

    unsub();
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

  describe('O(1) resolveEntityId and slug lookup index', () => {
    it('resolves entity by exact ID in O(1)', () => {
      store.getState().registerEntity({ id: 'HD 10180', name: 'HD 10180', position: [0, 0, 0] });
      expect(store.getState().resolveEntityId('HD 10180')).toBe('HD 10180');
    });

    it('resolves entity by slugified ID and slugified display name', () => {
      store.getState().registerEntity({ id: 'gliese-581', name: 'Gliese 581', position: [0, 0, 0] });
      expect(store.getState().resolveEntityId('gliese-581')).toBe('gliese-581');
      expect(store.getState().resolveEntityId('GLIESE 581')).toBe('gliese-581');
      expect(store.getState().resolveEntityId('Gliese-581')).toBe('gliese-581');
      expect(store.getState().resolveEntityId('nonexistent')).toBeNull();
    });

    it('gives ID slug precedence over name slug on conflict', () => {
      // Entity A claims 'rigil-kentaurus' as name
      store.getState().registerEntity({ id: 'alpha-cen-a', name: 'Rigil Kentaurus', position: [0, 0, 0] });
      expect(store.getState().resolveEntityId('rigil-kentaurus')).toBe('alpha-cen-a');

      // Entity B claims 'rigil-kentaurus' as ID
      store.getState().registerEntity({ id: 'rigil-kentaurus', name: 'Rigil Kentaurus System', position: [0, 0, 0] });
      // ID slug should take precedence
      expect(store.getState().resolveEntityId('rigil-kentaurus')).toBe('rigil-kentaurus');

      // Entity C attempts to claim 'rigil-kentaurus' as name, should NOT overwrite Entity B's ID slug
      store.getState().registerEntity({ id: 'star-c', name: 'Rigil Kentaurus', position: [0, 0, 0] });
      expect(store.getState().resolveEntityId('rigil-kentaurus')).toBe('rigil-kentaurus');
    });

    it('updates slug index on updateEntity and cleans up on unregisterEntity and clearEntities', () => {
      store.getState().registerEntity({ id: 'star-1', name: 'Old Name', position: [0, 0, 0] });
      expect(store.getState().resolveEntityId('old-name')).toBe('star-1');

      store.getState().updateEntity('star-1', { name: 'New Name' });
      expect(store.getState().resolveEntityId('new-name')).toBe('star-1');
      expect(store.getState().resolveEntityId('old-name')).toBeNull();

      store.getState().unregisterEntity('star-1');
      expect(store.getState().resolveEntityId('star-1')).toBeNull();
      expect(store.getState().resolveEntityId('new-name')).toBeNull();

      store.getState().registerEntities([
        { id: 'star-a', name: 'Star Alpha', position: [1, 0, 0] },
        { id: 'star-b', name: 'Star Beta', position: [2, 0, 0] },
      ]);
      expect(store.getState().resolveEntityId('star-alpha')).toBe('star-a');
      expect(store.getState().resolveEntityId('star-beta')).toBe('star-b');

      store.getState().clearEntities();
      expect(store.getState().resolveEntityId('star-alpha')).toBeNull();
      expect(store.getState().resolveEntityId('star-beta')).toBeNull();
      expect(Object.keys(store.getState().entities)).toHaveLength(0);
    });
  });
});
