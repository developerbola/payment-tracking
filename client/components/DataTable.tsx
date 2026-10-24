import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  searchableValue?: (row: T) => string;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  search?: string;
  emptyMessage?: string;
  loading?: boolean;
  skeletonRows?: number;
};

const SKELETON_WIDTHS = ["w-2/3", "w-1/2", "w-3/4", "w-1/2", "w-2/3"];

export function DataTable<T>({
  data,
  columns,
  search = "",
  emptyMessage = "Maʼlumot yoʻq",
  loading = false,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const visible = search
    ? data.filter((row) =>
        columns.some((column) =>
          column
            .searchableValue?.(row)
            ?.toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : data;

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }, (_, rowIndex) => (
              <TableRow key={rowIndex} className="h-12!">
                {columns.map((column, columnIndex) => (
                  <TableCell key={column.id}>
                    <Skeleton
                      className={`h-4 ${SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length]}`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : visible.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            visible.map((row) => (
              <TableRow key={String((row as { id?: string }).id)}>
                {columns.map((column) => (
                  <TableCell key={column.id}>{column.cell(row)}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
