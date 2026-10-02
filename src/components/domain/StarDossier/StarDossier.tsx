import type { HTMLAttributes } from 'react';
import type { ExoplanetRecord } from '../../../types/astro';
import { Stack, Cluster, Button, Badge, Metric } from '../../primitives';
import { DossierLayout, MetricStrip } from '../../templates';
import styles from './StarDossier.module.css';

export interface StarDossierData {
  id: string;
  name: string;
  properName?: string;
  spectralType?: string;
  luminosityLsun?: number;
  massMsun?: number;
  radiusRsun?: number;
  effectiveTempK?: number;
  distPc?: number;
  con?: string | null;
  planets?: ExoplanetRecord[];
  overviewText?: string;
}

export interface StarDossierProps extends HTMLAttributes<HTMLDivElement> {
  star: StarDossierData;
  onSelectPlanet?: (planetId: string) => void;
  onNavigateSystem?: (systemId: string) => void;
  onClose?: () => void;
}

export const StarDossier = ({
  star,
  onSelectPlanet,
  onNavigateSystem,
  onClose,
  className,
  ...rest
}: StarDossierProps) => {
  const combinedClassName = className
    ? `${styles.starDossier} ${className}`
    : styles.starDossier;

  const lum = star.luminosityLsun;
  const hasLuminosity = typeof lum === 'number' && lum > 0;
  const hzInner = hasLuminosity ? 0.95 * Math.sqrt(lum) : undefined;
  const hzOuter = hasLuminosity ? 1.37 * Math.sqrt(lum) : undefined;

  const headerContent = (
    <div className={styles.headerRow}>
      <div className={styles.titleGroup}>
        <Cluster gap="tight">
          <h2 className={styles.title}>{star.properName || star.name}</h2>
          {star.properName && star.name !== star.properName && (
            <span className={styles.subtitle}>{`(${star.name})`}</span>
          )}
          {star.spectralType && (
            <Badge status="info">{star.spectralType}</Badge>
          )}
        </Cluster>
        <span className={styles.subtitle}>
          {star.distPc !== undefined
            ? `${star.distPc.toFixed(2)} pc (${(star.distPc * 3.26156).toFixed(2)} ly) from Sol`
            : 'Distance unknown'}
          {star.con ? ` • Constellation: ${star.con}` : ''}
        </span>
      </div>
      {onClose && (
        <Button variant="subtle" size="sm" onClick={onClose} aria-label="Close dossier">
          ✕
        </Button>
      )}
    </div>
  );

  const metricsContent = (
    <MetricStrip minWidth="sm">
      <Metric
        label="Spectral Class"
        value={star.spectralType || 'Unknown'}
      />
      <Metric
        label="Luminosity"
        value={star.luminosityLsun !== undefined ? `${star.luminosityLsun.toFixed(2)} L☉` : '—'}
      />
      <Metric
        label="Habitable Zone"
        value={
          hzInner !== undefined && hzOuter !== undefined
            ? `${hzInner.toFixed(2)}–${hzOuter.toFixed(2)} AU`
            : '—'
        }
      />
      <Metric
        label="Effective Temp"
        value={star.effectiveTempK !== undefined ? `${star.effectiveTempK.toLocaleString()} K` : '—'}
      />
    </MetricStrip>
  );

  const actionContent = onNavigateSystem ? (
    <Cluster gap="default" justify="end">
      <Button variant="primary" onClick={() => onNavigateSystem(star.id)}>
        View System in 3D
      </Button>
    </Cluster>
  ) : undefined;

  return (
    <div className={combinedClassName} {...rest}>
      <DossierLayout
        header={headerContent}
        metrics={metricsContent}
        actions={actionContent}
      >
        <Stack gap="section">
          {star.overviewText && (
            <p className={styles.overviewText}>{star.overviewText}</p>
          )}

          <Stack gap="default">
            <h3 className={styles.sectionTitle}>
              Exoplanet Inventory ({star.planets?.length ?? 0})
            </h3>
            {star.planets && star.planets.length > 0 ? (
              <div className={styles.planetList}>
                {star.planets.map((planet) => {
                  const sma = planet.orbit?.semiMajorAxis;
                  const isHabitable =
                    hzInner !== undefined &&
                    hzOuter !== undefined &&
                    sma !== undefined &&
                    sma >= hzInner &&
                    sma <= hzOuter;
                  return (
                    <div
                      key={planet.id}
                      className={styles.planetItem}
                      role={onSelectPlanet ? 'button' : undefined}
                      tabIndex={onSelectPlanet ? 0 : undefined}
                      data-selectable={onSelectPlanet ? 'true' : undefined}
                      onClick={() => onSelectPlanet?.(planet.id)}
                      onKeyDown={(e) => {
                        if (onSelectPlanet && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onSelectPlanet(planet.id);
                        }
                      }}
                    >
                      <Cluster gap="tight">
                        <span className={styles.planetName}>{planet.name}</span>
                        {isHabitable && <Badge status="nominal">Habitable Zone</Badge>}
                      </Cluster>
                      <div className={styles.planetMetrics}>
                        {sma !== undefined && <span>{sma.toFixed(2)} AU</span>}
                        {planet.orbit?.periodDays !== undefined && (
                          <span>{planet.orbit.periodDays.toFixed(1)} d</span>
                        )}
                        {planet.massMearth !== undefined && (
                          <span>{planet.massMearth.toFixed(1)} M⊕</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyNotice}>
                No confirmed exoplanets cataloged in this system.
              </div>
            )}
          </Stack>
        </Stack>
      </DossierLayout>
    </div>
  );
};
