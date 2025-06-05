
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
  Row, 
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  renderCardRow?: (row: Row<TData>) => React.ReactNode; 
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
    initialState: {
      pagination: {
        pageSize: 10, // Default page size
      }
    }
  })

  const isMobile = useIsMobile();
  const hasHideableColumns = React.useMemo(() => columns.some(col => col.enableHiding !== false && col.getCanHide && col.getCanHide()), [columns]);


  return (
    <div>
      {(filterColumn || hasHideableColumns) && (
        <div className={cn(
          "flex flex-col gap-2 py-4 sm:flex-row sm:items-center",
          (filterColumn && hasHideableColumns) ? "sm:justify-between" : 
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
          {hasHideableColumns && (
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
                    } else if (typeof headerDef === 'function') {
                        try {
                            const renderedHeader = headerDef({ column } as any); 
                            if (React.isValidElement(renderedHeader) && renderedHeader.props.title) {
                                headerText = renderedHeader.props.title;
                            } else if (React.isValidElement(renderedHeader) && typeof renderedHeader.props.children === 'string') {
                                headerText = renderedHeader.props.children;
                            }
                        } catch (e) {
                           // fallback to column.id
                        }
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
      
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Số mục mỗi trang</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
           <span className="text-sm text-muted-foreground">
            Trang {table.getState().pagination.pageIndex + 1} của {table.getPageCount()}
          </span>
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
    </div>
  )
}
