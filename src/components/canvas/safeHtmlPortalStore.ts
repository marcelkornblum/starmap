import type React from 'react';

const portalMap = new Map<string, React.ReactPortal>();
const portalIdListeners = new Set<() => void>();
const portalSlotListeners = new Map<string, Set<() => void>>();
let portalIdSnapshot: string[] = [];

function emitPortalIdChange(): void {
  portalIdSnapshot = Array.from(portalMap.keys());
  for (const listener of portalIdListeners) {
    listener();
  }
}

function emitPortalSlotChange(portalId: string): void {
  const listeners = portalSlotListeners.get(portalId);
  if (!listeners) return;
  for (const listener of listeners) {
    listener();
  }
}

export function setPortalEntry(portalId: string, portal: React.ReactPortal): void {
  const isNew = !portalMap.has(portalId);
  portalMap.set(portalId, portal);
  if (isNew) {
    emitPortalIdChange();
  } else {
    emitPortalSlotChange(portalId);
  }
}

export function deletePortalEntry(portalId: string): void {
  if (!portalMap.has(portalId)) return;
  portalMap.delete(portalId);
  emitPortalIdChange();
}

export function subscribePortalIds(listener: () => void): () => void {
  portalIdListeners.add(listener);
  return () => {
    portalIdListeners.delete(listener);
  };
}

export function getPortalIdsSnapshot(): string[] {
  return portalIdSnapshot;
}

const EMPTY_PORTAL_IDS: string[] = [];
export function getServerPortalIdsSnapshot(): string[] {
  return EMPTY_PORTAL_IDS;
}

export function subscribePortalSlot(portalId: string, listener: () => void): () => void {
  let listeners = portalSlotListeners.get(portalId);
  if (!listeners) {
    listeners = new Set();
    portalSlotListeners.set(portalId, listeners);
  }
  listeners.add(listener);
  return () => {
    const current = portalSlotListeners.get(portalId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      portalSlotListeners.delete(portalId);
    }
  };
}

export function getPortalSlotSnapshot(portalId: string): React.ReactPortal | null {
  return portalMap.get(portalId) ?? null;
}

export function getServerPortalSlotSnapshot(): React.ReactPortal | null {
  return null;
}
