import React, { useMemo } from 'react';
import { BodiesPanel } from '../components/domain/BodiesPanel';
import { Breadcrumbs } from '../components/domain/Breadcrumbs';
import { CanvasLayer } from '../components/domain/CanvasLayer';
import { DetailsPanel } from '../components/domain/DetailsPanel';
import { DirectionsPanel } from '../components/domain/DirectionsPanel';
import { LayerCard } from '../components/domain/LayerCard';
import { Minimap } from '../components/domain/Minimap';
import { PreviewPanel } from '../components/domain/PreviewPanel';
import { Search } from '../components/domain/Search';
import { SearchResultItem } from '../components/domain/SearchResultItem';
import { SpatialShell } from '../components/domain/SpatialShell';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import { handleSpatialTouchPointerMissed } from './spatialTouchMiss';
import { stripCameraSearchParams } from './stripCameraSearchParams';
import { usePanelsReadyAfterTransition } from './usePanelsReadyAfterTransition';
import { useSystemViewModel } from './useSystemViewModel';

export interface SystemViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly systemId?: string;
}

const renderSystemSearchResultItem = (
  result: React.ComponentProps<typeof SearchResultItem>['result'],
) => <SearchResultItem key={result.id} result={result} />;

export const SystemView: React.FC<SystemViewProps> = (props) => {
  const { initialCorpus } = props;
  const panelsReady = usePanelsReadyAfterTransition();
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
    systemBodies,
    routeStops,
    resolvedBreadcrumbs,
    handleSelectEntity,
  } = useSystemViewModel(props);

  const nonCameraSearch = useMemo(() => stripCameraSearchParams(search), [search]);

  const breadcrumbsNode = useMemo(
    () => <Breadcrumbs items={resolvedBreadcrumbs} />,
    [resolvedBreadcrumbs],
  );

  const searchNode = useMemo(
    () => (
      <Search.Root
        limitPerCategory={3}
        initialCorpus={initialCorpus}
        locationPathname={pathname}
        locationSearch={nonCameraSearch}
      >
        <Search.Panel scope="system" />
        <Search.Results
          searchViewPath="/search"
          renderItem={renderSystemSearchResultItem}
        />
      </Search.Root>
    ),
    [initialCorpus, pathname, nonCameraSearch],
  );

  const activeJourneyMethod =
    activeJourney?.selectedOption?.id ?? activeJourney?.options[0]?.id;

  const canvasNode = useMemo(
    () => (
      <CanvasLayer
        scope="system"
        targetId={targetId}
        centerId={effectiveCenterId}
        centerCoordinates={resolvedCenterCoordinates}
        cameraAzimuthDeg={cameraState.az}
        cameraElevationDeg={cameraState.el}
        cameraDistance={cameraState.dist}
        journeyLegs={activeJourney?.chordLegs}
        activeJourneyMethod={activeJourneyMethod}
        onSelect={handleSelectEntity}
        onTouchPointerMissed={handleSpatialTouchPointerMissed}
      />
    ),
    [
      targetId,
      effectiveCenterId,
      resolvedCenterCoordinates,
      cameraState.az,
      cameraState.el,
      cameraState.dist,
      activeJourney?.chordLegs,
      activeJourneyMethod,
      handleSelectEntity,
    ],
  );

  const layerCardNode = useMemo(
    () => <LayerCard card={activeLayerCard} />,
    [activeLayerCard],
  );

  const detailsPanelNode = useMemo(
    () =>
      panelsReady && focusedDetails ? (
        <DetailsPanel
          details={focusedDetails}
          schematic={orbitalSchematic}
          preview={focusedPreview}
        />
      ) : undefined,
    [panelsReady, focusedDetails, orbitalSchematic, focusedPreview],
  );

  const hasMultiStopJourney = Boolean(activeJourney && routeStops && routeStops.length >= 2);
  const directionsPanelNode = useMemo(
    () => (hasMultiStopJourney && activeJourney ? <DirectionsPanel journey={activeJourney} /> : undefined),
    [hasMultiStopJourney, activeJourney],
  );

  const hasActiveJourney = Boolean(activeJourney);
  const previewNode = useMemo(
    () => (hasActiveJourney ? <PreviewPanel preview={focusedPreview} /> : null),
    [hasActiveJourney, focusedPreview],
  );

  const minimapNode = useMemo(
    () => <Minimap orientation={minimapOrientation} />,
    [minimapOrientation],
  );

  const bodiesNode = useMemo(
    () => (panelsReady ? <BodiesPanel elements={systemBodies} /> : undefined),
    [panelsReady, systemBodies],
  );

  return (
    <SpatialShell
      testId="system-view-root"
      canvas={canvasNode}
      breadcrumbs={breadcrumbsNode}
      minimapOrientation={minimapOrientation}
      search={searchNode}
      layerCard={layerCardNode}
      detailsPanel={detailsPanelNode}
      directionsPanel={directionsPanelNode}
      preview={previewNode}
      minimap={minimapNode}
      bodies={bodiesNode}
    />
  );
};
