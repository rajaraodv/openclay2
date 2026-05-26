"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Sparkles,
  Layers,
  Calculator,
  Merge,
  Type,
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
  Zap,
} from "lucide-react";
import { ColumnDataType } from "@/types/table";

// ── Props ────────────────────────────────────────────────────────────

export interface AddColumnMenuProps {
  onAddDataColumn: (type: ColumnDataType) => void;
  onAddEnrichment: (templateId: string) => void;
  onAddFormula: () => void;
  onAddAI: () => void;
  onOpenEnrichmentCatalog: () => void;
}

// ── Enrichment action items ─────────────────────────────────────────

const ENRICHMENT_ACTIONS = [
  {
    id: "add_enrichment",
    label: "Add enrichment",
    icon: Zap,
    action: "catalog" as const,
  },
  {
    id: "use_ai",
    label: "Use AI",
    icon: Sparkles,
    action: "ai" as const,
  },
  {
    id: "waterfall",
    label: "Waterfall",
    icon: Layers,
    action: "catalog" as const,
  },
  {
    id: "formula",
    label: "Formula",
    icon: Calculator,
    action: "formula" as const,
  },
  {
    id: "merge_columns",
    label: "Merge columns",
    icon: Merge,
    action: "enrichment" as const,
    templateId: "merge_columns",
  },
] as const;

// ── Data type items ─────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────

export function AddColumnMenu({
  onAddDataColumn,
  onAddEnrichment,
  onAddFormula,
  onAddAI,
  onOpenEnrichmentCatalog,
}: AddColumnMenuProps) {
  const handleActionClick = (action: (typeof ENRICHMENT_ACTIONS)[number]) => {
    switch (action.action) {
      case "catalog":
        onOpenEnrichmentCatalog();
        break;
      case "ai":
        onAddAI();
        break;
      case "formula":
        onAddFormula();
        break;
      case "enrichment":
        if ("templateId" in action) {
          onAddEnrichment(action.templateId);
        }
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Plus className="size-3.5" />
            Add column
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        {/* ── Enrichment actions ─────────────────────────────── */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Enrichment actions</DropdownMenuLabel>
          {ENRICHMENT_ACTIONS.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
            >
              <action.icon className="mr-1.5 size-4 text-muted-foreground" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* ── Data types ─────────────────────────────────────── */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Data types</DropdownMenuLabel>
          {DATA_TYPE_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.type}
              onClick={() => onAddDataColumn(item.type)}
            >
              <item.icon className="mr-1.5 size-4 text-muted-foreground" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AddColumnMenu;
