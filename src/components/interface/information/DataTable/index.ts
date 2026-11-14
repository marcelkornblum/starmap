import {
  DataTableRoot,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeaderCell,
  DataTableCell,
} from './DataTable';

export * from './DataTable';

export const DataTable = Object.assign(DataTableRoot, {
  Root: DataTableRoot,
  Head: DataTableHead,
  Body: DataTableBody,
  Row: DataTableRow,
  HeaderCell: DataTableHeaderCell,
  Cell: DataTableCell,
});
