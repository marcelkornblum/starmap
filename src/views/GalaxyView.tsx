import type React from 'react';

export interface GalaxyViewProps {
  title?: string;
}

export const GalaxyView: React.FC<GalaxyViewProps> = ({ title = 'Galactic Atlas' }) => {
  return (
    <div data-testid="galaxy-view" className="starmap-view">
      <h2>{title}</h2>
      <p>Interactive 3D galactic neighborhood and stellar distribution view.</p>
    </div>
  );
};
