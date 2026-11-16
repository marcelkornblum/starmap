import React, { useEffect } from 'react';
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
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { SOL_REFERENCE_TARGET } from '../config/referenceTargets';
import { prefetchEntitySelection } from '../services/details/prefetchEntitySelection';
import { useGalaxyViewModel } from './useGalaxyViewModel';

export interface GalaxyViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
}

const GALAXY_BREADCRUMBS = [{ label: 'Galaxy' }];
const GALAXY_BREADCRUMBS_NODE = <Breadcrumbs items={GALAXY_BREADCRUMBS} />;
const GALAXY_CONTROLS_NODE = <ControlBar scope="galaxy" />;

const renderGalaxySearchResultItem = (
  result: React.ComponentProps<typeof SearchResultItem>['result'],
) => <SearchResultItem key={result.id} result={result} />;

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

  useEffect(() => {
    const t = setTimeout(
      () => prefetchEntitySelection(SOL_REFERENCE_TARGET.id, SOL_REFERENCE_TARGET.systemId),
      100,
    );
    return () => clearTimeout(t);
  }, []);

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
      breadcrumbs={GALAXY_BREADCRUMBS_NODE}
      controls={GALAXY_CONTROLS_NODE}
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
            renderItem={renderGalaxySearchResultItem}
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
