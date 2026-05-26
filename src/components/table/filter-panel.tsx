"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Save } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import type {
  ColumnDef,
  FilterDef,
  FilterGroup,
  FilterGroupLogic,
  FilterOperator,
} from "@/types/table";

// ── Filter operators ─────────────────────────────────────────────────

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater than or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less than or equal" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const VALUELESS_OPERATORS = new Set<FilterOperator>(["is_empty", "is_not_empty"]);

// ── Props ────────────────────────────────────────────────────────────

export interface FilterPanelProps {
  columns: ColumnDef[];
  filterGroup: FilterGroup;
  onFilterGroupChange: (group: FilterGroup) => void;
  onSaveAsView?: () => void;
  onClearAll?: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export function FilterPanel({
  columns,
  filterGroup,
  onFilterGroupChange,
  onSaveAsView,
  onClearAll,
}: FilterPanelProps) {
  const { logic, filters } = filterGroup;

  // ── Add filter ─────────────────────────────────────────────────

  const addFilter = useCallback(() => {
    const firstColumn = columns[0];
    if (!firstColumn) return;

    const newFilter: FilterDef = {
      id: uuidv4(),
      columnId: firstColumn.id,
      operator: "contains",
      value: "",
    };
    onFilterGroupChange({
      ...filterGroup,
      filters: [...filters, newFilter],
    });
  }, [columns, filters, filterGroup, onFilterGroupChange]);

  // ── Remove filter ──────────────────────────────────────────────

  const removeFilter = useCallback(
    (filterId: string) => {
      onFilterGroupChange({
        ...filterGroup,
        filters: filters.filter((f) => f.id !== filterId),
      });
    },
    [filters, filterGroup, onFilterGroupChange]
  );

  // ── Update filter ──────────────────────────────────────────────

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<FilterDef>) => {
      onFilterGroupChange({
        ...filterGroup,
        filters: filters.map((f) =>
          f.id === filterId ? { ...f, ...updates } : f
        ),
      });
    },
    [filters, filterGroup, onFilterGroupChange]
  );

  // ── Toggle logic ───────────────────────────────────────────────

  const toggleLogic = useCallback(() => {
    const newLogic: FilterGroupLogic = logic === "and" ? "or" : "and";
    onFilterGroupChange({ ...filterGroup, logic: newLogic });
  }, [logic, filterGroup, onFilterGroupChange]);

  // ── Clear all ──────────────────────────────────────────────────

  const handleClearAll = useCallback(() => {
    onFilterGroupChange({ logic: "and", filters: [] });
    onClearAll?.();
  }, [onFilterGroupChange, onClearAll]);

  if (filters.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">No active filters</span>
        <Button
          variant="outline"
          size="xs"
          className="gap-1"
          onClick={addFilter}
        >
          <Plus className="size-3" />
          Add filter
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 border-b border-border bg-muted/30 px-3 py-2">
      {filters.map((filter, idx) => (
        <FilterRow
          key={filter.id}
          filter={filter}
          columns={columns}
          index={idx}
          logic={logic}
          onToggleLogic={toggleLogic}
          onUpdate={(updates) => updateFilter(filter.id, updates)}
          onRemove={() => removeFilter(filter.id)}
        />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="xs"
          className="gap-1"
          onClick={addFilter}
        >
          <Plus className="size-3" />
          Add filter
        </Button>

        <div className="flex-1" />

        {onSaveAsView && (
          <Button
            variant="ghost"
            size="xs"
            className="gap-1 text-xs"
            onClick={onSaveAsView}
          >
            <Save className="size-3" />
            Save as view
          </Button>
        )}

        <Button
          variant="ghost"
          size="xs"
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={handleClearAll}
        >
          Clear all
        </Button>
      </div>
    </div>
  );
}

// ── Single filter row ────────────────────────────────────────────────

function FilterRow({
  filter,
  columns,
  index,
  logic,
  onToggleLogic,
  onUpdate,
  onRemove,
}: {
  filter: FilterDef;
  columns: ColumnDef[];
  index: number;
  logic: FilterGroupLogic;
  onToggleLogic: () => void;
  onUpdate: (updates: Partial<FilterDef>) => void;
  onRemove: () => void;
}) {
  const needsValue = !VALUELESS_OPERATORS.has(filter.operator);

  return (
    <div className="flex items-center gap-1.5">
      {/* Logic toggle (shown between rows) */}
      <div className="w-12 shrink-0 text-right">
        {index === 0 ? (
          <span className="text-xs text-muted-foreground">Where</span>
        ) : (
          <button
            type="button"
            onClick={onToggleLogic}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            {logic.toUpperCase()}
          </button>
        )}
      </div>

      {/* Column selector */}
      <Select
        value={filter.columnId}
        onValueChange={(val) => { if (val) onUpdate({ columnId: val }); }}
      >
        <SelectTrigger className="h-7 w-36 text-xs">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((col) => (
            <SelectItem key={col.id} value={col.id}>
              {col.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={filter.operator}
        onValueChange={(val) =>
          onUpdate({ operator: val as FilterOperator })
        }
      >
        <SelectTrigger className="h-7 w-40 text-xs">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      {needsValue && (
        <Input
          value={filter.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value..."
          className="h-7 w-40 text-xs"
        />
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export default FilterPanel;
