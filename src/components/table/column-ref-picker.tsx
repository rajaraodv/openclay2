"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ChevronRight,
  Search,
  Type,
  Hash,
  Link,
  Calendar,
  CheckSquare,
  Tag,
  DollarSign,
  Mail,
  Image,
  User,
  Database,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { ColumnDef } from "@/types/table";
import { ColumnBehaviorType, ColumnDataType } from "@/types/table";

// ── Helpers ─────────────────────────────────────────────────────────

/** Icon component for a given column data type. */
function ColumnTypeIcon({
  dataType,
  className,
}: {
  dataType: ColumnDataType;
  className?: string;
}) {
  const cls = cn("size-3.5", className);
  switch (dataType) {
    case ColumnDataType.Text:
      return <Type className={cls} />;
    case ColumnDataType.Number:
      return <Hash className={cls} />;
    case ColumnDataType.Url:
      return <Link className={cls} />;
    case ColumnDataType.Date:
      return <Calendar className={cls} />;
    case ColumnDataType.Checkbox:
      return <CheckSquare className={cls} />;
    case ColumnDataType.Select:
    case ColumnDataType.MultiSelect:
      return <Tag className={cls} />;
    case ColumnDataType.Currency:
      return <DollarSign className={cls} />;
    case ColumnDataType.Email:
      return <Mail className={cls} />;
    case ColumnDataType.Image:
      return <Image className={cls} />;
    case ColumnDataType.AssignedTo:
      return <User className={cls} />;
    default:
      return <Type className={cls} />;
  }
}

/** Try to extract enrichment field names from a column's rawValue or config. */
function getEnrichmentSubFields(col: ColumnDef): string[] {
  // For demo purposes, we try to read field names from the config
  // In a real app, this would come from the provider schema or sample data
  const cfg = col.config as Record<string, unknown>;
  if (cfg && typeof cfg === "object") {
    // Check if there's a fieldMap or schema
    if (Array.isArray(cfg.fields)) {
      return cfg.fields as string[];
    }
    if (cfg.schema && typeof cfg.schema === "object") {
      return Object.keys(cfg.schema as Record<string, unknown>);
    }
  }
  // Default enrichment fields (common company enrichment response)
  return [
    "name",
    "domain",
    "description",
    "industry",
    "size",
    "founded",
    "country",
    "locality",
    "website",
    "logo_url",
    "type",
    "slug",
    "org_id",
    "company_id",
    "linkedin_url",
    "locations",
    "technologies",
    "last_refresh",
  ];
}

// ── Props ───────────────────────────────────────────────────────────

export interface ColumnRefPickerProps {
  columns: ColumnDef[];
  onSelect: (ref: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

// ── Component ───────────────────────────────────────────────────────

export function ColumnRefPicker({
  columns,
  onSelect,
  onClose,
  position,
}: ColumnRefPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedColumnId, setExpandedColumnId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
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
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Filter columns
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;
    const q = searchQuery.toLowerCase();
    return columns.filter((c) => c.name.toLowerCase().includes(q));
  }, [columns, searchQuery]);

  const handleSelectColumn = useCallback(
    (col: ColumnDef) => {
      if (col.columnType === ColumnBehaviorType.Enrichment) {
        // Toggle expand for enrichment columns
        setExpandedColumnId((prev) => (prev === col.id ? null : col.id));
      } else {
        onSelect(`{{${col.name}}}`);
      }
    },
    [onSelect]
  );

  const handleSelectSubField = useCallback(
    (colName: string, field: string) => {
      onSelect(`{{${colName}.${field}}}`);
    },
    [onSelect]
  );

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-[280px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="border-b border-border px-3 py-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          Insert column reference
        </p>
      </div>

      {/* Search */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search columns..."
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Column list */}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredColumns.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No columns found.
          </p>
        )}

        {filteredColumns.map((col) => {
          const isEnrichment =
            col.columnType === ColumnBehaviorType.Enrichment;
          const isExpanded = expandedColumnId === col.id;
          const subFields = isEnrichment
            ? getEnrichmentSubFields(col)
            : [];

          return (
            <div key={col.id}>
              <button
                type="button"
                onClick={() => handleSelectColumn(col)}
                className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50"
              >
                {/* Column icon */}
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                  {isEnrichment ? (
                    <Database className="size-3" />
                  ) : (
                    <ColumnTypeIcon
                      dataType={col.dataType}
                      className="size-3"
                    />
                  )}
                </span>

                {/* Column name */}
                <span className="flex-1 truncate text-xs font-medium text-foreground">
                  {col.name}
                </span>

                {/* Enrichment indicator */}
                {isEnrichment && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{subFields.length} items</span>
                    <ChevronRight
                      className={cn(
                        "size-3 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </span>
                )}
              </button>

              {/* Sub-fields for enrichment columns */}
              {isEnrichment && isExpanded && (
                <div className="border-t border-border/50 bg-muted/20">
                  {subFields
                    .filter((f) =>
                      searchQuery.trim()
                        ? f.toLowerCase().includes(searchQuery.toLowerCase())
                        : true
                    )
                    .map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() =>
                          handleSelectSubField(col.name, field)
                        }
                        className="flex w-full items-center gap-2.5 py-1.5 pl-10 pr-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground">
                          T
                        </span>
                        <span className="truncate text-[11px] text-foreground">
                          {field
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ColumnRefPicker;
