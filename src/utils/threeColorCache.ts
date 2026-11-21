import * as THREE from 'three';

const threeColorCache = new Map<string, THREE.Color>();

/**
 * Returns a cached linear THREE.Color instance for the given hex color string.
 */
export function getThreeColor(hex: string): THREE.Color {
  const normalized = hex.toLowerCase();
  let color = threeColorCache.get(normalized);
  if (!color) {
    color = new THREE.Color(normalized);
    threeColorCache.set(normalized, color);
  }
  return color;
}
