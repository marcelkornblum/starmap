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
import { useGalaxyViewModel } from './useGalaxyViewModel';

export interface GalaxyViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const GALAXY_BREADCRUMBS = [{ label: 'Galaxy' }];

export const GalaxyView: React.FC<GalaxyViewProps> = ({
  initialCorpus,
  locationPathname,
  locationSearch,
}) => {
  const {
    pathname,
    search,
    canvasEntities,
    cameraState,
    centerId,
    resolvedCenterCoordinates,
    activeJourney,
    activeLayerCard,
    focusedDetails,
    orbitalSchematic,
    focusedPreview,
    minimapOrientation,
    galaxyBodies,
    routeStops,
    handleHoverEntity,
    handleFocusChange,
    handleSelectSystem,
  } = useGalaxyViewModel({
    initialCorpus,
    locationPathname,
    locationSearch,
  });

  return (
    <SpatialShell
      testId="galaxy-view-root"
      canvas={
        <CanvasLayer
          scope="galaxy"
          selectedEntities={canvasEntities}
          centerId={centerId}
          centerCoordinates={resolvedCenterCoordinates}
          cameraAzimuthDeg={cameraState.az}
          cameraElevationDeg={cameraState.el}
          cameraDistance={cameraState.dist}
          journeyLegs={activeJourney?.chordLegs}
          activeJourneyMethod={
            activeJourney?.selectedOption?.id ??
            activeJourney?.options[0]?.id
          }
          onInspect={handleSelectSystem}
          onSelect={handleSelectSystem}
          onFocusChange={handleFocusChange}
        />
      }
      breadcrumbs={<Breadcrumbs items={GALAXY_BREADCRUMBS} />}
      controls={<ControlBar scope="galaxy" />}
      search={
        <Search.Root
          limitPerCategory={3}
          initialCorpus={initialCorpus}
          locationPathname={pathname}
          locationSearch={search}
        >
          <Search.Panel scope="galaxy" />
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
      bodies={
        <BodiesPanel
          elements={galaxyBodies}
          onHoverEntity={handleHoverEntity}
        />
      }
    />
  );
};
