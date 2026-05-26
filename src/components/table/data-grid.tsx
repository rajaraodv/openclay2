"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  GridCellKind,
  type GridColumn,
  type EditableGridCell,
  type GridCell,
  type Item,
  type GridSelection,
  type Rectangle,
  type CustomCell,
  type DrawArgs,
  type CustomRenderer,
  CompactSelection,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

import type {
  ColumnDef,
  RowData,
  CellValue,
  CellData,
  CellStatus,
} from "@/types/table";
import {
  CellStatus as CellStatusEnum,
  ColumnBehaviorType,
  ColumnDataType,
} from "@/types/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// ── Dynamic import of DataEditor (no SSR) ────────────────────────────

const DataEditor = dynamic(
  () => import("@glideapps/glide-data-grid").then((mod) => mod.DataEditor),
  { ssr: false, loading: () => <DataGridSkeleton /> }
);

function DataGridSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-2 text-zinc-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">Loading spreadsheet...</span>
      </div>
    </div>
  );
}

// ── Column type icons ────────────────────────────────────────────────

const DATA_TYPE_ICONS: Record<string, string> = {
  text: "Aa",
  url: "\u{1f517}",
  number: "#",
  date: "\u{1f4c5}",
  select: "\u{1f3f7}",
  multi_select: "\u{1f3f7}",
  checkbox: "☑",
  currency: "$",
  email: "@",
  image: "\u{1f5bc}",
  assigned_to: "\u{1f464}",
};

const BEHAVIOR_TYPE_ICONS: Record<string, string> = {
  enrichment: "\u{1f504}",
  formula: "fx",
  ai_agent: "\u{1f916}",
  action: "⚡",
};

// ── Status indicators ────────────────────────────────────────────────

const STATUS_INDICATOR: Record<
  string,
  { symbol: string; color: string }
> = {
  empty: { symbol: "", color: "#52525b" },
  pending: { symbol: "⏳", color: "#f59e0b" },
  running: { symbol: "●", color: "#3b82f6" },
  complete: { symbol: "✓", color: "#22c55e" },
  error: { symbol: "✗", color: "#ef4444" },
  skipped: { symbol: "—", color: "#52525b" },
};

// ── Custom cell data for our enrichment overlay ──────────────────────

interface OpenClayCellData {
  kind: "openclay-cell";
  displayValue: string;
  dataType: ColumnDataType;
  columnType: ColumnBehaviorType;
  status: CellStatus;
  tags?: string[];
  checked?: boolean;
  imageUrl?: string;
  avatarName?: string;
}

type OpenClayCell = CustomCell<OpenClayCellData>;

// ── Tag color palette ────────────────────────────────────────────────

const TAG_COLORS = [
  { bg: "#1e3a5f", text: "#60a5fa" },
  { bg: "#14532d", text: "#4ade80" },
  { bg: "#422006", text: "#facc15" },
  { bg: "#4a0e2e", text: "#f472b6" },
  { bg: "#1e1b4b", text: "#818cf8" },
  { bg: "#431407", text: "#fbbf24" },
  { bg: "#064e3b", text: "#34d399" },
  { bg: "#2e1065", text: "#a78bfa" },
  { bg: "#450a0a", text: "#f87171" },
  { bg: "#083344", text: "#22d3ee" },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ── Color map for company icons ─────────────────────────────────────

const COMPANY_COLORS = [
  "#6366f1", "#ec4899", "#f97316", "#14b8a6",
  "#8b5cf6", "#ef4444", "#22c55e", "#3b82f6",
  "#f59e0b", "#06b6d4", "#a855f7", "#10b981",
];

function getCompanyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
}

// ── Custom renderer for OpenClay cells ───────────────────────────────

const openClayCellRenderer: CustomRenderer<OpenClayCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell: CustomCell): cell is OpenClayCell =>
    (cell.data as OpenClayCellData)?.kind === "openclay-cell",
  needsHover: true,
  needsHoverPosition: true,
  draw: (args: DrawArgs<OpenClayCell>, cell: OpenClayCell) => {
    const { ctx, rect, hoverAmount, hoverX, hoverY, theme, requestAnimationFrame: reqAF } = args;
    const { displayValue, dataType, columnType, status, tags, checked, imageUrl, avatarName } =
      cell.data;

    const x = rect.x + 8;
    const y = rect.y;
    const w = rect.width - 16;
    const h = rect.height;
    const midY = y + h / 2;

    ctx.save();

    const isAutomated =
      columnType === ColumnBehaviorType.Enrichment ||
      columnType === ColumnBehaviorType.AIAgent ||
      columnType === ColumnBehaviorType.Formula ||
      columnType === ColumnBehaviorType.Action;

    // ── Status-based cell background ────────────────────────────
    if (isAutomated) {
      if (status === CellStatusEnum.Complete && displayValue) {
        // Green left border for complete cells
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(rect.x, rect.y, 3, rect.height);
      } else if (status === CellStatusEnum.Running) {
        // Light yellow-ish bg for running
        ctx.fillStyle = "rgba(250, 204, 21, 0.06)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      } else if (status === CellStatusEnum.Error) {
        // Light red bg for error
        ctx.fillStyle = "rgba(239, 68, 68, 0.06)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    }

    let statusWidth = 0;
    if (isAutomated && status !== CellStatusEnum.Complete && status !== CellStatusEnum.Empty) {
      const indicator = STATUS_INDICATOR[status] ?? STATUS_INDICATOR.empty;

      if (status === CellStatusEnum.Running) {
        // Animated pulsing dot
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 400));
        ctx.fillStyle = indicator.color;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(x + 6, midY, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        reqAF();
        statusWidth = 16;
      } else if (status === CellStatusEnum.Error) {
        ctx.fillStyle = indicator.color;
        ctx.font = "bold 11px sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("✗", x + 1, midY);
        statusWidth = 14;
      } else if (status === CellStatusEnum.Pending) {
        ctx.fillStyle = indicator.color;
        ctx.font = "10px sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("⏱", x + 1, midY);
        statusWidth = 14;
      }
    }

    const contentX = x + statusWidth;
    const contentW = w - statusWidth;

    ctx.textBaseline = "middle";

    // ── Enrichment column with complete data: show icon + company name ──
    if (isAutomated && columnType === ColumnBehaviorType.Enrichment && status === CellStatusEnum.Complete && displayValue) {
      // Draw colored circle icon
      const iconSize = 18;
      const iconX = contentX + 1;
      const iconY = midY - iconSize / 2;
      const iconColor = getCompanyColor(displayValue);

      ctx.fillStyle = iconColor;
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 2, midY, iconSize / 2, 0, 2 * Math.PI);
      ctx.fill();

      // Draw initial letter
      const initial = displayValue.charAt(0).toUpperCase();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 10px ${theme.fontFamily}`;
      ctx.textAlign = "center";
      ctx.fillText(initial, iconX + iconSize / 2, midY + 1);
      ctx.textAlign = "left";

      // Draw company name
      ctx.fillStyle = "#e4e4e7";
      ctx.font = `13px ${theme.fontFamily}`;
      ctx.fillText(displayValue, iconX + iconSize + 6, midY, contentW - iconSize - 8);
    } else {
      // ── Draw cell content based on data type ─────────────────────
      switch (dataType) {
        case ColumnDataType.Url:
        case ColumnDataType.Email: {
          ctx.fillStyle = "#60a5fa";
          ctx.font = `13px ${theme.fontFamily}`;
          const text = displayValue || "";
          const metrics = ctx.measureText(text);
          const textWidth = Math.min(metrics.width, contentW);
          ctx.fillText(text, contentX, midY, contentW);
          // Underline
          ctx.strokeStyle = "#60a5fa40";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(contentX, midY + 7);
          ctx.lineTo(contentX + textWidth, midY + 7);
          ctx.stroke();
          break;
        }

        case ColumnDataType.Number: {
          ctx.fillStyle = "#e4e4e7";
          ctx.font = `13px ${theme.fontFamily}`;
          ctx.textAlign = "right";
          ctx.fillText(displayValue || "", contentX + contentW, midY, contentW);
          ctx.textAlign = "left";
          break;
        }

        case ColumnDataType.Currency: {
          ctx.fillStyle = "#e4e4e7";
          ctx.font = `13px ${theme.fontFamily}`;
          ctx.textAlign = "right";
          const formatted = displayValue ? `$${displayValue}` : "";
          ctx.fillText(formatted, contentX + contentW, midY, contentW);
          ctx.textAlign = "left";
          break;
        }

        case ColumnDataType.Checkbox: {
          const boxSize = 16;
          const boxX = contentX + 2;
          const boxY = midY - boxSize / 2;
          ctx.strokeStyle = checked ? "#22c55e" : "#52525b";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          roundRect(ctx, boxX, boxY, boxSize, boxSize, 3);
          ctx.stroke();
          if (checked) {
            ctx.fillStyle = "#22c55e";
            ctx.beginPath();
            roundRect(ctx, boxX, boxY, boxSize, boxSize, 3);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(boxX + 4, midY);
            ctx.lineTo(boxX + 7, midY + 3);
            ctx.lineTo(boxX + 12, midY - 3);
            ctx.stroke();
          }
          break;
        }

        case ColumnDataType.Select: {
          if (tags && tags.length > 0) {
            const tag = tags[0];
            const color = getTagColor(tag);
            ctx.font = `12px ${theme.fontFamily}`;
            const tw = ctx.measureText(tag).width;
            const paddingH = 8;
            const tagH = 20;
            const tagW = tw + paddingH * 2;
            const tagY = midY - tagH / 2;
            ctx.fillStyle = color.bg;
            ctx.beginPath();
            roundRect(ctx, contentX, tagY, tagW, tagH, 10);
            ctx.fill();
            ctx.fillStyle = color.text;
            ctx.textBaseline = "middle";
            ctx.fillText(tag, contentX + paddingH, midY);
          }
          break;
        }

        case ColumnDataType.MultiSelect: {
          if (tags && tags.length > 0) {
            let offsetX = contentX;
            ctx.font = `11px ${theme.fontFamily}`;
            for (const tag of tags) {
              const color = getTagColor(tag);
              const tw = ctx.measureText(tag).width;
              const paddingH = 6;
              const tagH = 18;
              const tagW = tw + paddingH * 2;
              const tagY = midY - tagH / 2;
              if (offsetX + tagW > contentX + contentW) break;
              ctx.fillStyle = color.bg;
              ctx.beginPath();
              roundRect(ctx, offsetX, tagY, tagW, tagH, 9);
              ctx.fill();
              ctx.fillStyle = color.text;
              ctx.textBaseline = "middle";
              ctx.fillText(tag, offsetX + paddingH, midY);
              offsetX += tagW + 4;
            }
          }
          break;
        }

        case ColumnDataType.AssignedTo: {
          const avatarSize = 22;
          const avatarX = contentX;
          const name = avatarName || displayValue || "";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          ctx.fillStyle = "#6366f1";
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, midY, avatarSize / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold 10px ${theme.fontFamily}`;
          ctx.textAlign = "center";
          ctx.fillText(initials, avatarX + avatarSize / 2, midY + 1);
          ctx.textAlign = "left";
          ctx.fillStyle = "#e4e4e7";
          ctx.font = `13px ${theme.fontFamily}`;
          ctx.fillText(name, avatarX + avatarSize + 6, midY, contentW - avatarSize - 6);
          break;
        }

        default: {
          // Text
          ctx.fillStyle = "#e4e4e7";
          ctx.font = `13px ${theme.fontFamily}`;
          ctx.fillText(displayValue || "", contentX, midY, contentW);
          break;
        }
      }
    }

    // ── Per-cell play button on hover for automated columns ──────
    if (
      isAutomated &&
      hoverAmount > 0 &&
      hoverX !== undefined &&
      hoverY !== undefined
    ) {
      const btnSize = 20;
      const btnX = rect.x + rect.width - btnSize - 6;
      const btnY = midY - btnSize / 2;

      ctx.globalAlpha = hoverAmount;
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      roundRect(ctx, btnX, btnY, btnSize, btnSize, 4);
      ctx.fill();

      // Play triangle
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(btnX + 7, btnY + 4);
      ctx.lineTo(btnX + 7, btnY + btnSize - 4);
      ctx.lineTo(btnX + btnSize - 5, btnY + btnSize / 2);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    ctx.restore();
    return true;
  },
  onClick: (args) => {
    const { cell, posX, bounds } = args;
    const isAutomated =
      cell.data.columnType === ColumnBehaviorType.Enrichment ||
      cell.data.columnType === ColumnBehaviorType.AIAgent ||
      cell.data.columnType === ColumnBehaviorType.Formula ||
      cell.data.columnType === ColumnBehaviorType.Action;

    if (isAutomated) {
      const btnSize = 20;
      const btnX = bounds.width - btnSize - 6;
      if (posX >= btnX && posX <= btnX + btnSize) {
        return undefined;
      }
    }
    return undefined;
  },
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

// ── Helper: compute column progress for enrichment columns ──────────

function computeColumnProgress(
  columnId: string,
  rows: RowData[]
): { complete: number; running: number; error: number; empty: number; total: number; percentage: number } {
  let complete = 0, running = 0, error = 0, empty = 0;
  for (const row of rows) {
    const cell = row.cells[columnId];
    if (!cell || cell.status === CellStatusEnum.Empty) empty++;
    else if (cell.status === CellStatusEnum.Complete) complete++;
    else if (cell.status === CellStatusEnum.Running) running++;
    else if (cell.status === CellStatusEnum.Error) error++;
    else if (cell.status === CellStatusEnum.Pending) empty++;
    else empty++;
  }
  const total = rows.length;
  const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;
  return { complete, running, error, empty, total, percentage };
}

// ── Props ────────────────────────────────────────────────────────────

export interface DataGridProps {
  columns: ColumnDef[];
  rows: RowData[];
  onCellEdited?: (cell: Item, newValue: CellValue) => void;
  onColumnAdded?: () => void;
  onColumnResized?: (columnId: string, newWidth: number) => void;
  onRowAdded?: () => void;
  onCellClicked?: (cell: Item) => void;
  onRunCell?: (rowId: string, columnId: string) => void;
  onHeaderClicked?: (columnIndex: number) => void;
  onColumnHeaderContextMenu?: (columnId: string, x: number, y: number) => void;
}

// ── Component ────────────────────────────────────────────────────────

export function OpenClayDataGrid({
  columns,
  rows,
  onCellEdited,
  onColumnAdded,
  onColumnResized,
  onRowAdded,
  onCellClicked,
  onRunCell,
  onHeaderClicked,
  onColumnHeaderContextMenu,
}: DataGridProps) {
  const [selection, setSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

  const gridRef = useRef<HTMLDivElement>(null);

  // ── Map column defs to Glide columns ───────────────────────────

  const gridColumns: GridColumn[] = useMemo(() => {
    const cols: GridColumn[] = columns.map((col) => {
      const icon =
        col.columnType !== ColumnBehaviorType.Manual
          ? BEHAVIOR_TYPE_ICONS[col.columnType]
          : DATA_TYPE_ICONS[col.dataType];

      const isAutomated = col.columnType !== ColumnBehaviorType.Manual;
      let title = `${icon ?? ""} ${col.name}`;

      // Add progress percentage to enrichment column headers
      if (isAutomated) {
        const progress = computeColumnProgress(col.id, rows);
        title = `${icon ?? ""} ${col.name}  ${progress.percentage}%`;
      }

      return {
        id: col.id,
        title,
        width: col.width,
        hasMenu: true,
        grow: 0,
      };
    });
    // Add "+" column at the end
    cols.push({
      id: "__add_column__",
      title: "+",
      width: 44,
      hasMenu: false,
      grow: 0,
      themeOverride: {
        bgHeader: "#18181b",
        textHeader: "#52525b",
      },
    });
    return cols;
  }, [columns, rows]);

  // ── getCellContent ─────────────────────────────────────────────

  const getCellContent = useCallback(
    ([colIdx, rowIdx]: Item): GridCell => {
      // "Add column" column
      if (colIdx >= columns.length) {
        return {
          kind: GridCellKind.Text,
          data: "",
          displayData: "",
          allowOverlay: false,
          readonly: true,
          themeOverride: { bgCell: "#18181b" },
        };
      }

      const col = columns[colIdx];
      const row = rows[rowIdx];

      if (!row) {
        return {
          kind: GridCellKind.Loading,
          allowOverlay: false,
        };
      }

      const cellData: CellData = row.cells[col.id] ?? {
        value: null,
        status: CellStatusEnum.Empty,
      };

      const value = cellData.value;
      const status = cellData.status;
      const displayValue = formatCellValue(value, col.dataType);

      // Use custom cell renderer for rich display
      const customCell: OpenClayCell = {
        kind: GridCellKind.Custom,
        allowOverlay: true,
        copyData: displayValue,
        data: {
          kind: "openclay-cell",
          displayValue,
          dataType: col.dataType,
          columnType: col.columnType,
          status,
          tags: Array.isArray(value) ? value.map(String) : value && typeof value === "string" ? [String(value)] : undefined,
          checked: typeof value === "boolean" ? value : undefined,
          imageUrl: col.dataType === ColumnDataType.Image && typeof value === "string" ? value : undefined,
          avatarName: col.dataType === ColumnDataType.AssignedTo && typeof value === "string" ? value : undefined,
        },
      };

      return customCell;
    },
    [columns, rows]
  );

  // ── Cell editing ───────────────────────────────────────────────

  const handleCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (!onCellEdited) return;
      if (cell[0] >= columns.length) return;

      let parsed: CellValue;
      if (newValue.kind === GridCellKind.Custom) {
        parsed = (newValue as CustomCell).copyData ?? null;
      } else if (newValue.kind === GridCellKind.Text) {
        parsed = newValue.data;
      } else if (newValue.kind === GridCellKind.Number) {
        parsed = newValue.data;
      } else if (newValue.kind === GridCellKind.Boolean) {
        parsed = newValue.data === true;
      } else {
        parsed = null;
      }

      onCellEdited(cell, parsed);
    },
    [onCellEdited, columns.length]
  );

  // ── Header click ───────────────────────────────────────────────

  const handleHeaderClicked = useCallback(
    (colIdx: number) => {
      if (colIdx >= columns.length) {
        onColumnAdded?.();
        return;
      }
      onHeaderClicked?.(colIdx);
    },
    [columns.length, onColumnAdded, onHeaderClicked]
  );

  // ── Cell click (detect play button) ────────────────────────────

  const handleCellClicked = useCallback(
    (cell: Item, event: { bounds: Rectangle; localEventX: number; localEventY: number }) => {
      onCellClicked?.(cell);

      if (cell[0] < columns.length && onRunCell) {
        const col = columns[cell[0]];
        const isAutomated =
          col.columnType === ColumnBehaviorType.Enrichment ||
          col.columnType === ColumnBehaviorType.AIAgent ||
          col.columnType === ColumnBehaviorType.Formula ||
          col.columnType === ColumnBehaviorType.Action;

        if (isAutomated) {
          const btnSize = 20;
          const btnX = event.bounds.width - btnSize - 6;
          if (event.localEventX >= btnX && event.localEventX <= btnX + btnSize) {
            const row = rows[cell[1]];
            if (row) {
              onRunCell(row.id, col.id);
            }
          }
        }
      }
    },
    [columns, rows, onCellClicked, onRunCell]
  );

  // ── Column resize ──────────────────────────────────────────────

  const handleColumnResize = useCallback(
    (column: GridColumn, newSize: number) => {
      if (column.id && column.id !== "__add_column__") {
        onColumnResized?.(column.id, newSize);
      }
    },
    [onColumnResized]
  );

  // ── Header context menu (right-click) ───────────────────────────

  const handleHeaderContextMenu = useCallback(
    (colIdx: number, event: { bounds: Rectangle; localEventX: number; localEventY: number; preventDefault: () => void }) => {
      event.preventDefault();
      if (colIdx >= columns.length) return;
      const col = columns[colIdx];
      // Compute screen position from the bounds + local offset
      const x = event.bounds.x + event.localEventX;
      const y = event.bounds.y + event.localEventY;
      onColumnHeaderContextMenu?.(col.id, x, y);
    },
    [columns, onColumnHeaderContextMenu]
  );

  // ── Row append (trailing row) ──────────────────────────────────

  const handleRowAppended = useCallback(() => {
    onRowAdded?.();
  }, [onRowAdded]);

  // ── Custom renderers ───────────────────────────────────────────

  const customRenderers = useMemo(
    () => [openClayCellRenderer],
    []
  );

  // ── Draw header for enrichment columns with progress bar ──────

  const drawHeader = useCallback(
    (args: {
      ctx: CanvasRenderingContext2D;
      column: GridColumn;
      columnIndex: number;
      theme: unknown;
      rect: Rectangle;
      hoverAmount: number;
      isSelected: boolean;
      isHovered: boolean;
      hasSelectedCell: boolean;
      spriteManager: unknown;
      menuBounds: Rectangle;
    }, drawContent: () => void) => {
      const { ctx, rect, columnIndex } = args;

      // Let default header draw first
      drawContent();

      const col = columns[columnIndex];
      if (!col) return;
      const isAutomated = col.columnType !== ColumnBehaviorType.Manual;

      if (!isAutomated) return;

      // Draw progress bar at the bottom of the header
      const progress = computeColumnProgress(col.id, rows);
      const barHeight = 3;
      const barY = rect.y + rect.height - barHeight;
      const totalWidth = rect.width;

      if (progress.total > 0) {
        // Background bar
        ctx.fillStyle = "#27272a";
        ctx.fillRect(rect.x, barY, totalWidth, barHeight);

        // Complete segment (green)
        const completeW = (progress.complete / progress.total) * totalWidth;
        if (completeW > 0) {
          ctx.fillStyle = "#16a34a";
          ctx.fillRect(rect.x, barY, completeW, barHeight);
        }

        // Running segment (blue) after complete
        const runningW = (progress.running / progress.total) * totalWidth;
        if (runningW > 0) {
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(rect.x + completeW, barY, runningW, barHeight);
        }

        // Error segment (red)
        const errorW = (progress.error / progress.total) * totalWidth;
        if (errorW > 0) {
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(rect.x + completeW + runningW, barY, errorW, barHeight);
        }
      }
    },
    [columns, rows]
  );

  return (
    <div className="flex h-full w-full flex-col" ref={gridRef}>
      <div className="relative min-h-0 flex-1">
        <DataEditor
          getCellContent={getCellContent}
          columns={gridColumns}
          rows={rows.length}
          onCellEdited={handleCellEdited}
          onHeaderClicked={handleHeaderClicked}
          onHeaderContextMenu={handleHeaderContextMenu}
          onCellClicked={handleCellClicked}
          onColumnResize={handleColumnResize}
          onRowAppended={handleRowAppended}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          customRenderers={customRenderers}
          drawHeader={drawHeader}
          getCellsForSelection={true}
          trailingRowOptions={{
            sticky: false,
            tint: true,
            hint: "Add row...",
          }}
          rowMarkers="both"
          width="100%"
          height="100%"
          headerHeight={38}
          rowHeight={36}
          theme={{
            accentColor: "#6366f1",
            accentLight: "#1e1b4b",
            bgHeader: "#18181b",
            bgHeaderHasFocus: "#27272a",
            bgHeaderHovered: "#27272a",
            bgCell: "#09090b",
            bgCellMedium: "#18181b",
            textDark: "#e4e4e7",
            textHeader: "#a1a1aa",
            textLight: "#52525b",
            borderColor: "#27272a",
            horizontalBorderColor: "#1c1c1f",
            headerFontStyle: "600 12px",
            baseFontStyle: "13px",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          }}
          smoothScrollX
          smoothScrollY
          editOnType
          keybindings={{
            search: true,
            copy: true,
            paste: true,
            selectAll: true,
            selectRow: true,
            selectColumn: true,
          }}
        />
      </div>
      {/* Bottom bar */}
      <div className="flex items-center border-t border-zinc-800 bg-zinc-950 px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-zinc-500 hover:text-zinc-300"
          onClick={onRowAdded}
        >
          <Plus className="size-3.5" />
          Add row
        </Button>
        <span className="ml-auto text-xs text-zinc-500">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatCellValue(value: CellValue, dataType: ColumnDataType): string {
  if (value === null || value === undefined) return "";

  // If the value is an object (enrichment JSON), it was stored as rawValue
  // and "value" should be the display string. But if value itself is an object, extract name.
  if (typeof value === "object" && !Array.isArray(value)) {
    return (value as Record<string, unknown>).name as string ?? JSON.stringify(value);
  }

  switch (dataType) {
    case ColumnDataType.Number:
      return typeof value === "number"
        ? value.toLocaleString()
        : String(value);

    case ColumnDataType.Currency:
      if (typeof value === "number") {
        return value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return String(value);

    case ColumnDataType.Date:
      if (typeof value === "string") {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      }
      return String(value);

    case ColumnDataType.Checkbox:
      return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

    case ColumnDataType.MultiSelect:
      return Array.isArray(value) ? value.join(", ") : String(value);

    default:
      return Array.isArray(value) ? value.join(", ") : String(value);
  }
}

export default OpenClayDataGrid;
