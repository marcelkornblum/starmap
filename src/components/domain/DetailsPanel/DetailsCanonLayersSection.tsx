import { memo } from 'react';
import type { FocusedCanonAnnotation } from '../../../services/details/detailsCanonTypes';
import { CollapsibleSection, Stack } from '../../interface';
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
    <CollapsibleSection
      title="References"
      headingId="details-canon-heading"
      data-testid="details-canon-section"
    >
      <Stack as="ul" gap="fib-2" data-testid="details-canon-list">
        {canonAnnotations.map((annotation) => (
          <CanonLayerItem
            key={`${annotation.layerId}:${annotation.targetId}`}
            annotation={annotation}
          />
        ))}
      </Stack>
    </CollapsibleSection>
  );
});

DetailsCanonLayersSection.displayName = 'DetailsCanonLayersSection';
