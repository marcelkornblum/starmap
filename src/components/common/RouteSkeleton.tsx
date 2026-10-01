import type React from 'react';

export interface RouteSkeletonProps {
  label?: string;
}

export const RouteSkeleton: React.FC<RouteSkeletonProps> = ({
  label = 'Loading Target Telemetry...',
}) => {
  return (
    <div
      data-testid="route-skeleton"
      style={{
        position: 'absolute',
        bottom: '2rem',
        left: '2rem',
        padding: '1rem 1.5rem',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(100, 108, 255, 0.4)',
        borderRadius: '6px',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#646cff',
          boxShadow: '0 0 8px #646cff',
          animation: 'pulse 1.2s infinite ease-in-out',
        }}
      />
      <span>{label}</span>
    </div>
  );
};
