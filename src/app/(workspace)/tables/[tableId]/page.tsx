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
  CellData,
} from "@/types/table";
import { CellStatus, ColumnBehaviorType } from "@/types/table";
import { X, Play, Copy, ExternalLink } from "lucide-react";

// ── Right panel modes ──────────────────────────────────────────────

type RightPanelMode = "closed" | "cell-detail" | "column-config";

interface RightPanelState {
  mode: RightPanelMode;
  selectedRowId?: string;
  selectedColumnId?: string;
}

// ── Loading skeleton ────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex h-full flex-col bg-zinc-950">
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
      <div className="flex-1 p-4">
        <div className="flex flex-col gap-0">
          <div className="flex gap-0 border-b border-zinc-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`header-${i}`}
                className="h-9 flex-1 animate-pulse border-r border-zinc-800 bg-zinc-900/50"
              />
            ))}
          </div>
          {Array.from({ length: 11 }).map((_, rowIdx) => (
            <div key={`row-${rowIdx}`} className="flex gap-0 border-b border-zinc-800/50">
              {Array.from({ length: 5 }).map((_, colIdx) => (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="h-8 flex-1 animate-pulse border-r border-zinc-800/30 bg-zinc-950"
                  style={{
                    animationDelay: `${(rowIdx * 5 + colIdx) * 30}ms`,
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

// ── Cell Detail Panel ──────────────────────────────────────────────

function CellDetailPanel({
  row,
  column,
  cellData,
  allColumns,
  onClose,
  onRunCell,
}: {
  row: RowData;
  column: ColumnDef;
  cellData: CellData;
  allColumns: ColumnDef[];
  onClose: () => void;
  onRunCell?: (rowId: string, columnId: string) => void;
}) {
  const rawValue = cellData.rawValue ?? cellData.value;
  const isObject = rawValue !== null && typeof rawValue === "object" && !Array.isArray(rawValue);
  const isAutomated = column.columnType !== ColumnBehaviorType.Manual;

  return (
    <div className="flex h-full flex-col bg-zinc-900 text-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-zinc-500">{column.name}</span>
          <span className="text-sm font-semibold text-zinc-100">
            Row {row.position + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isAutomated && (
            <button
              onClick={() => onRunCell?.(row.id, column.id)}
              className="flex items-center gap-1 rounded-md bg-emerald-600/20 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30"
            >
              <Play className="size-3" fill="currentColor" />
              Run
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Status:</span>
          <StatusBadge status={cellData.status} />
          {cellData.source && (
            <>
              <span className="text-xs text-zinc-600">|</span>
              <span className="text-xs text-zinc-500">
                Source: <span className="text-zinc-300">{cellData.source}</span>
              </span>
            </>
          )}
          {cellData.errorMessage && (
            <span className="text-xs text-red-400">{cellData.errorMessage}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Display value */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Display Value
          </label>
          <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200">
            {cellData.value !== null && cellData.value !== undefined
              ? String(cellData.value)
              : <span className="italic text-zinc-600">empty</span>}
          </div>
        </div>

        {/* Raw JSON value (for enrichment columns) */}
        {isObject && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">
                Raw Data (JSON)
              </label>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(rawValue, null, 2));
                }}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <Copy className="size-3" />
                Copy
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-md border border-zinc-700 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">
              {JSON.stringify(rawValue, null, 2)}
            </pre>
          </div>
        )}

        {/* Key-value breakdown for objects */}
        {isObject && (
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">
              Fields
            </label>
            <div className="flex flex-col gap-1">
              {Object.entries(rawValue as Record<string, unknown>).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-800/50"
                >
                  <span className="shrink-0 font-medium text-zinc-400 w-28 text-right">
                    {key}
                  </span>
                  <span className="text-zinc-200 break-all">
                    {typeof val === "string" && val.startsWith("http") ? (
                      <a
                        href={val}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        {val}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      String(val)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row context: show other cells in this row */}
        <div className="mt-6 border-t border-zinc-800 pt-4">
          <label className="mb-2 block text-xs font-medium text-zinc-500">
            Row Context
          </label>
          <div className="flex flex-col gap-1">
            {allColumns
              .filter((c) => c.id !== column.id)
              .map((col) => {
                const cell = row.cells[col.id];
                const val = cell?.value;
                return (
                  <div
                    key={col.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-800/50"
                  >
                    <span className="shrink-0 font-medium text-zinc-500 w-28 text-right">
                      {col.name}
                    </span>
                    <span className="truncate text-zinc-300">
                      {val !== null && val !== undefined ? String(val) : "—"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CellStatus }) {
  const config: Record<string, { label: string; classes: string }> = {
    [CellStatus.Empty]: { label: "Empty", classes: "border-zinc-600 text-zinc-500" },
    [CellStatus.Pending]: { label: "Queued", classes: "border-amber-600/40 text-amber-400 bg-amber-500/10" },
    [CellStatus.Running]: { label: "Running", classes: "border-blue-600/40 text-blue-400 bg-blue-500/10" },
    [CellStatus.Complete]: { label: "Complete", classes: "border-green-600/40 text-green-400 bg-green-500/10" },
    [CellStatus.Error]: { label: "Error", classes: "border-red-600/40 text-red-400 bg-red-500/10" },
    [CellStatus.Skipped]: { label: "Skipped", classes: "border-zinc-600 text-zinc-500" },
  };
  const c = config[status] ?? config[CellStatus.Empty];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.classes}`}>
      {c.label}
    </span>
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
  const [autoRun, setAutoRun] = useState(true);

  // Right panel state
  const [rightPanel, setRightPanel] = useState<RightPanelState>({
    mode: "closed",
  });

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

  // ── Cell click: open right panel with cell details ───────────
  const handleCellClicked = useCallback(
    (cell: Item) => {
      const [colIdx, rowIdx] = cell;
      const col = displayColumns[colIdx];
      const row = rows[rowIdx];
      if (!col || !row) return;

      setRightPanel({
        mode: "cell-detail",
        selectedRowId: row.id,
        selectedColumnId: col.id,
      });
    },
    [displayColumns, rows]
  );

  // ── Header click: open column config panel ───────────────────
  const handleHeaderClicked = useCallback(
    (columnIndex: number) => {
      const col = displayColumns[columnIndex];
      if (col) {
        setSelectedColumn(col);
        setConfigPanelOpen(true);
        setRightPanel({ mode: "column-config", selectedColumnId: col.id });
      }
    },
    [displayColumns]
  );

  const handleRunCell = useCallback(
    (rowId: string, columnId: string) => {
      console.log("Run cell:", rowId, columnId);
      // In production: POST /api/tables/${tableId}/run
    },
    []
  );

  const handleTableNameChange = useCallback(
    (name: string) => {
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
    },
    []
  );

  const handleColumnDelete = useCallback(
    (columnId: string) => {
      setLocalColumns((prev) => prev.filter((c) => c.id !== columnId));
      setConfigPanelOpen(false);
      setSelectedColumn(null);
      setRightPanel({ mode: "closed" });
    },
    []
  );

  const handleCloseRightPanel = useCallback(() => {
    setRightPanel({ mode: "closed" });
    setConfigPanelOpen(false);
    setSelectedColumn(null);
  }, []);

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

  // ── Get selected cell data for right panel ────────────────────

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === rightPanel.selectedRowId),
    [rows, rightPanel.selectedRowId]
  );

  const selectedCol = useMemo(
    () => displayColumns.find((c) => c.id === rightPanel.selectedColumnId),
    [displayColumns, rightPanel.selectedColumnId]
  );

  const selectedCellData = useMemo((): CellData | null => {
    if (!selectedRow || !selectedCol) return null;
    return selectedRow.cells[selectedCol.id] ?? {
      value: null,
      status: CellStatus.Empty,
    };
  }, [selectedRow, selectedCol]);

  // ── Loading ───────────────────────────────────────────────────

  if (tableLoading || rowsLoading) {
    return <TableSkeleton />;
  }

  // ── Render ────────────────────────────────────────────────────

  const isRightPanelOpen = rightPanel.mode !== "closed";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
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
        columnCount={displayColumns.length}
        totalColumns={29}
        autoRun={autoRun}
        onAutoRunToggle={() => setAutoRun((v) => !v)}
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

      {/* Main content: grid + right panel side by side */}
      <div className="flex min-h-0 flex-1">
        {/* Data grid */}
        <div
          className={`min-h-0 transition-all duration-200 ${
            isRightPanelOpen ? "w-[60%]" : "w-full"
          }`}
        >
          <OpenClayDataGrid
            columns={displayColumns}
            rows={rows}
            onCellEdited={handleCellEdited}
            onColumnAdded={handleColumnAdded}
            onColumnResized={handleColumnResized}
            onRowAdded={handleRowAdded}
            onHeaderClicked={handleHeaderClicked}
            onCellClicked={handleCellClicked}
            onRunCell={handleRunCell}
          />
        </div>

        {/* Right panel */}
        {isRightPanelOpen && (
          <div className="flex w-[40%] flex-col border-l border-zinc-800">
            {rightPanel.mode === "cell-detail" &&
              selectedRow &&
              selectedCol &&
              selectedCellData && (
                <CellDetailPanel
                  row={selectedRow}
                  column={selectedCol}
                  cellData={selectedCellData}
                  allColumns={displayColumns}
                  onClose={handleCloseRightPanel}
                  onRunCell={handleRunCell}
                />
              )}

            {rightPanel.mode === "column-config" && selectedCol && (
              <div className="flex h-full flex-col bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <span className="text-sm font-semibold text-zinc-100">
                    Configure: {selectedCol.name}
                  </span>
                  <button
                    onClick={handleCloseRightPanel}
                    className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 text-xs text-zinc-400">
                  <p className="mb-2">
                    Column type:{" "}
                    <span className="text-zinc-200">{selectedCol.columnType}</span>
                  </p>
                  <p className="mb-2">
                    Data type:{" "}
                    <span className="text-zinc-200">{selectedCol.dataType}</span>
                  </p>
                  {selectedCol.autoRun !== undefined && (
                    <p className="mb-2">
                      Auto-run:{" "}
                      <span className="text-zinc-200">
                        {selectedCol.autoRun ? "On" : "Off"}
                      </span>
                    </p>
                  )}
                  <p className="mt-4 text-zinc-600">
                    Use the full column config panel (slide-over) for detailed configuration.
                  </p>
                  <button
                    onClick={() => {
                      setConfigPanelOpen(true);
                    }}
                    className="mt-2 rounded-md bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-600/30"
                  >
                    Open full editor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column config slide-over (full panel) */}
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
