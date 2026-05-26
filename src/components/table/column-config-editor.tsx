"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Settings,
  Trash2,
  Pencil,
  X,
  Database,
  ChevronRight,
  Play,
  Code,
  Sparkles,
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
  Equal,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ColumnDef, ColumnValueSource } from "@/types/table";
import {
  ColumnBehaviorType,
  ColumnDataType,
  type EnrichmentConfig,
  type FormulaConfig,
  type AIAgentConfig,
} from "@/types/table";
import { ColumnRefPicker } from "./column-ref-picker";
import { ENRICHMENT_TEMPLATES } from "./enrichment-templates";

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

const AI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "claude-opus", label: "Claude Opus" },
  { value: "gemini-pro", label: "Gemini Pro" },
] as const;

// ── Helpers ─────────────────────────────────────────────────────────

/** Return a short icon string for a data type (for chip display). */
function dataTypeIconString(dt: ColumnDataType): string {
  switch (dt) {
    case ColumnDataType.Text: return "T";
    case ColumnDataType.Number: return "#";
    case ColumnDataType.Url: return "🔗";
    case ColumnDataType.Date: return "📅";
    case ColumnDataType.Email: return "@";
    case ColumnDataType.Currency: return "$";
    case ColumnDataType.Checkbox: return "☑";
    case ColumnDataType.Select:
    case ColumnDataType.MultiSelect: return "🏷";
    case ColumnDataType.Image: return "🖼";
    case ColumnDataType.AssignedTo: return "👤";
    default: return "T";
  }
}

/** Icon component for a data type. */
function DataTypeIcon({ dataType, className }: { dataType: ColumnDataType; className?: string }) {
  const cls = cn("size-3", className);
  switch (dataType) {
    case ColumnDataType.Text: return <Type className={cls} />;
    case ColumnDataType.Number: return <Hash className={cls} />;
    case ColumnDataType.Url: return <Link className={cls} />;
    case ColumnDataType.Date: return <Calendar className={cls} />;
    case ColumnDataType.Checkbox: return <CheckSquare className={cls} />;
    case ColumnDataType.Select:
    case ColumnDataType.MultiSelect: return <Tag className={cls} />;
    case ColumnDataType.Currency: return <DollarSign className={cls} />;
    case ColumnDataType.Email: return <Mail className={cls} />;
    case ColumnDataType.Image: return <Image className={cls} />;
    case ColumnDataType.AssignedTo: return <User className={cls} />;
    default: return <Type className={cls} />;
  }
}

/** Try to find enrichment template info for a column. */
function getEnrichmentTemplate(col: ColumnDef) {
  const cfg = col.config as Record<string, unknown>;
  if (cfg && typeof cfg === "object" && cfg.templateId) {
    return ENRICHMENT_TEMPLATES.find((t) => t.id === cfg.templateId) ?? null;
  }
  // Try to match by column name
  return ENRICHMENT_TEMPLATES.find(
    (t) => col.name.toLowerCase().includes(t.name.toLowerCase())
  ) ?? null;
}

/** Extract sub-field count from column config. */
function getEnrichmentFieldCount(col: ColumnDef): number {
  const cfg = col.config as Record<string, unknown>;
  if (cfg && typeof cfg === "object") {
    if (Array.isArray(cfg.fields)) return (cfg.fields as string[]).length;
    if (cfg.schema && typeof cfg.schema === "object")
      return Object.keys(cfg.schema as Record<string, unknown>).length;
  }
  return 20;
}

/** Extract enrichment sub-field names. */
function getEnrichmentSubFields(col: ColumnDef): string[] {
  const cfg = col.config as Record<string, unknown>;
  if (cfg && typeof cfg === "object") {
    if (Array.isArray(cfg.fields)) return cfg.fields as string[];
    if (cfg.schema && typeof cfg.schema === "object")
      return Object.keys(cfg.schema as Record<string, unknown>);
  }
  return [
    "name", "domain", "description", "industry", "size", "founded",
    "country", "locality", "website", "logo_url", "type", "slug",
    "org_id", "company_id", "linkedin_url", "locations",
    "technologies", "last_refresh",
  ];
}

// ── ColumnRefChip ───────────────────────────────────────────────────

interface ColumnRefChipProps {
  sourceColumn: ColumnDef | undefined;
  sourceField?: string;
  isSelected?: boolean;
  onRemove: () => void;
  onClick?: () => void;
}

function ColumnRefChip({
  sourceColumn,
  sourceField,
  isSelected,
  onRemove,
  onClick,
}: ColumnRefChipProps) {
  const columnName = sourceColumn?.name ?? "Unknown";
  const isEnrichment = sourceColumn?.columnType === ColumnBehaviorType.Enrichment;
  const typeIcon = sourceColumn
    ? dataTypeIconString(sourceColumn.dataType)
    : "T";

  // Build display label: "ColumnName" or "ColumnName.field"
  const displayLabel = sourceField
    ? `${columnName}.${sourceField}`
    : columnName;

  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
        isSelected
          ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600"
      )}
      onClick={onClick}
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex size-3.5 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
      >
        <X className="size-2.5" />
      </button>

      {/* Derive icon := */}
      <span className="flex items-center text-zinc-500">
        <Equal className="size-2.5" />
      </span>

      {/* Type icon */}
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold",
          isEnrichment
            ? "bg-purple-500/20 text-purple-400"
            : "bg-zinc-700 text-zinc-400"
        )}
      >
        {isEnrichment ? (
          <Database className="size-2.5" />
        ) : (
          typeIcon
        )}
      </span>

      {/* Label */}
      <span className="truncate max-w-[200px]">{displayLabel}</span>
    </span>
  );
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
  // ── Local state ─────────────────────────────────────────────────
  const [name, setName] = useState(column.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [dataType, setDataType] = useState(column.dataType);
  const [valueSource, setValueSource] = useState<ColumnValueSource | undefined>(
    column.valueSource
  );
  const [selectedChipIndex, setSelectedChipIndex] = useState<number | null>(null);

  // Formula state
  const [formulaValue, setFormulaValue] = useState(() => {
    if (
      column.columnType === ColumnBehaviorType.Formula &&
      column.config &&
      "expression" in column.config
    ) {
      return (column.config as FormulaConfig).expression;
    }
    return "";
  });

  // AI Agent state
  const [aiPrompt, setAiPrompt] = useState(() => {
    if (
      column.columnType === ColumnBehaviorType.AIAgent &&
      column.config &&
      "prompt" in column.config
    ) {
      return (column.config as AIAgentConfig).prompt;
    }
    return "";
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    if (
      column.columnType === ColumnBehaviorType.AIAgent &&
      column.config &&
      "model" in column.config
    ) {
      return (column.config as AIAgentConfig).model;
    }
    return "gpt-4o";
  });
  const [aiContextColumns, setAiContextColumns] = useState<string[]>(() => {
    if (
      column.columnType === ColumnBehaviorType.AIAgent &&
      column.config &&
      "contextColumns" in column.config
    ) {
      return (column.config as AIAgentConfig).contextColumns;
    }
    return [];
  });

  // Ref picker
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [refPickerPos, setRefPickerPos] = useState({ top: 0, left: 0 });
  const refInputAreaRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync state when column prop changes
  useEffect(() => {
    setName(column.name);
    setDataType(column.dataType);
    setValueSource(column.valueSource);
    setSelectedChipIndex(null);
    if (
      column.columnType === ColumnBehaviorType.Formula &&
      column.config &&
      "expression" in column.config
    ) {
      setFormulaValue((column.config as FormulaConfig).expression);
    }
    if (
      column.columnType === ColumnBehaviorType.AIAgent &&
      column.config &&
      "prompt" in column.config
    ) {
      const cfg = column.config as AIAgentConfig;
      setAiPrompt(cfg.prompt);
      setAiModel(cfg.model);
      setAiContextColumns(cfg.contextColumns);
    }
  }, [column]);

  // Other columns (exclude self)
  const otherColumns = useMemo(
    () => allColumns.filter((c) => c.id !== column.id),
    [allColumns, column.id]
  );

  // ── Handlers ──────────────────────────────────────────────────

  const handleNameSave = useCallback(() => {
    setIsEditingName(false);
    if (name !== column.name && name.trim()) {
      onSave({ name: name.trim() });
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

  // ── Reference management ──────────────────────────────────────

  const handleRemoveReference = useCallback(() => {
    setValueSource(undefined);
    onSave({ valueSource: undefined });
  }, [onSave]);

  const handleOpenRefPicker = useCallback(() => {
    const area = refInputAreaRef.current;
    if (area) {
      const rect = area.getBoundingClientRect();
      setRefPickerPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setShowRefPicker(true);
  }, []);

  const handleRefSelect = useCallback(
    (ref: string) => {
      // ref comes as "{{ColumnName}}" or "{{ColumnName.field}}"
      const match = ref.match(/^\{\{(.+?)(?:\.(.+?))?\}\}$/);
      if (match) {
        const colName = match[1];
        const field = match[2] ?? undefined;
        const sourceCol = allColumns.find((c) => c.name === colName);
        if (sourceCol) {
          const newSource: ColumnValueSource = {
            type: "reference",
            sourceColumnId: sourceCol.id,
            sourceField: field,
          };
          setValueSource(newSource);
          onSave({ valueSource: newSource });
        }
      }
      setShowRefPicker(false);
    },
    [allColumns, onSave]
  );

  const handleRefPickerClose = useCallback(() => {
    setShowRefPicker(false);
  }, []);

  // Handle "/" keydown inside the reference input area
  const handleRefAreaKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        handleOpenRefPicker();
      }
      // Backspace to remove selected chip or last chip
      if (e.key === "Backspace" && valueSource) {
        handleRemoveReference();
      }
    },
    [handleOpenRefPicker, handleRemoveReference, valueSource]
  );

  // ── Formula handlers ──────────────────────────────────────────

  const formulaTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [formulaSlashIndex, setFormulaSlashIndex] = useState<number | null>(null);

  const handleFormulaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const prevVal = formulaValue;
      setFormulaValue(val);

      if (
        val.length > prevVal.length &&
        val[e.target.selectionStart - 1] === "/"
      ) {
        const textarea = formulaTextareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          setRefPickerPos({ top: rect.bottom + 4, left: rect.left });
          setFormulaSlashIndex(e.target.selectionStart - 1);
          setShowRefPicker(true);
        }
      }
    },
    [formulaValue]
  );

  const handleFormulaRefSelect = useCallback(
    (ref: string) => {
      if (formulaSlashIndex !== null) {
        const before = formulaValue.slice(0, formulaSlashIndex);
        const after = formulaValue.slice(formulaSlashIndex + 1);
        const newVal = before + ref + after;
        setFormulaValue(newVal);
        onSave({ config: { expression: newVal } });
      }
      setShowRefPicker(false);
      setFormulaSlashIndex(null);
      formulaTextareaRef.current?.focus();
    },
    [formulaSlashIndex, formulaValue, onSave]
  );

  const handleFormulaSave = useCallback(() => {
    if (column.columnType === ColumnBehaviorType.Formula) {
      onSave({ config: { expression: formulaValue } });
    }
  }, [formulaValue, column.columnType, onSave]);

  // ── AI Agent handlers ─────────────────────────────────────────

  const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiSlashIndex, setAiSlashIndex] = useState<number | null>(null);

  const handleAiPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const prevVal = aiPrompt;
      setAiPrompt(val);

      if (
        val.length > prevVal.length &&
        val[e.target.selectionStart - 1] === "/"
      ) {
        const textarea = aiTextareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          setRefPickerPos({ top: rect.bottom + 4, left: rect.left });
          setAiSlashIndex(e.target.selectionStart - 1);
          setShowRefPicker(true);
        }
      }
    },
    [aiPrompt]
  );

  const handleAiRefSelect = useCallback(
    (ref: string) => {
      if (aiSlashIndex !== null) {
        const before = aiPrompt.slice(0, aiSlashIndex);
        const after = aiPrompt.slice(aiSlashIndex + 1);
        const newVal = before + ref + after;
        setAiPrompt(newVal);
        onSave({
          config: {
            prompt: newVal,
            model: aiModel,
            contextColumns: aiContextColumns,
          } as AIAgentConfig,
        });
      }
      setShowRefPicker(false);
      setAiSlashIndex(null);
      aiTextareaRef.current?.focus();
    },
    [aiSlashIndex, aiPrompt, aiModel, aiContextColumns, onSave]
  );

  const handleAiSave = useCallback(() => {
    if (column.columnType === ColumnBehaviorType.AIAgent) {
      onSave({
        config: {
          prompt: aiPrompt,
          model: aiModel as AIAgentConfig["model"],
          contextColumns: aiContextColumns,
        } as AIAgentConfig,
      });
    }
  }, [aiPrompt, aiModel, aiContextColumns, column.columnType, onSave]);

  const toggleAiContextColumn = useCallback(
    (colId: string) => {
      setAiContextColumns((prev) => {
        const next = prev.includes(colId)
          ? prev.filter((id) => id !== colId)
          : [...prev, colId];
        onSave({
          config: {
            prompt: aiPrompt,
            model: aiModel as AIAgentConfig["model"],
            contextColumns: next,
          } as AIAgentConfig,
        });
        return next;
      });
    },
    [aiPrompt, aiModel, onSave]
  );

  // ── Determine which ref select handler to use ─────────────────

  const currentRefSelectHandler = useMemo(() => {
    if (column.columnType === ColumnBehaviorType.Formula) return handleFormulaRefSelect;
    if (column.columnType === ColumnBehaviorType.AIAgent) return handleAiRefSelect;
    return handleRefSelect;
  }, [column.columnType, handleFormulaRefSelect, handleAiRefSelect, handleRefSelect]);

  // ── Resolve source column for chip display ────────────────────

  const sourceColumn = useMemo(
    () =>
      valueSource?.sourceColumnId
        ? allColumns.find((c) => c.id === valueSource.sourceColumnId)
        : undefined,
    [valueSource, allColumns]
  );

  // ── Enrichment info ───────────────────────────────────────────

  const enrichmentTemplate = useMemo(
    () =>
      column.columnType === ColumnBehaviorType.Enrichment
        ? getEnrichmentTemplate(column)
        : null,
    [column]
  );

  const enrichmentFieldCount = useMemo(
    () =>
      column.columnType === ColumnBehaviorType.Enrichment
        ? getEnrichmentFieldCount(column)
        : 0,
    [column]
  );

  const enrichmentConfig = useMemo(
    () =>
      column.columnType === ColumnBehaviorType.Enrichment
        ? (column.config as EnrichmentConfig)
        : null,
    [column]
  );

  const enrichmentInputColumn = useMemo(() => {
    const cfg = column.config as Record<string, unknown>;
    if (cfg && typeof cfg === "object" && cfg.inputColumnId) {
      return allColumns.find((c) => c.id === cfg.inputColumnId);
    }
    return undefined;
  }, [column.config, allColumns]);

  // ── Render ────────────────────────────────────────────────────

  const isManualOrText =
    column.columnType === ColumnBehaviorType.Manual ||
    (column.columnType !== ColumnBehaviorType.Enrichment &&
      column.columnType !== ColumnBehaviorType.Formula &&
      column.columnType !== ColumnBehaviorType.AIAgent);

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header: Column name + type badge ──────────────────── */}
      <div className="flex items-start gap-2 px-4 pt-4 pb-3">
        <div className="flex flex-1 flex-col gap-1">
          {/* Iconic header: := T columnName */}
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="text-[10px] font-mono">:=</span>
            <span className="flex size-4 items-center justify-center rounded bg-zinc-800 text-[9px] font-bold text-zinc-400">
              {dataTypeIconString(dataType)}
            </span>
            {isEditingName ? (
              <Input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameSave();
                  if (e.key === "Escape") {
                    setName(column.name);
                    setIsEditingName(false);
                  }
                }}
                className="h-7 flex-1 border-zinc-700 bg-zinc-800 px-2 text-base font-semibold text-zinc-100"
                autoFocus
              />
            ) : (
              <span className="flex-1 truncate text-base font-semibold text-zinc-100">
                {name}
              </span>
            )}
          </div>
        </div>
        {!isEditingName && (
          <button
            type="button"
            onClick={() => {
              setIsEditingName(true);
              // Focus happens via autoFocus on the input
            }}
            className="mt-0.5 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>

      <Separator className="bg-zinc-800" />

      {/* ── Data type selector ────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 px-4 py-3">
        <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Data type
        </label>
        <Select value={dataType} onValueChange={handleDataTypeChange}>
          <SelectTrigger className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-200">
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

      <Separator className="bg-zinc-800" />

      {/* ════════════════════════════════════════════════════════════
           MANUAL / TEXT COLUMNS
         ════════════════════════════════════════════════════════════ */}
      {isManualOrText && (
        <>
          {/* Instructions */}
          <div className="flex flex-col gap-1 px-4 pt-3 pb-1">
            <p className="text-xs text-zinc-400">
              Reference data from a column, use a formula, or enter static text
            </p>
            <p className="text-[11px] text-zinc-600">
              Leave blank to manually enter values for each cell
            </p>
          </div>

          {/* Reference input area */}
          <div className="px-4 py-2">
            <div className="relative">
              <div
                ref={refInputAreaRef}
                tabIndex={0}
                onKeyDown={handleRefAreaKeyDown}
                onClick={() => {
                  if (!valueSource) {
                    // Click empty area to focus
                  }
                }}
                className={cn(
                  "flex min-h-[72px] flex-wrap items-start gap-1.5 rounded-md border p-2.5 transition-colors focus-within:ring-1 focus-within:ring-indigo-500/50",
                  "border-zinc-700 bg-zinc-900/50",
                  !valueSource && "cursor-text"
                )}
              >
                {valueSource && sourceColumn ? (
                  <ColumnRefChip
                    sourceColumn={sourceColumn}
                    sourceField={valueSource.sourceField}
                    isSelected={selectedChipIndex === 0}
                    onRemove={handleRemoveReference}
                    onClick={() =>
                      setSelectedChipIndex(selectedChipIndex === 0 ? null : 0)
                    }
                  />
                ) : (
                  <span className="text-xs text-zinc-600 italic leading-relaxed">
                    No reference configured
                  </span>
                )}
              </div>

              {/* Gear icon */}
              <button
                type="button"
                className="absolute right-2 top-2 rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-400"
                title="Advanced settings"
              >
                <Settings className="size-3.5" />
              </button>
            </div>

            {/* "/" hint */}
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
                /
              </span>
              <span>Type / to insert column</span>
            </div>
          </div>

          {/* Ref picker popup */}
          {showRefPicker && (
            <ColumnRefPicker
              columns={otherColumns}
              onSelect={currentRefSelectHandler}
              onClose={handleRefPickerClose}
              position={refPickerPos}
            />
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
           ENRICHMENT COLUMNS
         ════════════════════════════════════════════════════════════ */}
      {column.columnType === ColumnBehaviorType.Enrichment && (
        <>
          {/* Provider info card */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                <Database className="size-4" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-xs font-semibold text-zinc-200">
                  {enrichmentTemplate?.name ?? "Enrichment"}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {enrichmentTemplate?.description ??
                    `${enrichmentFieldCount} fields available`}
                </span>
              </div>
            </div>
          </div>

          {/* Input column selector */}
          <div className="flex flex-col gap-1.5 px-4 pb-3">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Input column
            </label>
            <Select
              value={enrichmentInputColumn?.id ?? ""}
              onValueChange={(val) => {
                const cfg = { ...(column.config as Record<string, unknown>), inputColumnId: val };
                onSave({ config: cfg });
              }}
            >
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-200">
                <SelectValue placeholder="Select input column" />
              </SelectTrigger>
              <SelectContent>
                {otherColumns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    <span className="flex items-center gap-1.5">
                      <DataTypeIcon dataType={col.dataType} className="size-3 text-zinc-400" />
                      {col.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider order summary */}
          {enrichmentConfig?.providerOrder &&
            enrichmentConfig.providerOrder.length > 0 && (
              <div className="flex flex-col gap-1.5 px-4 pb-3">
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Waterfall providers
                </label>
                <div className="flex flex-wrap gap-1">
                  {enrichmentConfig.providerOrder
                    .filter((p) => p.enabled)
                    .map((provider, idx) => (
                      <span
                        key={provider.providerId}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-400"
                      >
                        <span className="text-zinc-600">{idx + 1}.</span>
                        {provider.providerName}
                      </span>
                    ))}
                </div>
              </div>
            )}

          <Separator className="bg-zinc-800" />

          {/* Edit enrichment button */}
          <div className="px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Settings className="size-3.5" />
              Edit enrichment
            </Button>
          </div>

          {/* Progress stats */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="flex size-2 rounded-full bg-emerald-500" />
              <span>
                <span className="font-medium text-zinc-300">0</span> / 0 rows
                complete
              </span>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
           FORMULA COLUMNS
         ════════════════════════════════════════════════════════════ */}
      {column.columnType === ColumnBehaviorType.Formula && (
        <>
          {/* Available columns as chips */}
          <div className="flex flex-col gap-1.5 px-4 pt-3 pb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Available columns
            </label>
            <div className="flex flex-wrap gap-1">
              {otherColumns.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    const ref = `{{${col.name}}}`;
                    setFormulaValue((prev) => prev + ref);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                >
                  <DataTypeIcon dataType={col.dataType} className="size-2.5 text-zinc-500" />
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          {/* Code editor textarea */}
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Formula
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-zinc-600">
                <Code className="size-3.5" />
              </div>
              <Textarea
                ref={formulaTextareaRef}
                value={formulaValue}
                onChange={handleFormulaChange}
                onBlur={handleFormulaSave}
                placeholder='e.g. {{First Name}} + " " + {{Last Name}}'
                className="min-h-[120px] resize-none border-zinc-700 bg-zinc-900/50 pl-9 font-mono text-xs text-zinc-200 placeholder:text-zinc-600"
                rows={6}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
                /
              </span>
              <span>Type / to insert column reference</span>
            </div>
          </div>

          {/* Output type */}
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Output type
            </label>
            <Select value={dataType} onValueChange={handleDataTypeChange}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-200">
                <SelectValue />
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

          <Separator className="bg-zinc-800" />

          {/* Run preview */}
          <div className="px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Play className="size-3.5" fill="currentColor" />
              Run preview
            </Button>
          </div>

          {/* Ref picker popup */}
          {showRefPicker && (
            <ColumnRefPicker
              columns={otherColumns}
              onSelect={currentRefSelectHandler}
              onClose={handleRefPickerClose}
              position={refPickerPos}
            />
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
           AI AGENT COLUMNS
         ════════════════════════════════════════════════════════════ */}
      {column.columnType === ColumnBehaviorType.AIAgent && (
        <>
          {/* Model selector */}
          <div className="flex flex-col gap-1.5 px-4 pt-3 pb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              AI Model
            </label>
            <Select
              value={aiModel}
              onValueChange={(val) => {
                if (!val) return;
                setAiModel(val);
                onSave({
                  config: {
                    prompt: aiPrompt,
                    model: val as AIAgentConfig["model"],
                    contextColumns: aiContextColumns,
                  } as AIAgentConfig,
                });
              }}
            >
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-200">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-400" />
                      {m.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt textarea */}
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Prompt
            </label>
            <Textarea
              ref={aiTextareaRef}
              value={aiPrompt}
              onChange={handleAiPromptChange}
              onBlur={handleAiSave}
              placeholder="Write a prompt for the AI. Use / to insert column references like {{Company Name}}."
              className="min-h-[140px] resize-none border-zinc-700 bg-zinc-900/50 text-xs text-zinc-200 placeholder:text-zinc-600"
              rows={7}
            />
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
                /
              </span>
              <span>Type / to insert column reference</span>
            </div>
          </div>

          {/* Context columns */}
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Context columns
            </label>
            <p className="text-[11px] text-zinc-600">
              Select which columns to include as context for the AI
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {otherColumns.map((col) => {
                const selected = aiContextColumns.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleAiContextColumn(col.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                      selected
                        ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                    )}
                  >
                    <DataTypeIcon dataType={col.dataType} className="size-2.5" />
                    {col.name}
                  </button>
                );
              })}
              {otherColumns.length === 0 && (
                <span className="text-[11px] text-zinc-600">
                  No other columns available
                </span>
              )}
            </div>
          </div>

          {/* Output format selector */}
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Output format
            </label>
            <Select value={dataType} onValueChange={handleDataTypeChange}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-200">
                <SelectValue />
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

          <Separator className="bg-zinc-800" />

          {/* Ref picker popup */}
          {showRefPicker && (
            <ColumnRefPicker
              columns={otherColumns}
              onSelect={currentRefSelectHandler}
              onClose={handleRefPickerClose}
              position={refPickerPos}
            />
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
           BOTTOM: Settings + Delete (all column types)
         ════════════════════════════════════════════════════════════ */}
      <Separator className="bg-zinc-800" />

      {/* Advanced settings */}
      <div className="px-4 py-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
        >
          <Settings className="size-3.5" />
          <span>Advanced settings</span>
          <ChevronRight className="ml-auto size-3.5" />
        </button>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Delete column */}
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

export default ColumnConfigEditor;
