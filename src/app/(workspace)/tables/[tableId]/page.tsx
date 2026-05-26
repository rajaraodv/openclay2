"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { Item } from "@glideapps/glide-data-grid";
import { OpenClayDataGrid } from "@/components/table/data-grid";
import { TableToolbar } from "@/components/table/table-toolbar";
import { FilterPanel } from "@/components/table/filter-panel";
import { ColumnConfigPanel } from "@/components/table/column-config-panel";
import {
  useTable,
  useRows,
  useUpdateCell,
  useAddRow,
  useAddColumn,
} from "@/hooks/use-table";
import type {
  ColumnDef,
  CellValue,
  FilterGroup,
  SortDef,
  RowData,
} from "@/types/table";
import { CellStatus } from "@/types/table";

// ── Loading skeleton ────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="h-5 w-px bg-zinc-800" />
        <div className="h-6 w-16 animate-pulse rounded bg-zinc-800" />
        <div className="h-6 w-14 animate-pulse rounded bg-zinc-800" />
        <div className="h-5 w-px bg-zinc-800" />
        <div className="h-6 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="flex-1" />
        <div className="h-5 w-20 animate-pulse rounded bg-zinc-800" />
      </div>
      {/* Grid skeleton */}
      <div className="flex-1 p-4">
        <div className="flex flex-col gap-0">
          {/* Header row */}
          <div className="flex gap-0 border-b border-zinc-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`header-${i}`}
                className="h-9 flex-1 animate-pulse border-r border-zinc-800 bg-zinc-900/50"
              />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: 10 }).map((_, rowIdx) => (
            <div key={`row-${rowIdx}`} className="flex gap-0 border-b border-zinc-800/50">
              {Array.from({ length: 6 }).map((_, colIdx) => (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="h-8 flex-1 animate-pulse border-r border-zinc-800/30 bg-zinc-950"
                  style={{
                    animationDelay: `${(rowIdx * 6 + colIdx) * 30}ms`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export default function TablePage() {
  const params = useParams();
  const tableId = params.tableId as string;

  // ── Data fetching ───────────────────────────────────────────────
  const {
    data: tableData,
    isLoading: tableLoading,
  } = useTable(tableId);

  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    logic: "and",
    filters: [],
  });
  const [sorts, setSorts] = useState<SortDef[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage] = useState(1);

  const {
    data: rowsData,
    isLoading: rowsLoading,
  } = useRows(tableId, filterGroup, sorts, currentPage);

  const updateCell = useUpdateCell();
  const addRow = useAddRow();
  const addColumn = useAddColumn();

  // ── Columns & rows ─────────────────────────────────────────────
  const columns: ColumnDef[] = useMemo(
    () => tableData?.columns ?? [],
    [tableData?.columns]
  );

  const rows: RowData[] = useMemo(
    () => rowsData?.rows ?? [],
    [rowsData?.rows]
  );

  // ── UI state ──────────────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ColumnDef | null>(null);
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>([]);

  // Sync local columns when fetched data arrives
  useEffect(() => {
    if (columns.length > 0) {
      setLocalColumns(columns);
    }
  }, [columns]);

  const displayColumns = localColumns.length > 0 ? localColumns : columns;

  // ── SSE for real-time enrichment updates ──────────────────────
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // In production, connect to SSE endpoint for live cell updates:
    // const es = new EventSource(`/api/tables/${tableId}/sse`);
    // es.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   // Optimistically update the cell in the query cache
    //   queryClient.setQueryData(...)
    // };
    // sseRef.current = es;
    // return () => es.close();

    return () => {
      sseRef.current?.close();
    };
  }, [tableId]);

  // ── Callbacks ─────────────────────────────────────────────────

  const handleCellEdited = useCallback(
    (cell: Item, newValue: CellValue) => {
      const [colIdx, rowIdx] = cell;
      const col = displayColumns[colIdx];
      const row = rows[rowIdx];
      if (!col || !row) return;

      updateCell.mutate({
        tableId,
        rowId: row.id,
        columnId: col.id,
        value: newValue,
      });
    },
    [displayColumns, rows, tableId, updateCell]
  );

  const handleColumnAdded = useCallback(() => {
    addColumn.mutate(
      { tableId },
      {
        onSuccess: (newCol) => {
          setLocalColumns((prev) => [
            ...prev,
            { ...newCol, position: prev.length },
          ]);
        },
      }
    );
  }, [tableId, addColumn]);

  const handleColumnResized = useCallback(
    (columnId: string, newWidth: number) => {
      setLocalColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, width: newWidth } : c))
      );
    },
    []
  );

  const handleRowAdded = useCallback(() => {
    addRow.mutate({ tableId });
  }, [tableId, addRow]);

  const handleHeaderClicked = useCallback(
    (columnIndex: number) => {
      const col = displayColumns[columnIndex];
      if (col) {
        setSelectedColumn(col);
        setConfigPanelOpen(true);
      }
    },
    [displayColumns]
  );

  const handleRunCell = useCallback(
    (rowId: string, columnId: string) => {
      // In production, trigger enrichment/AI run for this cell:
      // fetch(`/api/tables/${tableId}/run-cell`, {
      //   method: "POST",
      //   body: JSON.stringify({ rowId, columnId }),
      // });
      console.log("Run cell:", rowId, columnId);
    },
    []
  );

  const handleTableNameChange = useCallback(
    (name: string) => {
      // In production:
      // fetch(`/api/tables/${tableId}`, {
      //   method: "PATCH",
      //   body: JSON.stringify({ name }),
      // });
      console.log("Rename table:", name);
    },
    []
  );

  const handleColumnUpdate = useCallback(
    (updatedCol: ColumnDef) => {
      setLocalColumns((prev) =>
        prev.map((c) => (c.id === updatedCol.id ? updatedCol : c))
      );
      setSelectedColumn(updatedCol);
      // In production, persist to API
    },
    []
  );

  const handleColumnDelete = useCallback(
    (columnId: string) => {
      setLocalColumns((prev) => prev.filter((c) => c.id !== columnId));
      setConfigPanelOpen(false);
      setSelectedColumn(null);
      // In production, persist to API
    },
    []
  );

  const handleRunFirst10 = useCallback(() => {
    console.log("Run first 10 rows");
  }, []);

  const handleRunAll = useCallback(() => {
    console.log("Run all rows");
  }, []);

  const handleForceRunAll = useCallback(() => {
    console.log("Force run all rows");
  }, []);

  const handleCsvImport = useCallback(
    (file: File) => {
      console.log("Import CSV:", file.name);
    },
    []
  );

  const handleCsvExport = useCallback(() => {
    console.log("Export CSV");
  }, []);

  // ── Loading ───────────────────────────────────────────────────

  if (tableLoading || rowsLoading) {
    return <TableSkeleton />;
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <TableToolbar
        tableName={tableData?.name ?? "Untitled"}
        onTableNameChange={handleTableNameChange}
        onFilterToggle={() => setIsFilterOpen((v) => !v)}
        isFilterOpen={isFilterOpen}
        onRunFirst10={handleRunFirst10}
        onRunAll={handleRunAll}
        onForceRunAll={handleForceRunAll}
        onCsvImport={handleCsvImport}
        onCsvExport={handleCsvExport}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        rowCount={rowsData?.total ?? rows.length}
      />

      {/* Filter panel (collapsible) */}
      {isFilterOpen && (
        <FilterPanel
          columns={displayColumns}
          filterGroup={filterGroup}
          onFilterGroupChange={setFilterGroup}
          onClearAll={() => setIsFilterOpen(false)}
        />
      )}

      {/* Data grid fills remaining space */}
      <div className="min-h-0 flex-1">
        <OpenClayDataGrid
          columns={displayColumns}
          rows={rows}
          onCellEdited={handleCellEdited}
          onColumnAdded={handleColumnAdded}
          onColumnResized={handleColumnResized}
          onRowAdded={handleRowAdded}
          onHeaderClicked={handleHeaderClicked}
          onRunCell={handleRunCell}
        />
      </div>

      {/* Column config slide-over */}
      <ColumnConfigPanel
        open={configPanelOpen}
        onOpenChange={setConfigPanelOpen}
        column={selectedColumn}
        allColumns={displayColumns}
        onUpdate={handleColumnUpdate}
        onDelete={handleColumnDelete}
      />
    </div>
  );
}
