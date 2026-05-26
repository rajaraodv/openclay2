"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Search,
  Mail,
  Phone,
  Globe,
  BarChart3,
  Banknote,
  Layers,
  TrendingUp,
  Briefcase,
  User,
  Users,
  Newspaper,
  BadgeCheck,
  Factory,
  Share2,
  Sparkles,
} from "lucide-react";

import {
  ENRICHMENT_TEMPLATES,
  type EnrichmentTemplate,
} from "./enrichment-templates";

// ── Props ────────────────────────────────────────────────────────────

export interface EnrichmentCatalogProps {
  onSelectTemplate: (template: EnrichmentTemplate) => void;
  onClose: () => void;
}

// ── Icon map ────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  phone: Phone,
  globe: Globe,
  "bar-chart-3": BarChart3,
  banknote: Banknote,
  layers: Layers,
  "trending-up": TrendingUp,
  briefcase: Briefcase,
  user: User,
  users: Users,
  newspaper: Newspaper,
  "badge-check": BadgeCheck,
  factory: Factory,
  "share-2": Share2,
  sparkles: Sparkles,
};

// ── Category filter options ─────────────────────────────────────────

type FilterOption = "suggested" | "all" | EnrichmentTemplate["category"];

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "all", label: "All" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "people", label: "People" },
  { value: "technographic", label: "Technographic" },
  { value: "social", label: "Social" },
  { value: "ai", label: "AI" },
];

// ── Suggested template IDs (curated order) ──────────────────────────

const SUGGESTED_IDS = [
  "use_ai",
  "work_email",
  "company_domain",
  "website_traffic",
  "company_funding",
  "website_techstack",
  "company_revenue",
  "job_openings",
  "linkedin_highlights",
];

const INITIAL_DISPLAY_COUNT = 10;

// ── Component ────────────────────────────────────────────────────────

export function EnrichmentCatalog({
  onSelectTemplate,
  onClose,
}: EnrichmentCatalogProps) {
  const [activeTab, setActiveTab] = useState("enrichments");
  const [filter, setFilter] = useState<FilterOption>("suggested");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  // Filter and search templates
  const filteredTemplates = useMemo(() => {
    let templates = [...ENRICHMENT_TEMPLATES];

    // Apply category filter
    if (filter === "suggested") {
      templates = templates.sort((a, b) => {
        const aIdx = SUGGESTED_IDS.indexOf(a.id);
        const bIdx = SUGGESTED_IDS.indexOf(b.id);
        if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
        if (aIdx >= 0) return -1;
        if (bIdx >= 0) return 1;
        return 0;
      });
    } else if (filter !== "all") {
      templates = templates.filter((t) => t.category === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    return templates;
  }, [filter, searchQuery]);

  const visibleTemplates = filteredTemplates.slice(0, displayCount);
  const hasMore = displayCount < filteredTemplates.length;

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName];
    return IconComponent ? (
      <IconComponent className="size-4" />
    ) : (
      <Sparkles className="size-4" />
    );
  };

  return (
    <div className="flex h-full w-[380px] flex-col border-l border-border bg-background">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Tools</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs
        defaultValue="enrichments"
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as string)}
      >
        <div className="border-b border-border px-4 pt-2">
          <TabsList variant="line">
            <TabsTrigger value="sources" className="text-xs">
              Sources
            </TabsTrigger>
            <TabsTrigger value="enrichments" className="text-xs">
              Enrichments
            </TabsTrigger>
            <TabsTrigger value="signals" className="text-xs">
              Signals
            </TabsTrigger>
            <TabsTrigger value="exports" className="text-xs">
              Exports
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="enrichments" className="flex flex-1 flex-col overflow-hidden">
          {/* ── Filter & Search ─────────────────────────────── */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Select
              value={filter}
              onValueChange={(val) => {
                setFilter(val as FilterOption);
                setDisplayCount(INITIAL_DISPLAY_COUNT);
              }}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayCount(INITIAL_DISPLAY_COUNT);
                }}
                placeholder="Search enrichments..."
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>

          {/* ── Template list ───────────────────────────────── */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 p-2">
              {visibleTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className="group flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  {/* Icon */}
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground">
                    {getIcon(template.icon)}
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {template.name}
                      </span>
                      {template.providerCount > 1 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          +{template.providerCount - 1}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  </div>

                  {/* Cost */}
                  <div className="mt-0.5 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      ~{template.creditCostPerRow} / row
                    </span>
                  </div>
                </button>
              ))}

              {visibleTemplates.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No enrichments found.
                </div>
              )}

              {/* Load More */}
              {hasMore && (
                <div className="px-3 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() =>
                      setDisplayCount((prev) => prev + INITIAL_DISPLAY_COUNT)
                    }
                  >
                    Load More ({filteredTemplates.length - displayCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Placeholder tabs ──────────────────────────────── */}
        <TabsContent value="sources" className="flex-1">
          <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
            Sources coming soon.
          </div>
        </TabsContent>
        <TabsContent value="signals" className="flex-1">
          <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
            Signals coming soon.
          </div>
        </TabsContent>
        <TabsContent value="exports" className="flex-1">
          <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
            Exports coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnrichmentCatalog;
