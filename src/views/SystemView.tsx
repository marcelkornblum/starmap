import type React from 'react';
import { BodiesPanel } from '../components/domain/BodiesPanel';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { CanvasLayer } from '../components/domain/CanvasLayer';
import { ControlBar } from '../components/domain/ControlBar';
import { DetailsPanel } from '../components/domain/DetailsPanel';
import { DirectionsPanel } from '../components/domain/DirectionsPanel';
import { LayerCard } from '../components/domain/LayerCard';
import { Minimap } from '../components/domain/Minimap';
import { PreviewPanel } from '../components/domain/PreviewPanel';
import { Search } from '../components/domain/Search';
import { SearchResultItem } from '../components/domain/SearchResultItem';
import { SpatialShell } from '../components/domain/SpatialShell';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { useSystemViewModel } from './useSystemViewModel';

export interface SystemViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly systemId?: string;
}

export const SystemView: React.FC<SystemViewProps> = (props) => {
  const { initialCorpus } = props;
  const {
    pathname,
    search,
    targetId,
    effectiveCenterId,
    cameraState,
    activeJourney,
    activeLayerCard,
    focusedDetails,
    orbitalSchematic,
    focusedPreview,
    minimapOrientation,
    systemBodies,
    routeStops,
    resolvedBreadcrumbs,
    handleSelectEntity,
  } = useSystemViewModel(props);

  return (
    <SpatialShell
      testId="system-view-root"
      canvas={
        <CanvasLayer
          scope="system"
          targetId={targetId}
          centerId={effectiveCenterId}
          centerCoordinates={
            cameraState.x !== undefined &&
            cameraState.y !== undefined &&
            cameraState.z !== undefined
              ? [cameraState.x, cameraState.y, cameraState.z]
              : undefined
          }
          cameraAzimuthDeg={cameraState.az}
          cameraElevationDeg={cameraState.el}
          cameraDistance={cameraState.dist}
          journeyLegs={activeJourney?.chordLegs}
          activeJourneyMethod={
            activeJourney?.selectedOption?.id ??
            activeJourney?.options[0]?.id
          }
          onSelect={handleSelectEntity}
        />
      }
      breadcrumbs={<Breadcrumbs items={resolvedBreadcrumbs} />}
      controls={<ControlBar scope="system" />}
      search={
        <Search.Root
          limitPerCategory={3}
          initialCorpus={initialCorpus}
          locationPathname={pathname}
          locationSearch={search}
        >
          <Search.Panel scope="system" />
          <Search.Results
            searchViewPath="/search"
            renderItem={(result) => (
              <SearchResultItem key={result.id} result={result} />
            )}
          />
        </Search.Root>
      }
      layerCard={<LayerCard card={activeLayerCard} />}
      detailsPanel={
        focusedDetails ? (
          <DetailsPanel
            details={focusedDetails}
            schematic={orbitalSchematic}
            preview={focusedPreview}
          />
        ) : undefined
      }
      directionsPanel={
        activeJourney && routeStops && routeStops.length >= 2 ? (
          <DirectionsPanel journey={activeJourney} />
        ) : undefined
      }
      preview={activeJourney ? <PreviewPanel preview={focusedPreview} /> : null}
      minimap={<Minimap orientation={minimapOrientation} />}
      bodies={<BodiesPanel elements={systemBodies} schematic={orbitalSchematic} />}
    />
  );
};
