"use client";

import React, { useCallback, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  GripVertical,
  Trash2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import {
  ColumnDataType,
  ColumnBehaviorType,
  type ColumnDef,
  type EnrichmentConfig,
  type FormulaConfig,
  type AIAgentConfig,
  type ActionConfig,
  type ActionType,
  type EnrichmentProviderEntry,
} from "@/types/table";

// ── Data type options ────────────────────────────────────────────────

const DATA_TYPE_OPTIONS: { value: ColumnDataType; label: string; icon: string }[] = [
  { value: ColumnDataType.Text, label: "Text", icon: "\u{1f4dd}" },
  { value: ColumnDataType.Url, label: "URL", icon: "\u{1f517}" },
  { value: ColumnDataType.Number, label: "Number", icon: "#️" },
  { value: ColumnDataType.Date, label: "Date", icon: "\u{1f4c5}" },
  { value: ColumnDataType.Select, label: "Select", icon: "\u{1f3f7}️" },
  { value: ColumnDataType.MultiSelect, label: "Multi Select", icon: "\u{1f3f7}️" },
  { value: ColumnDataType.Checkbox, label: "Checkbox", icon: "☑️" },
  { value: ColumnDataType.Currency, label: "Currency", icon: "\u{1f4b0}" },
  { value: ColumnDataType.Email, label: "Email", icon: "\u{1f4e7}" },
  { value: ColumnDataType.Image, label: "Image", icon: "\u{1f5bc}️" },
  { value: ColumnDataType.AssignedTo, label: "Assigned To", icon: "\u{1f464}" },
];

const BEHAVIOR_TYPE_OPTIONS: {
  value: ColumnBehaviorType;
  label: string;
  icon: string;
}[] = [
  { value: ColumnBehaviorType.Manual, label: "Manual", icon: "✏️" },
  { value: ColumnBehaviorType.Enrichment, label: "Enrichment", icon: "\u{1f504}" },
  { value: ColumnBehaviorType.Formula, label: "Formula", icon: "\u{1f9ee}" },
  { value: ColumnBehaviorType.AIAgent, label: "AI Agent", icon: "\u{1f916}" },
  { value: ColumnBehaviorType.Action, label: "Action", icon: "⚡" },
];

const AI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "claude-opus", label: "Claude Opus" },
  { value: "gemini-pro", label: "Gemini Pro" },
] as const;

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "http", label: "HTTP Request" },
  { value: "webhook", label: "Webhook" },
  { value: "slack", label: "Slack Message" },
  { value: "crm_push", label: "CRM Push" },
  { value: "write_table", label: "Write to Table" },
];

// ── Props ────────────────────────────────────────────────────────────

export interface ColumnConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: ColumnDef | null;
  allColumns: ColumnDef[];
  onUpdate: (column: ColumnDef) => void;
  onDelete: (columnId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────

export function ColumnConfigPanel({
  open,
  onOpenChange,
  column,
  allColumns,
  onUpdate,
  onDelete,
}: ColumnConfigPanelProps) {
  if (!column) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] overflow-y-auto sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>Configure Column</SheetTitle>
          <SheetDescription>
            Set up the data type, behavior, and configuration for this column.
          </SheetDescription>
        </SheetHeader>

        <ColumnConfigForm
          column={column}
          allColumns={allColumns}
          onUpdate={onUpdate}
        />

        <SheetFooter>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              onDelete(column.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="mr-1.5 size-4" />
            Delete Column
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Inner form ───────────────────────────────────────────────────────

function ColumnConfigForm({
  column,
  allColumns,
  onUpdate,
}: {
  column: ColumnDef;
  allColumns: ColumnDef[];
  onUpdate: (col: ColumnDef) => void;
}) {
  const [name, setName] = useState(column.name);
  const [dataType, setDataType] = useState(column.dataType);
  const [columnType, setColumnType] = useState(column.columnType);
  const [config, setConfig] = useState(column.config);
  const [onlyRunIf, setOnlyRunIf] = useState(column.onlyRunIf ?? "");
  const [autoRun, setAutoRun] = useState(column.autoRun ?? false);

  const emit = useCallback(
    (partial: Partial<ColumnDef>) => {
      const updated = {
        ...column,
        name,
        dataType,
        columnType,
        config,
        onlyRunIf: onlyRunIf || undefined,
        autoRun,
        ...partial,
      };
      onUpdate(updated);
    },
    [column, name, dataType, columnType, config, onlyRunIf, autoRun, onUpdate]
  );

  const isAutomated =
    columnType === ColumnBehaviorType.Enrichment ||
    columnType === ColumnBehaviorType.AIAgent ||
    columnType === ColumnBehaviorType.Action;

  const otherColumns = allColumns.filter((c) => c.id !== column.id);

  return (
    <div className="flex flex-col gap-5 px-4 py-2">
      {/* ── Column name ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Column Name
        </label>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          onBlur={() => emit({ name })}
          placeholder="Column name"
        />
      </div>

      {/* ── Data type ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Data Type
        </label>
        <Select
          value={dataType}
          onValueChange={(val) => {
            const dt = val as ColumnDataType;
            setDataType(dt);
            emit({ dataType: dt });
          }}
        >
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

      {/* ── Behavior type ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Column Behavior
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BEHAVIOR_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setColumnType(opt.value);
                // Reset config for new type
                if (opt.value === ColumnBehaviorType.Enrichment) {
                  setConfig({ providerOrder: [], verificationProvider: undefined, fieldType: undefined } satisfies EnrichmentConfig);
                } else if (opt.value === ColumnBehaviorType.Formula) {
                  setConfig({ expression: "" } satisfies FormulaConfig);
                } else if (opt.value === ColumnBehaviorType.AIAgent) {
                  setConfig({ prompt: "", model: "gpt-4o", contextColumns: [] } satisfies AIAgentConfig);
                } else if (opt.value === ColumnBehaviorType.Action) {
                  setConfig({ actionType: "http" } satisfies ActionConfig);
                } else {
                  setConfig({});
                }
                emit({ columnType: opt.value });
              }}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                columnType === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Enrichment config ─────────────────────────────────── */}
      {columnType === ColumnBehaviorType.Enrichment && (
        <EnrichmentSection
          config={config as EnrichmentConfig}
          onChange={(c) => {
            setConfig(c);
            emit({ config: c });
          }}
        />
      )}

      {/* ── Formula config ────────────────────────────────────── */}
      {columnType === ColumnBehaviorType.Formula && (
        <FormulaSection
          config={config as FormulaConfig}
          otherColumns={otherColumns}
          onChange={(c) => {
            setConfig(c);
            emit({ config: c });
          }}
        />
      )}

      {/* ── AI Agent config ───────────────────────────────────── */}
      {columnType === ColumnBehaviorType.AIAgent && (
        <AIAgentSection
          config={config as AIAgentConfig}
          otherColumns={otherColumns}
          onChange={(c) => {
            setConfig(c);
            emit({ config: c });
          }}
        />
      )}

      {/* ── Action config ─────────────────────────────────────── */}
      {columnType === ColumnBehaviorType.Action && (
        <ActionSection
          config={config as ActionConfig}
          onChange={(c) => {
            setConfig(c);
            emit({ config: c });
          }}
        />
      )}

      {/* ── Conditional & auto-run (for automated columns) ──── */}
      {isAutomated && (
        <>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Only Run If (conditional formula)
            </label>
            <Input
              value={onlyRunIf}
              onChange={(e) => setOnlyRunIf(e.target.value)}
              onBlur={() => emit({ onlyRunIf: onlyRunIf || undefined })}
              placeholder='e.g. {{Email}} != ""'
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Use {"{{ColumnName}}"} to reference other columns
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-run</p>
              <p className="text-xs text-muted-foreground">
                Run automatically when input data changes
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoRun}
              onClick={() => {
                const newVal = !autoRun;
                setAutoRun(newVal);
                emit({ autoRun: newVal });
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                autoRun ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                  autoRun ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Enrichment section ───────────────────────────────────────────────

function EnrichmentSection({
  config,
  onChange,
}: {
  config: EnrichmentConfig;
  onChange: (config: EnrichmentConfig) => void;
}) {
  const providers = config.providerOrder ?? [];

  const addProvider = () => {
    const entry: EnrichmentProviderEntry = {
      providerId: `provider-${Date.now()}`,
      providerName: "",
      enabled: true,
    };
    onChange({ ...config, providerOrder: [...providers, entry] });
  };

  const removeProvider = (idx: number) => {
    const next = providers.filter((_, i) => i !== idx);
    onChange({ ...config, providerOrder: next });
  };

  const moveProvider = (idx: number, direction: "up" | "down") => {
    const next = [...providers];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    onChange({ ...config, providerOrder: next });
  };

  const updateProvider = (idx: number, name: string) => {
    const next = [...providers];
    next[idx] = { ...next[idx], providerName: name };
    onChange({ ...config, providerOrder: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-muted-foreground">
        Waterfall Provider Order
      </label>
      <p className="text-[11px] text-muted-foreground">
        Data is tried from each provider in order. First successful result wins.
      </p>

      <div className="flex flex-col gap-1.5">
        {providers.map((provider, idx) => (
          <div
            key={provider.providerId}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5"
          >
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="w-5 text-center text-xs font-medium text-muted-foreground">
              {idx + 1}
            </span>
            <Input
              value={provider.providerName}
              onChange={(e) => updateProvider(idx, e.target.value)}
              placeholder="Provider name"
              className="h-6 flex-1 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
            />
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => moveProvider(idx, "up")}
                disabled={idx === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => moveProvider(idx, "down")}
                disabled={idx === providers.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => removeProvider(idx)}
                className="ml-1 p-0.5 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addProvider} className="w-fit gap-1">
        <Plus className="size-3" />
        Add Provider
      </Button>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Verification Provider (optional)
        </label>
        <Input
          value={config.verificationProvider ?? ""}
          onChange={(e) =>
            onChange({ ...config, verificationProvider: e.target.value || undefined })
          }
          placeholder="e.g. neverbounce"
          className="text-xs"
        />
      </div>
    </div>
  );
}

// ── Formula section ──────────────────────────────────────────────────

function FormulaSection({
  config,
  otherColumns,
  onChange,
}: {
  config: FormulaConfig;
  otherColumns: ColumnDef[];
  onChange: (config: FormulaConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-muted-foreground">
        Formula Expression
      </label>
      <Textarea
        value={config.expression}
        onChange={(e) => onChange({ ...config, expression: e.target.value })}
        placeholder='e.g. {{First Name}} + " " + {{Last Name}}'
        className="min-h-24 font-mono text-xs"
        rows={4}
      />
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium text-muted-foreground">
          Available column references:
        </p>
        <div className="flex flex-wrap gap-1">
          {otherColumns.map((col) => (
            <Badge key={col.id} variant="secondary" className="text-[10px]">
              {`{{${col.name}}}`}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Agent section ─────────────────────────────────────────────────

function AIAgentSection({
  config,
  otherColumns,
  onChange,
}: {
  config: AIAgentConfig;
  otherColumns: ColumnDef[];
  onChange: (config: AIAgentConfig) => void;
}) {
  const toggleContextColumn = (colId: string) => {
    const current = config.contextColumns ?? [];
    const next = current.includes(colId)
      ? current.filter((id) => id !== colId)
      : [...current, colId];
    onChange({ ...config, contextColumns: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          AI Model
        </label>
        <Select
          value={config.model}
          onValueChange={(val) =>
            onChange({ ...config, model: val as AIAgentConfig["model"] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Prompt
        </label>
        <Textarea
          value={config.prompt}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          placeholder="Write a prompt for the AI agent. Use {{ColumnName}} to reference data from other columns."
          className="min-h-28 text-xs"
          rows={5}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Context Columns
        </label>
        <p className="text-[11px] text-muted-foreground">
          Select which columns to send as context to the AI model.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {otherColumns.map((col) => {
            const selected = (config.contextColumns ?? []).includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleContextColumn(col.id)}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {col.name}
              </button>
            );
          })}
          {otherColumns.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              No other columns available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Action section ───────────────────────────────────────────────────

function ActionSection({
  config,
  onChange,
}: {
  config: ActionConfig;
  onChange: (config: ActionConfig) => void;
}) {
  const actionType = config.actionType ?? "http";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Action Type
        </label>
        <Select
          value={actionType}
          onValueChange={(val) =>
            onChange({ ...config, actionType: val as ActionType })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* HTTP / Webhook fields */}
      {(actionType === "http" || actionType === "webhook") && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              URL
            </label>
            <Input
              value={config.url ?? ""}
              onChange={(e) => onChange({ ...config, url: e.target.value })}
              placeholder="https://api.example.com/endpoint"
              className="text-xs"
            />
          </div>
          {actionType === "http" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Method
              </label>
              <Select
                value={config.method ?? "POST"}
                onValueChange={(val) =>
                  onChange({
                    ...config,
                    method: val as ActionConfig["method"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map(
                    (m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Body Template (JSON)
            </label>
            <Textarea
              value={config.body ?? ""}
              onChange={(e) => onChange({ ...config, body: e.target.value })}
              placeholder={'{\n  "email": "{{Email}}"\n}'}
              className="min-h-20 font-mono text-xs"
              rows={4}
            />
          </div>
        </>
      )}

      {/* Slack fields */}
      {actionType === "slack" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Slack Channel
            </label>
            <Input
              value={config.slackChannel ?? ""}
              onChange={(e) =>
                onChange({ ...config, slackChannel: e.target.value })
              }
              placeholder="#general"
              className="text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Message Template
            </label>
            <Textarea
              value={config.slackMessage ?? ""}
              onChange={(e) =>
                onChange({ ...config, slackMessage: e.target.value })
              }
              placeholder="New lead: {{Name}} ({{Email}})"
              className="min-h-16 text-xs"
              rows={3}
            />
          </div>
        </>
      )}

      {/* CRM Push fields */}
      {actionType === "crm_push" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              CRM Provider
            </label>
            <Input
              value={config.crmProvider ?? ""}
              onChange={(e) =>
                onChange({ ...config, crmProvider: e.target.value })
              }
              placeholder="e.g. salesforce, hubspot"
              className="text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              CRM Object
            </label>
            <Input
              value={config.crmObject ?? ""}
              onChange={(e) =>
                onChange({ ...config, crmObject: e.target.value })
              }
              placeholder="e.g. contact, lead, deal"
              className="text-xs"
            />
          </div>
        </>
      )}

      {/* Write Table fields */}
      {actionType === "write_table" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Target Table ID
          </label>
          <Input
            value={config.targetTableId ?? ""}
            onChange={(e) =>
              onChange({ ...config, targetTableId: e.target.value })
            }
            placeholder="Table ID"
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
}

export default ColumnConfigPanel;
