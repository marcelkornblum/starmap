import type { FocusedEntityDetails } from '../../../services/detailsService';
import { DetailsAstrometrySection } from './DetailsAstrometrySection';
import { DetailsDiskTelemetrySection } from './DetailsDiskTelemetrySection';
import {
  DetailsMinorBodyTelemetrySection,
  DetailsStructureTelemetrySection,
} from './DetailsOtherTelemetrySections';
import { DetailsPlanetTelemetrySection } from './DetailsPlanetTelemetrySection';
import { DetailsStarTelemetrySection } from './DetailsStarTelemetrySection';

export {
  DetailsAstrometrySection,
  DetailsDiskTelemetrySection,
  DetailsMinorBodyTelemetrySection,
  DetailsPlanetTelemetrySection,
  DetailsStarTelemetrySection,
  DetailsStructureTelemetrySection,
};

export interface DetailsTelemetrySectionsProps {
  readonly details: FocusedEntityDetails;
}

export const DetailsTelemetrySections = ({
  details,
}: DetailsTelemetrySectionsProps) => {
  const {
    id,
    systemId,
    sectorId,
    coordinatesPc,
    tags,
    starTelemetry,
    planetTelemetry,
    diskTelemetry,
    minorBodyTelemetry,
    structureTelemetry,
  } = details;

  return (
    <>
      <DetailsStarTelemetrySection
        starTelemetry={starTelemetry}
        entityId={id}
      />
      <DetailsPlanetTelemetrySection
        planetTelemetry={planetTelemetry}
        entityId={id}
      />
      <DetailsDiskTelemetrySection
        diskTelemetry={diskTelemetry}
        entityId={id}
      />
      <DetailsMinorBodyTelemetrySection
        minorBodyTelemetry={minorBodyTelemetry}
      />
      <DetailsStructureTelemetrySection
        structureTelemetry={structureTelemetry}
        entityId={id}
      />
      <DetailsAstrometrySection
        entityId={id}
        systemId={systemId}
        sectorId={sectorId}
        coordinatesPc={coordinatesPc}
        tags={tags}
      />
    </>
  );
};
