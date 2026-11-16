export const resolveEntityMarkerKind = (
  entity: { readonly classification?: string; readonly type?: string } | null | undefined,
): string => {
  if (!entity) return 'point';
  if (typeof entity.type === 'string' && entity.type.length > 0) return entity.type;
  if (typeof entity.classification === 'string' && entity.classification.length > 0) {
    return entity.classification;
  }
  return 'entity';
};
