import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { Unit } from '../Unit/Unit';
import styles from './DataTable.module.css';

export interface DataTableRootProps extends HTMLAttributes<HTMLDivElement> {
  caption?: ReactNode;
  children?: ReactNode;
  tableClassName?: string;
}

export const DataTableRoot = ({
  caption,
  children,
  className,
  tableClassName,
  ...rest
}: DataTableRootProps) => {
  const combinedContainerClassName = className
    ? `${styles.tableContainer} ${className}`
    : styles.tableContainer;

  const combinedTableClassName = tableClassName
    ? `${styles.table} ${tableClassName}`
    : styles.table;

  return (
    <div
      className={combinedContainerClassName}
      data-data-table="true"
      {...rest}
    >
      <table className={combinedTableClassName}>
        {caption && <caption className={styles.caption}>{caption}</caption>}
        {children}
      </table>
    </div>
  );
};

export interface DataTableHeadProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  children?: ReactNode;
}

export const DataTableHead = ({
  children,
  className,
  ...rest
}: DataTableHeadProps) => {
  const combinedClassName = className
    ? `${styles.head} ${className}`
    : styles.head;

  return (
    <thead className={combinedClassName} {...rest}>
      {children}
    </thead>
  );
};

export interface DataTableBodyProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  children?: ReactNode;
}

export const DataTableBody = ({
  children,
  className,
  ...rest
}: DataTableBodyProps) => {
  const combinedClassName = className
    ? `${styles.body} ${className}`
    : styles.body;

  return (
    <tbody className={combinedClassName} {...rest}>
      {children}
    </tbody>
  );
};

export interface DataTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  interactive?: boolean;
  children?: ReactNode;
}

export const DataTableRow = ({
  selected,
  interactive,
  children,
  className,
  ...rest
}: DataTableRowProps) => {
  const combinedClassName = className
    ? `${styles.row} ${className}`
    : styles.row;

  return (
    <tr
      className={combinedClassName}
      data-selected={selected ? 'true' : undefined}
      data-interactive={interactive ? 'true' : undefined}
      {...rest}
    >
      {children}
    </tr>
  );
};

export interface DataTableHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
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
  className,
  ...rest
}: DataTableHeaderCellProps) => {
  const combinedClassName = className
    ? `${styles.headerCell} ${className}`
    : styles.headerCell;

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
    return <Unit className={styles.headerUnit}>{unit}</Unit>;
  };

  return (
    <th
      scope={scope}
      className={combinedClassName}
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
  extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
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
  className,
  ...rest
}: DataTableCellProps) => {
  const combinedClassName = className
    ? `${styles.cell} ${className}`
    : styles.cell;

  const resolvedAlign = align ?? (numeric ? 'end' : 'start');

  return (
    <td
      className={combinedClassName}
      data-align={resolvedAlign}
      data-numeric={numeric ? 'true' : undefined}
      {...rest}
    >
      {children}
    </td>
  );
};

export const DataTable = Object.assign(DataTableRoot, {
  Root: DataTableRoot,
  Head: DataTableHead,
  Body: DataTableBody,
  Row: DataTableRow,
  HeaderCell: DataTableHeaderCell,
  Cell: DataTableCell,
});
