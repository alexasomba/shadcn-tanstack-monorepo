import { compareItems, rankItem } from "@tanstack/match-sorter-utils";
import type { RankingInfo } from "@tanstack/match-sorter-utils";
import { createFileRoute } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  sortingFns,
  useReactTable,
} from "@tanstack/react-table";
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingFn,
} from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import React from "react";

import { makeData } from "#/data/demo-table-data";
import type { Person } from "#/data/demo-table-data";

export const Route = createFileRoute("/demo/table")({
  component: TableDemo,
});

declare module "@tanstack/react-table" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

// Define a custom fuzzy filter function that will apply ranking info to rows (using match-sorter utils)
const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value);

  // Store the itemRank info
  addMeta({
    itemRank,
  });

  // Return if the item should be filtered in/out
  return itemRank.passed;
};

// Define a custom fuzzy sort function that will sort by rank if the row has ranking information
const fuzzySort: SortingFn<any> = (rowA, rowB, columnId) => {
  let dir = 0;

  // Only sort by rank if the column has ranking information
  if (rowA.columnFiltersMeta[columnId]) {
    dir = compareItems(
      rowA.columnFiltersMeta[columnId]?.itemRank,
      rowB.columnFiltersMeta[columnId]?.itemRank,
    );
  }


  // Provide an alphanumeric fallback for when the item ranks are equal
  return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir;
};

function TableDemo() {
  const rerender = React.useReducer(() => ({}), {})[1];

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo<ColumnDef<Person, any>[]>(
    () => [
      {
        accessorKey: "id",
        filterFn: "equalsString", // note: normal non-fuzzy filter column - exact match required
      },
      {
        accessorKey: "firstName",
        cell: (info) => info.getValue(),
        filterFn: "includesStringSensitive", // note: normal non-fuzzy filter column - case sensitive
      },
      {
        accessorFn: (row) => row.lastName,
        id: "lastName",
        cell: (info) => info.getValue(),
        header: () => <span>Last Name</span>,
        filterFn: "includesString", // note: normal non-fuzzy filter column - case insensitive
      },
      {
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        id: "fullName",
        header: "Full Name",
        cell: (info) => info.getValue(),
        filterFn: "fuzzy", // using our custom fuzzy filter function
        // filterFn: fuzzyFilter, //or just define with the function
        sortingFn: fuzzySort, // sort by fuzzy rank (falls back to alphanumeric)
      },
    ],
    [],
  );

  const [data, setData] = React.useState<Person[]>(() => makeData(5_000));
  const refreshData = () => setData((_old) => makeData(50_000)); // stress test

  // react-doctor-disable-next-line react-hooks-js/incompatible-library
  const table = useReactTable({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter, // define as a filter function that can be used in column definitions
    },
    state: {
      columnFilters,
      globalFilter,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "fuzzy", // apply fuzzy filter to the global filter (most common use case for fuzzy filter)
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // client side filtering
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    debugHeaders: true,
    debugColumns: false,
  });

  // apply the fuzzy sort if the fullName column is being filtered
  React.useEffect(() => {
    if (table.getState().columnFilters[0]?.id === "fullName") {
      if (table.getState().sorting[0]?.id !== "fullName") {
        table.setSorting([{ id: "fullName", desc: false }]);
      }
    }
  }, [table.getState().columnFilters[0]?.id]);

  return (
    <main className="demo-page demo-page-wide">
      <div>
        <p className="island-kicker mb-2">TanStack Table</p>
        <h1 className="demo-title mb-6">Table Demo</h1>
        <DebouncedInput
          value={globalFilter ?? ""}
          onChange={(value) => setGlobalFilter(String(value))}
          placeholder="Search all columns..."
        />
      </div>
      <div className="h-4" />
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <>
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? "cursor-pointer select-none transition-colors hover:text-foreground font-semibold"
                                : "font-semibold",
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: " 🔼",
                              desc: " 🔽",
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                          {header.column.getCanFilter() ? (
                            <div className="mt-2">
                              <Filter column={header.column} />
                            </div>
                          ) : null}
                        </>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              return (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="h-4" />
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {"<<"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {">"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {">>"}
        </Button>
        <span className="flex items-center gap-1">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </span>
        <span className="flex items-center gap-1">
          <label htmlFor="go-to-page-input">Go to page:</label>
          <Input
            id="go-to-page-input"
            type="number"
            aria-label="Go to page"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="w-20"
          />
        </span>
        <NativeSelect
          id="page-size-select"
          aria-label="Page size"
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          className="w-32"
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <NativeSelectOption key={pageSize} value={pageSize}>
              Show {pageSize}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="mt-4 text-xs text-muted-foreground">
        {table.getPrePaginationRowModel().rows.length} Rows
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => rerender()}>
          Force Rerender
        </Button>
        <Button variant="outline" size="sm" onClick={() => refreshData()}>
          Refresh Data
        </Button>
      </div>
      <pre className="demo-code-block mt-4 overflow-auto">
        {JSON.stringify(
          {
            columnFilters: table.getState().columnFilters,
            globalFilter: table.getState().globalFilter,
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}

function Filter({ column }: { column: Column<any, unknown> }) {
  const columnFilterValue = column.getFilterValue();

  return (
    <DebouncedInput
      type="text"
      value={(columnFilterValue ?? "") as string}
      onChange={(value) => column.setFilterValue(value)}
      placeholder={`Search...`}
    />
  );
}

// A typical debounced input react component
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [prevInitialValue, setPrevInitialValue] = React.useState(initialValue);
  const [value, setValue] = React.useState(initialValue);

  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setValue(initialValue);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <Input
      aria-label="Search table"
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

