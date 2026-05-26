"use client";

import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  ArrowUpDown,
  Play,
  Zap,
  RefreshCw,
  Upload,
  Download,
  ChevronDown,
  LayoutGrid,
  Check,
} from "lucide-react";

import type { ViewDef } from "@/types/table";

// ── Props ────────────────────────────────────────────────────────────

export interface TableToolbarProps {
  tableName: string;
  onTableNameChange?: (name: string) => void;
  views?: ViewDef[];
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  onFilterToggle?: () => void;
  onSortToggle?: () => void;
  onRunFirst10?: () => void;
  onRunAll?: () => void;
  onForceRunAll?: () => void;
  onCsvImport?: (file: File) => void;
  onCsvExport?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  rowCount: number;
  isFilterOpen?: boolean;
}

// ── Component ────────────────────────────────────────────────────────

export function TableToolbar({
  tableName,
  onTableNameChange,
  views = [],
  activeViewId,
  onViewChange,
  onFilterToggle,
  onSortToggle,
  onRunFirst10,
  onRunAll,
  onForceRunAll,
  onCsvImport,
  onCsvExport,
  searchQuery = "",
  onSearchChange,
  rowCount,
  isFilterOpen,
}: TableToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(tableName);
  const [showSearch, setShowSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleNameSubmit = useCallback(() => {
    setIsEditingName(false);
    if (nameValue.trim() && nameValue !== tableName) {
      onTableNameChange?.(nameValue.trim());
    } else {
      setNameValue(tableName);
    }
  }, [nameValue, tableName, onTableNameChange]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onCsvImport) {
        onCsvImport(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [onCsvImport]
  );

  const activeView = views.find((v) => v.id === activeViewId);

  return (
    <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-1.5">
      {/* ── Table name (inline editable) ────────────────────── */}
      <div className="mr-1 shrink-0">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit();
              if (e.key === "Escape") {
                setNameValue(tableName);
                setIsEditingName(false);
              }
            }}
            className="h-7 w-48 rounded border border-primary bg-transparent px-1.5 text-sm font-semibold text-foreground outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="h-7 rounded px-1.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            {tableName}
          </button>
        )}
      </div>

      {/* ── View selector ───────────────────────────────────── */}
      {views.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                <LayoutGrid className="size-3.5" />
                {activeView?.name ?? "Default View"}
                <ChevronDown className="size-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            {views.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => onViewChange?.(view.id)}
              >
                {view.id === activeViewId && (
                  <Check className="mr-1.5 size-3.5" />
                )}
                <span className={view.id !== activeViewId ? "pl-5" : ""}>
                  {view.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="h-4 w-px bg-border" />

      {/* ── Filter ──────────────────────────────────────────── */}
      <Button
        variant={isFilterOpen ? "secondary" : "ghost"}
        size="sm"
        className="gap-1 text-xs"
        onClick={onFilterToggle}
      >
        <Filter className="size-3.5" />
        Filter
      </Button>

      {/* ── Sort ────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={onSortToggle}
      >
        <ArrowUpDown className="size-3.5" />
        Sort
      </Button>

      <div className="h-4 w-px bg-border" />

      {/* ── Run buttons ─────────────────────────────────────── */}
      <Button
        variant="default"
        size="sm"
        className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
        onClick={onRunFirst10}
      >
        <Play className="size-3" />
        Run first 10
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Zap className="size-3.5" />
              Run
              <ChevronDown className="size-3" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onRunAll}>
            <Play className="mr-1.5 size-3.5" />
            Run all
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onForceRunAll}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Force run all (re-run completed)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* ── Search ──────────────────────────────────────────── */}
      {showSearch ? (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onBlur={() => {
              if (!searchQuery) setShowSearch(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onSearchChange?.("");
                setShowSearch(false);
              }
            }}
            placeholder="Search..."
            className="h-7 w-48 pl-7 text-xs"
            autoFocus
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowSearch(true)}
        >
          <Search className="size-3.5" />
        </Button>
      )}

      <div className="h-4 w-px bg-border" />

      {/* ── CSV Import / Export ──────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="size-3.5" />
        Import
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={onCsvExport}
      >
        <Download className="size-3.5" />
        Export
      </Button>

      <div className="h-4 w-px bg-border" />

      {/* ── Row count ───────────────────────────────────────── */}
      <span className="text-xs text-muted-foreground">
        {rowCount.toLocaleString()} {rowCount === 1 ? "row" : "rows"}
      </span>
    </div>
  );
}

export default TableToolbar;
