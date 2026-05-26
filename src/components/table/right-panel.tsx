"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { CellData, ColumnDef } from "@/types/table";
import { CellDetailPanel } from "./cell-detail-panel";
import { ColumnConfigEditor } from "./column-config-editor";

// ── Types ───────────────────────────────────────────────────────────

export type RightPanelMode =
  | "closed"
  | "cell-detail"
  | "column-config"
  | "enrichment-catalog"
  | "waterfall-config";

export interface RightPanelProps {
  mode: RightPanelMode;
  selectedCell?: {
    rowId: string;
    columnId: string;
    cellData: CellData;
    columnDef: ColumnDef;
  };
  selectedColumn?: ColumnDef;
  allColumns: ColumnDef[];
  onClose: () => void;
  onColumnConfigSave: (columnId: string, config: Partial<ColumnDef>) => void;
  onAddEnrichmentColumn?: (config: unknown) => void;
  children?: React.ReactNode;
}

// ── Title map ───────────────────────────────────────────────────────

const PANEL_TITLES: Record<Exclude<RightPanelMode, "closed">, string> = {
  "cell-detail": "Cell details",
  "column-config": "Configure column",
  "enrichment-catalog": "Enrichment catalog",
  "waterfall-config": "Waterfall config",
};

// ── Component ───────────────────────────────────────────────────────

export function RightPanel({
  mode,
  selectedCell,
  selectedColumn,
  allColumns,
  onClose,
  onColumnConfigSave,
  children,
}: RightPanelProps) {
  const isOpen = mode !== "closed";

  return (
    <>
      {/* Slide-in panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-40 flex h-full w-[400px] flex-col border-l border-border bg-background transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {isOpen && (
          <>
            {/* Header */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
              <h2 className="text-sm font-semibold text-foreground">
                {PANEL_TITLES[mode]}
              </h2>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Close panel</span>
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="h-full">
                {mode === "cell-detail" && selectedCell && (
                  <CellDetailPanel
                    cellData={selectedCell.cellData}
                    columnDef={selectedCell.columnDef}
                  />
                )}

                {mode === "column-config" && selectedColumn && (
                  <ColumnConfigEditor
                    column={selectedColumn}
                    allColumns={allColumns}
                    onSave={(config) =>
                      onColumnConfigSave(selectedColumn.id, config)
                    }
                    onDelete={() => {
                      /* parent handles deletion */
                    }}
                  />
                )}

                {(mode === "enrichment-catalog" ||
                  mode === "waterfall-config") &&
                  children}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </>
  );
}

export default RightPanel;
