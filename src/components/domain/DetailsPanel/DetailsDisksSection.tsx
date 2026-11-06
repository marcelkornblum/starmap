import {
  buildSystemElementFocusHref,
  type FocusedDiskDetail,
} from '../../../services/detailsService';
import { buildMetricGuideHref } from '../../../services/searchService';
import {
  CelestialTitle,
  Cluster,
  ConfidencePip,
  type ConfidenceLevel,
  DataTable,
  Heading,
  Quantity,
  Unit,
} from '../../interface';

export interface DetailsDisksSectionProps {
  readonly disks?: readonly FocusedDiskDetail[];
  readonly systemNameOrId: string;
}

export const DetailsDisksSection = ({
  disks = [],
  systemNameOrId,
}: DetailsDisksSectionProps) => {
  if (disks.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="details-disks-heading"
      data-testid="details-disks-section"
    >
      <Heading as="h4" size="eyebrow" id="details-disks-heading">
        Circumstellar Belts & Disks
      </Heading>
      <DataTable data-testid="details-disks-list">
        <DataTable.Head>
          <DataTable.Row>
            <DataTable.HeaderCell>Belt / Disk</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Span</DataTable.HeaderCell>
            <DataTable.HeaderCell align="end">Temp</DataTable.HeaderCell>
          </DataTable.Row>
        </DataTable.Head>
        <DataTable.Body>
          {disks.map((disk) => (
            <DataTable.Row
              key={disk.id}
              data-testid="details-disk-item"
              data-disk-id={disk.id}
              data-kind={disk.kind}
            >
              <DataTable.Cell>
                <Cluster gap="tight" align="center">
                  <CelestialTitle
                    type={disk.kind}
                    title={disk.name}
                    href={
                      disk.href ??
                      buildSystemElementFocusHref(
                        systemNameOrId,
                        disk.name || disk.id,
                      )
                    }
                    titleTestId="details-disk-name-link"
                  />
                  {disk.confidence ? (
                    <ConfidencePip
                      confidence={disk.confidence as ConfidenceLevel}
                      size="sm"
                    />
                  ) : null}
                </Cluster>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Quantity
                  value={`${disk.innerRadiusAu}–${disk.outerRadiusAu}`}
                  unit={
                    <Unit>
                      <a
                        href={disk.guideHref}
                        data-testid="details-disk-unit-link"
                      >
                        AU
                      </a>
                    </Unit>
                  }
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {disk.tempK !== undefined ? (
                  <Quantity
                    value={disk.tempK}
                    unit={
                      <Unit>
                        <a
                          href={buildMetricGuideHref(
                            'equilibrium-temperature',
                            disk.id,
                          )}
                          data-testid="details-disk-temp-link"
                        >
                          K
                        </a>
                      </Unit>
                    }
                  />
                ) : (
                  '—'
                )}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>
    </section>
  );
};
