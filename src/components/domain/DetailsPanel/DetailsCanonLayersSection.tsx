import { memo } from 'react';
import type { FocusedCanonAnnotation } from '../../../services/details/detailsCanonTypes';
import { Heading, Stack } from '../../interface';
import { CanonLayerItem } from '../CanonLayerItem';

export interface DetailsCanonLayersSectionProps {
  readonly canonAnnotations?: readonly FocusedCanonAnnotation[];
}

export const DetailsCanonLayersSection = memo(function DetailsCanonLayersSection({
  canonAnnotations = [],
}: DetailsCanonLayersSectionProps) {
  if (canonAnnotations.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-canon-heading"
      data-testid="details-canon-section"
    >
      <Heading as="h4" size="eyebrow" id="details-canon-heading">
        Canon Layers
      </Heading>
      <Stack as="ul" gap="none" data-testid="details-canon-list">
        {canonAnnotations.map((annotation) => (
          <CanonLayerItem
            key={`${annotation.layerId}:${annotation.targetId}`}
            annotation={annotation}
          />
        ))}
      </Stack>
    </section>
  );
});

DetailsCanonLayersSection.displayName = 'DetailsCanonLayersSection';
