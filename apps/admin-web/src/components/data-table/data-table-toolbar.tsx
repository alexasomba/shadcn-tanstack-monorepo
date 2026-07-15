import { Funnel, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Table } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import type * as React from "react";

import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  batchActions?: React.ReactNode | ((table: Table<TData>) => React.ReactNode);
  table: Table<TData>;
  filterColumn?: string;
  filterPlaceholder?: string;
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

export function DataTableToolbar<TData>({
  batchActions,
  table,
  filterColumn,
  filterPlaceholder,
  facetedFilters,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const selectedRows = table.getFilteredSelectedRowModel().rows.length;
  const renderedBatchActions =
    typeof batchActions === "function" ? batchActions(table) : batchActions;

  return (
    <div className="flex flex-col gap-3">
      {selectedRows > 0 && renderedBatchActions ? (
        <div
          className="flex flex-col gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
          role="status"
        >
          <span className="font-medium">
            {selectedRows.toLocaleString()} row{selectedRows === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">{renderedBatchActions}</div>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          {filterColumn && (
            <div className="relative w-[150px] lg:w-[250px]">
              <MagnifyingGlass className="absolute top-2 left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label={filterPlaceholder ?? "Filter table"}
                onChange={(event) =>
                  table.getColumn(filterColumn)?.setFilterValue(event.target.value)
                }
                placeholder={filterPlaceholder ?? "Filter..."}
                type="search"
                value={
                  (table.getColumn(filterColumn)?.getFilterValue() as string | undefined) ?? ""
                }
                className="pl-8"
              />
            </div>
          )}
          {facetedFilters?.map((filter) => {
            const column = table.getColumn(filter.column);
            if (!column) return null;

            const selectedValues = new Set(
              (column.getFilterValue() as Array<string> | undefined) ?? [],
            );

            return (
              <DropdownMenu key={filter.column}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 border-dashed">
                    <Funnel className="mr-2 h-4 w-4" aria-hidden="true" />
                    {filter.title}
                    {selectedValues.size > 0 ? (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                        {selectedValues.size}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuLabel>{filter.title}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filter.options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedValues.has(option.value);

                    return (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const nextValues = new Set(selectedValues);
                          if (checked) {
                            nextValues.add(option.value);
                          } else {
                            nextValues.delete(option.value);
                          }

                          column.setFilterValue(
                            nextValues.size > 0 ? Array.from(nextValues) : undefined,
                          );
                        }}
                      >
                        {Icon ? <Icon className="mr-2 h-4 w-4 text-muted-foreground" /> : null}
                        <span>{option.label}</span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
          {isFiltered && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
