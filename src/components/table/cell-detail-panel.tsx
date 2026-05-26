"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  Pencil,
  Settings,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Ban,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { CellData, ColumnDef } from "@/types/table";
import { CellStatus } from "@/types/table";

// ── Helpers ─────────────────────────────────────────────────────────

/** Detect the JSON type of a value for display. */
function getFieldType(
  value: unknown
): "string" | "number" | "boolean" | "array" | "object" | "null" {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

/** Return the type icon glyph for a given field type. */
function typeIcon(type: ReturnType<typeof getFieldType>): string {
  switch (type) {
    case "string":
      return "T";
    case "number":
      return "#";
    case "boolean":
      return "☑";
    case "array":
      return "[]";
    case "object":
      return "{}";
    case "null":
      return "∅";
  }
}

/** Format a display label from a JSON key. */
function formatLabel(key: string): string {
  // Convert camelCase / snake_case to Title Case
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Try to parse the cell value as a JSON object. */
function parseJsonValue(
  value: unknown
): Record<string, unknown> | unknown[] | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      // not JSON
    }
  }
  return null;
}

// ── Types ───────────────────────────────────────────────────────────

interface FieldEntry {
  key: string;
  label: string;
  value: unknown;
  type: ReturnType<typeof getFieldType>;
  path: string;
}

// ── Props ───────────────────────────────────────────────────────────

export interface CellDetailPanelProps {
  cellData: CellData;
  columnDef: ColumnDef;
}

// ── Component ───────────────────────────────────────────────────────

export function CellDetailPanel({ cellData, columnDef }: CellDetailPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Parse the raw or main value as JSON
  const jsonData = useMemo(() => {
    return parseJsonValue(cellData.rawValue) ?? parseJsonValue(cellData.value);
  }, [cellData.rawValue, cellData.value]);

  // Build flat field entries from top-level keys
  const fields: FieldEntry[] = useMemo(() => {
    if (!jsonData || Array.isArray(jsonData)) return [];
    return Object.entries(jsonData).map(([key, value]) => ({
      key,
      label: formatLabel(key),
      value,
      type: getFieldType(value),
      path: `{{${columnDef.name}.${key}}}`,
    }));
  }, [jsonData, columnDef.name]);

  // Filter by search
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return fields;
    const q = searchQuery.toLowerCase();
    return fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        String(f.value).toLowerCase().includes(q)
    );
  }, [fields, searchQuery]);

  const handleCopyPath = useCallback(
    (path: string) => {
      navigator.clipboard.writeText(path).then(() => {
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 1500);
      });
    },
    []
  );

  // ── Status states ──────────────────────────────────────────────

  if (cellData.status === CellStatus.Empty) {
    return (
      <StatusMessage
        icon={<Ban className="size-5 text-muted-foreground" />}
        title="No data"
        description="This cell has not been enriched yet."
      />
    );
  }

  if (cellData.status === CellStatus.Pending) {
    return (
      <StatusMessage
        icon={<Clock className="size-5 text-muted-foreground" />}
        title="Pending"
        description="This cell is queued for enrichment."
      />
    );
  }

  if (cellData.status === CellStatus.Running) {
    return (
      <StatusMessage
        icon={
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        }
        title="Running"
        description="Enrichment is in progress..."
      />
    );
  }

  if (cellData.status === CellStatus.Error) {
    return (
      <StatusMessage
        icon={<AlertCircle className="size-5 text-destructive" />}
        title="Error"
        description={cellData.errorMessage ?? "An error occurred during enrichment."}
      />
    );
  }

  if (cellData.status === CellStatus.Skipped) {
    return (
      <StatusMessage
        icon={<Ban className="size-5 text-muted-foreground" />}
        title="Skipped"
        description="This cell was skipped based on conditions."
      />
    );
  }

  // ── No JSON data (simple value) ───────────────────────────────

  if (!jsonData || fields.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Pencil className="size-3.5" />
          <span>Cell details</span>
          <Settings className="ml-auto size-3.5" />
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm text-foreground break-all">
            {String(cellData.value ?? "")}
          </p>
        </div>
        {cellData.source && (
          <p className="text-[11px] text-muted-foreground">
            Source: {cellData.source}
          </p>
        )}
      </div>
    );
  }

  // ── JSON field list ───────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      {/* Subheader with icons */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 text-xs text-muted-foreground">
        <Pencil className="size-3.5" />
        <span>Cell details</span>
        <Settings className="ml-auto size-3.5 cursor-pointer hover:text-foreground" />
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fields..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Source badge */}
      {cellData.source && (
        <div className="px-4 pb-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Source: {cellData.source}
          </span>
        </div>
      )}

      {/* Field list */}
      <div className="flex flex-col">
        {filteredFields.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No fields match your search.
          </p>
        )}

        {filteredFields.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            columnName={columnDef.name}
            copiedPath={copiedPath}
            onCopyPath={handleCopyPath}
          />
        ))}
      </div>
    </div>
  );
}

// ── FieldRow ────────────────────────────────────────────────────────

function FieldRow({
  field,
  columnName,
  copiedPath,
  onCopyPath,
}: {
  field: FieldEntry;
  columnName: string;
  copiedPath: string | null;
  onCopyPath: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isExpandable = field.type === "object" || field.type === "array";

  const displayValue = useMemo(() => {
    if (field.type === "array") {
      const arr = field.value as unknown[];
      return `[${arr.length}]`;
    }
    if (field.type === "object") {
      const keys = Object.keys(field.value as Record<string, unknown>);
      return `{${keys.length}}`;
    }
    if (field.type === "boolean") {
      return field.value ? "true" : "false";
    }
    if (field.type === "null") {
      return "null";
    }
    const str = String(field.value);
    if (str.length > 80) return str.slice(0, 80) + "...";
    return str;
  }, [field]);

  // Build nested fields for expansion
  const nestedFields: FieldEntry[] = useMemo(() => {
    if (!expanded || !isExpandable) return [];
    if (field.type === "array") {
      const arr = field.value as unknown[];
      return arr.map((item, idx) => ({
        key: `${field.key}[${idx}]`,
        label: `[${idx}]`,
        value: item,
        type: getFieldType(item),
        path: `{{${columnName}.${field.key}[${idx}]}}`,
      }));
    }
    if (field.type === "object") {
      const obj = field.value as Record<string, unknown>;
      return Object.entries(obj).map(([k, v]) => ({
        key: `${field.key}.${k}`,
        label: formatLabel(k),
        value: v,
        type: getFieldType(v),
        path: `{{${columnName}.${field.key}.${k}}}`,
      }));
    }
    return [];
  }, [expanded, isExpandable, field, columnName]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => {
          if (isExpandable) {
            setExpanded(!expanded);
          } else {
            onCopyPath(field.path);
          }
        }}
        className={cn(
          "group flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-muted/50",
          isExpandable && "cursor-pointer"
        )}
        title={
          isExpandable
            ? "Click to expand"
            : `Click to copy: ${field.path}`
        }
      >
        {/* Expand chevron or spacer */}
        {isExpandable ? (
          <ChevronRight
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {/* Type icon */}
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
          {typeIcon(field.type)}
        </span>

        {/* Field name */}
        <span className="shrink-0 text-xs font-medium text-foreground">
          {field.label}
          {field.type === "array" && (
            <span className="ml-1 text-muted-foreground">
              [{(field.value as unknown[]).length}]
            </span>
          )}
        </span>

        {/* Value */}
        <span className="ml-auto truncate text-right text-xs text-muted-foreground">
          {displayValue}
        </span>

        {/* Copy indicator (non-expandable) */}
        {!isExpandable && (
          <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            {copiedPath === field.path ? (
              <Check className="size-3 text-green-500" />
            ) : (
              <Copy className="size-3 text-muted-foreground" />
            )}
          </span>
        )}
      </button>

      {/* Nested fields */}
      {expanded && nestedFields.length > 0 && (
        <div className="border-l border-border ml-7">
          {nestedFields.map((nested) => (
            <NestedFieldRow
              key={nested.key}
              field={nested}
              columnName={columnName}
              copiedPath={copiedPath}
              onCopyPath={onCopyPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── NestedFieldRow ──────────────────────────────────────────────────

function NestedFieldRow({
  field,
  columnName,
  copiedPath,
  onCopyPath,
}: {
  field: FieldEntry;
  columnName: string;
  copiedPath: string | null;
  onCopyPath: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isExpandable = field.type === "object" || field.type === "array";

  const displayValue = useMemo(() => {
    if (field.type === "array") {
      const arr = field.value as unknown[];
      return `[${arr.length}]`;
    }
    if (field.type === "object") {
      const keys = Object.keys(field.value as Record<string, unknown>);
      return `{${keys.length}}`;
    }
    if (field.type === "boolean") return field.value ? "true" : "false";
    if (field.type === "null") return "null";
    const str = String(field.value);
    if (str.length > 60) return str.slice(0, 60) + "...";
    return str;
  }, [field]);

  const nestedFields: FieldEntry[] = useMemo(() => {
    if (!expanded || !isExpandable) return [];
    if (field.type === "array") {
      const arr = field.value as unknown[];
      return arr.map((item, idx) => ({
        key: `${field.key}[${idx}]`,
        label: `[${idx}]`,
        value: item,
        type: getFieldType(item),
        path: `{{${columnName}.${field.key}[${idx}]}}`,
      }));
    }
    if (field.type === "object") {
      const obj = field.value as Record<string, unknown>;
      return Object.entries(obj).map(([k, v]) => ({
        key: `${field.key}.${k}`,
        label: formatLabel(k),
        value: v,
        type: getFieldType(v),
        path: `{{${columnName}.${field.key}.${k}}}`,
      }));
    }
    return [];
  }, [expanded, isExpandable, field, columnName]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => {
          if (isExpandable) {
            setExpanded(!expanded);
          } else {
            onCopyPath(field.path);
          }
        }}
        className="group flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/50"
        title={
          isExpandable
            ? "Click to expand"
            : `Click to copy: ${field.path}`
        }
      >
        {isExpandable ? (
          <ChevronRight
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground">
          {typeIcon(field.type)}
        </span>

        <span className="shrink-0 text-[11px] font-medium text-foreground">
          {field.label}
        </span>

        <span className="ml-auto truncate text-right text-[11px] text-muted-foreground">
          {displayValue}
        </span>

        {!isExpandable && (
          <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            {copiedPath === field.path ? (
              <Check className="size-3 text-green-500" />
            ) : (
              <Copy className="size-3 text-muted-foreground" />
            )}
          </span>
        )}
      </button>

      {expanded && nestedFields.length > 0 && (
        <div className="border-l border-border ml-5">
          {nestedFields.map((nested) => (
            <NestedFieldRow
              key={nested.key}
              field={nested}
              columnName={columnName}
              copiedPath={copiedPath}
              onCopyPath={onCopyPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── StatusMessage ───────────────────────────────────────────────────

function StatusMessage({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      {icon}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default CellDetailPanel;
