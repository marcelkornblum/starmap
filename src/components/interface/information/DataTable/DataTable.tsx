import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { Unit } from '../Unit/Unit';
import styles from './DataTable.module.css';

export interface DataTableRootProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  caption?: ReactNode;
  children?: ReactNode;
}

export const DataTableRoot = ({
  caption,
  children,
  ...rest
}: DataTableRootProps) => {
  return (
    <div
      className={styles.tableContainer}
      data-data-table="true"
      {...rest}
    >
      <table className={styles.table}>
        {caption && <caption className={styles.caption}>{caption}</caption>}
        {children}
      </table>
    </div>
  );
};

export interface DataTableHeadProps
  extends Omit<HTMLAttributes<HTMLTableSectionElement>, 'className' | 'style'> {
  children?: ReactNode;
}

export const DataTableHead = ({
  children,
  ...rest
}: DataTableHeadProps) => {
  return (
    <thead className={styles.head} {...rest}>
      {children}
    </thead>
  );
};

export interface DataTableBodyProps
  extends Omit<HTMLAttributes<HTMLTableSectionElement>, 'className' | 'style'> {
  children?: ReactNode;
}

export const DataTableBody = ({
  children,
  ...rest
}: DataTableBodyProps) => {
  return (
    <tbody className={styles.body} {...rest}>
      {children}
    </tbody>
  );
};

export interface DataTableRowProps
  extends Omit<HTMLAttributes<HTMLTableRowElement>, 'className' | 'style'> {
  selected?: boolean;
  interactive?: boolean;
  children?: ReactNode;
}

export const DataTableRow = ({
  selected,
  interactive,
  children,
  ...rest
}: DataTableRowProps) => {
  return (
    <tr
      className={styles.row}
      data-selected={selected ? 'true' : undefined}
      data-interactive={interactive ? 'true' : undefined}
      {...rest}
    >
      {children}
    </tr>
  );
};

export interface DataTableHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align' | 'className' | 'style'> {
  align?: 'start' | 'end';
  unit?: ReactNode;
  children?: ReactNode;
  'data-testid'?: string;
  [key: `data-${string}`]: unknown;
}

export const DataTableHeaderCell = ({
  align = 'start',
  unit,
  children,
  scope = 'col',
  ...rest
}: DataTableHeaderCellProps) => {
  const renderUnit = () => {
    if (!unit) return null;
    if (
      typeof unit === 'object' &&
      unit !== null &&
      'type' in unit &&
      (unit.type === Unit || (unit.type as any)?.displayName === 'Unit')
    ) {
      return unit;
    }
    return <Unit>{unit}</Unit>;
  };

  return (
    <th
      scope={scope}
      className={styles.headerCell}
      data-align={align}
      {...rest}
    >
      {children}
      {unit && (
        <>
          {' '}
          {renderUnit()}
        </>
      )}
    </th>
  );
};

export interface DataTableCellProps
  extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align' | 'className' | 'style'> {
  align?: 'start' | 'end';
  numeric?: boolean;
  children?: ReactNode;
  'data-testid'?: string;
  [key: `data-${string}`]: unknown;
}

export const DataTableCell = ({
  align,
  numeric,
  children,
  ...rest
}: DataTableCellProps) => {
  const resolvedAlign = align ?? (numeric ? 'end' : 'start');

  return (
    <td
      className={styles.cell}
      data-align={resolvedAlign}
      data-numeric={numeric ? 'true' : undefined}
      {...rest}
    >
      {children}
    </td>
  );
};
