"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

import type { ColumnDef, RowData, ColumnReference } from "@/types/table";
import { ColumnBehaviorType, ColumnDataType } from "@/types/table";

function getColumnIcon(col: ColumnDef): string {
  if (col.columnType === ColumnBehaviorType.Enrichment) return "🏢";
  if (col.valueSource) return ":=";
  const icons: Record<string, string> = {
    [ColumnDataType.Date]: "📅",
    [ColumnDataType.Url]: "🔗",
    [ColumnDataType.Number]: "#",
    [ColumnDataType.Email]: "@",
    [ColumnDataType.Currency]: "$",
    [ColumnDataType.Checkbox]: "☑",
    [ColumnDataType.Select]: "◉",
    [ColumnDataType.MultiSelect]: "☰",
    [ColumnDataType.Image]: "🖼",
    [ColumnDataType.AssignedTo]: "👤",
  };
  return icons[col.dataType] ?? "T";
}

function inferTypeIcon(value: unknown): string {
  if (value === null || value === undefined) return "T";
  if (typeof value === "number") return "#";
  if (typeof value === "boolean") return "☑";
  if (Array.isArray(value)) return "[]";
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) return "🔗";
    if (value.includes("@") && value.includes(".")) return "@";
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "📅";
  }
  if (typeof value === "object") return "{}";
  return "T";
}

function getSubFieldsFromRows(rows: RowData[], columnId: string): string[] {
  for (const row of rows) {
    const cell = row.cells[columnId];
    if (cell?.rawValue && typeof cell.rawValue === "object" && !Array.isArray(cell.rawValue)) {
      return Object.keys(cell.rawValue as Record<string, unknown>);
    }
  }
  return [];
}

function getSubFieldValue(row: RowData, columnId: string, field: string): unknown {
  const cell = row.cells[columnId];
  if (cell?.rawValue && typeof cell.rawValue === "object" && !Array.isArray(cell.rawValue)) {
    return (cell.rawValue as Record<string, unknown>)[field];
  }
  return undefined;
}

function getCellDisplayValue(row: RowData, columnId: string): string {
  const cell = row.cells[columnId];
  if (!cell || cell.value === null || cell.value === undefined) return "—";
  if (typeof cell.value === "object") return JSON.stringify(cell.value);
  return String(cell.value);
}

function formatPreviewValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") {
    if (Array.isArray(val)) return `[${val.length} items]`;
    return JSON.stringify(val).slice(0, 60);
  }
  return String(val);
}

export interface ColumnRefPickerProps {
  columns: ColumnDef[];
  rows: RowData[];
  onSelect: (ref: ColumnReference) => void;
  onClose: () => void;
  triggerRect: { top: number; left: number; width: number };
}

function PreviewPopup({ title, rows, columnId, field, anchorRect }: {
  title: string;
  rows: RowData[];
  columnId: string;
  field?: string;
  anchorRect: { top: number; left: number; height: number };
}) {
  const previewRows = rows.slice(0, 8);
  return (
    <div
      className="fixed z-[60] w-[280px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
      style={{ top: Math.max(8, anchorRect.top - 20), left: anchorRect.left - 290 }}
    >
      <div className="border-b border-gray-100 bg-gray-50/80 px-3 py-2">
        <p className="truncate text-[11px] font-semibold text-gray-700">{title}</p>
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-3 py-1 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">Row</th>
              <th className="px-3 py-1 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">Value</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, idx) => {
              const val = field ? getSubFieldValue(row, columnId, field) : getCellDisplayValue(row, columnId);
              const displayVal = field ? formatPreviewValue(val) : (val as string);
              return (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-1 text-[11px] text-gray-400">{idx + 1}</td>
                  <td className="max-w-[180px] truncate px-3 py-1 text-[11px] text-gray-700" title={String(displayVal)}>{displayVal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ColumnRefPicker({ columns, rows, onSelect, onClose, triggerRect }: ColumnRefPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<{
    columnId: string; field?: string; rect: { top: number; left: number; height: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, []);

  const toggleExpand = useCallback((colId: string) => {
    setExpandedColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }, []);

  const handleColumnSelect = useCallback((col: ColumnDef) => {
    onSelect({
      columnId: col.id,
      columnName: col.name,
      displayLabel: col.name,
      typeIcon: getColumnIcon(col),
    });
  }, [onSelect]);

  const handleSubFieldSelect = useCallback((col: ColumnDef, field: string) => {
    let icon = "T";
    for (const row of rows) {
      const val = getSubFieldValue(row, col.id, field);
      if (val !== undefined && val !== null) { icon = inferTypeIcon(val); break; }
    }
    onSelect({
      columnId: col.id,
      columnName: col.name,
      field,
      displayLabel: field,
      typeIcon: icon,
    });
  }, [rows, onSelect]);

  const handleMouseEnter = useCallback((columnId: string, field: string | undefined, e: React.MouseEvent<HTMLElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimerRef.current = setTimeout(() => {
      setHoveredItem({ columnId, field, rect: { top: rect.top, left: rect.left, height: rect.height } });
    }, 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredItem(null);
  }, []);

  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;
    const q = searchQuery.toLowerCase();
    return columns.filter((c) => c.name.toLowerCase().includes(q));
  }, [columns, searchQuery]);

  return (
    <>
      <div
        ref={containerRef}
        className="fixed z-50 w-[340px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        style={{ top: triggerRect.top, left: triggerRect.left, minWidth: Math.max(triggerRect.width, 340) }}
      >
        {/* Search */}
        <div className="border-b border-gray-100 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search columns and fields..."
              className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-7 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Column list */}
        <div className="max-h-[400px] overflow-y-auto py-1">
          {filteredColumns.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-gray-400">No columns found</p>
          )}

          {filteredColumns.map((col) => {
            const hasData = col.columnType === ColumnBehaviorType.Enrichment;
            const subFields = hasData ? getSubFieldsFromRows(rows, col.id) : [];
            const isExpanded = expandedColumnIds.has(col.id);
            const icon = getColumnIcon(col);

            return (
              <div key={col.id}>
                {/* Column row */}
                <div
                  className="group flex w-full items-center hover:bg-blue-50 transition-colors"
                  onMouseEnter={(e) => handleMouseEnter(col.id, undefined, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Expand/collapse button for enrichment columns */}
                  {hasData && subFields.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(col.id)}
                      className="flex items-center justify-center w-7 shrink-0 self-stretch text-gray-400 hover:text-blue-500"
                    >
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                  ) : (
                    <div className="w-7 shrink-0" />
                  )}

                  {/* Clickable column name */}
                  <button
                    type="button"
                    onClick={() => {
                      if (hasData && subFields.length > 0) {
                        toggleExpand(col.id);
                      } else {
                        handleColumnSelect(col);
                      }
                    }}
                    className="flex flex-1 items-center gap-2 py-2 pr-3 text-left"
                  >
                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded bg-gray-100 text-[11px] text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                      {icon}
                    </span>
                    <span className="flex-1 truncate text-[13px] font-medium text-gray-700 group-hover:text-gray-900">
                      {col.name}
                    </span>
                  </button>

                  {/* Data badge for enrichment columns */}
                  {hasData && subFields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(col.id)}
                      className={cn(
                        "mr-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                        isExpanded
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-500"
                      )}
                    >
                      <span className="tabular-nums">{subFields.length} fields</span>
                      {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    </button>
                  )}
                </div>

                {/* Expanded sub-fields */}
                {hasData && isExpanded && subFields.length > 0 && (
                  <div className="border-l-2 border-blue-200 ml-[14px] bg-blue-50/30">
                    {subFields.map((field) => {
                      let fieldIcon = "T";
                      for (const row of rows) {
                        const val = getSubFieldValue(row, col.id, field);
                        if (val !== undefined && val !== null) { fieldIcon = inferTypeIcon(val); break; }
                      }

                      // Get a sample value for display
                      let sampleVal = "";
                      for (const row of rows) {
                        const val = getSubFieldValue(row, col.id, field);
                        if (val !== undefined && val !== null) {
                          sampleVal = formatPreviewValue(val);
                          if (sampleVal.length > 30) sampleVal = sampleVal.slice(0, 30) + "...";
                          break;
                        }
                      }

                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => handleSubFieldSelect(col, field)}
                          onMouseEnter={(e) => handleMouseEnter(col.id, field, e)}
                          onMouseLeave={handleMouseLeave}
                          className="group/field flex w-full items-center gap-2 py-1.5 pl-5 pr-3 text-left transition-colors hover:bg-blue-100/60"
                        >
                          <span className="flex size-[18px] shrink-0 items-center justify-center rounded bg-white text-[10px] text-gray-500 group-hover/field:text-blue-600 border border-gray-200">
                            {fieldIcon}
                          </span>
                          <span className="text-[12px] font-medium text-gray-600 group-hover/field:text-blue-700">
                            {field}
                          </span>
                          {sampleVal && (
                            <span className="ml-auto max-w-[120px] truncate text-[10px] text-gray-400">
                              {sampleVal}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-1.5">
          <p className="text-[10px] text-gray-400">
            Click a column to use its value. Expand enrichment columns to pick a specific field.
          </p>
        </div>
      </div>

      {/* Preview popup on hover */}
      {hoveredItem && (
        <PreviewPopup
          title={
            hoveredItem.field
              ? `${columns.find((c) => c.id === hoveredItem.columnId)?.name ?? ""} › ${hoveredItem.field}`
              : columns.find((c) => c.id === hoveredItem.columnId)?.name ?? ""
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
