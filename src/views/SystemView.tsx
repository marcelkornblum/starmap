import type React from 'react';
import { useParams } from '@tanstack/react-router';

export interface SystemViewProps {
  systemId?: string;
}

export const SystemView: React.FC<SystemViewProps> = ({ systemId: propSystemId }) => {
  const params = useParams({ strict: false }) as { systemId?: string };
  const systemId = propSystemId ?? params.systemId ?? 'unknown';

  return (
    <div data-testid="system-view" className="starmap-view">
      <h2>System: {systemId}</h2>
      <p>Stellar system orbital plane and planetary member visualization.</p>
    </div>
  );
};
