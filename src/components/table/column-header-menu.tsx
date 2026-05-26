"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pencil,
  Settings,
  ArrowLeft,
  ArrowRight,
  Info,
  Palette,
  Type as TypeIcon,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Link2,
  Filter,
  Pin,
  EyeOff,
  Trash2,
  Copy,
  ChevronRight,
  Zap,
  Sparkles,
  Layers,
  Calculator,
  Merge,
  Hash,
  DollarSign,
  Calendar,
  Link,
  Mail,
  Image,
  CheckSquare,
  List,
  ListChecks,
  UserCircle,
  Type,
  SplitSquareHorizontal,
  CornerDownRight,
} from "lucide-react";
import type { ColumnDef } from "@/types/table";
import { ColumnDataType } from "@/types/table";

// ── Props ────────────────────────────────────────────────────────────

export interface ColumnHeaderMenuProps {
  column: ColumnDef;
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onRename: (columnId: string) => void;
  onEdit: (columnId: string) => void;
  onInsertLeft: (columnId: string, type: string, config?: any) => void;
  onInsertRight: (columnId: string, type: string, config?: any) => void;
  onChangeColor: (columnId: string, color: string) => void;
  onChangeType: (columnId: string, type: ColumnDataType) => void;
  onDuplicate: (columnId: string) => void;
  onSort: (columnId: string, direction: "asc" | "desc") => void;
  onDedupe: (columnId: string) => void;
  onFilter: (columnId: string) => void;
  onPin: (columnId: string) => void;
  onHide: (columnId: string) => void;
  onDelete: (columnId: string) => void;
}

// ── Insert column submenu items (same as AddColumnMenu) ─────────────

const ENRICHMENT_ACTIONS = [
  { id: "add_enrichment", label: "Add enrichment", icon: Zap, type: "enrichment" },
  { id: "use_ai", label: "Use AI", icon: Sparkles, type: "ai" },
  { id: "waterfall", label: "Waterfall", icon: Layers, type: "waterfall" },
  { id: "formula", label: "Formula", icon: Calculator, type: "formula" },
  { id: "merge_columns", label: "Merge columns", icon: Merge, type: "merge" },
] as const;

const DATA_TYPE_ITEMS: {
  type: ColumnDataType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: ColumnDataType.Text, label: "Text", icon: Type },
  { type: ColumnDataType.Number, label: "Number", icon: Hash },
  { type: ColumnDataType.Currency, label: "Currency", icon: DollarSign },
  { type: ColumnDataType.Date, label: "Date", icon: Calendar },
  { type: ColumnDataType.Url, label: "URL", icon: Link },
  { type: ColumnDataType.Email, label: "Email", icon: Mail },
  { type: ColumnDataType.Image, label: "Image from URL", icon: Image },
  { type: ColumnDataType.Checkbox, label: "Checkbox", icon: CheckSquare },
  { type: ColumnDataType.Select, label: "Select", icon: List },
  { type: ColumnDataType.MultiSelect, label: "Multi-select", icon: ListChecks },
  { type: ColumnDataType.AssignedTo, label: "Assigned to", icon: UserCircle },
];

// ── Color palette ───────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "green", label: "Green", hex: "#22c55e" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "purple", label: "Purple", hex: "#a855f7" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "gray", label: "Gray", hex: "#71717a" },
] as const;

// ── Submenu IDs ─────────────────────────────────────────────────────

type SubmenuId = "insert-left" | "insert-right" | "change-color" | "change-type" | null;

// ── Component ────────────────────────────────────────────────────────

export function ColumnHeaderMenu({
  column,
  position,
  isOpen,
  onClose,
  onRename,
  onEdit,
  onInsertLeft,
  onInsertRight,
  onChangeColor,
  onChangeType,
  onDuplicate,
  onSort,
  onDedupe,
  onFilter,
  onPin,
  onHide,
  onDelete,
}: ColumnHeaderMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuId>(null);
  const submenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Close on Escape ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ── Close on click outside ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use timeout so the opening right-click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ── Reset submenu when menu closes ─────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
    }
  }, [isOpen]);

  // ── Submenu hover handlers ─────────────────────────────────────

  const handleSubmenuEnter = useCallback((id: SubmenuId) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    setActiveSubmenu(id);
  }, []);

  const handleSubmenuLeave = useCallback(() => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
  }, []);

  // ── Compute position so menu stays on screen ──────────────────

  const menuStyle = React.useMemo(() => {
    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
      left: position.x,
      top: position.y,
    };
    return style;
  }, [position]);

  if (!isOpen) return null;

  const colId = column.id;

  return (
    <div ref={menuRef} style={menuStyle}>
      <div className="min-w-[220px] rounded-lg border border-zinc-700/50 bg-zinc-900 py-1 shadow-2xl shadow-black/50">
        {/* ── Rename / Edit ──────────────────────────────────── */}
        <MenuItem
          icon={<Pencil className="size-4" />}
          label="Rename column"
          onClick={() => { onRename(colId); onClose(); }}
        />
        <MenuItem
          icon={<Settings className="size-4" />}
          label="Edit column"
          onClick={() => { onEdit(colId); onClose(); }}
        />

        {/* ── Insert left / right ────────────────────────────── */}
        <SubmenuItem
          icon={<ArrowLeft className="size-4" />}
          label="Insert 1 column left"
          isActive={activeSubmenu === "insert-left"}
          onMouseEnter={() => handleSubmenuEnter("insert-left")}
          onMouseLeave={handleSubmenuLeave}
          submenu={
            <InsertColumnSubmenu
              onSelect={(type, config) => { onInsertLeft(colId, type, config); onClose(); }}
              onMouseEnter={() => handleSubmenuEnter("insert-left")}
              onMouseLeave={handleSubmenuLeave}
            />
          }
        />
        <SubmenuItem
          icon={<ArrowRight className="size-4" />}
          label="Insert 1 column right"
          isActive={activeSubmenu === "insert-right"}
          onMouseEnter={() => handleSubmenuEnter("insert-right")}
          onMouseLeave={handleSubmenuLeave}
          submenu={
            <InsertColumnSubmenu
              onSelect={(type, config) => { onInsertRight(colId, type, config); onClose(); }}
              onMouseEnter={() => handleSubmenuEnter("insert-right")}
              onMouseLeave={handleSubmenuLeave}
            />
          }
        />

        <Separator />

        {/* ── Edit description / Change color / Change type ── */}
        <MenuItem
          icon={<Info className="size-4" />}
          label="Edit description"
          onClick={() => { onEdit(colId); onClose(); }}
        />
        <SubmenuItem
          icon={<Palette className="size-4" />}
          label="Change color"
          isActive={activeSubmenu === "change-color"}
          onMouseEnter={() => handleSubmenuEnter("change-color")}
          onMouseLeave={handleSubmenuLeave}
          submenu={
            <ColorPickerSubmenu
              onSelect={(color) => { onChangeColor(colId, color); onClose(); }}
              onMouseEnter={() => handleSubmenuEnter("change-color")}
              onMouseLeave={handleSubmenuLeave}
            />
          }
        />
        <SubmenuItem
          icon={<TypeIcon className="size-4" />}
          label={dataTypeLabel(column.dataType)}
          isActive={activeSubmenu === "change-type"}
          onMouseEnter={() => handleSubmenuEnter("change-type")}
          onMouseLeave={handleSubmenuLeave}
          submenu={
            <ChangeTypeSubmenu
              currentType={column.dataType}
              onSelect={(type) => { onChangeType(colId, type); onClose(); }}
              onMouseEnter={() => handleSubmenuEnter("change-type")}
              onMouseLeave={handleSubmenuLeave}
            />
          }
        />

        <Separator />

        {/* ── Parent / Duplicate / Text to columns ───────────── */}
        <MenuItem
          icon={<CornerDownRight className="size-4" />}
          label="Go to parent column"
          onClick={() => { onEdit(colId); onClose(); }}
          disabled
        />
        <MenuItem
          icon={<Copy className="size-4" />}
          label="Duplicate"
          onClick={() => { onDuplicate(colId); onClose(); }}
        />
        <MenuItem
          icon={<SplitSquareHorizontal className="size-4" />}
          label="Text to columns"
          onClick={() => onClose()}
          disabled
        />

        <Separator />

        {/* ── Sort ───────────────────────────────────────────── */}
        <MenuItem
          icon={<ArrowUpNarrowWide className="size-4" />}
          label="Sort A → Z"
          onClick={() => { onSort(colId, "asc"); onClose(); }}
        />
        <MenuItem
          icon={<ArrowDownWideNarrow className="size-4" />}
          label="Sort Z → A"
          onClick={() => { onSort(colId, "desc"); onClose(); }}
        />

        <Separator />

        {/* ── Dedupe / Filter ────────────────────────────────── */}
        <MenuItem
          icon={<Link2 className="size-4" />}
          label="Dedupe"
          onClick={() => { onDedupe(colId); onClose(); }}
        />
        <MenuItem
          icon={<Filter className="size-4" />}
          label="Filter on this column"
          onClick={() => { onFilter(colId); onClose(); }}
        />

        <Separator />

        {/* ── Pin / Hide ─────────────────────────────────────── */}
        <MenuItem
          icon={<Pin className="size-4" />}
          label={column.pinned ? "Unpin" : "Pin"}
          onClick={() => { onPin(colId); onClose(); }}
        />
        <MenuItem
          icon={<EyeOff className="size-4" />}
          label="Hide"
          onClick={() => { onHide(colId); onClose(); }}
        />

        <Separator />

        {/* ── Delete ─────────────────────────────────────────── */}
        <MenuItem
          icon={<Trash2 className="size-4" />}
          label="Delete"
          onClick={() => { onDelete(colId); onClose(); }}
          danger
        />
      </div>
    </div>
  );
}

// ── MenuItem ────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
        disabled
          ? "cursor-not-allowed text-zinc-600"
          : danger
            ? "text-red-400 hover:bg-zinc-800 hover:text-red-300"
            : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className={`shrink-0 ${danger ? "text-red-400" : disabled ? "text-zinc-600" : "text-zinc-500"}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}

// ── SubmenuItem (parent item that reveals a submenu on hover) ───────

function SubmenuItem({
  icon,
  label,
  isActive,
  onMouseEnter,
  onMouseLeave,
  submenu,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  submenu: React.ReactNode;
}) {
  const itemRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
          isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        }`}
      >
        <span className="shrink-0 text-zinc-500">{icon}</span>
        <span className="flex-1">{label}</span>
        <ChevronRight className="size-3.5 text-zinc-500" />
      </div>
      {isActive && (
        <div className="absolute left-full top-0 z-[10000] ml-0.5">
          {submenu}
        </div>
      )}
    </div>
  );
}

// ── Separator ────────────────────────────────────────────────────────

function Separator() {
  return <div className="my-1 h-px bg-zinc-800" />;
}

// ── InsertColumnSubmenu ──────────────────────────────────────────────

function InsertColumnSubmenu({
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: {
  onSelect: (type: string, config?: any) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="min-w-[200px] rounded-lg border border-zinc-700/50 bg-zinc-900 py-1 shadow-2xl shadow-black/50"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Enrichment actions */}
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Enrichment actions
      </div>
      {ENRICHMENT_ACTIONS.map((action) => (
        <button
          key={action.id}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onSelect(action.type)}
        >
          <action.icon className="size-4 shrink-0 text-zinc-500" />
          {action.label}
        </button>
      ))}

      <div className="my-1 h-px bg-zinc-800" />

      {/* Data types */}
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Data types
      </div>
      {DATA_TYPE_ITEMS.map((item) => (
        <button
          key={item.type}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onSelect(item.type)}
        >
          <item.icon className="size-4 shrink-0 text-zinc-500" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── ColorPickerSubmenu ───────────────────────────────────────────────

function ColorPickerSubmenu({
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: {
  onSelect: (color: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="min-w-[160px] rounded-lg border border-zinc-700/50 bg-zinc-900 py-1 shadow-2xl shadow-black/50"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {COLOR_OPTIONS.map((color) => (
        <button
          key={color.id}
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => onSelect(color.id)}
        >
          <span
            className="inline-block size-3.5 rounded-full border border-zinc-600"
            style={{ backgroundColor: color.hex }}
          />
          {color.label}
        </button>
      ))}
    </div>
  );
}

// ── ChangeTypeSubmenu ────────────────────────────────────────────────

function ChangeTypeSubmenu({
  currentType,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: {
  currentType: ColumnDataType;
  onSelect: (type: ColumnDataType) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="min-w-[180px] rounded-lg border border-zinc-700/50 bg-zinc-900 py-1 shadow-2xl shadow-black/50"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {DATA_TYPE_ITEMS.map((item) => (
        <button
          key={item.type}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
            item.type === currentType
              ? "bg-zinc-800 text-indigo-400"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          }`}
          onClick={() => onSelect(item.type)}
        >
          <item.icon
            className={`size-4 shrink-0 ${
              item.type === currentType ? "text-indigo-400" : "text-zinc-500"
            }`}
          />
          {item.label}
          {item.type === currentType && (
            <span className="ml-auto text-xs text-indigo-400">Current</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function dataTypeLabel(type: ColumnDataType): string {
  const found = DATA_TYPE_ITEMS.find((item) => item.type === type);
  return found ? found.label : "Text";
}

export default ColumnHeaderMenu;
