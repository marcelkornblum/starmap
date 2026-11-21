import { describe, expect, it } from 'vitest';
import {
  resolveCanonLayerKindPriority,
  sortCanonAnnotations,
  buildInPlaceLayerItemHref,
  resolveFocusedCanonAnnotations,
  resolveDirectTargetCanonAnnotations,
} from './detailsCanonAnnotations';
import type { FocusedCanonAnnotation } from './detailsCanonTypes';
import type { DecodedEntityAnnotation } from '../../utils/datasetLayerTypes';

describe('detailsCanonAnnotations', () => {
  it('resolves layer kind priority in default order: scientific -> custom -> fictional', () => {
    expect(resolveCanonLayerKindPriority('scientific-overlay')).toBe(0);
    expect(resolveCanonLayerKindPriority('custom-user')).toBe(1);
    expect(resolveCanonLayerKindPriority('fictional-canon')).toBe(2);
  });

  it('sortCanonAnnotations orders annotations by layer kind then stable index', () => {
    const annotations: FocusedCanonAnnotation[] = [
      {
        layerId: 'fic-1',
        layerTitle: 'Fictional',
        kind: 'fictional-canon',
        targetId: 'tau-ceti',
        targetType: 'system',
        text: 'Text 1',
      },
      {
        layerId: 'sci-1',
        layerTitle: 'Scientific',
        kind: 'scientific-overlay',
        targetId: 'tau-ceti',
        targetType: 'system',
        text: 'Text 2',
      },
    ];

    const sorted = sortCanonAnnotations(annotations);
    expect(sorted[0]?.layerId).toBe('sci-1');
    expect(sorted[1]?.layerId).toBe('fic-1');
  });

  it('buildInPlaceLayerItemHref formats query params preserving search state', () => {
    const href = buildInPlaceLayerItemHref('canon-the-expanse', 'sol', 'Sol', '/galaxy?center=sol');
    expect(href).toContain('select=layer:the-expanse');
    expect(href).toContain('layer=the-expanse:sol');
  });

  it('resolveFocusedCanonAnnotations gathers annotations matching target and system', () => {
    const records: DecodedEntityAnnotation[] = [
      {
        layerId: 'sci-exoplanets',
        layerTitle: 'Exoplanets',
        kind: 'scientific-overlay',
        targetId: 'tau-ceti-e',
        systemId: 'tau-ceti',
        targetType: 'planet',
        text: 'Habitable planet candidate',
      },
      {
        layerId: 'fic-space',
        layerTitle: 'Space Lore',
        kind: 'fictional-canon',
        targetId: 'tau-ceti',
        systemId: 'tau-ceti',
        targetType: 'system',
        text: 'System lore',
      },
    ];

    const result = resolveFocusedCanonAnnotations('tau-ceti-e', 'tau-ceti', records);
    expect(result).toHaveLength(2);
    expect(result[0]?.targetId).toBe('tau-ceti-e');
    expect(result[1]?.targetId).toBe('tau-ceti');
  });

  it('resolveFocusedCanonAnnotations preserves query params while replacing select and layer across items', () => {
    const records: DecodedEntityAnnotation[] = [
      {
        layerId: 'canon-expanse',
        layerTitle: 'The Expanse',
        kind: 'fictional-canon',
        targetId: 'earth',
        systemId: 'sol',
        targetType: 'planet',
        text: 'United Nations of Earth',
      },
      {
        layerId: 'canon-mars',
        layerTitle: 'Mars Federation',
        kind: 'fictional-canon',
        targetId: 'mars',
        systemId: 'sol',
        targetType: 'planet',
        text: 'MCRN base',
      },
    ];

    const result = resolveFocusedCanonAnnotations(
      'earth',
      'sol',
      records,
      undefined,
      undefined,
      '/galaxy?center=sol&select=layer:old&layer=old:target',
      '?center=sol&select=layer:old&layer=old:target',
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.href).toBe('/galaxy?center=sol&select=layer:expanse&layer=expanse:earth');
    expect(result[1]?.href).toBe('/galaxy?center=sol&select=layer:mars&layer=mars:mars');
  });

  it('resolveDirectTargetCanonAnnotations matches direct target ids', () => {
    const recordsById: Record<string, DecodedEntityAnnotation[]> = {
      earth: [
        {
          layerId: 'sci-earth',
          layerTitle: 'Earth Science',
          kind: 'scientific-overlay',
          targetId: 'earth',
          systemId: 'sol',
          targetType: 'planet',
          text: 'Home world',
        },
      ],
    };

    const result = resolveDirectTargetCanonAnnotations(['earth'], recordsById);
    expect(result).toHaveLength(1);
    expect(result[0]?.layerId).toBe('sci-earth');
  });
});
