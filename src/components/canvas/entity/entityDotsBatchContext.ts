import React, { createContext, useContext } from 'react';
import type * as THREE from 'three';
import type { NodeAlphaRef } from './types';

export interface EntityDotRegistration {
  id: string;
  groupRef: React.RefObject<THREE.Group | null>;
  worldPosition?: THREE.Vector3 | readonly [number, number, number];
  pixelSize: number;
  color?: string | THREE.Color;
  nodeAlphaRef?: NodeAlphaRef;
}

export interface EntityDotsBatchRegistry extends Iterable<EntityDotRegistration> {
  readonly version: number;
  readonly size: number;
  register(registration: EntityDotRegistration): void;
  unregister(id: string): void;
  markDirty(): void;
  subscribeVersion(listener: () => void): () => void;
  getEntriesArray(): readonly EntityDotRegistration[];
}

export function createEntityDotsBatchRegistry(): EntityDotsBatchRegistry {
  const entriesMap = new Map<string, EntityDotRegistration>();
  const listeners = new Set<() => void>();
  let entriesArray: EntityDotRegistration[] = [];
  let currentVersion = 0;

  const notify = (): void => {
    currentVersion++;
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    get version(): number {
      return currentVersion;
    },
    get size(): number {
      return entriesMap.size;
    },
    register(registration: EntityDotRegistration): void {
      entriesMap.set(registration.id, registration);
      entriesArray = Array.from(entriesMap.values());
      notify();
    },
    unregister(id: string): void {
      if (entriesMap.delete(id)) {
        entriesArray = Array.from(entriesMap.values());
        notify();
      }
    },
    markDirty(): void {
      notify();
    },
    subscribeVersion(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getEntriesArray(): readonly EntityDotRegistration[] {
      return entriesArray;
    },
    [Symbol.iterator](): IterableIterator<EntityDotRegistration> {
      return entriesMap.values();
    },
  };
}

export const EntityDotsBatchContext = createContext<EntityDotsBatchRegistry | null>(null);

export function useEntityDotsBatchRegistry(): EntityDotsBatchRegistry | null {
  return useContext(EntityDotsBatchContext);
}
