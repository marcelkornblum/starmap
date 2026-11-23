import React, { useEffect, useMemo, useState } from 'react';
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
import { useSystemViewModel } from './useSystemViewModel';

export interface SystemViewProps {
  readonly initialCorpus?: readonly CompactSearchEntry[];
  readonly locationPathname?: string;
  readonly locationSearch?: string;
  readonly systemId?: string;
}

const SYSTEM_CONTROLS_NODE = <ControlBar scope="system" />;
const renderSystemSearchResultItem = (
  result: React.ComponentProps<typeof SearchResultItem>['result'],
) => <SearchResultItem key={result.id} result={result} />;

export const SystemView: React.FC<SystemViewProps> = (props) => {
  const { initialCorpus } = props;
  const [panelsReady, setPanelsReady] = useState(
    () => !useUIStore.getState().isCameraTransitioning,
  );

  useEffect(() => {
    if (panelsReady) return;
    let cancelled = false;
    if (!useUIStore.getState().isCameraTransitioning) {
      queueMicrotask(() => {
        if (!cancelled) {
          setPanelsReady(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    const unsubscribe = useUIStore.subscribe((state) => {
      if (!state.isCameraTransitioning && !cancelled) {
        unsubscribe();
        setPanelsReady(true);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [panelsReady]);
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

  const nonCameraSearch = useMemo(() => {
    if (!search || (!search.includes('center=') && !search.includes('x=') && !search.includes('az=') && !search.includes('dist='))) {
      return search;
    }
    const params = new URLSearchParams(search);
    for (const key of ['center', 'x', 'y', 'z', 'az', 'el', 'dist', 'zoom']) {
      params.delete(key);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [search]);

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
    () => (panelsReady ? <BodiesPanel elements={systemBodies} schematic={orbitalSchematic} /> : undefined),
    [panelsReady, systemBodies, orbitalSchematic],
  );

  return (
    <SpatialShell
      testId="system-view-root"
      canvas={canvasNode}
      breadcrumbs={breadcrumbsNode}
      controls={SYSTEM_CONTROLS_NODE}
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
