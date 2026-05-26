"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { ColumnDef } from "@/types/table";
import {
  PROVIDER_CATALOG,
  type EnrichmentTemplate,
  type WaterfallProvider,
  type WaterfallColumnConfig,
} from "./enrichment-templates";

// ── Props ────────────────────────────────────────────────────────────

export interface WaterfallConfigProps {
  template: EnrichmentTemplate;
  availableColumns: ColumnDef[];
  onSave: (config: WaterfallColumnConfig) => void;
  onCancel: () => void;
}

// ── "Optimized for" presets by category ─────────────────────────────

const OPTIMIZED_FOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  email: [
    { value: "work_email", label: "Work Email" },
    { value: "personal_email", label: "Personal Email" },
  ],
  phone: [
    { value: "direct_phone", label: "Direct Phone" },
    { value: "mobile_phone", label: "Mobile Phone" },
    { value: "company_phone", label: "Company Phone" },
  ],
  company: [
    { value: "general", label: "General" },
    { value: "accuracy", label: "High Accuracy" },
    { value: "speed", label: "Fastest" },
  ],
  people: [
    { value: "general", label: "General" },
    { value: "accuracy", label: "High Accuracy" },
  ],
  technographic: [
    { value: "full_stack", label: "Full Stack" },
    { value: "frontend", label: "Frontend Only" },
  ],
  social: [
    { value: "linkedin", label: "LinkedIn" },
    { value: "all_platforms", label: "All Platforms" },
  ],
  ai: [
    { value: "quality", label: "Best Quality" },
    { value: "speed", label: "Fastest" },
    { value: "cost", label: "Lowest Cost" },
  ],
};

// ── Component ────────────────────────────────────────────────────────

export function WaterfallConfig({
  template,
  availableColumns,
  onSave,
  onCancel,
}: WaterfallConfigProps) {
  const [configTab, setConfigTab] = useState<"quick" | "full">("quick");
  const [inputColumnId, setInputColumnId] = useState<string>("");
  const [optimizedFor, setOptimizedFor] = useState<string>(
    OPTIMIZED_FOR_OPTIONS[template.category]?.[0]?.value ?? "general"
  );

  // Initialize providers from the catalog
  const [providers, setProviders] = useState<WaterfallProvider[]>(() => {
    const catalogProviders = PROVIDER_CATALOG[template.id];
    if (catalogProviders) return catalogProviders.map((p) => ({ ...p }));
    // Fallback: generate from defaultProviders
    return template.defaultProviders.map((name, idx) => ({
      id: `provider-${idx}`,
      name,
      icon: name.slice(0, 2).toUpperCase(),
      costPerRow: 1,
      enabled: true,
    }));
  });

  // Calculate estimated cost (average of enabled providers)
  const estimatedCost = useMemo(() => {
    const enabled = providers.filter((p) => p.enabled);
    if (enabled.length === 0) return 0;
    // Waterfall cost: the expected cost is roughly the average of enabled providers
    // since typically only one succeeds — but we show the weighted average
    const total = enabled.reduce((sum, p) => sum + p.costPerRow, 0);
    return Math.round((total / enabled.length) * 10) / 10;
  }, [providers]);

  // Provider actions
  const toggleProvider = useCallback((idx: number) => {
    setProviders((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], enabled: !next[idx].enabled };
      return next;
    });
  }, []);

  const removeProvider = useCallback((idx: number) => {
    setProviders((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const moveProvider = useCallback((idx: number, direction: "up" | "down") => {
    setProviders((prev) => {
      const next = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }, []);

  const handleSave = useCallback(
    (runOnSave: boolean) => {
      const config: WaterfallColumnConfig = {
        templateId: template.id,
        templateName: template.name,
        inputColumnId: inputColumnId || undefined,
        optimizedFor,
        providers: providers.filter((p) => p.enabled),
        estimatedCostPerRow: estimatedCost,
        runOnSave,
      };
      onSave(config);
    },
    [template, inputColumnId, optimizedFor, providers, estimatedCost, onSave]
  );

  const presetOptions = OPTIMIZED_FOR_OPTIONS[template.category] ?? [
    { value: "general", label: "General" },
  ];

  return (
    <div className="flex h-full w-[420px] flex-col border-l border-border bg-background">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h2 className="text-sm font-semibold text-foreground">
          {template.name}
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {/* ── Provider label ──────────────────────────────── */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Provider:</span>
            <Badge variant="secondary" className="text-xs">
              Waterfall
            </Badge>
          </div>

          {/* ── Description ─────────────────────────────────── */}
          <p className="text-xs text-muted-foreground">
            {template.description}
          </p>

          <Separator />

          {/* ── Config tabs ─────────────────────────────────── */}
          <Tabs
            defaultValue="quick"
            value={configTab}
            onValueChange={(val) => setConfigTab(val as "quick" | "full")}
          >
            <TabsList>
              <TabsTrigger value="quick" className="text-xs">
                Quick setup
              </TabsTrigger>
              <TabsTrigger value="full" className="text-xs">
                Full configuration
              </TabsTrigger>
            </TabsList>

            {/* ── Quick setup ──────────────────────────────── */}
            <TabsContent value="quick">
              <div className="flex flex-col gap-4 pt-2">
                {/* Optimized For */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Optimized For
                  </label>
                  <Select
                    value={optimizedFor}
                    onValueChange={(val) => { if (val !== null) setOptimizedFor(val); }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {presetOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Input column selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Which column has the data?
                  </label>
                  <Select
                    value={inputColumnId}
                    onValueChange={(val) => { if (val !== null) setInputColumnId(val); }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select input column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                      {availableColumns.length === 0 && (
                        <SelectItem value="__none" disabled>
                          No columns available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Select the column containing input data for this enrichment.
                  </p>
                </div>

                {/* Provider summary in quick mode */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Providers ({providers.filter((p) => p.enabled).length} active)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {providers
                      .filter((p) => p.enabled)
                      .map((p) => (
                        <Badge
                          key={p.id}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {p.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Full configuration ───────────────────────── */}
            <TabsContent value="full">
              <div className="flex flex-col gap-4 pt-2">
                {/* Input column selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Input Column
                  </label>
                  <Select
                    value={inputColumnId}
                    onValueChange={(val) => { if (val !== null) setInputColumnId(val); }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select input column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Waterfall sequence */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Waterfall sequence
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Drag these providers to rearrange the order. Data is tried
                    from each provider in sequence until one succeeds.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    {providers.map((provider, idx) => (
                      <div
                        key={provider.id}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                          provider.enabled
                            ? "border-border bg-background"
                            : "border-border/50 bg-muted/30 opacity-60"
                        }`}
                      >
                        {/* Drag handle */}
                        <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />

                        {/* Provider icon */}
                        <div className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                          {provider.icon}
                        </div>

                        {/* Provider name */}
                        <span className="flex-1 text-sm font-medium text-foreground">
                          {provider.name}
                        </span>

                        {/* Cost badge */}
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px] font-normal"
                        >
                          {provider.costPerRow} / row
                        </Badge>

                        {/* Reorder buttons */}
                        <div className="flex shrink-0 flex-col">
                          <button
                            type="button"
                            onClick={() => moveProvider(idx, "up")}
                            disabled={idx === 0}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ChevronUp className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveProvider(idx, "down")}
                            disabled={idx === providers.length - 1}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </div>

                        {/* Toggle */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={provider.enabled}
                          onClick={() => toggleProvider(idx)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                            provider.enabled ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                              provider.enabled
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeProvider(idx)}
                          className="p-0.5 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${provider.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {providers.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No providers configured. Add providers to start the
                      waterfall.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="border-t border-border px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Estimated cost:
          </span>
          <Badge variant="outline" className="text-xs font-medium">
            ~{estimatedCost} / row
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => handleSave(false)}
          >
            Save and don&apos;t run
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs"
            onClick={() => handleSave(true)}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WaterfallConfig;
