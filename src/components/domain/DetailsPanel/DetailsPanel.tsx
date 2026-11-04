import type {
  FocusedEntityDetails,
  FocusedPreviewSummary,
  OrbitalSchematicSummary,
} from '../../../services/detailsService';
import { DetentSheet, type DetentLevel } from '../../interface/surfaces/DetentSheet';
import { Heading } from '../../interface';
import { useUIStore } from '../../../stores/useUIStore';
import { OrbitalSchematicList } from '../OrbitalSchematicPanel/OrbitalSchematicPanel';
import { PreviewPanel } from '../PreviewPanel';
import { DetailsActionBar } from './DetailsActionBar';
import {
  DetailsCanonLayersSection,
  DetailsHazardsSection,
} from './DetailsCanonAndHazards';
import {
  DetailsPlanetHierarchy,
  DetailsSystemHierarchy,
} from './DetailsHierarchySections';
import { DetailsIdentityHeader } from './DetailsIdentityHeader';
import { DetailsQuickTelemetry } from './DetailsQuickTelemetry';
import { DetailsTelemetrySections } from './DetailsTelemetrySections';

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
export const DetailsPanel = ({
  details,
  activeDetent: propActiveDetent,
  schematic,
  preview,
  isOpen,
  onClose: _onClose,
  onDetentChange: _onDetentChange,
}: DetailsPanelProps) => {
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
      <DetailsQuickTelemetry details={details} />
    </>
  );

  const partialContent = (
    <>
      <DetailsActionBar
        id={id}
        directionsHref={details.directionsHref}
        centerHref={details.centerHref}
        systemDetailsHref={details.systemDetailsHref}
      />
      <DetailsHazardsSection hazards={details.hazards} />
      <DetailsCanonLayersSection canonAnnotations={canonAnnotations} />
      <DetailsPlanetHierarchy
        focusedKind={focusedKind}
        schematic={schematic}
        orbitingBodies={orbitingBodies}
      />
      <DetailsSystemHierarchy
        isSystemFocus={isSystemFocus}
        schematic={schematic}
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
      {!isSystemFocus &&
      schematic &&
      schematic.scope === 'system' &&
      schematic.items.length > 0 ? (
        <section
          aria-labelledby="details-schematic-heading"
          data-testid="orbital-schematic-panel"
          data-scope={schematic.scope}
          data-system-id={schematic.systemId}
        >
          <Heading as="h4" size="eyebrow" id="details-schematic-heading">
            Orbital Schematic
          </Heading>
          <OrbitalSchematicList items={schematic.items} />
        </section>
      ) : null}
      {preview ? <PreviewPanel preview={preview} /> : null}
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
};
