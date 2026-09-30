import type React from 'react';

export interface ReferenceViewProps {
  section?: string;
}

export const ReferenceView: React.FC<ReferenceViewProps> = ({ section = 'General' }) => {
  return (
    <div data-testid="reference-view" className="starmap-view">
      <h2>Encyclopedia & Reference: {section}</h2>
      <p>Astronomical reference guides, astrophysics terminology, and pilot lore.</p>
    </div>
  );
};
