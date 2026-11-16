import { memo } from 'react';
import type { FocusedEntityDetails } from '../../../services/details/detailsEntityTypes';
import type { FocusedPreviewSummary } from '../../../services/details/detailsNavigationTypes';
import type { OrbitalSchematicSummary } from '../../../services/details/detailsHierarchyTypes';
import { DetentSheet, type DetentLevel } from '../../interface/surfaces/DetentSheet';
import { useUIStore } from '../../../stores/useUIStore';
import { DetailsActionControls } from './DetailsActionControls';
import { DetailsHazardsSection } from './DetailsCanonSection';
import { DetailsIdentityHeader } from './DetailsIdentityHeader';
import { DetailsQuickTelemetrySection } from './DetailsQuickTelemetrySection';
import { DetailsTelemetrySections } from './DetailsTelemetrySections';
import {
  DetailsDeferredFull,
  DetailsDeferredPartialLower,
} from './DetailsDeferredSections';

export interface DetailsPanelProps {
  readonly details: FocusedEntityDetails | null;
  readonly activeDetent?: DetentLevel;
  readonly schematic?: OrbitalSchematicSummary | null;
  readonly preview?: FocusedPreviewSummary | null;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
  readonly onDetentChange?: (detent: DetentLevel) => void;
}

/**
 * Domain Component (`<DetailsPanel>`): accepts a single `FocusedEntityDetails | null`
 * domain property (`details`), returns `null` when nothing is focused, and decomposes
 * the focused entity's data into the 3 detent areas (`Peek`, `Partial`, `Full`).
 */
export const DetailsPanel = memo(function DetailsPanel({
  details,
  activeDetent: propActiveDetent,
  schematic,
  preview,
  isOpen,
  onClose: _onClose,
  onDetentChange: _onDetentChange,
}: DetailsPanelProps) {
  const subscribedDetent = useUIStore((s) => s.detailsDetent);
  const storeDetent =
    typeof window === 'undefined'
      ? useUIStore.getState().detailsDetent
      : subscribedDetent;

  const effectiveIsOpen = isOpen !== undefined ? isOpen : storeDetent !== 'collapsed';
  if (!effectiveIsOpen || !details) {
    return null;
  }

  const effectiveDetent: DetentLevel =
    propActiveDetent ?? (storeDetent === 'collapsed' ? 'peek' : storeDetent);

  const {
    id,
    systemId,
    name,
    systemName,
    focusedKind,
    spectralType,
    reticleType,
    starCount,
    stars,
    planets,
    orbitingBodies,
    canonAnnotations = [],
  } = details;

  const isSystemFocus = focusedKind === 'system';

  const peekContent = (
    <>
      <DetailsIdentityHeader
        name={name}
        systemName={systemName}
        reticleType={reticleType}
        focusedKind={focusedKind}
        spectralType={spectralType}
        starCount={starCount}
      />
      <DetailsQuickTelemetrySection details={details} />
    </>
  );

  const partialContent = (
    <>
      <DetailsActionControls
        id={id}
        directionsHref={details.directionsHref}
        centerHref={details.centerHref}
        systemDetailsHref={details.systemDetailsHref}
      />
      <DetailsHazardsSection hazards={details.hazards} />
      <DetailsDeferredPartialLower
        canonAnnotations={canonAnnotations}
        focusedKind={focusedKind}
        isSystemFocus={isSystemFocus}
        schematic={schematic}
        orbitingBodies={orbitingBodies}
        stars={stars}
        planets={planets}
        disks={details.disks}
        systemNameOrId={systemName || systemId}
      />
    </>
  );

  const fullContent = (
    <>
      <DetailsTelemetrySections details={details} />
      <DetailsDeferredFull
        isSystemFocus={isSystemFocus}
        schematic={schematic}
        preview={preview}
      />
    </>
  );

  return (
    <DetentSheet
      testIdPrefix="details"
      heading="Details"
      headingId="details-panel-heading"
      activeDetent={effectiveDetent}
      data-entity-id={id}
      data-system-id={systemId}
      data-focused-kind={focusedKind}
      peek={peekContent}
      partial={partialContent}
      full={fullContent}
    />
  );
});

DetailsPanel.displayName = 'DetailsPanel';
