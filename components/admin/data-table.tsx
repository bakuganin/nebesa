import type { ReactNode } from "react";

import { EmptyState } from "./empty-state";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T,>({
  columns,
  rows,
  getRowKey,
  emptyTitle,
  emptyDescription,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[#d8dedc] bg-white">
      <table className="min-w-full divide-y divide-[#d8dedc] text-left text-sm">
        <thead className="bg-[#f7f9f8] text-xs uppercase tracking-[0.08em] text-[#59685e]">
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col" className={`px-4 py-3 font-semibold ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1ef]">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="align-top">
              {columns.map((column) => (
                <td key={column.header} className={`min-w-0 max-w-[22rem] break-words px-4 py-3 ${column.className ?? ""}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
