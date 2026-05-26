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
  Sparkles,
  Columns3,
  Rows3,
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
  columnCount?: number;
  totalColumns?: number;
  isFilterOpen?: boolean;
  autoRun?: boolean;
  onAutoRunToggle?: () => void;
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
  columnCount,
  totalColumns,
  isFilterOpen,
  autoRun = false,
  onAutoRunToggle,
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
      e.target.value = "";
    },
    [onCsvImport]
  );

  const activeView = views.find((v) => v.id === activeViewId);

  return (
    <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5">
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
            className="h-7 w-52 rounded border border-indigo-500 bg-zinc-900 px-1.5 text-sm font-semibold text-zinc-100 outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="h-7 rounded px-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            {tableName}
          </button>
        )}
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      {/* ── Auto-run toggle ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onAutoRunToggle}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      >
        <span
          className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
            autoRun
              ? "border-emerald-500 bg-emerald-500/20"
              : "border-zinc-600"
          }`}
        >
          {autoRun && (
            <Check className="size-2.5 text-emerald-400" />
          )}
        </span>
        Auto-run
      </button>

      <div className="h-4 w-px bg-zinc-800" />

      {/* ── View selector ───────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs text-zinc-400 hover:text-zinc-200"
      >
        <LayoutGrid className="size-3.5" />
        {activeView?.name ?? "Default View"}
      </Button>

      <div className="h-4 w-px bg-zinc-800" />

      {/* ── Column & Row counts ─────────────────────────────── */}
      <span className="flex items-center gap-1 text-xs text-zinc-500">
        <Columns3 className="size-3" />
        {columnCount ?? 0}/{totalColumns ?? 29} columns
      </span>

      <span className="flex items-center gap-1 text-xs text-zinc-500">
        <Rows3 className="size-3" />
        {rowCount}/{rowCount} rows
      </span>

      <div className="h-4 w-px bg-zinc-800" />

      {/* ── Filter ──────────────────────────────────────────── */}
      <Button
        variant={isFilterOpen ? "secondary" : "ghost"}
        size="sm"
        className={`gap-1 text-xs ${
          isFilterOpen
            ? "bg-zinc-800 text-zinc-200"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
        onClick={onFilterToggle}
      >
        <Filter className="size-3.5" />
        Filter
      </Button>

      {/* ── Sort ────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs text-zinc-400 hover:text-zinc-200"
        onClick={onSortToggle}
      >
        <ArrowUpDown className="size-3.5" />
        Sort
      </Button>

      <div className="flex-1" />

      {/* ── Search ──────────────────────────────────────────── */}
      {showSearch ? (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
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
            className="h-7 w-48 border-zinc-700 bg-zinc-900 pl-7 text-xs text-zinc-200 placeholder:text-zinc-600"
            autoFocus
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-zinc-500 hover:text-zinc-300"
          onClick={() => setShowSearch(true)}
        >
          <Search className="size-3.5" />
        </Button>
      )}

      <div className="h-4 w-px bg-zinc-800" />

      {/* ── Sculptor AI button (placeholder) ─────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
      >
        <Sparkles className="size-3.5" />
        Sculptor
      </Button>

      <div className="h-4 w-px bg-zinc-800" />

      {/* ── Run buttons ─────────────────────────────────────── */}
      <Button
        variant="default"
        size="sm"
        className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
        onClick={onRunFirst10}
      >
        <Play className="size-3" fill="currentColor" />
        Run first 10
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1 border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800">
              <Zap className="size-3.5" />
              Run
              <ChevronDown className="size-3" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
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

      {/* ── CSV Import / Export (less prominent) ────────────── */}
      <div className="h-4 w-px bg-zinc-800" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className="text-zinc-500 hover:text-zinc-400">
              <Upload className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 size-3.5" />
            Import CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCsvExport}>
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default TableToolbar;
