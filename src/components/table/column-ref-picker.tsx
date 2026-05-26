"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

import type { ColumnDef, RowData, ColumnReference } from "@/types/table";
import { ColumnBehaviorType, ColumnDataType } from "@/types/table";

// ── Helpers ─────────────────────────────────────────────────────────

/** Get icon string for a column data type. */
function getColumnIcon(col: ColumnDef): string {
  if (col.columnType === ColumnBehaviorType.Enrichment) return "🏢";
  if (col.valueSource) return ":=T";
  switch (col.dataType) {
    case ColumnDataType.Date:
      return "📅";
    case ColumnDataType.Url:
      return "🔗";
    case ColumnDataType.Number:
      return "#";
    case ColumnDataType.Email:
      return "↓";
    case ColumnDataType.Currency:
      return "$";
    case ColumnDataType.Checkbox:
      return "☑";
    case ColumnDataType.Select:
    case ColumnDataType.MultiSelect:
      return "🏷";
    case ColumnDataType.Image:
      return "🖼";
    case ColumnDataType.AssignedTo:
      return "👤";
    case ColumnDataType.Text:
    default:
      return "T";
  }
}

/** Infer a type icon from a value. */
function inferTypeIcon(value: unknown): string {
  if (value === null || value === undefined) return "T";
  if (typeof value === "number") return "#";
  if (typeof value === "boolean") return "☑";
  if (Array.isArray(value)) return "[]";
  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("www.")
    )
      return "🔗";
    if (value.includes("@") && value.includes(".")) return "@";
    // Check for date-ish strings
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "📅";
  }
  if (typeof value === "object") return "{}";
  return "T";
}

/** Extract enrichment sub-field names from row data. */
function getSubFieldsFromRows(
  rows: RowData[],
  columnId: string
): string[] {
  for (const row of rows) {
    const cell = row.cells[columnId];
    if (cell?.rawValue && typeof cell.rawValue === "object" && !Array.isArray(cell.rawValue)) {
      return Object.keys(cell.rawValue as Record<string, unknown>);
    }
  }
  return [];
}

/** Get a sample value for a sub-field from a row's enrichment rawValue. */
function getSubFieldValue(
  row: RowData,
  columnId: string,
  field: string
): unknown {
  const cell = row.cells[columnId];
  if (cell?.rawValue && typeof cell.rawValue === "object" && !Array.isArray(cell.rawValue)) {
    return (cell.rawValue as Record<string, unknown>)[field];
  }
  return undefined;
}

/** Get the display value for a cell (simple column). */
function getCellDisplayValue(row: RowData, columnId: string): string {
  const cell = row.cells[columnId];
  if (!cell || cell.value === null || cell.value === undefined) return "—";
  if (typeof cell.value === "object") return JSON.stringify(cell.value);
  return String(cell.value);
}

/** Format a value for preview display. */
function formatPreviewValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") {
    if (Array.isArray(val)) return `[${val.length} items]`;
    return JSON.stringify(val);
  }
  return String(val);
}

// ── Props ───────────────────────────────────────────────────────────

export interface ColumnRefPickerProps {
  columns: ColumnDef[];
  rows: RowData[];
  onSelect: (ref: ColumnReference) => void;
  onClose: () => void;
  triggerRect: { top: number; left: number; width: number };
}

// ── Preview Popup ───────────────────────────────────────────────────

interface PreviewPopupProps {
  title: string;
  rows: RowData[];
  columnId: string;
  field?: string;
  anchorRect: { top: number; left: number; height: number };
}

function PreviewPopup({
  title,
  rows,
  columnId,
  field,
  anchorRect,
}: PreviewPopupProps) {
  const previewRows = rows.slice(0, 10);

  return (
    <div
      className="fixed z-[60] w-[280px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{
        top: Math.max(8, anchorRect.top - 20),
        left: anchorRect.left - 290,
      }}
    >
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50/80 px-3 py-2">
        <p className="truncate text-[11px] font-semibold text-gray-700">
          {title}
        </p>
      </div>

      {/* Table */}
      <div className="max-h-[280px] overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Row #
              </th>
              <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, idx) => {
              const val = field
                ? getSubFieldValue(row, columnId, field)
                : getCellDisplayValue(row, columnId);
              const displayVal = field
                ? formatPreviewValue(val)
                : (val as string);

              return (
                <tr
                  key={row.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-3 py-1.5 text-[11px] text-gray-400">
                    {idx + 1}
                  </td>
                  <td
                    className="max-w-[180px] truncate px-3 py-1.5 text-[11px] text-gray-700"
                    title={String(displayVal)}
                  >
                    {displayVal}
                  </td>
                </tr>
              );
            })}
            {previewRows.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-3 py-3 text-center text-[11px] text-gray-400"
                >
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export function ColumnRefPicker({
  columns,
  rows,
  onSelect,
  onClose,
  triggerRect,
}: ColumnRefPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedColumn, setExpandedColumn] = useState<ColumnDef | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{
    columnId: string;
    field?: string;
    rect: { top: number; left: number; height: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus search on mount
  useEffect(() => {
    // Small delay to avoid conflicts with the "/" key trigger
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (expandedColumn) {
          setExpandedColumn(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, expandedColumn]);

  // Cleanup hover timer
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Get enrichment sub-fields for expanded column
  const subFields = useMemo(() => {
    if (!expandedColumn) return [];
    return getSubFieldsFromRows(rows, expandedColumn.id);
  }, [expandedColumn, rows]);

  // Filter columns
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;
    const q = searchQuery.toLowerCase();
    return columns.filter((c) => c.name.toLowerCase().includes(q));
  }, [columns, searchQuery]);

  // Filter sub-fields
  const filteredSubFields = useMemo(() => {
    if (!searchQuery.trim()) return subFields;
    const q = searchQuery.toLowerCase();
    return subFields.filter((f) => f.toLowerCase().includes(q));
  }, [subFields, searchQuery]);

  // Handlers
  const handleColumnClick = useCallback(
    (col: ColumnDef) => {
      const isEnrichment =
        col.columnType === ColumnBehaviorType.Enrichment;

      if (isEnrichment) {
        setExpandedColumn(col);
        setSearchQuery("");
      } else {
        onSelect({
          columnId: col.id,
          columnName: col.name,
          displayLabel: col.name,
          typeIcon: getColumnIcon(col),
        });
      }
    },
    [onSelect]
  );

  const handleSubFieldSelect = useCallback(
    (field: string) => {
      if (!expandedColumn) return;

      // Infer icon from first row's data
      let icon = "T";
      for (const row of rows) {
        const val = getSubFieldValue(row, expandedColumn.id, field);
        if (val !== undefined && val !== null) {
          icon = inferTypeIcon(val);
          break;
        }
      }

      onSelect({
        columnId: expandedColumn.id,
        columnName: expandedColumn.name,
        field,
        displayLabel: field,
        typeIcon: icon,
      });
    },
    [expandedColumn, rows, onSelect]
  );

  const handleBackToColumns = useCallback(() => {
    setExpandedColumn(null);
    setSearchQuery("");
  }, []);

  const handleMouseEnterItem = useCallback(
    (
      columnId: string,
      field: string | undefined,
      e: React.MouseEvent<HTMLButtonElement>
    ) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      const rect = e.currentTarget.getBoundingClientRect();
      hoverTimerRef.current = setTimeout(() => {
        setHoveredItem({
          columnId,
          field,
          rect: { top: rect.top, left: rect.left, height: rect.height },
        });
      }, 200);
    },
    []
  );

  const handleMouseLeaveItem = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredItem(null);
  }, []);

  // Position the dropdown below the trigger
  const dropdownStyle: React.CSSProperties = {
    top: triggerRect.top,
    left: triggerRect.left,
    minWidth: Math.max(triggerRect.width, 300),
  };

  return (
    <>
      <div
        ref={containerRef}
        className="fixed z-50 w-[300px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        style={dropdownStyle}
      >
        {/* Breadcrumb header (when expanded) */}
        {expandedColumn && (
          <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50/80 px-3 py-2">
            <button
              type="button"
              onClick={handleBackToColumns}
              className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <ChevronLeft className="size-3" />
              Back
            </button>
            <span className="text-[11px] text-gray-300">|</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-700">
              <span className="text-[10px]">{getColumnIcon(expandedColumn)}</span>
              {expandedColumn.name}
            </span>
            <ChevronRight className="size-3 text-gray-300" />
            <span className="text-[11px] text-gray-400">
              {subFields.length} fields
            </span>
          </div>
        )}

        {/* Search */}
        <div className="border-b border-gray-100 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                expandedColumn
                  ? "Search fields..."
                  : "Search columns..."
              }
              className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-7 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[320px] overflow-y-auto py-1">
          {!expandedColumn ? (
            /* ── Column list ── */
            <>
              {filteredColumns.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-gray-400">
                  No columns found
                </p>
              )}

              {filteredColumns.map((col) => {
                const isEnrichment =
                  col.columnType === ColumnBehaviorType.Enrichment;
                const colSubFields = isEnrichment
                  ? getSubFieldsFromRows(rows, col.id)
                  : [];
                const icon = getColumnIcon(col);

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleColumnClick(col)}
                    onMouseEnter={(e) =>
                      handleMouseEnterItem(col.id, undefined, e)
                    }
                    onMouseLeave={handleMouseLeaveItem}
                    className="group flex w-full items-center gap-2.5 px-3 py-[7px] text-left transition-colors hover:bg-blue-50"
                  >
                    {/* Column icon */}
                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded bg-gray-100 text-[11px] text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                      {icon}
                    </span>

                    {/* Column name */}
                    <span className="flex-1 truncate text-[13px] font-medium text-gray-700 group-hover:text-gray-900">
                      {col.name}
                    </span>

                    {/* Enrichment badge */}
                    {isEnrichment && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-blue-500">
                        <span>{colSubFields.length} items</span>
                        <ChevronRight className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            /* ── Sub-field list ── */
            <>
              {filteredSubFields.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-gray-400">
                  No fields found
                </p>
              )}

              {filteredSubFields.map((field) => {
                // Infer icon from first non-null value
                let icon = "T";
                for (const row of rows) {
                  const val = getSubFieldValue(
                    row,
                    expandedColumn.id,
                    field
                  );
                  if (val !== undefined && val !== null) {
                    icon = inferTypeIcon(val);
                    break;
                  }
                }

                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleSubFieldSelect(field)}
                    onMouseEnter={(e) =>
                      handleMouseEnterItem(
                        expandedColumn.id,
                        field,
                        e
                      )
                    }
                    onMouseLeave={handleMouseLeaveItem}
                    className="group flex w-full items-center gap-2.5 px-3 py-[7px] text-left transition-colors hover:bg-blue-50"
                  >
                    {/* Type icon */}
                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded bg-gray-100 text-[11px] text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                      {icon}
                    </span>

                    {/* Field name */}
                    <span className="flex-1 truncate text-[13px] font-medium text-gray-700 group-hover:text-gray-900">
                      {field}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Preview popup */}
      {hoveredItem && (
        <PreviewPopup
          title={
            hoveredItem.field
              ? `${expandedColumn?.name ?? ""} > ${hoveredItem.field}`
              : columns.find((c) => c.id === hoveredItem.columnId)?.name ??
                ""
          }
          rows={rows}
          columnId={hoveredItem.columnId}
          field={hoveredItem.field}
          anchorRect={hoveredItem.rect}
        />
      )}
    </>
  );
}

export default ColumnRefPicker;
