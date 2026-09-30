import type React from 'react';
import { useParams } from '@tanstack/react-router';

export interface PlanetViewProps {
  planetId?: string;
}

export const PlanetView: React.FC<PlanetViewProps> = ({ planetId: propPlanetId }) => {
  const params = useParams({ strict: false }) as { planetId?: string };
  const planetId = propPlanetId ?? params.planetId ?? 'unknown';

  return (
    <div data-testid="planet-view" className="starmap-view">
      <h2>Body: {planetId}</h2>
      <p>Close-range planetary body inspection and physical telemetry.</p>
    </div>
  );
};
