import { Fragment } from 'react';
import {
  buildMetricGuideHref,
  buildTagGalaxyHref,
} from '../../../services/searchService';
import { Badge, Datum, Heading, Stack, Unit } from '../../interface';

export interface DetailsAstrometrySectionProps {
  readonly entityId: string;
  readonly systemId: string;
  readonly sectorId: string;
  readonly coordinatesPc: readonly [number, number, number] | readonly number[];
  readonly tags?: readonly string[];
}

export const DetailsAstrometrySection = ({
  entityId,
  systemId,
  sectorId,
  coordinatesPc,
  tags = [],
}: DetailsAstrometrySectionProps) => {
  return (
    <section
      aria-labelledby="details-astrometry-heading"
      data-testid="details-astrometry-section"
    >
      <Heading as="h4" size="eyebrow" id="details-astrometry-heading">
        Astrometry
      </Heading>
      <Stack gap="none" data-testid="details-astrometry-list">
        <Datum
          label="System ID"
          valueTestId="details-astrometry-system-id"
          value={systemId}
        />
        <Datum
          label="Sector"
          valueTestId="details-astrometry-sector"
          value={sectorId}
        />
        <Datum
          label="Coordinates (J2000 pc)"
          valueTestId="details-astrometry-coords"
          value={`${coordinatesPc[0]}, ${coordinatesPc[1]}, ${coordinatesPc[2]}`}
          unit={
            <Unit>
              <a
                href={buildMetricGuideHref('galactic-coordinates', entityId)}
                data-testid="details-metric-unit-link"
              >
                pc
              </a>
            </Unit>
          }
        />
        {tags.length > 0 ? (
          <Datum
            label="Tags"
            valueTestId="details-astrometry-tags"
            value={
              <>
                {tags.map((tag, index) => (
                  <Fragment key={tag}>
                    {index > 0 ? ' ' : null}
                    <Badge
                      status={
                        tag === 'HabitableCandidate' ? 'nominal' : 'neutral'
                      }
                    >
                      <a
                        href={buildTagGalaxyHref(tag)}
                        data-testid="details-astrometry-tag-link"
                      >
                        {tag}
                      </a>
                    </Badge>
                  </Fragment>
                ))}
              </>
            }
          />
        ) : null}
      </Stack>
    </section>
  );
};
