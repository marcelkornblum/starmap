import type { HTMLAttributes } from 'react';
import { ConfidencePip, type ConfidenceLevel, Unit, Quantity } from '../../primitives/data';
import { Cluster } from '../../primitives/layout/Cluster/Cluster';
import styles from './OrbitTable.module.css';

export interface OrbitElementRow {
  id: string;
  name: string;
  semiMajorAxis: number; // AU
  eccentricity: number;
  inclination: number; // degrees
  periodDays: number; // days
  periapsis?: number; // degrees
  node?: number; // degrees
  confidence?: ConfidenceLevel;
}

export interface OrbitTableProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  orbits: OrbitElementRow[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  caption?: string;
}

export const OrbitTable = ({
  orbits,
  selectedId,
  onSelect,
  caption = 'Keplerian Orbital Telemetry',
  className,
  ...rest
}: OrbitTableProps) => {
  const combinedClassName = className
    ? `${styles.tableContainer} ${className}`
    : styles.tableContainer;

  if (orbits.length === 0) {
    return (
      <div className={combinedClassName} {...rest}>
        <div className={styles.emptyNotice}>No orbital telemetry records available.</div>
      </div>
    );
  }

  return (
    <div className={combinedClassName} {...rest}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={`${styles.headerCell} ${styles.headerCellName}`}>
              Body
            </th>
            <th scope="col" className={styles.headerCell}>
              a <Unit>AU</Unit>
            </th>
            <th scope="col" className={styles.headerCell}>
              e
            </th>
            <th scope="col" className={styles.headerCell}>
              i <Unit>°</Unit>
            </th>
            <th scope="col" className={styles.headerCell}>
              Period <Unit>d</Unit>
            </th>
          </tr>
        </thead>
        <tbody>
          {orbits.map((row) => {
            const isSelected = selectedId === row.id;
            return (
              <tr
                key={row.id}
                className={styles.row}
                data-selected={isSelected ? 'true' : undefined}
                data-selectable={onSelect ? 'true' : undefined}
                aria-selected={onSelect ? isSelected : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={() => onSelect?.(row.id)}
                onKeyDown={(e) => {
                  if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelect(row.id);
                  }
                }}
              >
                <td className={`${styles.cell} ${styles.cellName}`}>
                  {row.confidence ? (
                    <Cluster gap="dense" align="center">
                      <span>{row.name}</span>
                      <ConfidencePip confidence={row.confidence} />
                    </Cluster>
                  ) : (
                    row.name
                  )}
                </td>
                <td className={styles.cell}>
                  {typeof row.semiMajorAxis === 'number' && !Number.isNaN(row.semiMajorAxis)
                    ? row.semiMajorAxis.toFixed(3)
                    : '—'}
                </td>
                <td className={styles.cell}>
                  {typeof row.eccentricity === 'number' && !Number.isNaN(row.eccentricity)
                    ? row.eccentricity.toFixed(4)
                    : '—'}
                </td>
                <td className={styles.cell}>
                  {typeof row.inclination === 'number' && !Number.isNaN(row.inclination)
                    ? row.inclination.toFixed(2)
                    : '—'}
                </td>
                <td className={styles.cell}>
                  {typeof row.periodDays !== 'number' || Number.isNaN(row.periodDays) || row.periodDays <= 0 ? (
                    '—'
                  ) : (
                    <Quantity
                      value={
                        row.periodDays >= 1000
                          ? (row.periodDays / 365.25).toFixed(2)
                          : row.periodDays.toFixed(1)
                      }
                      unit={row.periodDays >= 1000 ? 'y' : 'd'}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
