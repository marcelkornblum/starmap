import { memo } from 'react';
import type { EntityHazardItem } from '../../../services/details/detailsEntityTypes';
import {
  buildHazardGuideHref,
  HAZARDS_GUIDE_PATH,
} from '../../../content/guide';
import { resolveAppHref } from '../../../utils/url';
import {
  Block,
  Datum,
  HazardBadge,
  Heading,
  Quantity,
  Stack,
  Unit,
} from '../../interface';

export interface DetailsHazardsSectionProps {
  readonly hazards: readonly EntityHazardItem[];
}

export const DetailsHazardsSection = memo(function DetailsHazardsSection({
  hazards,
}: DetailsHazardsSectionProps) {
  return (
    <section
      aria-labelledby="details-hazards-heading"
      data-testid="details-hazards-section"
    >
      <Heading as="h4" size="eyebrow" id="details-hazards-heading">
        Environmental Hazards
      </Heading>
      {hazards.length === 0 ? (
        <Block padding="tight">
          <Stack gap="fib-1" data-testid="details-hazards-nominal">
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
        </Block>
      ) : (
        <Stack as="ul" gap="fib-2" data-testid="details-hazards-list">
          {hazards.map((hazard) => (
            <Block
              as="li"
              key={hazard.code}
              status={hazard.severity === 'critical' ? 'critical' : 'caution'}
              padding="tight"
              data-testid="details-hazard-item"
              data-hazard-code={hazard.code}
              data-hazard-severity={hazard.severity}
            >
              <Stack gap="fib-1">
                <HazardBadge
                  code={hazard.code}
                  label={hazard.label}
                  severity={hazard.severity}
                  href={buildHazardGuideHref(hazard.code)}
                  data-testid="details-hazard-guide-link"
                />
                <span>{hazard.description}</span>
              </Stack>
            </Block>
          ))}
        </Stack>
      )}
    </section>
  );
});

DetailsHazardsSection.displayName = 'DetailsHazardsSection';
