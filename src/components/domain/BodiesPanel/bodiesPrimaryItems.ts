import type { PlanetCompositionClass } from '../../../content/guide';
import type {
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from '../../../services/details/detailsHierarchyTypes';
import { buildSystemElementFocusHref } from '../../../services/details/detailsNavigation';

export type BodiesPrimaryItem =
  | {
      readonly kind: 'star';
      readonly id: string;
      readonly name: string;
      readonly href?: string;
      readonly spectralType?: string;
    }
  | {
      readonly kind: 'planet';
      readonly id: string;
      readonly name: string;
      readonly href?: string;
      readonly composition: PlanetCompositionClass;
      readonly isHabitableCandidate: boolean;
    }
  | {
      readonly kind: 'disk';
      readonly id: string;
      readonly name: string;
      readonly href: string;
      readonly symbolType: 'asteroid-belt' | 'kuiper-belt' | 'debris-disk' | 'belt';
    }
  | {
      readonly kind: 'dwarf-planet';
      readonly id: string;
      readonly name: string;
      readonly href: string;
    }
  | {
      readonly kind: 'host-planet';
      readonly id: string;
      readonly name: string;
      readonly href: string;
      readonly composition: PlanetCompositionClass;
    }
  | {
      readonly kind: 'moon';
      readonly id: string;
      readonly name: string;
      readonly href: string;
    };

export function buildPrimaryItems(
  elements: SystemBodiesSummary | PlanetaryBodiesSummary,
): BodiesPrimaryItem[] {
  if (elements.scope === 'system') {
    const items: BodiesPrimaryItem[] = [];
    for (const star of elements.stars) {
      items.push({
        kind: 'star',
        id: star.id,
        name: star.name,
        href: star.href,
        spectralType: star.spectralType,
      });
    }
    for (const planet of elements.planets) {
      items.push({
        kind: 'planet',
        id: planet.id,
        name: planet.name,
        href: planet.href,
        composition: planet.composition,
        isHabitableCandidate: planet.isHabitableCandidate,
      });
    }
    for (const disk of elements.disks ?? []) {
      const href =
        'href' in disk && disk.href
          ? disk.href
          : buildSystemElementFocusHref(
              elements.systemName || elements.systemId,
              disk.name || disk.id,
            );
      const symbolType =
        disk.kind === 'asteroid-belt' ||
        disk.kind === 'kuiper-belt' ||
        disk.kind === 'debris-disk'
          ? disk.kind
          : 'belt';
      items.push({
        kind: 'disk',
        id: disk.id,
        name: disk.name,
        href,
        symbolType,
      });
    }
    for (const body of elements.moonsAndDwarfPlanets) {
      if (body.categoryKey === 'dwarf-planet') {
        items.push({
          kind: 'dwarf-planet',
          id: body.id,
          name: body.name,
          href: body.href,
        });
      }
    }
    return items;
  }

  const items: BodiesPrimaryItem[] = [];
  if (elements.planetDetail) {
    items.push({
      kind: 'host-planet',
      id: elements.planetDetail.id,
      name: elements.planetDetail.name,
      href: elements.planetDetail.href ?? elements.planetHref,
      composition: elements.planetDetail.composition,
    });
  }
  for (const moon of elements.moons) {
    items.push({
      kind: 'moon',
      id: moon.id,
      name: moon.name,
      href: moon.href,
    });
  }
  return items;
}
