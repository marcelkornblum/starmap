import React, { useState } from 'react';
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
import { useUIStore } from '../stores/useUIStore';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { usePlanetViewModel } from './usePlanetViewModel';

export interface PlanetViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly planetId?: string;
}

export const PlanetView: React.FC<PlanetViewProps> = (props) => {
  const { initialCorpus } = props;
  const isCameraTransitioning = useUIStore((s) => s.isCameraTransitioning);
  const [panelsReady, setPanelsReady] = useState(() => !isCameraTransitioning);
  if (!isCameraTransitioning && !panelsReady) {
    setPanelsReady(true);
  }
  const {
    pathname,
    search,
    targetId,
    effectiveCenterId,
    resolvedCenterCoordinates,
    cameraState,
    activeJourney,
    activeLayerCard,
    focusedDetails,
    orbitalSchematic,
    focusedPreview,
    minimapOrientation,
    planetaryBodies,
    routeStops,
    resolvedBreadcrumbs,
    handleSelectEntity,
  } = usePlanetViewModel(props);

  return (
    <SpatialShell
      testId="planet-view-root"
      canvas={
        <CanvasLayer
          scope="planet"
          targetId={targetId}
          centerId={effectiveCenterId}
          centerCoordinates={resolvedCenterCoordinates}
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
      controls={<ControlBar scope="planet" />}
      search={
        <Search.Root
          limitPerCategory={3}
          initialCorpus={initialCorpus}
          locationPathname={pathname}
          locationSearch={search}
        >
          <Search.Panel scope="planet" />
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
        panelsReady && focusedDetails ? (
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
      bodies={panelsReady ? <BodiesPanel elements={planetaryBodies} schematic={orbitalSchematic} /> : undefined}
    />
  );
};
