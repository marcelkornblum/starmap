import {
  buildSystemElementFocusHref,
  type FocusedStarDetail,
} from '../../../services/detailsService';
import {
  buildMetricGuideHref,
  buildStarTypeGuideHref,
} from '../../../services/searchService';
import {
  CelestialTitle,
  DataTable,
  Heading,
  Quantity,
  SpectralBadge,
  Unit,
} from '../../interface';

export interface DetailsStarsSectionProps {
  readonly stars?: readonly FocusedStarDetail[];
  readonly systemNameOrId: string;
}

export const DetailsStarsSection = ({
  stars = [],
  systemNameOrId,
}: DetailsStarsSectionProps) => {
  if (stars.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-stars-heading"
      data-testid="details-stars-section"
    >
      <Heading as="h4" size="eyebrow" id="details-stars-heading">
        Stars
      </Heading>
      <DataTable data-testid="details-stars-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Star</DataTable.HeaderCell>
            <DataTable.HeaderCell>Class</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Apparent Mag</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Absolute Mag</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {stars.map((star) => (
            <DataTable.Row
              key={star.id}
              data-testid="details-star-item"
              data-star-id={star.id}
            >
              <DataTable.Cell>
                <CelestialTitle
                  type="star"
                  title={star.name}
                  href={
                    star.href ??
                    buildSystemElementFocusHref(
                      systemNameOrId,
                      star.name || star.id,
                    )
                  }
                  titleTestId="details-star-name-link"
                />
              </DataTable.Cell>
              <DataTable.Cell>
                <SpectralBadge
                  spectralType={star.spectralType}
                  href={buildStarTypeGuideHref(star.spectralType)}
                  fallback={star.spectralType}
                  data-testid="details-star-spectral-link"
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Quantity
                  value={star.mag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude', star.id)}
                        data-testid="details-metric-unit-link"
                      >
                        V
                      </a>
                    </Unit>
                  }
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Quantity
                  value={star.absmag}
                  unit={
                    <Unit>
                      <a
                        href={buildMetricGuideHref('stellar-magnitude', star.id)}
                        data-testid="details-metric-unit-link"
                      >
                        M_V
                      </a>
                    </Unit>
                  }
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};
