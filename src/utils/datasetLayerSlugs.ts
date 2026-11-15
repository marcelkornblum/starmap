import { BoundedLruCache } from './lruCache';
import { SLUG_CACHE_LIMIT } from '../config/cacheConfig';

const SLUG_CACHE = new BoundedLruCache<string, string>(SLUG_CACHE_LIMIT);

export function toUrlSlug(value: string): string {
  if (!value) return '';
  const cached = SLUG_CACHE.get(value);
  if (cached !== undefined) return cached;

  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  SLUG_CACHE.set(value, slug);
  return slug;
}

export function splitAliases(aliases: string | undefined): string[] {
  return (aliases ?? '').split(/\s+/).filter((token) => token.length > 0);
}

export function toCanonicalLayerSlug(layerId: string): string {
  const slug = toUrlSlug(layerId);
  return slug.replace(/^(canon|overlay|layer)-/, '');
}

export function toAnnotationLookupKey(targetId: string): string {
  return targetId.includes(':') ? (targetId.split(':')[1] ?? targetId) : targetId;
}

export function findCanonLayerById<T extends { readonly layerId: string }>(
  candidateId: string,
  activeLayers: readonly T[],
): T | undefined {
  const trimmed = candidateId.trim().replace(/^(canon|layer|overlay):/i, '');
  if (!trimmed) return undefined;
  const targetLower = trimmed.toLowerCase();
  const targetSlug = toUrlSlug(trimmed);
  const targetCanonSlug = toCanonicalLayerSlug(trimmed);

  return activeLayers.find((layer) => {
    const layerSlug = toUrlSlug(layer.layerId);
    const layerCanonSlug = toCanonicalLayerSlug(layer.layerId);
    return (
      layer.layerId.toLowerCase() === targetLower ||
      layerSlug === targetSlug ||
      (targetCanonSlug.length > 0 && layerCanonSlug === targetCanonSlug)
    );
  });
}
