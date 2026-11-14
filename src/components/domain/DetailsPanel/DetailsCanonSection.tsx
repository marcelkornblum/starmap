import type {
  EntityHazardItem,
  FocusedCanonAnnotation,
} from '../../../services/detailsService';
import {
  buildHazardGuideHref,
  HAZARDS_GUIDE_PATH,
} from '../../../services/guideService';
import { resolveAppHref } from '../../../utils/url';
import {
  DataTable,
  Datum,
  HazardBadge,
  Heading,
  Quantity,
  Stack,
  Unit,
} from '../../interface';
import { CanonLayerItem } from '../CanonLayerItem';

export interface DetailsCanonLayersSectionProps {
  readonly canonAnnotations?: readonly FocusedCanonAnnotation[];
}

export const DetailsCanonLayersSection = ({
  canonAnnotations = [],
}: DetailsCanonLayersSectionProps) => {
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
};

export interface DetailsHazardsSectionProps {
  readonly hazards: readonly EntityHazardItem[];
}

export const DetailsHazardsSection = ({
  hazards,
}: DetailsHazardsSectionProps) => (
  <section
    aria-labelledby="details-hazards-heading"
    data-testid="details-hazards-section"
  >
    <Heading as="h4" size="eyebrow" id="details-hazards-heading">
      Environmental Hazards
    </Heading>
    {hazards.length === 0 ? (
      <Stack gap="none" data-testid="details-hazards-nominal">
        <Datum
          label="Status"
          value="Nominal environment"
          unit={
            <Quantity
              value={0}
              unit={
                <Unit>
                  <a
                    href={resolveAppHref(HAZARDS_GUIDE_PATH)}
                    data-testid="details-hazards-guide-link"
                  >
                    hazards
                  </a>
                </Unit>
              }
            />
          }
        />
      </Stack>
    ) : (
      <DataTable data-testid="details-hazards-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Hazard</DataTable.HeaderCell>
            <DataTable.HeaderCell>Operational Impact</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {hazards.map((hazard) => (
            <DataTable.Row
              key={hazard.code}
              data-testid="details-hazard-item"
              data-hazard-code={hazard.code}
              data-hazard-severity={hazard.severity}
            >
              <DataTable.Cell>
                <HazardBadge
                  code={hazard.code}
                  label={hazard.label}
                  severity={hazard.severity}
                  href={buildHazardGuideHref(hazard.code)}
                  data-testid="details-hazard-guide-link"
                />
              </DataTable.Cell>
              <DataTable.Cell>{hazard.description}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    )}
  </section>
);
