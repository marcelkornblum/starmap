import type {
  FocusedEntityKind,
  PlanetCompositionClass,
  SystemSummarySegment,
} from './detailsEntityTypes';

export const buildIntrinsicSystemSummarySegments = (input: {
  readonly name: string;
  readonly systemName: string;
  readonly isChildEntity: boolean;
  readonly focusedKind?: FocusedEntityKind;
  readonly spectralType?: string;
  readonly starCount: number;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly planetComposition?: PlanetCompositionClass;
  readonly planetIsHabitable?: boolean;
  readonly orbitingBodyCount?: number;
  readonly minorBodyCategoryLabel?: string;
  readonly minorBodyParentName?: string;
  readonly manifestOverview?: string;
  readonly structureDescription?: string;
}): readonly SystemSummarySegment[] => {
  if (input.focusedKind === 'planet') {
    const composition = input.planetComposition ?? 'terrestrial';
    const count = input.orbitingBodyCount ?? 0;
    const orbitSuffix =
      count > 0
        ? ` with ${count} catalogued ${count === 1 ? 'body' : 'bodies'} in orbit.`
        : '.';
    const segments: SystemSummarySegment[] = [
      { kind: 'text', text: `${input.name} is a ` },
      { kind: 'planet-type-badge', composition },
    ];
    if (input.planetIsHabitable) {
      segments.push({
        kind: 'text',
        text: ` planet orbiting ${input.systemName}, within the `,
      });
      segments.push({
        kind: 'habitable-badge',
        label: 'habitable zone candidate',
      });
      segments.push({ kind: 'text', text: orbitSuffix });
    } else {
      segments.push({
        kind: 'text',
        text: ` planet orbiting ${input.systemName}${orbitSuffix}`,
      });
    }
    return segments;
  }

  if (input.focusedKind === 'minor-body') {
    const catLabel = (input.minorBodyCategoryLabel ?? 'celestial body').toLowerCase();
    const parentName = input.minorBodyParentName ?? input.systemName;
    const count = input.orbitingBodyCount ?? 0;
    const orbitSuffix =
      count > 0
        ? ` with ${count} catalogued ${count === 1 ? 'body' : 'bodies'} in orbit.`
        : '.';
    const text =
      catLabel === 'spacecraft'
        ? `${input.name} is a spacecraft operating in the ${input.systemName} system.`
        : `${input.name} is a ${catLabel} orbiting ${parentName}${orbitSuffix}`;
    return [{ kind: 'text', text }];
  }

  if (input.focusedKind === 'belt') {
    const count = input.orbitingBodyCount ?? 0;
    const residentSuffix =
      count > 0
        ? ` hosting ${count} catalogued resident ${count === 1 ? 'body' : 'bodies'}.`
        : '.';
    return [
      {
        kind: 'text',
        text: `${input.name} is a circumstellar disk orbiting ${input.systemName}${residentSuffix}`,
      },
    ];
  }

  const allowManifestOverview =
    input.focusedKind === undefined || input.focusedKind === 'system';
  const customProse =
    allowManifestOverview &&
    input.manifestOverview &&
    input.manifestOverview.trim().length > 0
      ? input.manifestOverview.trim()
      : input.structureDescription &&
          input.structureDescription.trim().length > 0
        ? input.structureDescription.trim()
        : undefined;

  if (customProse) {
    return [{ kind: 'text', text: customProse }];
  }

  const segments: SystemSummarySegment[] = [];
  const prefix =
    input.isChildEntity && input.name !== input.systemName
      ? `${input.name} is a catalogued body in the ${input.systemName} `
      : `${input.systemName} is a `;
  segments.push({ kind: 'text', text: prefix });

  if (input.spectralType && input.spectralType !== 'Unknown') {
    segments.push({
      kind: 'spectral-badge',
      spectralType: input.spectralType,
    });
    segments.push({ kind: 'text', text: ' ' });
  }

  const starMultiplicityPart =
    input.starCount > 1
      ? `${input.starCount}-star system`
      : 'stellar system';
  const planetPart =
    input.planetCount > 0
      ? ` hosting ${input.planetCount} confirmed ${input.planetCount === 1 ? 'planet' : 'planets'}`
      : ' with no confirmed exoplanets catalogued';

  if (input.hasHabitableCandidate) {
    segments.push({
      kind: 'text',
      text: `${starMultiplicityPart}${planetPart}, including a `,
    });
    segments.push({
      kind: 'habitable-badge',
      label: 'habitable zone candidate',
    });
    segments.push({ kind: 'text', text: '.' });
  } else {
    segments.push({
      kind: 'text',
      text: `${starMultiplicityPart}${planetPart}.`,
    });
  }

  return segments;
};

export const buildIntrinsicSystemSummary = (input: {
  readonly name: string;
  readonly systemName: string;
  readonly isChildEntity: boolean;
  readonly focusedKind?: FocusedEntityKind;
  readonly spectralType?: string;
  readonly starCount: number;
  readonly planetCount: number;
  readonly hasHabitableCandidate: boolean;
  readonly planetComposition?: PlanetCompositionClass;
  readonly planetIsHabitable?: boolean;
  readonly orbitingBodyCount?: number;
  readonly minorBodyCategoryLabel?: string;
  readonly minorBodyParentName?: string;
  readonly manifestOverview?: string;
  readonly structureDescription?: string;
}): string =>
  buildIntrinsicSystemSummarySegments(input)
    .map((seg) => {
      if (seg.kind === 'text') return seg.text;
      if (seg.kind === 'spectral-badge') return seg.spectralType;
      if (seg.kind === 'planet-type-badge') return seg.composition;
      return seg.label;
    })
    .join('');
