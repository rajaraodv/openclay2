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
import { cn } from "@/lib/utils";

import type {
  ColumnDef,
  ColumnValueSource,
  RowData,
  ColumnReference,
  EditorSegment,
} from "@/types/table";
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

/** Convert segments to a template string (for saving). */
function segmentsToTemplate(segments: EditorSegment[]): string {
  return segments
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      const ref = seg.ref;
      return ref.field
        ? `{{${ref.columnName}.${ref.field}}}`
        : `{{${ref.columnName}}}`;
    })
    .join("");
}

/** Convert a valueSource to initial segments. */
function valueSourceToSegments(
  valueSource: ColumnValueSource | undefined,
  allColumns: ColumnDef[]
): EditorSegment[] {
  if (!valueSource || !valueSource.sourceColumnId) return [];
  const sourceCol = allColumns.find(
    (c) => c.id === valueSource.sourceColumnId
  );
  if (!sourceCol) return [];

  const ref: ColumnReference = {
    columnId: sourceCol.id,
    columnName: sourceCol.name,
    field: valueSource.sourceField,
    displayLabel: valueSource.sourceField ?? sourceCol.name,
    typeIcon: dataTypeIconString(sourceCol.dataType),
  };

  return [{ type: "ref", ref }];
}

// ── ColumnRefChip ───────────────────────────────────────────────────

interface ColumnRefChipProps {
  ref_: ColumnReference;
  onRemove: () => void;
}

function ColumnRefChip({ ref_, onRemove }: ColumnRefChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300 align-middle"
      contentEditable={false}
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
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
      <span className="flex size-4 shrink-0 items-center justify-center rounded bg-zinc-700 text-[9px] font-bold text-zinc-400">
        {ref_.typeIcon}
      </span>

      {/* Label */}
      <span className="truncate max-w-[160px]">{ref_.displayLabel}</span>
    </span>
  );
}

// ── ChipEditor ──────────────────────────────────────────────────────
// A rich editor that combines free text with reference chips.

interface ChipEditorProps {
  segments: EditorSegment[];
  onChange: (segments: EditorSegment[]) => void;
  onSlashTrigger: (rect: { top: number; left: number; width: number }) => void;
  placeholder?: string;
}

function ChipEditor({
  segments,
  onChange,
  onSlashTrigger,
  placeholder,
}: ChipEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const isEmpty = segments.length === 0 || (
    segments.length === 1 &&
    segments[0].type === "text" &&
    !segments[0].value
  );

  const handleRemoveChip = useCallback(
    (index: number) => {
      const newSegments = [...segments];
      newSegments.splice(index, 1);
      // Merge adjacent text segments
      const merged: EditorSegment[] = [];
      for (const seg of newSegments) {
        const last = merged[merged.length - 1];
        if (seg.type === "text" && last && last.type === "text") {
          last.value += seg.value;
        } else {
          merged.push({ ...seg });
        }
      }
      onChange(merged.length > 0 ? merged : []);
    },
    [segments, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "/") {
        e.preventDefault();
        const el = editorRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          onSlashTrigger({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      }

      if (e.key === "Backspace") {
        // If editor is empty or only whitespace, remove last chip
        if (isEmpty) {
          e.preventDefault();
          return;
        }

        // Check if we need to remove the last chip
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) {
          const el = editorRef.current;
          if (!el) return;

          // If cursor is at the beginning of a text node right after a chip, remove the chip
          const range = sel.getRangeAt(0);
          if (range.startOffset === 0) {
            // Find the previous sibling which might be a chip
            const node = range.startContainer;
            const parent = node.parentElement;
            if (parent) {
              const prevSibling = node === parent ? null : (node as Element).previousSibling;
              if (prevSibling && (prevSibling as Element).getAttribute?.("data-chip-index")) {
                const chipIdx = parseInt(
                  (prevSibling as Element).getAttribute("data-chip-index") ?? "-1",
                  10
                );
                if (chipIdx >= 0) {
                  e.preventDefault();
                  handleRemoveChip(chipIdx);
                  return;
                }
              }
            }
          }
        }
      }
    },
    [isEmpty, onSlashTrigger, handleRemoveChip]
  );

  // Sync the editor content from segments (one-way binding for chips)
  // We use a simple approach: render chips inline with text spans
  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    // Reconstruct segments from the DOM content
    const newSegments: EditorSegment[] = [];
    const children = el.childNodes;

    children.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (text) {
          newSegments.push({ type: "text", value: text });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const chipIndex = element.getAttribute("data-chip-index");
        if (chipIndex !== null) {
          // This is a chip - keep the original ref
          const idx = parseInt(chipIndex, 10);
          const origSegment = segments[idx];
          if (origSegment && origSegment.type === "ref") {
            newSegments.push(origSegment);
          }
        } else {
          // Some other element - extract text
          const text = element.textContent ?? "";
          if (text) {
            newSegments.push({ type: "text", value: text });
          }
        }
      }
    });

    // Merge adjacent text segments
    const merged: EditorSegment[] = [];
    for (const seg of newSegments) {
      const last = merged[merged.length - 1];
      if (seg.type === "text" && last && last.type === "text") {
        last.value += seg.value;
      } else {
        merged.push(seg);
      }
    }

    onChange(merged);
  }, [segments, onChange]);

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "flex min-h-[72px] flex-wrap items-start gap-1 rounded-md border p-2.5 text-xs text-zinc-200 outline-none transition-colors",
          "border-zinc-700 bg-zinc-900/50",
          isFocused && "ring-1 ring-indigo-500/50 border-indigo-500/30"
        )}
      >
        {isEmpty && !isFocused && (
          <span className="pointer-events-none text-zinc-600 italic select-none">
            {placeholder ?? "No reference configured"}
          </span>
        )}
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <React.Fragment key={`text-${i}`}>{seg.value}</React.Fragment>
            );
          }
          return (
            <span key={`chip-${i}`} data-chip-index={i} contentEditable={false}>
              <ColumnRefChip
                ref_={seg.ref}
                onRemove={() => handleRemoveChip(i)}
              />
            </span>
          );
        })}
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
  );
}

// ── Props ───────────────────────────────────────────────────────────

export interface ColumnConfigEditorProps {
  column: ColumnDef;
  allColumns: ColumnDef[];
  rows: RowData[];
  onSave: (columnId: string, config: Partial<ColumnDef>) => void;
  onDelete: (columnId: string) => void;
  onClose?: () => void;
}

// ── Component ───────────────────────────────────────────────────────

export function ColumnConfigEditor({
  column,
  allColumns,
  rows,
  onSave,
  onDelete,
  onClose,
}: ColumnConfigEditorProps) {
  // ── Local state ─────────────────────────────────────────────────
  const [name, setName] = useState(column.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [dataType, setDataType] = useState(column.dataType);
  const [segments, setSegments] = useState<EditorSegment[]>(() =>
    valueSourceToSegments(column.valueSource, allColumns)
  );

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
  const [refPickerTriggerRect, setRefPickerTriggerRect] = useState({
    top: 0,
    left: 0,
    width: 300,
  });
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync state when column prop changes
  useEffect(() => {
    setName(column.name);
    setDataType(column.dataType);
    setSegments(valueSourceToSegments(column.valueSource, allColumns));
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
  }, [column, allColumns]);

  // Other columns (exclude self)
  const otherColumns = useMemo(
    () => allColumns.filter((c) => c.id !== column.id),
    [allColumns, column.id]
  );

  // ── Handlers ──────────────────────────────────────────────────

  const handleNameSave = useCallback(() => {
    setIsEditingName(false);
    if (name !== column.name && name.trim()) {
      onSave(column.id, { name: name.trim() });
    }
  }, [name, column.name, onSave]);

  const handleDataTypeChange = useCallback(
    (val: ColumnDataType | null) => {
      if (!val) return;
      setDataType(val);
      onSave(column.id, { dataType: val });
    },
    [onSave]
  );

  // ── Segment / chip management ────────────────────────────────

  const handleSegmentsChange = useCallback(
    (newSegments: EditorSegment[]) => {
      setSegments(newSegments);

      // Convert segments to valueSource for saving
      const refs = newSegments.filter(
        (s): s is { type: "ref"; ref: ColumnReference } => s.type === "ref"
      );

      if (refs.length === 0) {
        onSave(column.id, { valueSource: undefined });
      } else {
        // Save the first ref as the primary valueSource
        // (full template is saved via the template string)
        const firstRef = refs[0].ref;
        const newSource: ColumnValueSource = {
          type: "reference",
          sourceColumnId: firstRef.columnId,
          sourceField: firstRef.field,
          expression: segmentsToTemplate(newSegments),
        };
        onSave(column.id, { valueSource: newSource });
      }
    },
    [onSave]
  );

  const handleRefSelect = useCallback(
    (ref: ColumnReference) => {
      const newSegments: EditorSegment[] = [
        ...segments,
        { type: "ref", ref },
      ];
      setSegments(newSegments);
      handleSegmentsChange(newSegments);
      setShowRefPicker(false);
    },
    [segments, handleSegmentsChange]
  );

  const handleOpenRefPicker = useCallback(
    (rect: { top: number; left: number; width: number }) => {
      setRefPickerTriggerRect(rect);
      setShowRefPicker(true);
    },
    []
  );

  const handleRefPickerClose = useCallback(() => {
    setShowRefPicker(false);
  }, []);

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
          setRefPickerTriggerRect({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
          setFormulaSlashIndex(e.target.selectionStart - 1);
          setShowRefPicker(true);
        }
      }
    },
    [formulaValue]
  );

  const handleFormulaRefSelect = useCallback(
    (ref: ColumnReference) => {
      if (formulaSlashIndex !== null) {
        const refStr = ref.field
          ? `{{${ref.columnName}.${ref.field}}}`
          : `{{${ref.columnName}}}`;
        const before = formulaValue.slice(0, formulaSlashIndex);
        const after = formulaValue.slice(formulaSlashIndex + 1);
        const newVal = before + refStr + after;
        setFormulaValue(newVal);
        onSave(column.id, { config: { expression: newVal } });
      }
      setShowRefPicker(false);
      setFormulaSlashIndex(null);
      formulaTextareaRef.current?.focus();
    },
    [formulaSlashIndex, formulaValue, onSave]
  );

  const handleFormulaSave = useCallback(() => {
    if (column.columnType === ColumnBehaviorType.Formula) {
      onSave(column.id, { config: { expression: formulaValue } });
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
          setRefPickerTriggerRect({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
          setAiSlashIndex(e.target.selectionStart - 1);
          setShowRefPicker(true);
        }
      }
    },
    [aiPrompt]
  );

  const handleAiRefSelect = useCallback(
    (ref: ColumnReference) => {
      if (aiSlashIndex !== null) {
        const refStr = ref.field
          ? `{{${ref.columnName}.${ref.field}}}`
          : `{{${ref.columnName}}}`;
        const before = aiPrompt.slice(0, aiSlashIndex);
        const after = aiPrompt.slice(aiSlashIndex + 1);
        const newVal = before + refStr + after;
        setAiPrompt(newVal);
        onSave(column.id, {
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
      onSave(column.id, {
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
        onSave(column.id, {
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
        <div className="flex items-center gap-0.5">
          {!isEditingName && (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="mt-0.5 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
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
           MANUAL / TEXT COLUMNS — Chip-based value editor
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

          {/* Chip editor */}
          <div className="px-4 py-2">
            <ChipEditor
              segments={segments}
              onChange={handleSegmentsChange}
              onSlashTrigger={handleOpenRefPicker}
              placeholder="No reference configured"
            />

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
              rows={rows}
              onSelect={currentRefSelectHandler}
              onClose={handleRefPickerClose}
              triggerRect={refPickerTriggerRect}
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
                onSave(column.id, { config: cfg });
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
              rows={rows}
              onSelect={currentRefSelectHandler}
              onClose={handleRefPickerClose}
              triggerRect={refPickerTriggerRect}
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
                onSave(column.id, {
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
              rows={rows}
              onSelect={currentRefSelectHandler}
              onClose={handleRefPickerClose}
              triggerRect={refPickerTriggerRect}
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
          onClick={() => onDelete(column.id)}
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
