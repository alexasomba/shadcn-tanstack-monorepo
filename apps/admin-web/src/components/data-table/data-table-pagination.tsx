import { CaretLeft, CaretRight, CaretDoubleLeft, CaretDoubleRight } from "@phosphor-icons/react";
import type { Table } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows?: number;
}

export function DataTablePagination<TData>({ table, totalRows }: DataTablePaginationProps<TData>) {
  const pageCount = Math.max(table.getPageCount(), 1);
  const rowCount = totalRows ?? table.getFilteredRowModel().rows.length;

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of {rowCount.toLocaleString()} row(s)
        selected.
      </div>
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            type="button"
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <CaretDoubleLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <CaretLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <CaretRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <CaretDoubleRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
