import type React from 'react';
import {
  BodiesPanel,
  Breadcrumbs,
  CanvasLayer,
  ControlBar,
  DetailsPanel,
  DirectionsPanel,
  LayerCard,
  Minimap,
  PreviewPanel,
  Search,
  SearchResultItem,
  SpatialShell,
} from '../components/domain';
import type { CompactSearchEntry } from '../utils/compactDataCodec';
import { usePlanetViewModel } from './usePlanetViewModel';

export interface PlanetViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly planetId?: string;
}

export const PlanetView: React.FC<PlanetViewProps> = (props) => {
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
    planetaryBodies,
    routeStops,
    resolvedBreadcrumbs,
  } = usePlanetViewModel(props);

  return (
    <SpatialShell
      testId="planet-view-root"
      canvas={
        <CanvasLayer
          scope="planet"
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
      bodies={<BodiesPanel elements={planetaryBodies} schematic={orbitalSchematic} />}
    />
  );
};
