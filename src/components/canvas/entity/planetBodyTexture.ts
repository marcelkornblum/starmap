import * as THREE from 'three';
import type { CelestialClassification } from '../../../types/spatial';
import type { PlanetPalette } from '../../../data/planetPalettes';

const MAX_PLANET_TEXTURE_CACHE_SIZE = 64;
const planetTextureCache = new Map<string, THREE.CanvasTexture>();

export function buildPlanetTextureCacheKey(
  classification: CelestialClassification,
  palette: PlanetPalette,
): string {
  const bandsKey = palette.bands ? palette.bands.join(',') : '';
  return [
    classification,
    palette.baseColor,
    palette.accentColor,
    palette.atmosphereColor ?? '',
    bandsKey,
    palette.spotColor ?? '',
  ].join('|');
}

function createPlanetTexture(
  classification: CelestialClassification,
  palette: PlanetPalette,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = palette.baseColor;
    ctx.fillRect(0, 0, 512, 256);

    if (
      classification === 'gas-giant' ||
      classification === 'ice-giant' ||
      classification === 'brown-dwarf'
    ) {
      const bands = palette.bands ?? [palette.accentColor, palette.baseColor];
      const bandHeight = 256 / bands.length;
      bands.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, i * bandHeight, 512, bandHeight);

        const grad = ctx.createLinearGradient(0, i * bandHeight, 0, (i + 1) * bandHeight);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, i * bandHeight, 512, bandHeight);
      });

      if (classification === 'gas-giant') {
        ctx.fillStyle = palette.spotColor ?? '#b04020';
        ctx.beginPath();
        ctx.ellipse(320, 160, 42, 24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = palette.accentColor;
      for (let i = 0; i < 6; i++) {
        const cx = 80 + i * 70;
        const cy = 70 + (i % 2) * 80;
        ctx.beginPath();
        ctx.arc(cx, cy, 32 + (i % 3) * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(235, 245, 255, 0.85)';
      ctx.fillRect(0, 0, 512, 24);
      ctx.fillRect(0, 232, 512, 24);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  } catch {
    return null;
  }
}

/**
 * Returns a cached procedural 512x256 planetary CanvasTexture keyed by (classification, palette).
 * Shared cached textures are intentionally retained across individual component unmounts.
 */
export function getOrCreatePlanetTexture(
  classification: CelestialClassification,
  palette: PlanetPalette,
): THREE.CanvasTexture | null {
  const key = buildPlanetTextureCacheKey(classification, palette);
  const existing = planetTextureCache.get(key);
  if (existing) {
    return existing;
  }

  const created = createPlanetTexture(classification, palette);
  if (!created) return null;

  if (planetTextureCache.size >= MAX_PLANET_TEXTURE_CACHE_SIZE) {
    const oldestKey = planetTextureCache.keys().next().value;
    if (oldestKey !== undefined) {
      const evicted = planetTextureCache.get(oldestKey);
      planetTextureCache.delete(oldestKey);
      evicted?.dispose();
    }
  }

  planetTextureCache.set(key, created);
  return created;
}

export function clearPlanetTextureCache(): void {
  for (const texture of planetTextureCache.values()) {
    texture.dispose();
  }
  planetTextureCache.clear();
}
