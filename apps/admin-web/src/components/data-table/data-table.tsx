import { rankItem } from "@tanstack/match-sorter-utils";
import type {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  OnChangeFn,
  PaginationState,
  Row,
  SortingState,
  VisibilityState,
  Table as TanStackTable,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

const fuzzyFilter: FilterFn<unknown> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value as string);
  addMeta({ itemRank });
  return itemRank.passed;
};

interface DataTableProps<TData, TValue> {
  ariaLabel?: string;
  batchActions?: React.ReactNode | ((table: TanStackTable<TData>) => React.ReactNode);
  columns: Array<ColumnDef<TData, TValue>>;
  data: Array<TData>;
  className?: string;
  emptyState?: React.ReactNode;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  manualPagination?: boolean;
  onRowClick?: (row: TData) => void;
  onRowMouseEnter?: (row: TData) => void;
  rowActionsMode?: "persistent" | "hover";
  totalRows?: number;
  filterColumn?: string;
  filterPlaceholder?: string;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  facetedFilters?: Array<{
    column: string;
    title: string;
    options: Array<{
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }>;
  }>;
}

export function DataTable<TData, TValue>({
  ariaLabel = "Data table",
  batchActions,
  columns,
  data,
  className,
  emptyState,
  getRowId,
  manualPagination = false,
  onRowClick,
  onRowMouseEnter,
  rowActionsMode = "persistent",
  totalRows,
  filterColumn,
  filterPlaceholder,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  columnVisibility,
  onColumnVisibilityChange,
  facetedFilters,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>(
    {},
  );
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const resolvedColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const resolvedColumnFilters = columnFilters ?? internalColumnFilters;
  const resolvedSorting = sorting ?? internalSorting;
  const resolvedPagination = pagination ?? internalPagination;

  const resolvedGetRowId = React.useCallback(
    (row: TData, index: number, parent?: Row<TData>) => {
      if (getRowId) {
        return getRowId(row, index, parent);
      }

      if (row && typeof row === "object" && "id" in row) {
        const id = (row as { id?: unknown }).id;
        if (
          typeof id === "string" ||
          typeof id === "number" ||
          typeof id === "bigint" ||
          typeof id === "boolean"
        ) {
          return String(id);
        }
      }

      return parent ? `${parent.id}.${index}` : String(index);
    },
    [getRowId],
  );
  const pageCount =
    typeof totalRows === "number"
      ? Math.max(Math.ceil(totalRows / resolvedPagination.pageSize), 1)
      : undefined;

  const table = useReactTable({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    getRowId: resolvedGetRowId,
    state: {
      sorting: resolvedSorting,
      columnVisibility: resolvedColumnVisibility,
      rowSelection,
      columnFilters: resolvedColumnFilters,
      pagination: resolvedPagination,
    },
    enableRowSelection: true,
    manualPagination,
    pageCount,
    onRowSelectionChange: setRowSelection,
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalColumnFilters,
    onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalColumnVisibility,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4" data-row-actions-mode={rowActionsMode}>
      <DataTableToolbar
        batchActions={batchActions}
        table={table}
        filterColumn={filterColumn}
        filterPlaceholder={filterPlaceholder}
        facetedFilters={facetedFilters}
      />
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm",
          className,
        )}
      >
        <Table aria-label={ariaLabel}>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row.original)}
                  onMouseEnter={() => onRowMouseEnter?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyState ?? "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} totalRows={totalRows} />
    </div>
  );
}
