import type { HTMLAttributes } from 'react';
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
              a (AU)
            </th>
            <th scope="col" className={styles.headerCell}>
              e
            </th>
            <th scope="col" className={styles.headerCell}>
              i (°)
            </th>
            <th scope="col" className={styles.headerCell}>
              Period (d)
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
                <td className={`${styles.cell} ${styles.cellName}`}>{row.name}</td>
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
                  {typeof row.periodDays !== 'number' || Number.isNaN(row.periodDays) || row.periodDays <= 0
                    ? '—'
                    : row.periodDays >= 1000
                    ? `${(row.periodDays / 365.25).toFixed(2)} y`
                    : `${row.periodDays.toFixed(1)} d`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
