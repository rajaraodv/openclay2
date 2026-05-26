"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Settings,
  Trash2,
  ChevronRight,
  Database,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { ColumnDef } from "@/types/table";
import { ColumnBehaviorType, ColumnDataType } from "@/types/table";
import { ColumnRefPicker } from "./column-ref-picker";

// ── Constants ───────────────────────────────────────────────────────

const DATA_TYPE_OPTIONS: {
  value: ColumnDataType;
  label: string;
  icon: string;
}[] = [
  { value: ColumnDataType.Text, label: "Text", icon: "T" },
  { value: ColumnDataType.Url, label: "URL", icon: "🔗" },
  { value: ColumnDataType.Number, label: "Number", icon: "#" },
  { value: ColumnDataType.Date, label: "Date", icon: "📅" },
  { value: ColumnDataType.Select, label: "Select", icon: "🏷" },
  { value: ColumnDataType.MultiSelect, label: "Multi Select", icon: "🏷" },
  { value: ColumnDataType.Checkbox, label: "Checkbox", icon: "☑" },
  { value: ColumnDataType.Currency, label: "Currency", icon: "$" },
  { value: ColumnDataType.Email, label: "Email", icon: "📧" },
  { value: ColumnDataType.Image, label: "Image", icon: "🖼" },
  { value: ColumnDataType.AssignedTo, label: "Assigned To", icon: "👤" },
];

/** Try to extract enrichment sub-field count from column config. */
function getEnrichmentFieldCount(col: ColumnDef): number {
  const cfg = col.config as Record<string, unknown>;
  if (cfg && typeof cfg === "object") {
    if (Array.isArray(cfg.fields)) return (cfg.fields as string[]).length;
    if (cfg.schema && typeof cfg.schema === "object")
      return Object.keys(cfg.schema as Record<string, unknown>).length;
  }
  return 20; // default
}

// ── Props ───────────────────────────────────────────────────────────

export interface ColumnConfigEditorProps {
  column: ColumnDef;
  allColumns: ColumnDef[];
  onSave: (config: Partial<ColumnDef>) => void;
  onDelete: () => void;
}

// ── Component ───────────────────────────────────────────────────────

export function ColumnConfigEditor({
  column,
  allColumns,
  onSave,
  onDelete,
}: ColumnConfigEditorProps) {
  const [name, setName] = useState(column.name);
  const [dataType, setDataType] = useState(column.dataType);
  const [formulaValue, setFormulaValue] = useState(() => {
    if (
      column.columnType === ColumnBehaviorType.Formula &&
      column.config &&
      "expression" in column.config
    ) {
      return (column.config as { expression: string }).expression;
    }
    return "";
  });

  const [showRefPicker, setShowRefPicker] = useState(false);
  const [refPickerPos, setRefPickerPos] = useState({ top: 0, left: 0 });
  const [slashIndex, setSlashIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when column prop changes
  useEffect(() => {
    setName(column.name);
    setDataType(column.dataType);
    if (
      column.columnType === ColumnBehaviorType.Formula &&
      column.config &&
      "expression" in column.config
    ) {
      setFormulaValue(
        (column.config as { expression: string }).expression
      );
    }
  }, [column]);

  // Other columns (exclude self)
  const otherColumns = useMemo(
    () => allColumns.filter((c) => c.id !== column.id),
    [allColumns, column.id]
  );

  // Enrichment columns for showing in the editor
  const enrichmentColumns = useMemo(
    () =>
      allColumns.filter(
        (c) => c.columnType === ColumnBehaviorType.Enrichment
      ),
    [allColumns]
  );

  // ── Handlers ──────────────────────────────────────────────────

  const handleNameBlur = useCallback(() => {
    if (name !== column.name) {
      onSave({ name });
    }
  }, [name, column.name, onSave]);

  const handleDataTypeChange = useCallback(
    (val: ColumnDataType | null) => {
      if (!val) return;
      setDataType(val);
      onSave({ dataType: val });
    },
    [onSave]
  );

  const handleFormulaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const prevVal = formulaValue;
      setFormulaValue(val);

      // Detect if user just typed "/"
      if (
        val.length > prevVal.length &&
        val[e.target.selectionStart - 1] === "/"
      ) {
        // Open the ref picker
        const textarea = textareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          // Position the picker below the textarea near the cursor
          setRefPickerPos({
            top: rect.bottom + 4,
            left: rect.left,
          });
          setSlashIndex(e.target.selectionStart - 1);
          setShowRefPicker(true);
        }
      }
    },
    [formulaValue]
  );

  const handleFormulaBlur = useCallback(() => {
    // Delay to allow ref picker clicks
    setTimeout(() => {
      if (column.columnType === ColumnBehaviorType.Formula) {
        onSave({ config: { expression: formulaValue } });
      }
    }, 200);
  }, [formulaValue, column.columnType, onSave]);

  const handleRefSelect = useCallback(
    (ref: string) => {
      if (slashIndex !== null) {
        // Replace the "/" with the reference
        const before = formulaValue.slice(0, slashIndex);
        const after = formulaValue.slice(slashIndex + 1);
        const newVal = before + ref + after;
        setFormulaValue(newVal);

        // Save immediately for formula columns
        if (column.columnType === ColumnBehaviorType.Formula) {
          onSave({ config: { expression: newVal } });
        }
      }
      setShowRefPicker(false);
      setSlashIndex(null);
      // Refocus the textarea
      textareaRef.current?.focus();
    },
    [slashIndex, formulaValue, column.columnType, onSave]
  );

  const handleRefPickerClose = useCallback(() => {
    setShowRefPicker(false);
    setSlashIndex(null);
  }, []);

  const isEnrichment = column.columnType === ColumnBehaviorType.Enrichment;

  return (
    <div className="flex flex-col gap-0">
      {/* Column name */}
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Column name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          placeholder="Column name"
          className="h-9 text-sm font-medium"
        />
      </div>

      {/* Data type */}
      <div className="flex flex-col gap-1.5 px-4 pb-3">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Data type
        </label>
        <Select value={dataType} onValueChange={handleDataTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {DATA_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="mr-1.5">{opt.icon}</span>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Enrichment column info */}
      {isEnrichment && (
        <div className="px-4 py-3">
          <EnrichmentColumnInfo column={column} />
        </div>
      )}

      {/* Value / Formula editor (non-enrichment columns) */}
      {!isEnrichment && (
        <div className="flex flex-col gap-1.5 px-4 py-3">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Value
          </label>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={formulaValue}
              onChange={handleFormulaChange}
              onBlur={handleFormulaBlur}
              placeholder="Reference data from a column, use a formula, or enter static text"
              className="min-h-[100px] resize-none font-mono text-xs"
              rows={5}
            />
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
                /
              </span>
              <span>Type / to insert column</span>
            </div>
          </div>

          {/* Ref picker popup */}
          {showRefPicker && (
            <ColumnRefPicker
              columns={otherColumns}
              onSelect={handleRefSelect}
              onClose={handleRefPickerClose}
              position={refPickerPos}
            />
          )}
        </div>
      )}

      {/* Referenced enrichment columns */}
      {!isEnrichment && enrichmentColumns.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2 px-4 py-3">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Enrichment columns
            </label>
            {enrichmentColumns.map((ec) => (
              <EnrichmentColumnRef
                key={ec.id}
                column={ec}
                onSelectField={(field) => {
                  const ref = `{{${ec.name}.${field}}}`;
                  setFormulaValue((prev) => prev + ref);
                  if (column.columnType === ColumnBehaviorType.Formula) {
                    onSave({
                      config: { expression: formulaValue + ref },
                    });
                  }
                }}
              />
            ))}
          </div>
        </>
      )}

      <Separator />

      {/* Settings */}
      <div className="px-4 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Settings className="size-3.5" />
          <span>Advanced settings</span>
        </button>
      </div>

      <Separator />

      {/* Delete */}
      <div className="px-4 py-3">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="w-full gap-1.5"
        >
          <Trash2 className="size-3.5" />
          Delete column
        </Button>
      </div>
    </div>
  );
}

// ── EnrichmentColumnInfo ────────────────────────────────────────────

function EnrichmentColumnInfo({ column }: { column: ColumnDef }) {
  const fieldCount = getEnrichmentFieldCount(column);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Database className="size-4" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground">
          {column.name}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Enrichment column
        </span>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {fieldCount} items
        <ChevronRight className="size-3.5" />
      </span>
    </div>
  );
}

// ── EnrichmentColumnRef ─────────────────────────────────────────────

function EnrichmentColumnRef({
  column,
  onSelectField,
}: {
  column: ColumnDef;
  onSelectField: (field: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fieldCount = getEnrichmentFieldCount(column);

  // Extract sub-fields
  const subFields = useMemo(() => {
    const cfg = column.config as Record<string, unknown>;
    if (cfg && typeof cfg === "object") {
      if (Array.isArray(cfg.fields)) return cfg.fields as string[];
      if (cfg.schema && typeof cfg.schema === "object")
        return Object.keys(cfg.schema as Record<string, unknown>);
    }
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
  }, [column.config]);

  return (
    <div className="flex flex-col rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          <Database className="size-3" />
        </span>
        <span className="flex-1 truncate text-xs font-medium text-foreground">
          {column.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {fieldCount} items
        </span>
        <ChevronRight
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            expanded && "rotate-90"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/10">
          {subFields.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => onSelectField(field)}
              className="flex w-full items-center gap-2 px-3 py-1.5 pl-9 text-left transition-colors hover:bg-muted/50"
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
}

export default ColumnConfigEditor;
