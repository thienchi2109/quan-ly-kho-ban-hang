
"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState,
  Row, // Import Row type
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from '@/hooks/use-mobile';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumn?: string
  filterPlaceholder?: string
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  renderCardRow?: (row: Row<TData>) => React.ReactNode; // New prop for mobile card rendering
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder = "Lọc...",
  columnVisibility: initialColumnVisibility,
  onColumnVisibilityChange,
  renderCardRow,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  
  // Use the passed-in columnVisibility and onColumnVisibilityChange if provided, else use internal state
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility || {});
  const currentColumnVisibility = initialColumnVisibility !== undefined ? initialColumnVisibility : internalColumnVisibility;
  const setCurrentColumnVisibility = onColumnVisibilityChange !== undefined ? onColumnVisibilityChange : setInternalColumnVisibility;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setCurrentColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility: currentColumnVisibility,
    },
  })

  const isMobile = useIsMobile();

  return (
    <div>
      {(filterColumn || columns.some(col => col.enableHiding !== false)) && (
        <div className={cn(
          "flex flex-col gap-2 py-4 sm:flex-row sm:items-center",
          (filterColumn && columns.some(col => col.enableHiding !== false)) ? "sm:justify-between" : 
          filterColumn ? "sm:justify-start" : "sm:justify-end"
        )}>
          {filterColumn && (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(filterColumn)?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-xs md:max-w-sm"
            />
          )}
          {columns.some(col => col.enableHiding !== false) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Cột <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter(
                    (column) => column.getCanHide()
                  )
                  .map((column) => {
                    let headerText = column.id;
                    const headerDef = column.columnDef.header;
                    if (typeof headerDef === 'string') {
                      headerText = headerDef;
                    } else if (headerDef && typeof headerDef !== 'function' && (headerDef as any).props?.title) {
                      headerText = (headerDef as any).props.title || column.id;
                    }
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {headerText}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {isMobile && renderCardRow ? (
        // Mobile Card View
        <div className="space-y-3 pb-4">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => renderCardRow(row))
          ) : (
            <div className="text-center text-muted-foreground py-10">
              Không có dữ liệu.
            </div>
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
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
                    Không có dữ liệu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Trước
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Sau
        </Button>
      </div>
    </div>
  )
}
