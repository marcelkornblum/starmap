import type { ReactNode } from 'react';
import type { CelestialSymbolType } from './celestialSymbolMeta';

export const renderGlyphContent = (type: CelestialSymbolType): ReactNode => {
  switch (type) {
    case 'star':
    case 'stellar-system':
    case 'multiple-system':
      return <path d="M 0 -9 L 9 0 L 0 9 L -9 0 Z" />;

    case 'brown-dwarf':
      return <path d="M -5.5 -3.5 L 0 -9 L 5.5 -3.5 M -5.5 3.5 L 0 9 L 5.5 3.5" />;

    case 'white-dwarf':
      return (
        <path d="M -3.2 -5.8 L 0 -9 L 3.2 -5.8 M 5.8 -3.2 L 9 0 L 5.8 3.2 M 3.2 5.8 L 0 9 L -3.2 5.8 M -5.8 3.2 L -9 0 L -5.8 -3.2" />
      );

    case 'neutron-star':
    case 'hazard':
    case 'pulsar':
      return (
        <path d="M -3.2 -5.8 L 0 -9 L 3.2 -5.8 M 5.8 -3.2 L 9 0 L 5.8 3.2 M 3.2 5.8 L 0 9 L -3.2 5.8 M -5.8 3.2 L -9 0 L -5.8 -3.2 M 0 -6.5 L 0 -10.8 M 0 6.5 L 0 10.8 M -6.5 0 L -10.8 0 M 6.5 0 L 10.8 0" />
      );

    case 'black-hole':
      return (
        <path d="M -9.5 0 L -2.5 0 M -4.5 -1.8 L -2.5 0 L -4.5 1.8 M 9.5 0 L 2.5 0 M 4.5 -1.8 L 2.5 0 L 4.5 1.8 M 0 -9.5 L 0 -2.5 M -1.8 -4.5 L 0 -2.5 L 1.8 -4.5 M 0 9.5 L 0 2.5 M -1.8 4.5 L 0 2.5 L 1.8 4.5" />
      );

    case 'barycentre':
      return <path d="M -7.5 0 L -2.2 0 M 2.2 0 L 7.5 0 M 0 -7.5 L 0 -2.2 M 0 2.2 L 0 7.5" />;

    case 'stellar-cluster':
      return <path d="M -6.5 2 L 0 -3 L 6.5 2 M -6.5 -2.5 L 0 -7.5 L 6.5 -2.5" />;

    case 'construct':
    case 'spacecraft':
      return (
        <path d="M -7 -3.5 L -7 -7 L -3.5 -7 M 3.5 -7 L 7 -7 L 7 -3.5 M 7 3.5 L 7 7 L 3.5 7 M -3.5 7 L -7 7 L -7 3.5" />
      );

    case 'terrestrial':
      return <circle cx="0" cy="0" r="5.5" />;

    case 'super-earth':
      return (
        <>
          <circle cx="0" cy="0" r="4" />
          <circle cx="0" cy="0" r="7.5" />
        </>
      );

    case 'gas-giant':
      return (
        <>
          <circle cx="0" cy="0" r="6.5" />
          <path d="M -4.6 4.6 L -1.8 1.8 M 1.8 -1.8 L 4.6 -4.6" />
        </>
      );

    case 'ice-giant':
    case 'sub-neptune':
      return (
        <>
          <circle cx="0" cy="0" r="5.2" />
          <path d="M -4.2 4.2 L -7.4 7.4 M 4.2 -4.2 L 7.4 -7.4" />
        </>
      );

    case 'dwarf-planet':
      return (
        <>
          <circle cx="0" cy="0" r="4.2" />
          <path d="M -8 0 L -4.8 0 M 4.8 0 L 8 0" />
        </>
      );

    case 'moon':
      return (
        <>
          <circle cx="0" cy="1" r="3.6" />
          <path d="M -5.5 -4.5 A 7.5 7.5 0 0 1 5.5 -4.5" />
        </>
      );

    case 'asteroid':
    case 'kuiper-belt-object':
      return <path d="M 0 -5.5 L 4.5 0 L 0 5.5 L -4.5 0 Z" />;

    case 'comet':
      return (
        <>
          <circle cx="-2.5" cy="2.5" r="3.2" />
          <path d="M 0 0.5 L 7.5 -5.5 M -0.5 0 L 5.5 -7.5" />
        </>
      );

    case 'belt':
    case 'asteroid-belt':
    case 'kuiper-belt':
    case 'debris-disk':
    case 'oort-cloud':
      return <circle cx="0" cy="0" r="7" strokeDasharray="2.5 2.5" />;

    case 'nebula':
    case 'ism':
    case 'supernova-remnant':
      return (
        <path d="M -4.5 -5.5 A 4.5 4.5 0 0 1 4.5 -5.5 M 5.5 -4.5 A 4.5 4.5 0 0 1 5.5 4.5 M 4.5 5.5 A 4.5 4.5 0 0 1 -4.5 5.5 M -5.5 4.5 A 4.5 4.5 0 0 1 -5.5 -4.5" />
      );

    case 'habitable-zone':
      return (
        <>
          <circle cx="0" cy="0" r="3.8" />
          <circle cx="0" cy="0" r="7.8" strokeDasharray="2.5 2" />
        </>
      );
  }
};
