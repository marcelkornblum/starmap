import type { HTMLAttributes } from 'react';
import { Quantity } from '../../interface/information/Quantity/Quantity';
import { CelestialSymbol } from '../../interface/information/CelestialSymbol/CelestialSymbol';
import { Cluster } from '../../interface/layouts/Cluster/Cluster';
import './PlanetCensus.module.css';

export interface PlanetCensusBreakdownItem {
  readonly composition: 'terrestrial' | 'super-earth' | 'ice-giant' | 'gas-giant';
  readonly count?: number;
}

export interface PlanetCensusProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  readonly planetCount: number;
  readonly breakdown?: readonly PlanetCensusBreakdownItem[];
  readonly hasHabitableCandidate?: boolean;
  readonly habitableHref?: string;
  readonly planetTypeHrefBuilder?: (
    composition: 'terrestrial' | 'super-earth' | 'ice-giant' | 'gas-giant',
  ) => string;
  readonly planetTypeTestId?: string;
  readonly habitableTestId?: string;
  readonly 'data-testid'?: string;
}

export const PlanetCensus = ({
  planetCount,
  breakdown,
  hasHabitableCandidate = false,
  habitableHref = '/guide/planet-types/habitable-zone',
  planetTypeHrefBuilder = (c) => `/guide/planet-types/${c}`,
  planetTypeTestId = 'details-summary-planet-type-link',
  habitableTestId = 'details-habitable-zone-link',
  'data-testid': dataTestId,
  ...rest
}: PlanetCensusProps) => {
  if (planetCount <= 0) {
    return (
      <Quantity
        data-testid={dataTestId}
        value={0}
        unit="confirmed planets"
      />
    );
  }

  const hasBreakdown = Boolean(breakdown && breakdown.length > 0);

  return (
    <Cluster
      gap="default"
      align="center"
      data-planet-census="true"
      data-testid={dataTestId}
      {...rest}
    >
      {!hasBreakdown ? (
        <Quantity
          value={planetCount}
          unit={planetCount === 1 ? 'planet' : 'planets'}
        />
      ) : null}
      {breakdown?.map((item) => (
        <Cluster
          key={item.composition}
          gap="dense"
          align="center"
          data-planet-census-item={item.composition}
        >
          {item.count !== undefined ? <Quantity value={item.count} /> : null}
          <CelestialSymbol
            type={item.composition}
            href={planetTypeHrefBuilder(item.composition)}
            data-testid={planetTypeTestId}
          />
        </Cluster>
      ))}
      {hasHabitableCandidate ? (
        <CelestialSymbol
          type="habitable-zone"
          href={habitableHref}
          data-testid={habitableTestId}
        />
      ) : null}
    </Cluster>
  );
};
