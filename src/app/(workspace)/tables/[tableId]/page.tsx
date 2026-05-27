"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { Item } from "@glideapps/glide-data-grid";
import { OpenClayDataGrid } from "@/components/table/data-grid";
import { TableToolbar } from "@/components/table/table-toolbar";
import { FilterPanel } from "@/components/table/filter-panel";
// Old slide-over panel removed — now using inline ColumnConfigEditor in right panel
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
import { ColumnHeaderMenu } from "@/components/table/column-header-menu";
import { ColumnConfigEditor } from "@/components/table/column-config-editor";
import { ColumnDataType } from "@/types/table";
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

  const fetchedRows: RowData[] = useMemo(
    () => rowsData?.rows ?? [],
    [rowsData?.rows]
  );

  // ── UI state ──────────────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ColumnDef | null>(null);
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>([]);
  const [localRows, setLocalRows] = useState<RowData[]>([]);
  const [autoRun, setAutoRun] = useState(true);

  // Sync local rows when fetched data arrives
  useEffect(() => {
    if (fetchedRows.length > 0) {
      setLocalRows(fetchedRows);
    }
  }, [fetchedRows]);

  const rows = localRows.length > 0 ? localRows : fetchedRows;

  // Right panel state
  const [rightPanel, setRightPanel] = useState<RightPanelState>({
    mode: "closed",
  });

  // Column header context menu state
  const [contextMenu, setContextMenu] = useState<{
    columnId: string;
    x: number;
    y: number;
  } | null>(null);

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

  // ── Header click: show column context menu (same as right-click) ──
  const handleHeaderClicked = useCallback(
    (columnIndex: number) => {
      const col = displayColumns[columnIndex];
      if (!col) return;
      const headerEl = document.querySelector(`[data-testid="data-grid-canvas"]`) ??
        document.querySelector("canvas");
      if (headerEl) {
        const rect = headerEl.getBoundingClientRect();
        const colWidths = displayColumns.slice(0, columnIndex).reduce((sum, c) => sum + (c.width || 200), 0);
        const x = rect.left + colWidths + (col.width || 200) / 2 + 60;
        const y = rect.top + 38;
        setContextMenu({ columnId: col.id, x, y });
      } else {
        setContextMenu({ columnId: col.id, x: 300, y: 60 });
      }
    },
    [displayColumns]
  );

  // ── Helper: update a single cell's data ───────────────────────
  const updateCellData = useCallback(
    (rowId: string, columnId: string, cellUpdate: Partial<CellData>) => {
      setLocalRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                cells: {
                  ...r.cells,
                  [columnId]: {
                    ...(r.cells[columnId] ?? { value: null, rawValue: null }),
                    ...cellUpdate,
                  } as CellData,
                },
              }
            : r
        )
      );
    },
    []
  );

  // ── Find columns that depend on a given column ───────────────
  const getDependentColumns = useCallback(
    (sourceColumnId: string): ColumnDef[] => {
      return displayColumns.filter(
        (c) => c.valueSource?.sourceColumnId === sourceColumnId
      );
    },
    [displayColumns]
  );

  // ── Run dependent columns for a row after source completes ───
  const runDependentColumns = useCallback(
    (rowId: string, sourceColumnId: string, enrichmentData: Record<string, unknown>) => {
      const dependents = getDependentColumns(sourceColumnId);
      if (dependents.length === 0) return;

      // Queue all dependents
      for (const depCol of dependents) {
        updateCellData(rowId, depCol.id, { status: CellStatus.Pending });
      }

      // Run each dependent with a staggered delay
      dependents.forEach((depCol, idx) => {
        setTimeout(() => {
          // Set to running
          updateCellData(rowId, depCol.id, { status: CellStatus.Running });

          // Extract value after short "processing" delay
          setTimeout(() => {
            const field = depCol.valueSource?.sourceField;
            if (field && field in enrichmentData) {
              const val = String(enrichmentData[field] ?? "");
              updateCellData(rowId, depCol.id, {
                value: val,
                status: CellStatus.Complete,
                source: `derived:${sourceColumnId}.${field}`,
              });
            } else {
              updateCellData(rowId, depCol.id, {
                value: null,
                status: CellStatus.Error,
                errorMessage: `Field "${field}" not found in enrichment response`,
              });
            }
          }, 400 + Math.random() * 600);
        }, (idx + 1) * 500); // Stagger: 500ms apart
      });
    },
    [getDependentColumns, updateCellData]
  );

  // ── Main cell execution handler ──────────────────────────────
  const handleRunCell = useCallback(
    (rowId: string, columnId: string) => {
      const col = displayColumns.find((c) => c.id === columnId);
      if (!col) return;

      // Get latest row data
      const currentRows = localRows.length > 0 ? localRows : fetchedRows;
      const row = currentRows.find((r) => r.id === rowId);
      if (!row) return;

      // ── Phase 1: Queued ──
      updateCellData(rowId, columnId, { status: CellStatus.Pending });

      // ── Phase 2: Running (after short queue delay) ──
      setTimeout(() => {
        updateCellData(rowId, columnId, { status: CellStatus.Running });

        // ── Phase 3: Execute based on column type ──
        const executionDelay = 1200 + Math.random() * 1800; // 1.2-3s

        setTimeout(() => {
          // Simulate random errors (10% chance)
          const shouldError = Math.random() < 0.1;
          if (shouldError) {
            updateCellData(rowId, columnId, {
              status: CellStatus.Error,
              errorMessage: "API rate limit exceeded. Retry in 30 seconds.",
            });
            return;
          }

          if (col.columnType === ColumnBehaviorType.Enrichment) {
            // Enrichment: use domain to generate company data
            const domainCell = row.cells["col-domain"];
            const domain = domainCell?.value ? String(domainCell.value) : "unknown.com";
            const companyName = domain
              .replace(/\.(com|co|io|app|dev|org|net)$/i, "")
              .split(".")[0]
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            const enrichmentResult: Record<string, unknown> = {
              url: `https://www.linkedin.com/company/${domain.replace(/\.\w+$/, "")}`,
              name: companyName,
              size: `${(Math.floor(Math.random() * 10) + 1) * 50}-${(Math.floor(Math.random() * 10) + 2) * 50} employees`,
              slug: domain.replace(/\.\w+$/, "").toLowerCase(),
              type: "Privately Held",
              domain,
              orgId: Math.floor(Math.random() * 100000000),
              country: "US",
              industry: ["Software Development", "SaaS", "Technology", "AI/ML", "Fintech", "DevTools"][
                Math.floor(Math.random() * 6)
              ],
              description: `${companyName} is a technology company building innovative solutions.`,
              foundedYear: 2010 + Math.floor(Math.random() * 14),
              linkedinUrl: `https://www.linkedin.com/company/${domain.replace(/\.\w+$/, "")}`,
              employeeCount: 20 + Math.floor(Math.random() * 500),
            };

            updateCellData(rowId, columnId, {
              value: companyName,
              rawValue: enrichmentResult,
              status: CellStatus.Complete,
              source: "clearbit-enrichment",
              confidence: 0.92 + Math.random() * 0.08,
            });

            // ── Phase 4: Run dependent columns ──
            runDependentColumns(rowId, columnId, enrichmentResult);
          } else if (col.valueSource?.type === "reference") {
            // Reference: extract from source column
            const sourceColumnId = col.valueSource.sourceColumnId ?? "";
            const sourceField = col.valueSource.sourceField;
            const latestRows = localRows.length > 0 ? localRows : fetchedRows;
            const latestRow = latestRows.find((r) => r.id === rowId);
            const sourceCell = latestRow?.cells[sourceColumnId];

            if (sourceCell?.rawValue && sourceField) {
              const rawObj = sourceCell.rawValue as Record<string, unknown>;
              if (sourceField in rawObj) {
                updateCellData(rowId, columnId, {
                  value: String(rawObj[sourceField]),
                  status: CellStatus.Complete,
                  source: `derived:${sourceColumnId}.${sourceField}`,
                });
              } else {
                updateCellData(rowId, columnId, {
                  status: CellStatus.Error,
                  errorMessage: `Field "${sourceField}" not found in source data`,
                });
              }
            } else {
              updateCellData(rowId, columnId, {
                status: CellStatus.Error,
                errorMessage: "Source column has no data. Run the source column first.",
              });
            }
          }
        }, executionDelay);
      }, 300 + Math.random() * 400); // Queue → Running delay: 300-700ms
    },
    [displayColumns, localRows, fetchedRows, updateCellData, runDependentColumns]
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
      setSelectedColumn(null);
      setRightPanel({ mode: "closed" });
    },
    []
  );

  const handleCloseRightPanel = useCallback(() => {
    setRightPanel({ mode: "closed" });
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

  // ── Column header context menu ────────────────────────────────

  const handleColumnHeaderContextMenu = useCallback(
    (columnId: string, x: number, y: number) => {
      setContextMenu({ columnId, x, y });
    },
    []
  );

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const contextMenuColumn = useMemo(
    () => displayColumns.find((c) => c.id === contextMenu?.columnId) ?? null,
    [displayColumns, contextMenu?.columnId]
  );

  const handleContextMenuRename = useCallback(
    (columnId: string) => {
      setContextMenu(null);
      const newName = prompt("Rename column:", displayColumns.find(c => c.id === columnId)?.name ?? "");
      if (newName) {
        setLocalColumns((prev) =>
          prev.map((c) => (c.id === columnId ? { ...c, name: newName } : c))
        );
      }
    },
    [displayColumns]
  );

  const handleContextMenuEdit = useCallback(
    (columnId: string) => {
      setContextMenu(null);
      const col = displayColumns.find((c) => c.id === columnId);
      if (col) {
        setSelectedColumn(col);
        setRightPanel({ mode: "column-config", selectedColumnId: col.id });
      }
    },
    [displayColumns]
  );

  const handleContextMenuInsertLeft = useCallback(
    (columnId: string, type: string, config?: any) => {
      console.log("Insert column left of", columnId, "type:", type, config);
      // TODO: insert column at position - 1
      addColumn.mutate(
        { tableId },
        {
          onSuccess: (newCol) => {
            const targetCol = displayColumns.find((c) => c.id === columnId);
            const insertPos = targetCol ? targetCol.position : 0;
            setLocalColumns((prev) => {
              const updated = prev.map((c) =>
                c.position >= insertPos ? { ...c, position: c.position + 1 } : c
              );
              return [...updated, { ...newCol, position: insertPos }].sort(
                (a, b) => a.position - b.position
              );
            });
          },
        }
      );
    },
    [tableId, addColumn, displayColumns]
  );

  const handleContextMenuInsertRight = useCallback(
    (columnId: string, type: string, config?: any) => {
      console.log("Insert column right of", columnId, "type:", type, config);
      // TODO: insert column at position + 1
      addColumn.mutate(
        { tableId },
        {
          onSuccess: (newCol) => {
            const targetCol = displayColumns.find((c) => c.id === columnId);
            const insertPos = targetCol ? targetCol.position + 1 : displayColumns.length;
            setLocalColumns((prev) => {
              const updated = prev.map((c) =>
                c.position >= insertPos ? { ...c, position: c.position + 1 } : c
              );
              return [...updated, { ...newCol, position: insertPos }].sort(
                (a, b) => a.position - b.position
              );
            });
          },
        }
      );
    },
    [tableId, addColumn, displayColumns]
  );

  const handleContextMenuChangeColor = useCallback(
    (columnId: string, color: string) => {
      setContextMenu(null);
      setLocalColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, config: { ...c.config, color } } : c))
      );
    },
    []
  );

  const handleContextMenuChangeType = useCallback(
    (columnId: string, type: ColumnDataType) => {
      setContextMenu(null);
      setLocalColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, dataType: type } : c))
      );
    },
    []
  );

  const handleContextMenuDuplicate = useCallback(
    (columnId: string) => {
      console.log("Duplicate column:", columnId);
      const col = displayColumns.find((c) => c.id === columnId);
      if (!col) return;
      addColumn.mutate(
        { tableId },
        {
          onSuccess: (newCol) => {
            setLocalColumns((prev) => [
              ...prev,
              {
                ...newCol,
                name: `${col.name} (copy)`,
                dataType: col.dataType,
                columnType: col.columnType,
                config: col.config,
                position: prev.length,
              },
            ]);
          },
        }
      );
    },
    [tableId, addColumn, displayColumns]
  );

  const handleContextMenuSort = useCallback(
    (columnId: string, direction: "asc" | "desc") => {
      setContextMenu(null);
      setSorts([{ id: `sort-${columnId}`, columnId, direction }]);
    },
    []
  );

  const handleContextMenuDedupe = useCallback(
    (columnId: string) => {
      setContextMenu(null);
      alert(`Dedupe on column "${displayColumns.find(c => c.id === columnId)?.name}" — will remove duplicate rows. (API integration pending)`);
    },
    [displayColumns]
  );

  const handleContextMenuFilter = useCallback(
    (columnId: string) => {
      setContextMenu(null);
      setIsFilterOpen(true);
      setFilterGroup((prev) => ({
        ...prev,
        filters: [
          ...prev.filters,
          {
            id: `filter-${Date.now()}`,
            columnId,
            operator: "is_not_empty" as const,
            value: "",
          },
        ],
      }));
    },
    []
  );

  const handleContextMenuPin = useCallback(
    (columnId: string) => {
      setContextMenu(null);
      setLocalColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, pinned: !c.pinned } : c))
      );
    },
    []
  );

  const handleContextMenuHide = useCallback(
    (columnId: string) => {
      setContextMenu(null);
      setLocalColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, hidden: true } : c))
      );
    },
    []
  );

  const handleContextMenuDelete = useCallback(
    (columnId: string) => {
      setContextMenu(null);
      handleColumnDelete(columnId);
    },
    [handleColumnDelete]
  );

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
            onColumnHeaderContextMenu={handleColumnHeaderContextMenu}
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
              <ColumnConfigEditor
                column={selectedCol}
                allColumns={displayColumns}
                rows={rows}
                onSave={(columnId, updates) => {
                  // Update column definition
                  setLocalColumns((prev) =>
                    prev.map((c) => (c.id === columnId ? { ...c, ...updates } : c))
                  );
                  setSelectedColumn((prev) => prev ? { ...prev, ...updates } : prev);

                  // If valueSource changed, recompute cell values from enrichment data
                  if (updates.valueSource && updates.valueSource.type === "reference") {
                    const { sourceColumnId, sourceField, expression } = updates.valueSource;
                    if (sourceColumnId) {
                      setLocalRows((prevRows) =>
                        prevRows.map((row) => {
                          const sourceCell = row.cells[sourceColumnId];
                          if (!sourceCell) return row;

                          let newValue: string | null = null;

                          if (sourceField && sourceCell.rawValue && typeof sourceCell.rawValue === "object") {
                            // Extract sub-field from JSON
                            newValue = String((sourceCell.rawValue as Record<string, unknown>)[sourceField] ?? "");
                          } else if (!sourceField) {
                            // Use the display value directly
                            newValue = sourceCell.value != null ? String(sourceCell.value) : null;
                          }

                          // If there's a template expression with text, apply it
                          if (expression && expression !== `{{${sourceColumnId}.${sourceField}}}` && newValue) {
                            // Simple template: replace {{col.field}} with value
                            newValue = expression.replace(/\{\{[^}]+\}\}/g, newValue);
                          }

                          return {
                            ...row,
                            cells: {
                              ...row.cells,
                              [columnId]: {
                                ...(row.cells[columnId] ?? { rawValue: null, source: undefined, confidence: undefined, errorMessage: undefined }),
                                value: newValue,
                                status: newValue ? CellStatus.Complete : CellStatus.Empty,
                              } as CellData,
                            },
                          };
                        })
                      );
                    }
                  }
                }}
                onDelete={(columnId) => {
                  handleColumnDelete(columnId);
                }}
                onClose={handleCloseRightPanel}
              />
            )}
          </div>
        )}
      </div>

      {/* Column config is now inline in the right panel above */}

      {/* Column header right-click context menu */}
      {contextMenu && contextMenuColumn && (
        <ColumnHeaderMenu
          column={contextMenuColumn}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          isOpen={true}
          onClose={handleContextMenuClose}
          onRename={handleContextMenuRename}
          onEdit={handleContextMenuEdit}
          onInsertLeft={handleContextMenuInsertLeft}
          onInsertRight={handleContextMenuInsertRight}
          onChangeColor={handleContextMenuChangeColor}
          onChangeType={handleContextMenuChangeType}
          onDuplicate={handleContextMenuDuplicate}
          onSort={handleContextMenuSort}
          onDedupe={handleContextMenuDedupe}
          onFilter={handleContextMenuFilter}
          onPin={handleContextMenuPin}
          onHide={handleContextMenuHide}
          onDelete={handleContextMenuDelete}
        />
      )}
    </div>
  );
}
